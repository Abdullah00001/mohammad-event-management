import { extname, join } from 'path';

import { Interest } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import prisma from '@/app/configs/db.configs';
import { singleUploadToS3 } from '@/app/utils/s3.utils';

export const createInterest = async ({
  interestName,
  interestFileName,
}: {
  interestName: string;
  interestFileName: string;
}): Promise<Interest> => {
  const filePath = join(__dirname, '../../../../public/temp', interestFileName);
  const mimeType = extname(filePath);
  const key = `interestIcons/${uuidv4()}/${Date.now()}${mimeType}`;
  try {
    const url = await singleUploadToS3({ filePath, key, mimeType });
    const newInterest = await prisma.interest.create({
      data: { interestName, interestIcon: url },
    });
    return newInterest;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in create interest service');
  }
};
