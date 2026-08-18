import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';

/**
 * Vendor-agnostic payment gateway access — same pattern as EmailProvider/
 * PushProvider. Order creation is the only part that needs a live account;
 * webhook signature verification (webhook-signature.guard.ts) is real,
 * vendor-generic HMAC code and doesn't go through this interface at all.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreateOrderInput {
  amountPaise: number;
  receiptId: string;
}

export interface CreateOrderResult {
  orderId: string;
}

export interface OrderPayment {
  paymentId: string;
  status: 'captured' | 'failed' | 'pending';
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  /** Used by the reconciliation job (T017) to check on an Order the webhook never confirmed. */
  fetchOrderPayments(orderId: string): Promise<OrderPayment[]>;
}

/**
 * Dev/test default: fabricates an order id, no network call. Real payment
 * verification still works against this — pair it with a self-signed
 * webhook fixture (see specs/002-contribution-events/quickstart.md and the
 * mandatory reconciliation test, T029) to exercise the full flow without a
 * live Razorpay account. Selected via PAYMENT_PROVIDER=mock in .env.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const orderId = `order_mock_${randomUUID()}`;
    this.logger.log(`[mock payment] created order ${orderId} for ${input.amountPaise} paise (receipt ${input.receiptId})`);
    return { orderId };
  }

  async fetchOrderPayments(): Promise<OrderPayment[]> {
    // No real gateway to ask — the mock flow is verified by posting a
    // self-signed payload straight to /webhooks/razorpay instead.
    return [];
  }
}

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  private readonly client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
  });

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await this.client.orders.create({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receiptId,
    });
    return { orderId: order.id };
  }

  async fetchOrderPayments(orderId: string): Promise<OrderPayment[]> {
    const { items } = await this.client.orders.fetchPayments(orderId);
    return items.map((p) => ({
      paymentId: p.id,
      status: p.status === 'captured' ? 'captured' : p.status === 'failed' ? 'failed' : 'pending',
    }));
  }
}
