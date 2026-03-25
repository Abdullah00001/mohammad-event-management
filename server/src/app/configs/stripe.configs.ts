import Stripe from 'stripe';

import { env } from '@/env';

class StripeService {
  private stripeClient(): Stripe {
    return new Stripe(env.STRIPE_API_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }

  private handleError(error: unknown, message: string): never {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe Error:', error.message);
      throw new Error(`Stripe Error: ${message} - ${error.message}`);
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
      throw new Error(`${message} - ${error.message}`);
    } else {
      throw new Error(`${message} - An unknown error occurred.`);
    }
  }

  public async retrieve(session_id: string) {
    try {
      return await this.stripeClient().checkout.sessions.retrieve(session_id);
    } catch (error) {
      this.handleError(error, 'Error retrieving session');
    }
  }

  public async getPaymentStatus(session_id: string) {
    try {
      return (await this.stripeClient().checkout.sessions.retrieve(session_id))
        .status;
    } catch (error) {
      this.handleError(error, 'Error retrieving payment status');
    }
  }

  public async createProductAndPrice(
    planId: string,
    title: string,
    price: number,
    currency: string,
    intervalDays: number
  ) {
    try {
      const product = await this.stripeClient().products.create({
        name: title,
        metadata: { internalPlanId: planId },
      });
      const stripePrice = await this.stripeClient().prices.create({
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: currency.toLowerCase(),
        recurring: { interval: 'day', interval_count: intervalDays },
      });
      return { stripeProductId: product.id, stripePriceId: stripePrice.id };
    } catch (error) {
      this.handleError(error, 'Error creating Stripe product and price');
    }
  }

  public async updateProduct(stripeProductId: string, title: string) {
    try {
      return await this.stripeClient().products.update(stripeProductId, {
        name: title,
      });
    } catch (error) {
      this.handleError(error, 'Error updating Stripe product');
    }
  }

  // Stripe prices are immutable — archive old, create new
  public async rotatePriceOnPlan(
    stripeProductId: string,
    oldStripePriceId: string,
    price: number,
    currency: string,
    intervalDays: number
  ) {
    try {
      await this.stripeClient().prices.update(oldStripePriceId, {
        active: false,
      });
      const newPrice = await this.stripeClient().prices.create({
        product: stripeProductId,
        unit_amount: Math.round(price * 100),
        currency: currency.toLowerCase(),
        recurring: { interval: 'day', interval_count: intervalDays },
      });
      return { stripePriceId: newPrice.id };
    } catch (error) {
      this.handleError(error, 'Error rotating Stripe price');
    }
  }

  public async archiveProduct(stripeProductId: string) {
    try {
      return await this.stripeClient().products.update(stripeProductId, {
        active: false,
      });
    } catch (error) {
      this.handleError(error, 'Error archiving Stripe product');
    }
  }


  public async createCustomer(
    email: string,
    name?: string,
    internalUserId?: string
  ) {
    try {
      return await this.stripeClient().customers.create({
        email,
        name,
        metadata: { internalUserId: internalUserId ?? '' },
      });
    } catch (error) {
      this.handleError(error, 'Error creating Stripe customer');
    }
  }
  

  public getStripe() {
    return this.stripeClient();
  }
}

export default new StripeService();
