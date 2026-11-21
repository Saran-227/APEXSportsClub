import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { validateLoginForm } from '../../utils/validation';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Client-side validation
    const errors = validateLoginForm(email, password);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Call real authentication service via centralized Axios client
    const success = await login({ email, password, rememberMe });
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Sign in to Champions Club</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your authorized staff or administration credentials to access the terminal.
        </p>
      </div>

      {/* Integration Notice */}
      <div className="mb-5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-emerald-200">FastAPI Session Contract:</span> Authenticates via HTTP-only cookie against{' '}
          <code className="text-emerald-100 font-mono">POST /api/v1/auth/login</code>.
        </div>
      </div>

      {authError && (
        <Alert type="error" title="Authentication Error" onClose={clearError} className="mb-5">
          {authError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="staff@championsclub.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={validationErrors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
        </div>

        {/* Password Field */}
        <div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={validationErrors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            autoComplete="current-password"
          />
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300">Remember this device</span>
          </label>

          <span
            onClick={() => alert('Password reset is managed by club administrators in Phase 1.')}
            className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
          >
            Forgot password?
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Authenticate & Enter
          </Button>
        </div>
      </form>
    </div>
  );
};
