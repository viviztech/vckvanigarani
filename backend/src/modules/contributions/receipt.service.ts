import { Inject, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { RECEIPT_STORAGE, ReceiptStorage } from './receipt-storage';

export interface ReceiptInput {
  contributionId: string;
  bearerName: string;
  eventTitle: string;
  amount: string; // formatted, e.g. "1500.00"
  gatewayPaymentId: string;
  verifiedAt: Date;
}

@Injectable()
export class ReceiptService {
  constructor(@Inject(RECEIPT_STORAGE) private readonly storage: ReceiptStorage) {}

  async generate(input: ReceiptInput): Promise<string> {
    const buffer = await this.renderPdf(input);
    return this.storage.save(`${input.contributionId}.pdf`, buffer);
  }

  private renderPdf(input: ReceiptInput): Promise<Buffer> {
    return new Promise((resolvePromise, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Vanigar Ani — Contribution Receipt', { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(11);
      const row = (label: string, value: string) => {
        doc.font('Helvetica-Bold').text(label, { continued: true });
        doc.font('Helvetica').text(`  ${value}`);
        doc.moveDown(0.4);
      };

      row('Receipt for:', input.bearerName);
      row('Event:', input.eventTitle);
      row('Amount:', `₹ ${input.amount}`);
      row('Payment reference:', input.gatewayPaymentId);
      row('Verified at:', input.verifiedAt.toISOString());
      row('Contribution ID:', input.contributionId);

      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('gray')
        .text('This receipt confirms a verified contribution recorded by the Vanigar Ani Bearer Platform.', {
          align: 'center',
        });

      doc.end();
    });
  }
}
