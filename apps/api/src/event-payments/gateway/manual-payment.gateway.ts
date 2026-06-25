import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGateway } from './payment-gateway.interface';

@Injectable()
export class ManualPaymentGateway implements PaymentGateway {
  readonly name = 'manual';

  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(input: {
    paymentId: string;
    method: PaymentMethod;
    paidAt: Date;
    receiptNote?: string;
    actorUserId: string;
  }) {
    const updated = await this.prisma.eventPayment.update({
      where: { id: input.paymentId },
      data: {
        status: PaymentStatus.PAID,
        method: input.method,
        paidAt: input.paidAt,
        receiptNote: input.receiptNote ?? null,
        receivedById: input.actorUserId,
      },
    });
    return { paymentId: updated.id, status: updated.status, paidAt: updated.paidAt };
  }
}
