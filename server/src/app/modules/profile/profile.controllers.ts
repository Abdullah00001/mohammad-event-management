import { Profile, User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  changePassword,
  changeUserPreference,
  updateProfile,
  uploadAvatar,
} from '@/app/modules/profile/profile.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const updateProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const payload = req.body;
    const data = await updateProfile({ user, payload });
    res.status(200).json({
      success: true,
      message: 'Profile update successful',
      data,
      traceId,
    });
    return;
  }
);

export const uploadAvatarController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const profile = req.profile as Profile;
    const fileName = (req.file as Express.Multer.File).filename;
    const data = await uploadAvatar({
      fileName,
      profile,
      user,
    });
    res.status(200).json({
      success: true,
      message: 'Profile avatar upload successful',
      data,
      traceId,
    });
    return;
  }
);

export const changePasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { newPassword } = req.body;
    await changePassword({ newPassword, user });
    res.status(200).json({
      success: true,
      message: 'Password change successful',
      traceId,
    });
    return;
  }
);

export const changeUserPreferenceController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user as User;
    const payload = req.body;
    const data = await changeUserPreference({
      payload,
      user,
    });
    res.status(200).json({
      success: true,
      message: 'User preference updated successfully',
      data,
      traceId,
    });
    return;
  }
);
