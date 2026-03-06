import { extname, join } from 'path';

import { Interest } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import prisma from '@/app/configs/db.configs';
import { singleDeleteToS3, singleUploadToS3 } from '@/app/utils/s3.utils';
import { extractS3KeyFromUrl } from '@/app/utils/system.utils';

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

export const updateInterest = async ({
  interestName,
  interestFileName,
  interest,
}: {
  interestName: string;
  interestFileName?: string;
  interest: Interest;
}): Promise<Interest> => {
  try {
    if (interestFileName) {
      const filePath = join(
        __dirname,
        '../../../../public/temp',
        interestFileName
      );
      const oldKey = extractS3KeyFromUrl(interest.interestIcon);
      const mimeType = extname(filePath);
      const key = `interestIcons/${uuidv4()}/${Date.now()}${mimeType}`;
      const url = await singleUploadToS3({ filePath, key, mimeType });
      const updatedInterest = await prisma.interest.update({
        data: { interestName, interestIcon: url },
        where: { id: interest.id },
      });
      await singleDeleteToS3({ key: oldKey });
      return updatedInterest;
    }
    const updatedInterest = await prisma.interest.update({
      data: { interestName },
      where: { id: interest.id },
    });
    return updatedInterest;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update interest service');
  }
};

export const deleteOneInterest = async ({
  interest,
}: {
  interest: Interest;
}): Promise<void> => {
  try {
    const oldKey = extractS3KeyFromUrl(interest.interestIcon);
    await Promise.all([
      prisma.interest.delete({ where: { id: interest.id } }),
      singleDeleteToS3({ key: oldKey }),
    ]);
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in delete interest service');
  }
};

export const getInterest = async (): Promise<Interest[]> => {
  try {
    const data = await prisma.interest.findMany();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get interest service');
  }
};

export const searchInterest = async ({
  interestName,
}: {
  interestName: string;
}): Promise<Interest[]> => {
  try {
    const trimmed = interestName.trim();

    if (!trimmed || trimmed.length === 0) return [];

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const [exactMatches, startsWithMatches, containsMatches] =
      await Promise.all([
        prisma.interest.findMany({
          where: { interestName: { equals: trimmed, mode: 'insensitive' } },
        }),
        prisma.interest.findMany({
          where: { interestName: { startsWith: escaped, mode: 'insensitive' } },
        }),
        prisma.interest.findMany({
          where: { interestName: { contains: escaped, mode: 'insensitive' } },
        }),
      ]);
    const seen = new Set<string>();
    const results = [];

    for (const interest of [
      ...exactMatches,
      ...startsWithMatches,
      ...containsMatches,
    ]) {
      if (!seen.has(interest.id)) {
        seen.add(interest.id);
        results.push(interest);
      }
    }
    return results;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in search interest service');
  }
};
