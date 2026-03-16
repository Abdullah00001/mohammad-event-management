import { join, extname } from 'path';

import { v4 as uuidv4 } from 'uuid';

import prisma from '@/app/configs/db.configs';
import { singleUploadToS3 } from '@/app/utils/s3.utils';

export const createEventType = async ({
  title,
  fileName,
}: {
  title: string;
  fileName: string;
}): Promise<{
  id: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail: string;
  title: string;
}> => {
  const file = join(__dirname, '../../../../public/temp', fileName);
  const mimeType = extname(fileName);
  const key = `eventType/${uuidv4()}/${Date.now()}${mimeType}`;
  try {
    const url = await singleUploadToS3({ filePath: file, key, mimeType });
    const data = await prisma.eventType.create({
      data: { thumbnail: url, title },
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in create event type service');
  }
};

export const updateEventType = async ({
  title,
  fileName,
  id,
}: {
  title: string;
  fileName?: string;
  id: string;
}) => {
  try {
    let thumbnailUrl: string | undefined = undefined;

    if (fileName) {
      const file = join(__dirname, '../../../../public/temp', fileName);
      const mimeType = extname(fileName);
      const key = `eventType/${uuidv4()}/${Date.now()}${mimeType}`;
      thumbnailUrl = await singleUploadToS3({ filePath: file, key, mimeType });
    }

    const data = await prisma.eventType.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      },
    });

    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update event type service');
  }
};
