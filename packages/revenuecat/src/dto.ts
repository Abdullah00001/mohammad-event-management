export interface NormalizedSubscriptionDTO {
  appUserId: string;
  entitlementId: string | null;
  productId: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'GRACE_PERIOD' | 'CANCELLED' | 'PAUSED';
  purchaseDate: Date | null;
  expireDate: Date | null;
  purchasePlatform: 'APPLE' | 'GOOGLE' | 'WEB';
  lastEventTimestamp: number; // For idempotency & Chronological checking
  originalAppUserId: string;
}

export interface RevenueCatSubscriberResponse {
  request_date_ms: number;
  subscriber: {
    original_app_user_id: string;
    entitlements: Record<string, {
      expires_date: string | null;
      grace_period_expires_date: string | null;
      product_identifier: string;
      purchase_date: string;
      unsubscribe_detected_at: string | null;
      billing_issue_detected_at: string | null;
      store: 'app_store' | 'play_store' | 'stripe' | 'promotional';
    }>;
  };
}
