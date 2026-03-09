import { User } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';
import { generate } from 'otp-generator';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { getEmailQueue } from '@/app/queues/queues';
import { generateOtpPageToken } from '@/app/utils/jwt.utils';
import { hashOtp } from '@/app/utils/otp.utils';
import { hashPassword } from '@/app/utils/password.utils';
import { calculateMilliseconds } from '@/app/utils/system.utils';
import { otpExpireAt } from '@/const';

export const findRecoverUSer = async ({
  user,
  traceId,
}: {
  user: User;
  traceId: string;
}): Promise<{ jwt: string }> => {
  try {
    const otp = generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
    const hashedOtp = hashOtp({ otp });
    const jwtToken = generateOtpPageToken({
      sub: String(user.id),
      role: user.role,
      isVerified: user.isVerified,
      accountStatus: user.accountStatus,
    });
    const emailData = {
      email: user.email,
      otp,
      traceId,
    };
    const redisClient = getRedisClient();
    const ttl = calculateMilliseconds(otpExpireAt, 'minute');
    await Promise.all([
      redisClient.set(`user:${user.id}:otp`, hashedOtp, 'PX', ttl),
      getEmailQueue().add('send-find-recover-user-email-otp', emailData),
    ]);
    return { jwt: jwtToken };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in find recover user service');
  }
};

export const verifyRecoverUserOtp = async ({
  user,
}: {
  user: JwtPayload;
}): Promise<void> => {
  try {
    const redisClient = getRedisClient();
    await redisClient.del(`user:${user.sub}:otp`);
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in verify recover user otp service'
    );
  }
};

export const resetRecoverUserPassword = async ({
  jwt,
  password,
  user,
  traceId,
}: {
  user: JwtPayload;
  jwt: string;
  password: string;
  traceId: string;
}): Promise<void> => {
  try {
    const hashPass = await hashPassword(password);
    const updatedUser = await prisma.user.update({
      data: { password: hashPass },
      where: { id: user.sub },
    });
    const redisClient = getRedisClient();
    const expirationTime = user.exp as number;
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    const ttl = Math.floor(expirationTime - currentTime); // remaining time in seconds
    if (ttl > 0) await redisClient.set(`blacklist:jwt:${jwt}`, jwt, 'EX', ttl);
    await getEmailQueue().add('send-reset-successful-recover-user-email', {
      email: updatedUser.email,
      traceId,
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in reset recover user password service'
    );
  }
};

export const resendRecoverUserOtp = async ({
  user,
  traceId,
}: {
  user: JwtPayload;
  traceId: string;
}): Promise<void> => {
  try {
    const otp = generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
    // hash plain otp and password
    const hashedOtp = hashOtp({ otp });
    const foundedUser = await prisma.user.findUnique({
      where: { id: user.sub },
    });
    if (!foundedUser) throw new Error('User not found');
    const emailData = {
      email: foundedUser?.email,
      otp,
      traceId,
    };
    const redisClient = getRedisClient();
    const ttl = calculateMilliseconds(otpExpireAt, 'minute');
    await redisClient.del(`user:${foundedUser?.id}:otp`);
    await Promise.all([
      redisClient.set(`user:${foundedUser?.id}:otp`, hashedOtp, 'PX', ttl),
      getEmailQueue().add('send-find-recover-user-email-otp', emailData),
    ]);
    return;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Unknown error occurred in resend recover user otp service'
    );
  }
};
