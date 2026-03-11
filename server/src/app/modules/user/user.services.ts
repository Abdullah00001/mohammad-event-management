import { AccountStatus, User } from '@prisma/client';
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
import { baseUrl, otpExpireAt } from '@/const';

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

export const retrieveUserList = async ({
  page,
  limit,
  sortBy,
  user,
  path,
}: {
  page: string;
  limit: string;
  sortBy: string;
  user: JwtPayload;
  path: string;
}): Promise<object> => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const order = sortBy === '1' ? 'asc' : 'desc';
    const url = `${baseUrl.v1}${path}`;
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: { id: { not: user.sub } },
        skip,
        take: limitNum,
        orderBy: { createdAt: order },
        select: {
          id: true,
          email: true,
          accountStatus: true,
          createdAt: true,
          profile: {
            select: {
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: { id: { not: user.sub } },
      }),
    ]);
    const totalPages = Math.ceil(totalCount / limitNum);
    const from = skip + 1;
    const to = Math.min(skip + limitNum, totalCount);
    const showing = `Showing ${from} to ${to} of ${totalCount} results`;
    const data = users.map((u) => ({
      id: u.id,
      name: u.profile?.name ?? null,
      email: u.email,
      avatar: u.profile?.avatar ?? null,
      createdAt: u.createdAt,
      accountStatus: u.accountStatus,
    }));
    const links = (targetPage: number): string => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limitNum));
      if (sortBy) params.set('sortBy', sortBy);
      return `${url}?${params.toString()}`;
    };

    const currentLink = (): string => {
      const params = new URLSearchParams();
      if (page) params.set('page', page);
      if (limit) params.set('limit', limit);
      if (sortBy) params.set('sortBy', sortBy);
      const query = params.toString();
      return query ? `${url}?${query}` : url;
    };

    return {
      data,
      links: {
        firstPage: links(1),
        lastPage: links(totalPages),
        currentPage: currentLink(),
        nextPage: pageNum < totalPages ? links(pageNum + 1) : null,
        previousPage: pageNum > 1 ? links(pageNum - 1) : null,
      },
      meta: {
        totalCount,
        totalPages,
        limit: limitNum,
        showing,
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in retrieve users service');
  }
};

export const retrieveSingleUser = async (
  id: string
): Promise<object | null> => {
  try {
    const data = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            name: true,
            avatar: true,
            location: true,
          },
        },
      },
    });

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.profile?.name ?? null,
      avatar: data.profile?.avatar ?? null,
      location: data.profile?.location ?? null,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in retrieve users service');
  }
};

export const changeUserAccountStatusService = async ({
  id,
  accountStatus,
}: {
  id: string;
  accountStatus: AccountStatus;
}): Promise<object | null> => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) return null;

    const data = await prisma.user.update({
      where: { id },
      data: { accountStatus },
      select: {
        id: true,
        email: true,
        accountStatus: true,
      },
    });

    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in change user account status service'
    );
  }
};
