import { BaseDTO } from '@/app/core/dto.base';
import {
  PrismaFeature,
  PrismaPlan,
} from '@/app/modules/subscription/subscription.types';

export class SubscriptionFeatureDTO extends BaseDTO<PrismaFeature> {
  readonly id: string;
  readonly featureKey: string;
  readonly featureTitle: string;
  readonly featureDescription: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isActive: boolean;

  constructor(entity: PrismaFeature) {
    super(entity);
    this.id = entity.id;
    this.featureKey = entity.featureKey;
    this.featureTitle = entity.featureTitle;
    this.featureDescription = entity.featureDescription ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.isActive = entity.isActive;
  }
}

export class SubscriptionPlanDTO extends BaseDTO<PrismaPlan> {
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly currency: string;
  readonly intervalDays: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly features: SubscriptionFeatureDTO[];

  constructor(entity: PrismaPlan) {
    super(entity);
    this.id = entity.id;
    this.title = entity.title;
    this.price = entity.price;
    this.currency = entity.currency;
    this.intervalDays = entity.intervalDays;
    this.isActive = entity.isActive;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.features = entity.planFeatures.map((pf) =>
      SubscriptionFeatureDTO.fromEntity(pf.feature)
    );
  }
}
