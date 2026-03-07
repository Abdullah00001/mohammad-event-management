import { Profile, User } from '@prisma/client';

import { TProfileUpdatePayload } from '@/app/modules/profile/profile.schemas';

import prisma from '../../configs/db.configs';

export const updateProfile = async ({
  user,
  payload,
}: {
  user: User;
  payload: TProfileUpdatePayload;
}): Promise<Profile> => {
  try {
    const data = await prisma.profile.update({
      data: payload,
      where: { userId: user.id },
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update profile service');
  }
};
