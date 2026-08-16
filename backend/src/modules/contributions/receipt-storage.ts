import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Where generated receipt PDFs end up. `LocalReceiptStorage` writes to disk
 * for local dev; swap for an S3-backed implementation in production — see
 * specs/002-contribution-events/research.md §7 (store the rendered
 * artifact once, link to it, don't regenerate on view).
 */
export const RECEIPT_STORAGE = Symbol('RECEIPT_STORAGE');

export interface ReceiptStorage {
  /** Returns a URL the receipt can be fetched from. */
  save(filename: string, buffer: Buffer): Promise<string>;
}

@Injectable()
export class LocalReceiptStorage implements ReceiptStorage {
  private readonly logger = new Logger(LocalReceiptStorage.name);
  private readonly dir = resolve(process.env.RECEIPT_STORAGE_DIR ?? './storage/receipts');

  async save(filename: string, buffer: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, filename);
    await writeFile(filePath, buffer);
    this.logger.log(`Saved receipt to ${filePath}`);
    // Served by the static mount registered in main.ts.
    return `/receipts/${filename}`;
  }
}
