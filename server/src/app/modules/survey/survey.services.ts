import { User, UserTraits } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { TProfileTraitsInput } from '@/app/modules/survey/survey.schemas';

export const createNewTraits = async ({
  payload,
  user,
}: {
  payload: TProfileTraitsInput;
  user: User;
}): Promise<UserTraits> => {
  try {
    const data = await prisma.userTraits.create({
      data: { ...payload, userId: user.id },
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in create new traits service');
  }
};
