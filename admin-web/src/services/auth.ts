import { api } from './api-client';
import { tokenStore } from './token-store';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const auth = {
  requestOtp: (phone: string) => api.post<void>('/auth/otp/request', { phone }, { skipAuth: true }),

  async verifyOtp(phone: string, code: string): Promise<void> {
    const tokens = await api.post<TokenPair>('/auth/otp/verify', { phone, code }, { skipAuth: true });
    tokenStore.set(tokens);
  },

  isLoggedIn: (): boolean => tokenStore.accessToken !== null,

  logOut: (): void => tokenStore.clear(),
};
