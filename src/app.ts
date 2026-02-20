import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  Application,
  Request,
  Response,
  json,
  urlencoded,
} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import corsConfiguration from '@/app/configs/cors.configs';
import {
  morganMessageFormat,
  streamConfig,
} from '@/app/configs/morgan.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { traceMiddleware } from '@/app/middlewares/trace.middlewares';
import v1Routes from '@/app/routes/v1/index';
import { baseUrl } from '@/const';

const app: Application = express();

app.use(traceMiddleware);
app.use(json());
app.use(urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(cors(corsConfiguration));
app.use(
  morgan(morganMessageFormat, {
    stream: {
      write: (message: string) => streamConfig(message),
    },
  })
);
app.use(helmet());

app.get('/health', (_req: Request, res: Response) => {
  const traceId = getTraceId();
  res
    .status(200)
    .json({
      status: 200,
      success: true,
      message: 'Server Is Running',
      traceId,
    });
  return;
});

/* ====================================|
|--------------APP ROUTES--------------|
|==================================== */

// V1 ROUTES
app.use(baseUrl.v1, v1Routes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

export default app;
