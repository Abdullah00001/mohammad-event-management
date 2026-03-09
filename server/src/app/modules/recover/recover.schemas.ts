import { z } from 'zod';

export const verifyOtpSchema = z
  .object({
    otp: z
      .string()
      .trim() // Remove accidental whitespace
      .length(6, 'OTP must be exactly 6 digits') // More precise than min(6).max(6)
      .regex(/^\d+$/, 'OTP must only contain numbers'), // Prevent letters/special chars
  })
  .strict(); // Disallow extra fields in the request object

export const resetPassword = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});
