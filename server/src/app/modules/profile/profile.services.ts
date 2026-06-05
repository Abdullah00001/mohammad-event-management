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
  profileInterest: string[];
}

export const getProfileInformation = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<unknown> => {
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
        cover: true,
      },
    });
    if (!profile) throw new Error('Profile not found');
    const interests = await prisma.interest.findMany({
      where: {
        id: { in: profile.profileInterest },
        isDeleted: false,
      },
      select: {
        id: true,
        interestName: true,
        interestIcon: true,
      },
    });
    const upcomingEvents = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'City Sports Championship',
        thumbnail:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/eventType/613b101c-f5f9-4bd2-bb73-1a66587c36b2/1778928703959.png',
        eventType: {
          id: '6a143688-8d8f-46df-a973-a37a799566e5',
          title: 'Sports',
        },
        startDate: '2026-06-10T09:00:00.000Z',
        startTime: '09:00 AM',
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Jazz & Blues Night',
        thumbnail:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/eventType/aac94538-e2a6-46b0-824d-97968204db20/1778928774835.png',
        eventType: {
          id: 'eca31285-05b0-4f83-8737-7a54455367cd',
          title: 'Music',
        },
        startDate: '2026-06-15T18:30:00.000Z',
        startTime: '06:30 PM',
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Street Food Festival',
        thumbnail:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/eventType/23da0fe6-7eca-45f9-8139-624dfc3b98d1/1778928852407.png',
        eventType: {
          id: 'b35cda8c-6a77-4675-a479-097273c8286e',
          title: 'Food and Drinks',
        },
        startDate: '2026-06-20T12:00:00.000Z',
        startTime: '12:00 PM',
      },
    ];
    return {
      name: profile.name,
      email,
      cover: profile.cover,
      avatar: profile.avatar,
      location: profile.location,
      bio: profile.bio,
      countryVisited: profile.countryVisited,
      profileInterest: interests,
      totalEventsAttended: 0,
      totalConnections: 0,
      upcomingEvents,
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

export const uploadCover = async ({
  fileName,
  profile,
  user,
}: {
  user: User;
  profile: Profile;
  fileName: string;
}): Promise<{ cover: string }> => {
  const cover = profile.cover;
  const filePath = join(__dirname, '../../../../public/temp', fileName);
  const fileExtension = extname(filePath);
  const s3Key = `covers/${user.id}/${Date.now()}${fileExtension}`;
  try {
    if (cover) {
      const key = extractS3KeyFromUrl(cover);
      await singleDeleteToS3({ key });
    }
    const url = await singleUploadToS3({
      filePath,
      key: s3Key,
      mimeType: fileExtension,
    });
    await prisma.profile.update({
      data: { cover: url },
      where: { id: profile.id, userId: user.id },
    });
    return { cover: url };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update profile cover service');
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
    console.log(payload);
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

export const getUserPreference = async ({
  user,
}: {
  user: User;
}): Promise<UserPreference> => {
  try {
    const data = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });
    if (!data) throw new Error('User preference not found');
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in change password service');
  }
};

export const getMyBlocklist = async ({
  user,
}: {
  user: User;
}): Promise<unknown> => {
  try {
    const blocklist: {
      id: string;
      blockedUserId: string;
      blockedUser: {
        id: string;
        profile: {
          name: string | null;
          avatar: string | null;
        } | null;
      };
    }[] = await prisma.blockList.findMany({
      where: { blockerId: user.id },
      select: {
        id: true,
        blockedUserId: true,
        blockedUser: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    const dummyBlockList = [
      {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'Rafi Hossain',
        bio: 'Travel enthusiast. Love exploring new places and meeting new people.',
        avatar:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/avatars/701ff52a-9125-4a8a-a7b6-026e2b18fb26/1779100957943.png',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Nadia Islam',
        bio: 'Foodie & adventure lover. Always looking for the next great experience.',
        avatar:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/avatars/701ff52a-9125-4a8a-a7b6-026e2b18fb26/1779100957943.png',
      },
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Tanvir Ahmed',
        bio: 'Music lover and part-time photographer based in Chittagong.',
        avatar:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/avatars/701ff52a-9125-4a8a-a7b6-026e2b18fb26/1779100957943.png',
      },
      {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        name: 'Sumaiya Khanam',
        bio: 'Bookworm and coffee addict. Enjoy cultural events and art exhibitions.',
        avatar:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/avatars/701ff52a-9125-4a8a-a7b6-026e2b18fb26/1779100957943.png',
      },
      {
        id: 'a987b234-c56d-78ef-901a-bcdef2345678',
        name: 'Imran Chowdhury',
        bio: 'Sports fanatic. Football, cricket — you name it, I watch it.',
        avatar:
          'https://abdullah-sta.s3.eu-north-1.amazonaws.com/avatars/701ff52a-9125-4a8a-a7b6-026e2b18fb26/1779100957943.png',
      },
    ];
    // return blocklist.map((block) => {
    //   return {
    //     id: block.id,
    //     blockedUserId: block.blockedUserId,
    //     blockedUserName: block.blockedUser.profile?.name ?? null,
    //     blockedUserAvatar: block.blockedUser.profile?.avatar ?? null,
    //   };
    // });
    return dummyBlockList;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get blocklist service');
  }
};
