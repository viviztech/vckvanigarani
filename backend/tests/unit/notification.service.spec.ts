import { NotificationService } from '../../src/common/notifications/notification.service';
import type { PushProvider } from '../../src/common/notifications/push-provider';
import type { MessageProvider } from '../../src/common/notifications/message-provider';

describe('NotificationService', () => {
  it('sends both push and message for a notify call', async () => {
    const push: PushProvider = { sendPush: jest.fn().mockResolvedValue(undefined) };
    const message: MessageProvider = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(push, message);

    await service.notify({ bearerId: 'b1', phone: '+911234567890', title: 'Hi', body: 'Body text' });

    expect(push.sendPush).toHaveBeenCalledWith('b1', { title: 'Hi', body: 'Body text' });
    expect(message.sendMessage).toHaveBeenCalledWith('+911234567890', 'Hi\nBody text');
  });

  it('does not throw when one channel fails — delivery is best-effort', async () => {
    const push: PushProvider = { sendPush: jest.fn().mockRejectedValue(new Error('FCM down')) };
    const message: MessageProvider = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(push, message);

    await expect(
      service.notify({ bearerId: 'b1', phone: '+911234567890', title: 'Hi', body: 'Body text' }),
    ).resolves.toBeUndefined();
    expect(message.sendMessage).toHaveBeenCalled();
  });

  it('does not throw when both channels fail', async () => {
    const push: PushProvider = { sendPush: jest.fn().mockRejectedValue(new Error('FCM down')) };
    const message: MessageProvider = { sendMessage: jest.fn().mockRejectedValue(new Error('SMS down')) };
    const service = new NotificationService(push, message);

    await expect(
      service.notify({ bearerId: 'b1', phone: '+911234567890', title: 'Hi', body: 'Body text' }),
    ).resolves.toBeUndefined();
  });
});
