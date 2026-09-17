import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser, verifyOtp, resendOtp } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginSuccess } = useAuth();

  const from = location.state?.from?.pathname || '/';

  // Step 1: credentials | Step 2: otp
  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState({});

  // Countdown timer for resend OTP cooldown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // ── Step 1: Submit credentials ──────────
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data } = await loginUser({ email: cleanEmail, password });
      toast.success(data.message || 'OTP sent to your email!');
      setStep('otp');
      setCooldown(60);
      setErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Submit OTP ───────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrors({ otp: 'Enter the 6-digit OTP from your email' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data } = await verifyOtp({ email: cleanEmail, otp: otp.trim() });
      loginSuccess(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      toast.error(msg);
      setErrors({ otp: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data } = await resendOtp({ email: cleanEmail });
      toast.success(data.message || 'A new OTP has been sent to your email.');
      setOtp('');
      setErrors({});
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      toast.error(msg);
      if (err.response?.data?.cooldownRemaining) {
        setCooldown(err.response.data.cooldownRemaining);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">🛍 ShopNow</div>
          <h1 className="auth-card__title">
            {step === 'credentials' ? 'Welcome Back' : 'Verify Your Email'}
          </h1>
          <p className="auth-card__subtitle">
            {step === 'credentials'
              ? 'Sign in to your account'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* OTP Step Indicator */}
        <div className="otp-steps">
          <div className={`otp-step ${step === 'credentials' ? 'active' : 'done'}`}>
            <span className="otp-step__num">{step === 'credentials' ? '1' : '✓'}</span>
            <span className="otp-step__label">Credentials</span>
          </div>
          <div className="otp-step__line" />
          <div className={`otp-step ${step === 'otp' ? 'active' : ''}`}>
            <span className="otp-step__num">2</span>
            <span className="otp-step__label">OTP Verify</span>
          </div>
        </div>

        {/* ── Step 1: Email + Password ── */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="auth-form" noValidate>
            {errors.general && (
              <div className="form-alert form-alert--error">{errors.general}</div>
            )}
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                className={`input ${errors.email ? 'input--error' : ''}`}
                autoComplete="email"
                required
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="login-password" className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                className={`input ${errors.password ? 'input--error' : ''}`}
                autoComplete="current-password"
                required
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? <span className="btn-spinner" /> : 'Continue →'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="auth-form" noValidate>
            <div className="otp-info-box">
              <span>📧</span>
              <span>Check your inbox (and spam folder) at <strong>{email}</strong></span>
            </div>
            <div className="form-group">
              <label htmlFor="otp-input" className="form-label">6-Digit OTP Code</label>
              <input
                id="otp-input"
                type="text"
                placeholder="● ● ● ● ● ●"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
                className={`input input--otp ${errors.otp ? 'input--error' : ''}`}
                maxLength={6}
                inputMode="numeric"
                autoFocus
                autoComplete="one-time-code"
              />
              {errors.otp && <span className="form-error">{errors.otp}</span>}
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading || otp.length !== 6}
              id="otp-verify-btn"
            >
              {loading ? <span className="btn-spinner" /> : '✅ Verify & Login'}
            </button>

            <div className="otp-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { setStep('credentials'); setOtp(''); setErrors({}); }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : resending
                  ? 'Sending...'
                  : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-card__footer">
          Don't have an account? <Link to="/register">Register free</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
