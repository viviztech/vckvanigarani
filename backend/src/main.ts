import { resolve } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true exposes request.rawBody, needed to verify the Razorpay
  // webhook's HMAC signature against the exact bytes Razorpay sent — the
  // JSON-parsed body isn't guaranteed byte-identical (see webhook-signature.guard.ts).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // Serves whatever LocalReceiptStorage wrote — swap for S3 in production
  // instead of this static mount (research.md §7).
  app.useStaticAssets(resolve(process.env.RECEIPT_STORAGE_DIR ?? './storage/receipts'), {
    prefix: '/receipts',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
