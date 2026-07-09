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
export const isoUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const SOCKET_EVENTS = {
  // ===== Chat Namespace =====
  // Client → Server
  SEND_MESSAGE_ON_EVENT_CHAT: 'chat:send_message_on_event_chat:',

  // Server → Client
  MESSAGE_RECEIVED_ON_EVENT_CHAT: 'chat:message_received_on_event_chat:',

  // ===== Notification Namespace =====
  // Client → Server

  // Server → Client

  // ===== Common =====
  ERROR: 'error',
  MESSAGE_ERROR: 'message_error',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const allowedAttachmentMimeTypes = [
  // =========================
  // Images
  // =========================
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/x-ms-bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/x-icon',
  'image/vnd.microsoft.icon',

  // =========================
  // PDF
  // =========================
  'application/pdf',

  // =========================
  // Microsoft Word
  // =========================
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // =========================
  // Microsoft Excel
  // =========================
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // =========================
  // Microsoft PowerPoint
  // =========================
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // =========================
  // Text
  // =========================
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/rtf',

  // =========================
  // JSON / XML
  // =========================
  'application/json',
  'application/xml',
  'text/xml',

  // =========================
  // Archives
  // =========================
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',

  // =========================
  // Audio
  // =========================
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',

  // =========================
  // Video
  // =========================
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/webm',
  'video/ogg',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',

  // =========================
  // Adobe
  // =========================
  'application/postscript',

  // =========================
  // OpenDocument
  // =========================
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',

  // =========================
  // Apple iWork
  // =========================
  'application/vnd.apple.pages',
  'application/vnd.apple.numbers',
  'application/vnd.apple.keynote',
] as const;

export const allowedExtensions = [
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
  '.heic',
  '.heif',
  '.avif',

  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.md',
  '.rtf',
  '.json',
  '.xml',

  // Archives
  '.zip',
  '.rar',
  '.7z',
  '.gz',
  '.tar',

  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.aac',
  '.flac',
  '.m4a',

  // Video
  '.mp4',
  '.mov',
  '.avi',
  '.wmv',
  '.mkv',
  '.webm',
  '.mpeg',
  '.3gp',

  // OpenDocument
  '.odt',
  '.ods',
  '.odp',

  // Apple iWork
  '.pages',
  '.numbers',
  '.key',
] as const;
