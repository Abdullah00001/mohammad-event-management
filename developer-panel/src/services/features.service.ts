import { api } from '@/lib/api';

export interface Feature {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plans?: { planId: string; plan: { name: string; isActive: boolean } }[];
}

export const featuresService = {
  getFeatures: async (): Promise<Feature[]> => {
    const response = await api.get('/dev/features');
    return response.data.data;
  },

  createFeature: async (data: { name: string; code: string; description?: string; isActive?: boolean }): Promise<Feature> => {
    const response = await api.post('/dev/features', data);
    return response.data.data;
  },

  updateFeature: async (id: string, data: Partial<Feature>): Promise<Feature> => {
    const response = await api.patch(`/dev/features/${id}`, data);
    return response.data.data;
  }
};
