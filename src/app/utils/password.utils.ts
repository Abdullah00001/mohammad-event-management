import { hash, compare } from 'bcrypt';

import logger from '@/app/configs/logger.configs';
import { saltRound } from '@/const';

/**
 * Hash a plain password using bcrypt
 */
export async function hashPassword(
  passwordString: string
): Promise<string | null> {
  try {
    return await hash(passwordString, saltRound);
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(`Error Occurred In Hash Password Utils: ${error.message}`);
    } else {
      logger.warn('Unexpected Error Occurred In Hash Password Utils');
    }
    return null;
  }
}

/**
 * Compare plain password with hashed password
 */
export async function comparePassword(
  requestedPassword: string,
  hashPassword: string
): Promise<boolean> {
  try {
    return await compare(requestedPassword, hashPassword);
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(`Error Occurred In Compare Password Utils: ${error.message}`);
      throw error;
    } else {
      logger.warn('Unexpected Error Occurred In Compare Password Utils');
      throw new Error('Unexpected Error Occurred In Compare Password Utils');
    }
  }
}
