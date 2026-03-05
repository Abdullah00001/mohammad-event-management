import { z } from 'zod';

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .pipe(z.email('Please provide a valid email address')),

  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const verifyOtpSchema = z
  .object({
    otp: z
      .string()
      .trim() // Remove accidental whitespace
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d+$/, 'OTP must only contain numbers'),
  })
  .strict();

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .pipe(z.email('Please provide a valid email address')),

  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  rememberMe: z
    .boolean({ message: 'Remember me field is required' })
    .default(false),
});
