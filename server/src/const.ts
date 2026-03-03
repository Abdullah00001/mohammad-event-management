export const corsWhiteList = ['http://localhost:5173', 'http://localhost:3000'];
export const saltRound = 10;
export const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
export const baseUrl = {
  v1: '/api/v1',
};
export const userAccessTokenExpiresIn = '3d';
export const adminAccessTokenExpiresIn = '15m';
export const refreshTokenExpiresInWithOutRememberMe = '3d';
export const refreshTokenExpiresInWithRememberMe = '30d';
export const otpExpireAt = 4;
