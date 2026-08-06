import axios, { AxiosInstance } from 'axios';

export class RevenueCatClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('RevenueCat API Key is required');
    }
    
    this.client = axios.create({
      baseURL: 'https://api.revenuecat.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}
