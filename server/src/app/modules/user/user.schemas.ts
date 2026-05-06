import { z } from 'zod';

export const gpsPayloadSchema = z.object({
  lng: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(-180, 'Longitude must be >= -180')
        .max(180, 'Longitude must be <= 180')
    ),

  lat: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(-90, 'Latitude must be >= -90')
        .max(90, 'Latitude must be <= 90')
    ),
});

export type TGpsPayload = z.infer<typeof gpsPayloadSchema>;

export const checkAccessTokenSchema = z.object({
  location: gpsPayloadSchema,
  fcmToken: z
    .string()
    .min(1, 'FCM Token is required')
    .regex(/^[a-zA-Z0-9\-_:]{100,250}$/, 'Invalid FCM token format'),
  platform: z.enum(['ios', 'android'], {
    message: 'Platform must be one of ios, android, or web',
  }),
});

export type TCheckAccessTokenPayload = z.infer<typeof checkAccessTokenSchema>;

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .pipe(z.email('Please provide a valid email address')),

  password: z
    .string(),
    // .min(1, 'Password is required')
    // .min(8, 'Password must be at least 8 characters long'),
    // .regex(
    //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    //   'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    // ),
  gpsPayloadSchema,
  fcmToken: z
    .string()
    .min(1, 'FCM Token is required')
    .regex(/^[a-zA-Z0-9\-_:]{100,250}$/, 'Invalid FCM token format'),
  platform: z.enum(['ios', 'android'], {
    message: 'Platform must be one of ios, android, or web',
  }),
});

export type TSignupPayload = z.infer<typeof signupSchema>;

export const verifyOtpSchema = z
  .object({
    otp: z
      .string()
      .trim() // Remove accidental whitespace
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d+$/, 'OTP must only contain numbers'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .pipe(z.email('Please provide a valid email address')),

    password: z
      .string(),
      // .min(1, 'Password is required')
      // .min(8, 'Password must be at least 8 characters long')
      // .max(128, 'Password is too long')
      // .regex(
      //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      //   'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      // ),

    rememberMe: z
      .boolean({ message: 'Remember me field is required' })
      .default(false),
    location: gpsPayloadSchema,
    fcmToken: z
      .string()
      .min(1, 'FCM Token is required')
      .regex(/^[a-zA-Z0-9\-_:]{100,250}$/, 'Invalid FCM token format'),
    platform: z.enum(['ios', 'android'], {
      message: 'Platform must be one of ios, android, or web',
    }),
  })
  .strict();

export type TLoginPayload = z.infer<typeof loginSchema>;
