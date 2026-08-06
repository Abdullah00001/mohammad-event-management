import { NormalizedSubscriptionDTO, RevenueCatSubscriberResponse } from './dto';

export class RevenueCatMapper {
  public static mapSubscriberResponse(
    response: RevenueCatSubscriberResponse,
    targetEntitlement: string = 'premium'
  ): NormalizedSubscriptionDTO {
    const subscriber = response.subscriber;
    const entitlement = subscriber.entitlements[targetEntitlement];

    // Default inactive state if entitlement doesn't exist
    if (!entitlement) {
      return {
        appUserId: subscriber.original_app_user_id,
        entitlementId: null,
        productId: null,
        status: 'EXPIRED',
        purchaseDate: null,
        expireDate: null,
        purchasePlatform: 'WEB',
        lastEventTimestamp: response.request_date_ms,
        originalAppUserId: subscriber.original_app_user_id,
      };
    }

    let status: NormalizedSubscriptionDTO['status'] = 'EXPIRED';
    
    const now = new Date();
    const expireDate = entitlement.expires_date ? new Date(entitlement.expires_date) : null;
    const graceDate = entitlement.grace_period_expires_date ? new Date(entitlement.grace_period_expires_date) : null;

    if (expireDate && expireDate > now) {
      if (entitlement.unsubscribe_detected_at) {
        status = 'CANCELLED';
      } else if (entitlement.billing_issue_detected_at) {
        // Technically this should be GRACE_PERIOD if it's within grace, but RC handles grace by extending expireDate
        status = 'ACTIVE'; 
      } else {
        status = 'ACTIVE';
      }
    } else if (graceDate && graceDate > now) {
      status = 'GRACE_PERIOD';
    } else {
      status = 'EXPIRED';
    }

    // Google pause mapping can be complex, often represented by missing active entitlements or specific paused state via webhook.
    // For simplicity, we stick to the main states based on expiration.

    let purchasePlatform: NormalizedSubscriptionDTO['purchasePlatform'] = 'WEB';
    if (entitlement.store === 'app_store') purchasePlatform = 'APPLE';
    if (entitlement.store === 'play_store') purchasePlatform = 'GOOGLE';

    return {
      appUserId: subscriber.original_app_user_id, // We assume the user fetching is the appUserId they authenticated with
      entitlementId: targetEntitlement,
      productId: entitlement.product_identifier,
      status,
      purchaseDate: new Date(entitlement.purchase_date),
      expireDate,
      purchasePlatform,
      lastEventTimestamp: response.request_date_ms,
      originalAppUserId: subscriber.original_app_user_id,
    };
  }
}
