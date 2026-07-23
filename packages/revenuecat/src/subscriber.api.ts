import { RevenueCatClient } from './client';
import { RevenueCatSubscriberResponse, NormalizedSubscriptionDTO } from './dto';
import { RevenueCatMapper } from './mapper';

export class RevenueCatSubscriberApi {
  private client: RevenueCatClient;
  private entitlementId: string;

  constructor(apiKey: string, entitlementId: string = 'premium') {
    this.client = new RevenueCatClient(apiKey);
    this.entitlementId = entitlementId;
  }

  public async getNormalizedSubscriber(appUserId: string): Promise<NormalizedSubscriptionDTO> {
    try {
      const response = await this.client.getClient().get<RevenueCatSubscriberResponse>(`/subscribers/${appUserId}`);
      // Ensure we pass the original appUserId to the mapper because sometimes RC returns aliases
      // but we always want to map it against our known requesting ID just in case.
      // RevenueCat's response object structure handles aliases under the hood, returning the canonical `original_app_user_id`.
      
      const normalizedDto = RevenueCatMapper.mapSubscriberResponse(response.data, this.entitlementId);
      
      // Override appUserId with the requested ID if needed, but usually the canonical original is best.
      // We will stick to the canonical original from RC.
      return normalizedDto;
    } catch (error: any) {
      // Normalize error
      if (error.response) {
        throw new Error(`RevenueCat API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`RevenueCat Network/Parsing Error: ${error.message}`);
    }
  }
}
