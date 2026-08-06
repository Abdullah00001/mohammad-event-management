import {
  AboutUs,
  ContactAndSupport,
  PrivacyPolicy,
  SubscriptionAndRefundPolicy,
  TermsAndCondition,
} from '@prisma/client';

import prisma from '@/app/configs/db.configs';

// ── GET SERVICES ──

export const getPrivacyPolicyService = async (): Promise<PrivacyPolicy | null> => {
  try {
    const data = await prisma.privacyPolicy.findFirst();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getPrivacyPolicyService');
  }
};

export const getTermsAndConditionService = async (): Promise<TermsAndCondition | null> => {
  try {
    const data = await prisma.termsAndCondition.findFirst();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getTermsAndConditionService');
  }
};

export const getAboutUsService = async (): Promise<AboutUs | null> => {
  try {
    const data = await prisma.aboutUs.findFirst();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getAboutUsService');
  }
};

export const getSubscriptionAndRefundPolicyService = async (): Promise<SubscriptionAndRefundPolicy | null> => {
  try {
    const data = await prisma.subscriptionAndRefundPolicy.findFirst();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getSubscriptionAndRefundPolicyService');
  }
};

export const getContactAndSupportService = async (): Promise<ContactAndSupport | null> => {
  try {
    const data = await prisma.contactAndSupport.findFirst();
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getContactAndSupportService');
  }
};

// ── PATCH SERVICES ──

export const updatePrivacyPolicyService = async (content: string): Promise<PrivacyPolicy> => {
  try {
    const existing = await prisma.privacyPolicy.findFirst();
    if (!existing) {
      return await prisma.privacyPolicy.create({ data: { content } });
    }
    return await prisma.privacyPolicy.update({
      where: { id: existing.id },
      data: { content },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in updatePrivacyPolicyService');
  }
};

export const updateTermsAndConditionService = async (content: string): Promise<TermsAndCondition> => {
  try {
    const existing = await prisma.termsAndCondition.findFirst();
    if (!existing) {
      return await prisma.termsAndCondition.create({ data: { content } });
    }
    return await prisma.termsAndCondition.update({
      where: { id: existing.id },
      data: { content },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in updateTermsAndConditionService');
  }
};

export const updateAboutUsService = async (content: string): Promise<AboutUs> => {
  try {
    const existing = await prisma.aboutUs.findFirst();
    if (!existing) {
      return await prisma.aboutUs.create({ data: { content } });
    }
    return await prisma.aboutUs.update({
      where: { id: existing.id },
      data: { content },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in updateAboutUsService');
  }
};

export const updateSubscriptionAndRefundPolicyService = async (content: string): Promise<SubscriptionAndRefundPolicy> => {
  try {
    const existing = await prisma.subscriptionAndRefundPolicy.findFirst();
    if (!existing) {
      return await prisma.subscriptionAndRefundPolicy.create({ data: { content } });
    }
    return await prisma.subscriptionAndRefundPolicy.update({
      where: { id: existing.id },
      data: { content },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in updateSubscriptionAndRefundPolicyService');
  }
};

export const updateContactAndSupportService = async (content: string): Promise<ContactAndSupport> => {
  try {
    const existing = await prisma.contactAndSupport.findFirst();
    if (!existing) {
      return await prisma.contactAndSupport.create({ data: { content } });
    }
    return await prisma.contactAndSupport.update({
      where: { id: existing.id },
      data: { content },
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in updateContactAndSupportService');
  }
};