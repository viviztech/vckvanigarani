import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/auth';
import { ApiError } from '../../services/api-client';

interface LoginProps {
  onLoggedIn: () => void;
}

export default function Login({ onLoggedIn }: LoginProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.requestOtp(phone);
      setStep('code');
    } catch {
      // The API always returns 202 for /otp/request, so this is a network-level failure.
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.verifyOtp(phone, code);
      onLoggedIn();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('No account found for this number. Contact your admin to be added.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect or expired code.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="card" style={{ width: 360 }}>
        <h2>Vanigar Ani Admin</h2>
        {step === 'phone' ? (
          <>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="primary" disabled={busy || !phone} onClick={requestOtp}>
              Send code
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Code sent to {phone}</p>
            <div className="field">
              <label htmlFor="code">6-digit code</label>
              <input
                id="code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="primary" disabled={busy || code.length !== 6} onClick={verifyOtp}>
              Log in
            </button>{' '}
            <button className="secondary" onClick={() => setStep('phone')}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
