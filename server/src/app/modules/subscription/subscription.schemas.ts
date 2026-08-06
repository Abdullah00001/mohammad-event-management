import { z } from 'zod';

export const CreateFeatureSchema = z.object({
  code: z.string().min(1, 'Feature code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type TCreateFeature = z.infer<typeof CreateFeatureSchema>;

export const UpdateFeatureSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type TUpdateFeature = z.infer<typeof UpdateFeatureSchema>;

export const CreateSubscriptionPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  marketingDescription: z.string().optional(),
  badge: z.string().optional(),
  displayOrder: z.number().optional(),
  isPopular: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  revenueCatProductId: z.string().min(1, 'RevenueCat Product ID is required'),
  entitlementId: z.string().min(1, 'Entitlement ID is required'),
  featureIds: z.array(z.string().uuid()).optional(),
});
export type TCreateSubscriptionPlan = z.infer<
  typeof CreateSubscriptionPlanSchema
>;

export const UpdateSubscriptionPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  marketingDescription: z.string().optional(),
  badge: z.string().optional(),
  displayOrder: z.number().optional(),
  isPopular: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  revenueCatProductId: z.string().min(1).optional(),
  entitlementId: z.string().min(1).optional(),
  featureIds: z.array(z.string().uuid()).optional(),
});
export type TUpdateSubscriptionPlan = z.infer<
  typeof UpdateSubscriptionPlanSchema
>;

export const RevenueCatWebhookSchema = z.object({
  event: z
    .object({
      id: z.string().min(1),
      type: z.string().min(1),
      app_user_id: z.string().min(1),
    })
    .passthrough(),
});
export type TRevenueCatWebhook = z.infer<typeof RevenueCatWebhookSchema>;
