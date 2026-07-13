export enum EPushNotificationJobName {
  SEND_TO_TOKEN = 'send-to-token',
  SEND_MULTICAST = 'send-multicast',
  SEND_TO_TOPIC = 'send-to-topic',
}

export interface IPushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export interface ISendToTokenData {
  jobName: EPushNotificationJobName.SEND_TO_TOKEN;
  token: string;
  payload: IPushNotificationPayload;
  traceId?: string;
}

export interface ISendMulticastData {
  jobName: EPushNotificationJobName.SEND_MULTICAST;
  tokens: string[];
  payload: IPushNotificationPayload;
  traceId?: string;
}

export interface ISendToTopicData {
  jobName: EPushNotificationJobName.SEND_TO_TOPIC;
  topic: string;
  payload: IPushNotificationPayload;
  traceId?: string;
}

export type TPushNotificationJobData =
  | ISendToTokenData
  | ISendMulticastData
  | ISendToTopicData;
