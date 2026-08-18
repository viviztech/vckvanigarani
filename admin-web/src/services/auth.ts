import { api } from './api-client';
import { tokenStore } from './token-store';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const auth = {
  requestOtp: (email: string) => api.post<void>('/auth/otp/request', { email }, { skipAuth: true }),

  async verifyOtp(email: string, code: string): Promise<void> {
    const tokens = await api.post<TokenPair>('/auth/otp/verify', { email, code }, { skipAuth: true });
    tokenStore.set(tokens);
  },

  isLoggedIn: (): boolean => tokenStore.accessToken !== null,

  logOut: (): void => tokenStore.clear(),
};
