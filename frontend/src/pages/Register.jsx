import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, verifyOtp, resendOtp } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  // Step 1: 'form' | Step 2: 'otp'
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Timer effect for resend cooldown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '', general: '' }));
  };

  // Step 1: Submit Registration Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const { data } = await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      toast.success(data.message || 'Verification code sent to your email!');
      setStep('otp');
      setCooldown(60); // 60s cooldown for resend
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your details.';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg, general: msg });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit verification code' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const cleanEmail = form.email.trim().toLowerCase();
      const { data } = await verifyOtp({ email: cleanEmail, otp: otp.trim() });
      
      loginSuccess(data.user, data.token);
      toast.success(`Account verified! Welcome to ShopNow, ${data.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      toast.error(msg);
      setErrors({ otp: msg });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      const cleanEmail = form.email.trim().toLowerCase();
      const { data } = await resendOtp({ email: cleanEmail });
      toast.success(data.message || 'A new verification code has been sent!');
      setOtp('');
      setErrors({});
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification code.';
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
            {step === 'form' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="auth-card__subtitle">
            {step === 'form'
              ? 'Join thousands of happy shoppers across India'
              : `Enter the 6-digit verification code sent to ${form.email}`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="otp-steps">
          <div className={`otp-step ${step === 'form' ? 'active' : 'done'}`}>
            <span className="otp-step__num">{step === 'form' ? '1' : '✓'}</span>
            <span className="otp-step__label">Register</span>
          </div>
          <div className="otp-step__line" />
          <div className={`otp-step ${step === 'otp' ? 'active' : ''}`}>
            <span className="otp-step__num">2</span>
            <span className="otp-step__label">Email OTP</span>
          </div>
        </div>

        {/* Step 1: Details Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {errors.general && (
              <div className="form-alert form-alert--error" style={{ marginBottom: '16px' }}>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">Full Name</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'input--error' : ''}`}
                autoComplete="name"
                required
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Email Address</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'input--error' : ''}`}
                autoComplete="email"
                required
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">Password</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                className={`input ${errors.password ? 'input--error' : ''}`}
                autoComplete="new-password"
                required
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                name="confirmPassword"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`input ${errors.confirmPassword ? 'input--error' : ''}`}
                autoComplete="new-password"
                required
              />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
              id="register-submit-btn"
            >
              {loading ? <span className="btn-spinner" /> : 'Continue to Verification →'}
            </button>
          </form>
        )}

        {/* Step 2: Email OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
            <div className="otp-info-box">
              <span>📧</span>
              <span>We sent a real verification OTP to <strong>{form.email}</strong>. Check your inbox (and spam folder).</span>
            </div>

            <div className="form-group">
              <label htmlFor="reg-otp-input" className="form-label">6-Digit Verification Code</label>
              <input
                id="reg-otp-input"
                type="text"
                placeholder="● ● ● ● ● ●"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrors({});
                }}
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
              id="register-otp-verify-btn"
            >
              {loading ? <span className="btn-spinner" /> : '✅ Verify & Activate Account'}
            </button>

            <div className="otp-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setStep('form');
                  setOtp('');
                  setErrors({});
                }}
              >
                ← Edit Details
              </button>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleResendOtp}
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
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
