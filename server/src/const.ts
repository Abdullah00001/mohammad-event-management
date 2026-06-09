export const corsWhiteList = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007',
  'http://localhost:3008',
  'http://10.10.10.26:3008',
  'http://10.10.10.26:3000',
];
export const saltRound = 10;
export const emailRegex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
export const baseUrl = {
  v1: '/api/v1',
};
export const otpPageTokenExpireIn = '1d';
export const userLocationCacheExpireIn = '1d';
export const userAccessTokenExpiresIn = '30d';
export const adminAccessTokenExpiresIn = '15m';
export const refreshTokenExpiresInWithOutRememberMe = '3d';
export const refreshTokenExpiresInWithRememberMe = '30d';
export const otpExpireAt = 4;
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_RADIUS_KM = 5;
export const EARTH_RADIUS_KM = 6371;
export const SUBSCRIPTION_FEATURE_CACHE_EXPIRY = '1d';
