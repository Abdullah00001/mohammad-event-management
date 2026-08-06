import { singleDeleteToS3, singleUploadToS3 } from '@/app/utils/s3.utils';
import { v4 as uuidv4 } from 'uuid';

export const uploadAttachmentToS3Service = async (
  files: Express.Multer.File[]
) => {
  try {
    const uploadPromises = files.map(async (file) => {
      // Generate a unique S3 key
      const extension = file.originalname.split('.').pop();
      const key = `attachments/${uuidv4()}-${Date.now()}.${extension}`;

      const url = await singleUploadToS3({ filePath: file.path, key, mimeType: file.mimetype });
      
      return {
        originalName: file.originalname,
        url,
        key: key
      };
    });

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in upload attachment service');
  }
};

export const deleteAttachmentFromS3Service = async (key: string) => {
  try {
    await singleDeleteToS3({ key });
    return { message: 'Attachment deleted successfully' };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in delete attachment service');
  }
};