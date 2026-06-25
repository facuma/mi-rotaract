import { PaymentMethod } from '@prisma/client';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  name: string;
  recordPayment(input: {
    paymentId: string;
    method: PaymentMethod;
    paidAt: Date;
    receiptNote?: string;
    actorUserId: string;
  }): Promise<{ paymentId: string; status: string; paidAt: Date | null }>;
}
