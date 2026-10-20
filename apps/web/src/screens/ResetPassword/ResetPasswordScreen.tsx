import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import {
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Logo } from '../../components/layout/Brand.js';
import { Button, IconButton } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please open the link directly from your email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired (valid for 30 minutes).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-canvas text-ink flex flex-col justify-between p-4 safe-top safe-bottom">
      <header className="w-full max-w-7xl mx-auto py-4 flex items-center justify-between">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md rounded-card border border-line bg-surface shadow-card p-6 sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-bold bg-navy-50 text-navy-800 ring-1 ring-inset ring-navy-200">
              <KeyRound className="size-3.5" />
              Password Reset
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-navy-800 dark:text-white mt-2">
              Set New Password
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Choose a secure password for your Software Hub account.
            </p>
          </div>

          {isSuccess ? (
            <div className="p-4 rounded-card bg-accent-50 border border-accent-200 text-accent-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="size-4 text-accent-600" />
                Password Changed Successfully
              </div>
              <p className="leading-relaxed">
                All active sessions have been terminated. Please sign in with your new password.
              </p>
              <div className="pt-3 border-t border-accent-200">
                <Button size="md" fullWidth rightIcon={ArrowRight} onClick={() => navigate('/login')}>
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-card bg-danger-50 border border-danger-100 text-danger-700 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-danger-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters (letters & numbers)"
                  leftIcon={Lock}
                  rightElement={
                    <IconButton
                      size="sm"
                      icon={showPassword ? EyeOff : Eye}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-ink-faint hover:text-ink cursor-pointer"
                    />
                  }
                />
              </div>

              <div>
                <Input
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  leftIcon={Lock}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={isSubmitting}
                loadingText="Saving password…"
                rightIcon={ArrowRight}
                className="mt-2"
              >
                Save Password & Sign In
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-ink-soft hover:text-navy-800 hover:underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto py-4 text-center text-[11px] text-ink-faint">
        Software Hub • St. Mary’s Rehabilitation University Central Office
      </footer>
    </div>
  );
};

export default ResetPasswordScreen;
