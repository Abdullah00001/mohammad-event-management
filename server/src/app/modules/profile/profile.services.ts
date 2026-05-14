import { extname, join } from 'path';

import { Profile, Role, User, UserPreference } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import {
  TProfileUpdatePayload,
  TUserPreference,
} from '@/app/modules/profile/profile.schemas';
import { hashPassword } from '@/app/utils/password.utils';
import { singleDeleteToS3, singleUploadToS3 } from '@/app/utils/s3.utils';
import { extractS3KeyFromUrl } from '@/app/utils/system.utils';

export interface ProfileInformation {
  cover: string | null;
  avatar: string | null;
  name: string | null;
  location: string | null;
  bio: string | null;
  countryVisited: string[];
  counrtyVisited: string[];
  profileInterest: string[];
}

export const getProfileInformation = async ({
  userId,
}: {
  userId: string;
}): Promise<ProfileInformation> => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        avatar: true,
        name: true,
        location: true,
        bio: true,
        countryVisited: true,
        profileInterest: true,
      },
    });

    if (!profile) throw new Error('Profile not found');

    return {
      cover: null,
      avatar: profile.avatar,
      name: profile.name,
      location: profile.location,
      bio: profile.bio,
      countryVisited: profile.countryVisited,
      counrtyVisited: profile.countryVisited,
      profileInterest: profile.profileInterest,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get profile service');
  }
};

export const updateProfile = async ({
  user,
  payload,
}: {
  user: User;
  payload: TProfileUpdatePayload;
}): Promise<Profile> => {
  try {
    const {
      age,
      bio,
      isProfileSetup,
      gender,
      location,
      name,
      profileInterest,
    } = payload;
    const data = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isProfileSetup },
      });
      return await tx.profile.update({
        data: { age, bio, gender, location, name, profileInterest },
        where: { userId: user.id },
      });
    });
    await prisma.profile.update({
      data: { age, bio, gender, location, name, profileInterest },
      where: { userId: user.id },
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update profile service');
  }
};

export const uploadAvatar = async ({
  fileName,
  profile,
  user,
}: {
  user: User;
  profile: Profile;
  fileName: string;
}): Promise<{ avatar: string }> => {
  const avatar = profile.avatar;
  const filePath = join(__dirname, '../../../../public/temp', fileName);
  const fileExtension = extname(filePath);
  const s3Key = `avatars/${user.id}/${Date.now()}${fileExtension}`;
  try {
    if (avatar) {
      const key = extractS3KeyFromUrl(avatar);
      await singleDeleteToS3({ key });
    }
    const url = await singleUploadToS3({
      filePath,
      key: s3Key,
      mimeType: fileExtension,
    });
    await prisma.profile.update({
      data: { avatar: url },
      where: { id: profile.id, userId: user.id },
    });
    return { avatar: url };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update profile avatar service');
  }
};

export const changePassword = async ({
  newPassword,
  user,
}: {
  newPassword: string;
  user: User;
}): Promise<void> => {
  try {
    const hashPass = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashPass },
    });
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in chnage password service');
  }
};

export const changeUserPreference = async ({
  payload,
  user,
}: {
  payload: TUserPreference;
  user: User;
}): Promise<UserPreference> => {
  try {
    const data = await prisma.userPreference.update({
      where: { userId: user.id },
      data: payload,
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in change password service');
  }
};

export const getAdminProfileInformation = async ({
  userId,
}: {
  userId: string;
}): Promise<{
  id: string;
  name: string | null;
  email: string;
  role: Role;
  avatar: string | null;
}> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name ?? null,
      avatar: user.profile?.avatar ?? null,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in change password service');
  }
};
