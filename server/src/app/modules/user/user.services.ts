import { generate } from 'otp-generator';

import { Role } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { SignupResponseDTO } from '@/app/modules/user/user.dto';
import { getEmailQueue } from '@/app/queues/queues';
import { generateOtpPageToken } from '@/app/utils/jwt.utils';
import { hashOtp } from '@/app/utils/otp.utils';
import { hashPassword } from '@/app/utils/password.utils';
import { calculateMilliseconds } from '@/app/utils/system.utils';
import { otpExpireAt } from '@/const';

export const signupService = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ user: SignupResponseDTO; signupPageToken: string }> => {
  const traceId = getTraceId();
  try {
    const hashPass = await hashPassword(password);
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashPass,
        },
      });
      await tx.profile.create({
        data: {
          userId: user?.id,
        },
      });
      return { user };
    });
    const otp = generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
    const hashedOtp = hashOtp({ otp });
    const jwtToken = generateOtpPageToken({
      sub: String(newUser.user.id),
      role: newUser.user.role as Role,
      isVerified: newUser.user.isVerified,
      accountStatus: newUser.user.accountStatus,
    });
    const emailData = {
      email: newUser.user.email,
      expirationTime: otpExpireAt,
      otp,
      traceId,
    };
    const redisClient = getRedisClient();
    const ttl = calculateMilliseconds(otpExpireAt, 'minute');
    await Promise.all([
      redisClient.set(`user:${newUser.user.id}:otp`, hashedOtp, 'PX', ttl),
      getEmailQueue().add('send-signup-user-verify-otp-email', emailData),
    ]);
    return {
      user: SignupResponseDTO.fromEntity(newUser.user),
      signupPageToken: jwtToken,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unexpected Error Occurred In Signup Service');
  }
};
