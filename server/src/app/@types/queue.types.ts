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

export enum ESubscriptionWebhookJobName {
  REVENUECAT_WEBHOOK = 'revenuecat-webhook',
}

export interface IRevenueCatWebhookPayload {
  api_version: string;
  event: {
    aliases: string[];
    app_id: string;
    app_user_id: string;
    commission_percentage: number;
    currency: string;
    entitlement_id: string;
    entitlement_ids: string[];
    environment: string;
    event_timestamp_ms: number;
    expiration_at_ms: number;
    id: string;
    is_family_share: boolean;
    offer_code: string | null;
    original_app_user_id: string;
    original_transaction_id: string;
    period_type: string;
    price: number;
    price_in_purchased_currency: number;
    product_id: string;
    purchased_at_ms: number;
    store: string;
    subscriber_attributes: Record<string, any>;
    takehome_percentage: number;
    tax_percentage: number;
    transaction_id: string;
    type: string;
  };
}

export type TSubscriptionWebhookJobData = IRevenueCatWebhookPayload;
