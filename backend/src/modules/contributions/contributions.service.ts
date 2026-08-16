import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../common/notifications/notification.service';
import { ContributionStatus, EventStatus } from '../../../generated/prisma/enums';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { ReceiptService } from './receipt.service';

export interface PayResult {
  contributionId: string;
  gatewayOrderId: string;
  amount: number;
  currency: 'INR';
  keyId: string | null;
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly receiptService: ReceiptService,
    private readonly notifications: NotificationService,
  ) {}

  /** FR-004, FR-006, FR-007 — Order + PENDING Contribution; never verifies from here. */
  async pay(eventId: string, bearerId: string, amountRupees: number): Promise<PayResult> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'Event does not exist' });

    if (event.status !== EventStatus.OPEN || new Date() > event.closeDate) {
      throw new ConflictException({ error: 'EVENT_CLOSED', message: 'This event is no longer accepting payments' });
    }

    const idempotencyKey = randomUUID();
    const amountPaise = Math.round(amountRupees * 100);
    const { orderId } = await this.paymentProvider.createOrder({ amountPaise, receiptId: idempotencyKey });

    const contribution = await this.prisma.contribution.create({
      data: {
        eventId,
        bearerId,
        amount: amountRupees,
        gatewayOrderId: orderId,
        idempotencyKey,
        status: ContributionStatus.PENDING,
      },
    });

    return {
      contributionId: contribution.id,
      gatewayOrderId: orderId,
      amount: amountRupees,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || null,
    };
  }

  /**
   * The only path that moves a Contribution to VERIFIED (Constitution
   * Principle III) — called from the signature-verified webhook (T016) and
   * the reconciliation job (T017), never directly from a client request.
   * Idempotent: a second call for an already-VERIFIED order (retried
   * webhook delivery, or a race with reconciliation) is a no-op, which is
   * what stops a retry from generating a second receipt/notification.
   */
  async markVerified(gatewayOrderId: string, gatewayPaymentId: string): Promise<void> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { gatewayOrderId },
      include: { event: true, bearer: true },
    });
    if (!contribution || contribution.status !== ContributionStatus.PENDING) return;

    const verifiedAt = new Date();
    await this.prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: ContributionStatus.VERIFIED, gatewayPaymentId, verifiedAt },
    });

    // FR-008/T018: receipt + notification, best-effort — must not un-verify
    // a genuinely captured payment if PDF generation or delivery hiccups.
    try {
      const receiptUrl = await this.receiptService.generate({
        contributionId: contribution.id,
        bearerName: contribution.bearer.fullName,
        eventTitle: contribution.event.title,
        amount: contribution.amount.toString(),
        gatewayPaymentId,
        verifiedAt,
      });
      await this.prisma.contribution.update({ where: { id: contribution.id }, data: { receiptUrl } });

      await this.notifications.notify({
        bearerId: contribution.bearerId,
        phone: contribution.bearer.phone,
        title: 'Payment received',
        body: `Your contribution of ₹${contribution.amount.toString()} to "${contribution.event.title}" is confirmed.`,
      });
    } catch {
      // Verification already committed above; receipt/notify can be retried
      // separately (a background sweep is a reasonable future addition —
      // not building it now since it's beyond what T018 asks for).
    }
  }

  async markFailed(gatewayOrderId: string, gatewayPaymentId?: string): Promise<void> {
    const contribution = await this.prisma.contribution.findUnique({ where: { gatewayOrderId } });
    if (!contribution || contribution.status !== ContributionStatus.PENDING) return;

    await this.prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: ContributionStatus.FAILED, gatewayPaymentId },
    });
  }

  async listMine(bearerId: string) {
    return this.prisma.contribution.findMany({
      where: { bearerId },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingOlderThan(cutoff: Date) {
    return this.prisma.contribution.findMany({ where: { status: ContributionStatus.PENDING, createdAt: { lt: cutoff } } });
  }
}
