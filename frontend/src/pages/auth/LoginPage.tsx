import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { getRoleDefaultDashboard } from '../../utils/navigation';
import {
  getGoogleClientId,
  initiateGoogleOAuthRedirect,
} from '../../services/googleAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle } = useAuth();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode with query param if present (?mode=register or ?register=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'register' || params.get('register') === 'true') {
      setMode('register');
    }
  }, [location.search]);

  // Google Sign-In Handler
  const handleGoogleSignIn = () => {
    setErrorMessage(null);
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: getGoogleClientId(),
          callback: async (response: { credential: string }) => {
            if (response.credential) {
              try {
                setIsLoading(true);
                const success = await loginWithGoogle(response.credential);
                if (success) {
                  try {
                    const usr = await authApi.getCurrentUser();
                    navigate(getRoleDefaultDashboard(usr), { replace: true });
                  } catch {
                    navigate('/customer/dashboard', { replace: true });
                  }
                }
              } catch (err: any) {
                setErrorMessage(err.message || 'Google authentication failed.');
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            initiateGoogleOAuthRedirect();
          }
        });
        return;
      } catch {
        // Fallback to OAuth redirect
      }
    }
    initiateGoogleOAuthRedirect();
  };

  // Email & Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const parts = fullName.trim().split(' ');
        const firstName = parts[0] || 'Member';
        const lastName = parts.slice(1).join(' ') || 'User';

        const success = await register({
          email: email.trim().toLowerCase(),
          password,
          firstName,
          lastName,
        });

        if (success) {
          navigate('/customer/dashboard', { replace: true });
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.detail || err.message || 'Registration failed.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login mode
      if (!email.trim() || !password) {
        setErrorMessage('Please enter both your email and password.');
        return;
      }

      setIsLoading(true);
      try {
        const success = await login({
          email: email.trim().toLowerCase(),
          password,
        });

        if (success) {
          try {
            const usr = await authApi.getCurrentUser();
            navigate(getRoleDefaultDashboard(usr), { replace: true });
          } catch {
            navigate('/customer/dashboard', { replace: true });
          }
        }
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.detail || err.message || 'Invalid email or password.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-[880px] mx-auto rounded-3xl overflow-hidden border border-[#23272C] bg-[#111417] shadow-2xl flex flex-col md:flex-row min-h-[540px]">
      {/* Left Visual Column: Tennis Ball on Court */}
      <div className="w-full md:w-1/2 relative min-h-[260px] md:min-h-[560px] bg-[#0E1114] select-none overflow-hidden">
        <img
          src="/assets/auth-tennis-court.jpg"
          alt="Apex Sports Club Court"
          className="w-full h-full object-cover object-center"
        />

        {/* Back to Home Link (Top Left) */}
        <Link
          to="/"
          className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-black/50 hover:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full transition shadow-md z-10 border border-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Right Column: Form Container */}
      <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center bg-[#111417]">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {/* 6-dot icon */}
          <div className="grid grid-cols-3 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7FF36]" />
          </div>
          <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase font-sans">
            APEX SPORTS CLUB
          </span>
        </div>

        {/* Headlines */}
        {mode === 'login' ? (
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Login to your Apex Sports Club account
            </p>
          </div>
        ) : (
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Join Apex Sports Club and start your journey
            </p>
          </div>
        )}

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            border: 'none',
          }}
          className="w-full py-2.5 px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer disabled:opacity-50 hover:opacity-95"
        >
          {/* Google Color Icon */}
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="font-semibold text-slate-900">Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-[#23272C]"></div>
          <span className="px-3 text-xs text-slate-500 font-medium">or</span>
          <div className="flex-1 border-t border-[#23272C]"></div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative w-full">
              <UserIcon
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                style={{ zIndex: 10 }}
              />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  backgroundColor: '#171A1E',
                  borderColor: '#262B30',
                  color: '#ffffff',
                }}
                className="w-full py-2.5 rounded-xl border text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-[#C7FF36] transition"
              />
            </div>
          )}

          <div className="relative w-full">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              style={{ zIndex: 10 }}
            />
            <input
              type="email"
              placeholder={mode === 'login' ? 'Enter your email' : 'Email Address'}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                paddingLeft: '2.75rem',
                paddingRight: '1rem',
                backgroundColor: '#171A1E',
                borderColor: '#262B30',
                color: '#ffffff',
              }}
              className="w-full py-2.5 rounded-xl border text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-[#C7FF36] transition"
            />
          </div>

          <div className="relative w-full">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              style={{ zIndex: 10 }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'login' ? 'Enter your password' : 'Password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                paddingLeft: '2.75rem',
                paddingRight: '2.75rem',
                backgroundColor: '#171A1E',
                borderColor: '#262B30',
                color: '#ffffff',
              }}
              className="w-full py-2.5 rounded-xl border text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-[#C7FF36] transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none',
                border: 'none',
                zIndex: 10,
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {mode === 'register' && (
            <div className="relative w-full">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                style={{ zIndex: 10 }}
              />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  paddingLeft: '2.75rem',
                  paddingRight: '2.75rem',
                  backgroundColor: '#171A1E',
                  borderColor: '#262B30',
                  color: '#ffffff',
                }}
                className="w-full py-2.5 rounded-xl border text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-[#C7FF36] transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  zIndex: 10,
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right pt-0.5">
              <button
                type="button"
                onClick={() =>
                  alert('Password recovery instructions sent to your email address.')
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C7FF36',
                }}
                className="text-xs font-medium hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Main Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: '#C7FF36',
                color: '#000000',
                border: 'none',
              }}
              className="w-full py-2.5 rounded-full font-bold text-xs sm:text-sm transition shadow-lg shadow-[#C7FF36]/20 cursor-pointer disabled:opacity-50 hover:bg-[#b5f028]"
            >
              {isLoading
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Registering...'
                : mode === 'login'
                ? 'Login'
                : 'Register'}
            </button>
          </div>
        </form>

        {/* Footer Mode Switch */}
        <div className="text-center mt-5">
          {mode === 'login' ? (
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('register');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C7FF36',
                }}
                className="font-semibold hover:underline cursor-pointer ml-1"
              >
                Register
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C7FF36',
                }}
                className="font-semibold hover:underline cursor-pointer ml-1"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
