import { User } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';
import { generate } from 'otp-generator';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { SignupResponseDTO } from '@/app/modules/user/user.dto';
import { getEmailQueue } from '@/app/queues/queues';
import {
  generateAccessTokenForAdmin,
  generateAccessTokenForUser,
  generateOtpPageToken,
  generateRefreshToken,
} from '@/app/utils/jwt.utils';
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
      await tx.userPreference.create({
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
      role: newUser.user.role,
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

export const verifySignupUserOtp = async ({
  token,
  user,
}: {
  token: string;
  user: JwtPayload;
}): Promise<{ accessToken: string }> => {
  const traceId = getTraceId();
  try {
    const updatedUser = await prisma.user.update({
      data: { isVerified: true },
      where: { id: user.sub },
    });
    const accessToken = generateAccessTokenForUser({
      sub: String(updatedUser.id),
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      accountStatus: updatedUser.accountStatus,
    });
    const redisClient = getRedisClient();
    const expirationTime = user.exp as number; // convert to seconds
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    const ttl = Math.floor(expirationTime - currentTime); // remaining time in seconds
    if (ttl > 0)
      await redisClient.set(
        `blacklist:jwt:${token}`,
        token as string,
        'EX',
        ttl
      );
    await redisClient.del(`user:${updatedUser.id}:otp`);
    await getEmailQueue().add('send-signup-success-email', {
      email: updatedUser.email,
      traceId,
    });
    return { accessToken };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in verify signup user otp service');
  }
};

export const resendSignupUserOtp = async ({
  user,
}: {
  user: JwtPayload;
}): Promise<void> => {
  const traceId = getTraceId();
  try {
    const otp = generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
    const hashedOtp = hashOtp({ otp });
    const queriedUser = await prisma.user.findUnique({
      where: { id: user.sub },
    });
    if (!queriedUser) throw new Error('User not found');
    const emailData = {
      email: queriedUser.email,
      expirationTime: otpExpireAt,
      otp,
      traceId,
    };
    const redisClient = getRedisClient();
    const ttl = calculateMilliseconds(otpExpireAt, 'minute');
    await Promise.all([
      redisClient.set(`user:${queriedUser.id}:otp`, hashedOtp, 'PX', ttl),
      getEmailQueue().add('send-signup-user-verify-otp-email', emailData),
    ]);
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in resend signup user otp service');
  }
};

export const loginService = async ({
  isAdmin,
  user,
  rememberMe,
}: {
  isAdmin: boolean;
  rememberMe: boolean;
  user: User;
}): Promise<{ accessToken: string; refreshToken?: string }> => {
  try {
    if (isAdmin) {
      const accessToken = generateAccessTokenForAdmin({
        isVerified: user.isVerified,
        role: user.role,
        sub: user.id,
        rememberMe,
        accountStatus: user.accountStatus,
      });
      const refreshToken = generateRefreshToken({
        isVerified: user.isVerified,
        role: user.role,
        sub: user.id,
        rememberMe,
        accountStatus: user.accountStatus,
      });
      return { accessToken, refreshToken };
    }
    const accessToken = generateAccessTokenForUser({
      isVerified: user.isVerified,
      role: user.role,
      sub: user.id,
      rememberMe,
      accountStatus: user.accountStatus,
    });
    return { accessToken };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in login service');
  }
};

export const adminRefreshToken = async ({
  user,
}: {
  user: JwtPayload;
}): Promise<{ jwt: string }> => {
  try {
    const accessToken = generateAccessTokenForAdmin({
      sub: String(user.sub),
      role: user.role,
      isVerified: user.isVerified,
      accountStatus: user.accountStatus,
    });
    return { jwt: accessToken };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred in admin refresh token service');
  }
};
