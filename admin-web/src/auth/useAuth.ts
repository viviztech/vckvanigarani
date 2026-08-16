import { useEffect, useState } from 'react';
import { auth } from '../services/auth';

/** Re-renders on login/logout so route guards react immediately. */
export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(auth.isLoggedIn());

  useEffect(() => {
    const onLoggedOut = () => setLoggedIn(false);
    window.addEventListener('vanigarani:logged-out', onLoggedOut);
    return () => window.removeEventListener('vanigarani:logged-out', onLoggedOut);
  }, []);

  return {
    loggedIn,
    logIn: () => setLoggedIn(true),
    logOut: () => {
      auth.logOut();
      setLoggedIn(false);
    },
  };
}
