import { User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { createNewTraits } from '@/app/modules/survey/survey.services';

export const createNewTraitsController = async (
  req: Request,
  res: Response
) => {
  const traceId = getTraceId();
  const user = req.user as User;
  const payload = req.body;
  const data = await createNewTraits({ payload, user });
  res.status(200).json({
    success: true,
    message: 'Traits creation successful',
    data,
    traceId,
  });
  return;
};
