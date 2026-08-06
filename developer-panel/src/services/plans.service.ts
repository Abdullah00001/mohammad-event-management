import { api } from '@/lib/api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  revenueCatProductId: string;
  revenueCatEntitlementId: string;
  displayOrder: number;
  isPopular: boolean;
  isActive: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  features?: { featureId: string; feature: { name: string; code: string } }[];
}

export const plansService = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get('/dev/plans');
    return response.data.data;
  },

  getPlanById: async (id: string): Promise<SubscriptionPlan> => {
    const response = await api.get(`/dev/plans/${id}`);
    return response.data.data;
  },

  createPlan: async (data: any): Promise<SubscriptionPlan> => {
    const response = await api.post('/dev/plans', data);
    return response.data.data;
  },

  updatePlan: async (id: string, data: any): Promise<SubscriptionPlan> => {
    const response = await api.patch(`/dev/plans/${id}`, data);
    return response.data.data;
  }
};
