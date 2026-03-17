import { join, extname } from 'path';

import { EventType } from '@prisma/client';
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
}): Promise<EventType> => {
  try {
    let thumbnailUrl: string | undefined = undefined;

    if (fileName) {
      const file = join(__dirname, '../../../../public/temp', fileName);
      const mimeType = extname(fileName);
      const key = `eventType/${uuidv4()}/${Date.now()}${mimeType}`;
      thumbnailUrl = await singleUploadToS3({ filePath: file, key, mimeType });
    }

    const data = await prisma.eventType.update({
      where: { id, isDeleted: false },
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

export const deleteEventType = async ({
  id,
}: {
  id: string;
}): Promise<void> => {
  try {
    await prisma.eventType.update({ data: { isDeleted: true }, where: { id } });
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in delete event type service');
  }
};

export const getEventTypes = async (): Promise<EventType[]> => {
  try {
    const data = await prisma.eventType.findMany({
      where: { isDeleted: false },
    });
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get event types service');
  }
};
