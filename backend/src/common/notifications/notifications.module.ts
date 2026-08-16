import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PUSH_PROVIDER, MockPushProvider } from './push-provider';
import { MESSAGE_PROVIDER, MockMessageProvider } from './message-provider';

@Global()
@Module({
  providers: [
    NotificationService,
    { provide: PUSH_PROVIDER, useClass: MockPushProvider },
    { provide: MESSAGE_PROVIDER, useClass: MockMessageProvider },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
