import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptService } from '../../src/modules/contributions/receipt.service';
import { LocalReceiptStorage } from '../../src/modules/contributions/receipt-storage';

describe('ReceiptService (integration)', () => {
  const testDir = join(tmpdir(), `vanigarani-receipts-test-${Date.now()}`);
  const originalDir = process.env.RECEIPT_STORAGE_DIR;

  beforeAll(() => {
    process.env.RECEIPT_STORAGE_DIR = testDir;
  });
  afterAll(() => {
    process.env.RECEIPT_STORAGE_DIR = originalDir;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('renders a real PDF and saves it via the configured storage', async () => {
    const service = new ReceiptService(new LocalReceiptStorage());

    const url = await service.generate({
      contributionId: 'contrib-test-1',
      bearerName: 'Test Bearer',
      eventTitle: 'Test Fundraiser',
      amount: '1500.00',
      gatewayPaymentId: 'pay_test123',
      verifiedAt: new Date('2026-08-14T00:00:00Z'),
    });

    expect(url).toBe('/receipts/contrib-test-1.pdf');

    const filePath = join(testDir, 'contrib-test-1.pdf');
    expect(existsSync(filePath)).toBe(true);

    const bytes = readFileSync(filePath);
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });
});
