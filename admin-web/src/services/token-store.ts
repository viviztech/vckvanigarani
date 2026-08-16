const ACCESS_KEY = 'vanigarani.accessToken';
const REFRESH_KEY = 'vanigarani.refreshToken';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Thin wrapper over localStorage so the rest of the app never touches the
 * storage keys directly — swapping storage strategy later (e.g. httpOnly
 * cookies) only touches this file.
 */
export const tokenStore = {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: TokenPair): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  setAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
