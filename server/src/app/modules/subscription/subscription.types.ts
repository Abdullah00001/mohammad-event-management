export type PrismaFeature = {
  id: string;
  featureKey: string;
  featureTitle: string;
  featureDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
};

export type PrismaPlan = {
  id: string;
  title: string;
  price: number;
  currency: string;
  intervalDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  planFeatures: { feature: PrismaFeature }[];
};
