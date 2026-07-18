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
  'http://10.10.10.27:3008',
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
  // ===== Conversation Management =====
  // Client → Server
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  CONVERSATION_CLEAR: 'conversation:clear',
  CONVERSATION_DELETE: 'conversation:delete',

  // Server → Client
  CONVERSATION_JOINED: 'conversation:joined',
  CONVERSATION_LEFT: 'conversation:left',
  CONVERSATION_CLEARED: 'conversation:cleared',
  CONVERSATION_DELETED: 'conversation:deleted',

  // ===== Messaging (Unified) =====
  // Client → Server
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',

  // Server → Client
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_CONFIRMED: 'message:confirmed',
  MESSAGE_READ_RESPONSE: 'message:read-response',

  // ===== Typing =====
  // Client → Server
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Server → Client
  TYPING_START_RESPONSE: 'typing:start-response',
  TYPING_STOP_RESPONSE: 'typing:stop-response',

  // ===== Notifications =====
  // Client → Server
  NOTIFICATION_COUNT: 'notification:count',
  NOTIFICATION_MARK_READ: 'notification:mark-read',
  NOTIFICATION_MARK_ALL_READ: 'notification:mark-all-read',

  // Server → Client
  NOTIFICATION_COUNT_RESPONSE: 'notification:count-response',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_ALL_READ: 'notification:all-read',

  // ===== Common =====
  ERROR: 'error:server',
  MESSAGE_ERROR: 'message:error',
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
