import { Profile, User } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { TProfileUpdatePayload } from '@/app/modules/profile/profile.schemas';

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
