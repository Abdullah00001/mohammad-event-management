import {
  User,
  KycAttemptStatus,
  KycAttempt,
  NotificationType,
} from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { env } from '@/env';
import { DiditWebhookPayload } from '@/app/modules/kyc/kyc.types';
import { createNotification } from '@/app/modules/notification/notification.services';
import { getEmailQueue, getPushNotificationQueue } from '@/app/queues/queues';
import { EPushNotificationJobName } from '@/app/@types/queue.types';

export const diditCreateSessionService = async ({ user }: { user: User }) => {
  try {
    // 1. Check for existing initiated session
    const existingSession = await prisma.kycAttempt.findFirst({
      where: {
        userId: user.id,
        status: KycAttemptStatus.INITIATED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingSession && existingSession.url) {
      const sessionAge = Date.now() - existingSession.createdAt.getTime();
      const MAX_SESSION_AGE = 15 * 60 * 1000; // 15 minutes

      if (sessionAge <= MAX_SESSION_AGE) {
        return {
          sessionId: existingSession.sessionId,
          url: existingSession.url,
        };
      }

      // Mark the expired session as ABANDONED so we don't pick it up again
      await prisma.kycAttempt.update({
        where: { id: existingSession.id },
        data: { status: KycAttemptStatus.ABANDONED },
      });
    }

    const response = await fetch(`${env.DIDIT_API_URL}/v3/session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.DIDIT_API_KEY,
      },
      body: JSON.stringify({
        workflow_id: env.DIDIT_WORKFLOW_ID,
        vendor_data: user.id,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          'Too many requests to Didit API. Please try again later.'
        );
      }
      const errorData = await response.text();
      throw new Error(`Didit API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();

    const { session_id, url } = data;

    if (!session_id || !url) {
      throw new Error(
        'Invalid response from Didit API: missing session_id or url'
      );
    }

    // Save the attempt in the database (use upsert to handle Didit returning the same session ID)
    await prisma.kycAttempt.upsert({
      where: { sessionId: session_id },
      update: {
        status: KycAttemptStatus.INITIATED,
        url: url,
        submittedAt: null,
      },
      create: {
        userId: user.id,
        sessionId: session_id,
        workflowId: env.DIDIT_WORKFLOW_ID,
        status: KycAttemptStatus.INITIATED,
        environment: env.NODE_ENV === 'production' ? 'live' : 'sandbox',
        url: url,
        submittedAt: null,
      },
    });

    return {
      sessionId: session_id,
      url,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in didit create session service');
  }
};

export const diditSubmitKycService = async ({
  user,
  attempt,
}: {
  user: User;
  attempt: KycAttempt;
}) => {
  try {
    // 1. If already submitted (PENDING with submittedAt), do nothing (idempotent)
    if (attempt.status === KycAttemptStatus.PENDING && attempt.submittedAt) {
      return;
    }

    // 2. Only allow submit from INITIATED state
    if (attempt.status !== KycAttemptStatus.INITIATED) {
      throw new Error(
        `Cannot submit a session with status ${attempt.status}. Only INITIATED sessions can be submitted.`
      );
    }

    // 3. Update the attempt
    await prisma.kycAttempt.update({
      where: { id: attempt.id },
      data: {
        status: KycAttemptStatus.PENDING,
        submittedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in diditSubmitKycService');
  }
};

export const processKycWebhookService = async ({
  payload,
}: {
  payload: DiditWebhookPayload;
}) => {
  const { session_id, status, vendor_data, rejection_reason, data } = payload;

  // 1. Find the attempt
  const attempt = await prisma.kycAttempt.findUnique({
    where: { sessionId: session_id },
  });

  if (!attempt) {
    // We don't throw – the service logs and returns (controller still returns 200)
    return;
  }

  // 2. Map Didit status to our enum
  let attemptStatus: KycAttemptStatus;
  switch (status) {
    case 'Approved':
      attemptStatus = KycAttemptStatus.APPROVED;
      break;
    case 'Declined':
      attemptStatus = KycAttemptStatus.DECLINED;
      break;
    case 'Abandoned':
      attemptStatus = KycAttemptStatus.ABANDONED;
      break;
    case 'In Review':
      attemptStatus = KycAttemptStatus.REVIEW;
      break;
    default:
      attemptStatus = KycAttemptStatus.PENDING;
      break;
  }

  // Idempotency check: if status hasn't changed, ignore the webhook
  if (attempt.status === attemptStatus) {
    return;
  }

  // 3 & 4. Update the attempt & upsert user data in a single transaction
  const updateData: any = {
    status: attemptStatus,
    rejectionReason: rejection_reason || null,
    rawResponse: payload,
  };

  if (status === 'Approved') {
    updateData.verifiedAt = new Date();
  }

  const updatedAttempt = await prisma.$transaction(async (tx) => {
    const attemptWithUser = await tx.kycAttempt.update({
      where: { id: attempt.id },
      data: updateData,
      include: {
        user: {
          include: {
            userPreference: true,
            devices: true,
            profile: true,
          },
        },
      },
    });

    // If approved, store extracted data
    if (status === 'Approved' && data) {
      await tx.verifiedUserData.upsert({
        where: { userId: attempt.userId },
        update: {
          firstName: data.first_name || null,
          lastName: data.last_name || null,
          dob: data.dob ? new Date(data.dob) : null,
          documentNumber: data.document_number || null,
          documentType: data.document_type || null,
          nationality: data.nationality || null,
          gender: data.gender || null,
          issueDate: data.issue_date ? new Date(data.issue_date) : null,
          expiryDate: data.expiry_date ? new Date(data.expiry_date) : null,
          rawData: data,
          attemptId: attempt.id,
        },
        create: {
          userId: attempt.userId,
          firstName: data.first_name || null,
          lastName: data.last_name || null,
          dob: data.dob ? new Date(data.dob) : null,
          documentNumber: data.document_number || null,
          documentType: data.document_type || null,
          nationality: data.nationality || null,
          gender: data.gender || null,
          issueDate: data.issue_date ? new Date(data.issue_date) : null,
          expiryDate: data.expiry_date ? new Date(data.expiry_date) : null,
          rawData: data,
          attemptId: attempt.id,
        },
      });
    }

    return attemptWithUser;
  });

  // 5. Notifications
  if (status === 'Approved' || status === 'Declined') {
    const user = updatedAttempt.user;

    if (user) {
      const userFirstName = user.profile?.name || user.email.split('@')[0];

      // A. In-App Notification (Always)
      await createNotification({
        userId: user.id,
        title:
          status === 'Approved' ? 'Identity Verified' : 'Verification Declined',
        description:
          status === 'Approved'
            ? 'Your identity has been successfully verified.'
            : 'We were unable to verify your identity. Please check your email for details.',
        type:
          status === 'Approved'
            ? NotificationType.KYC_VERIFIED
            : NotificationType.KYC_DECLINED,
        metadata: { attemptId: attempt.id },
      });

      // B. Push Notification (Check Preference)
      if (user.userPreference?.pushNotifications && user.devices?.length > 0) {
        const tokens = user.devices.map((d) => d.fcmToken);
        await getPushNotificationQueue().add(
          EPushNotificationJobName.SEND_MULTICAST,
          {
            jobName: EPushNotificationJobName.SEND_MULTICAST,
            tokens,
            payload: {
              title:
                status === 'Approved'
                  ? 'Identity Verified ✅'
                  : 'Verification Declined ❌',
              body:
                status === 'Approved'
                  ? 'Great news! Your identity has been successfully verified.'
                  : 'We could not verify your identity. Tap to see more details.',
              data: {
                type: status === 'Approved' ? 'KYC_VERIFIED' : 'KYC_DECLINED',
                attemptId: attempt.id,
              },
            },
          }
        );
      }

      // C. Email Notification (Always)
      if (status === 'Approved') {
        await getEmailQueue().add('send-kyc-verified-email', {
          email: user.email,
          userFirstName,
          verifiedAt: updatedAttempt.verifiedAt || new Date(),
        });
      } else if (status === 'Declined') {
        await getEmailQueue().add('send-kyc-declined-email', {
          email: user.email,
          userFirstName,
          rejectionReason:
            updatedAttempt.rejectionReason || 'Unable to verify details.',
          submittedAt: updatedAttempt.submittedAt || updatedAttempt.createdAt,
        });
      }
    }
  }
};

export const getKycStatusService = async ({ userId }: { userId: string }) => {
  const latest = await prisma.kycAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // No attempts → UNVERIFIED
  if (!latest) {
    return { state: 'UNVERIFIED' };
  }

  // Map database status to user‑friendly state
  switch (latest.status) {
    case KycAttemptStatus.APPROVED:
      return {
        state: 'VERIFIED',
        verifiedAt: latest.verifiedAt,
        attemptId: latest.id,
      };
    case KycAttemptStatus.PENDING:
      return {
        state: 'PENDING',
        submittedAt: latest.submittedAt,
        attemptId: latest.id,
      };
    case KycAttemptStatus.DECLINED:
      return {
        state: 'DECLINED',
        rejectionReason: latest.rejectionReason,
        submittedAt: latest.submittedAt,
        attemptId: latest.id,
      };
    case KycAttemptStatus.REVIEW:
      // UI shows "Verification Pending" for REVIEW as well
      return {
        state: 'PENDING',
        submittedAt: latest.submittedAt,
        attemptId: latest.id,
      };
    case KycAttemptStatus.ABANDONED:
      return { state: 'UNVERIFIED' };
    default:
      return { state: 'UNVERIFIED' };
  }
};
