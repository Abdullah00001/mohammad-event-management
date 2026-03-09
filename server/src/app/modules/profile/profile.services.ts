import { extname, join } from 'path';

import { Profile, User } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { TProfileUpdatePayload } from '@/app/modules/profile/profile.schemas';
import { singleDeleteToS3, singleUploadToS3 } from '@/app/utils/s3.utils';
import { extractS3KeyFromUrl } from '@/app/utils/system.utils';

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
