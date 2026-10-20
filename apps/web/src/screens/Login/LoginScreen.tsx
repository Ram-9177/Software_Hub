import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import {
  Lock,
  Mail,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  CalendarPlus,
  Search,
} from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { Logo, Brand, APP_NAME, SUBTITLE } from '../../components/layout/Brand.js';
import { Button, IconButton } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Modal } from '../../components/ui/Modal.js';
import { cn } from '../../components/ui/utils.js';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google SSO client id availability
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Invite entry state
  const [showInviteEntry, setShowInviteEntry] = useState(false);
  const [inviteTokenInput, setInviteTokenInput] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    apiRequest<{ googleClientId: string | null }>('/auth/config')
      .then((res) => {
        if (res.googleClientId) {
          setGoogleClientId(res.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or inactive account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsForgotLoading(true);
    setForgotStatus(null);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStatus(
        'If an account exists with this email, a reset link has been dispatched.'
      );
    } catch (err: any) {
      setForgotStatus(
        'If an account exists with this email, a reset link has been dispatched.'
      );
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleGoToInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTokenInput.trim()) return;

    let token = inviteTokenInput.trim();
    if (token.includes('token=')) {
      token = token.split('token=')[1].split('&')[0];
    }
    navigate(`/accept-invite?token=${encodeURIComponent(token)}`);
  };

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      {/* SMRU Institutional Brand Hero Panel (Desktop) */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-linear-to-br from-navy-950 via-navy-900 to-[#0e274b] p-10 text-white lg:flex xl:p-14 shadow-card glow-navy">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-navy-700/40 blur-xl" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -right-20 size-60 rounded-full bg-gold-500/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-navy-900/70" />

        <div className="relative inline-flex w-fit rounded-card bg-white px-4 py-3 shadow-card ring-1 ring-gold-400/30 glow-gold-sm">
          <Logo size="lg" />
        </div>

        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-300 ring-1 ring-gold-400/30">
            Executive Operations Portal
          </div>
          <p className="font-display text-3xl leading-tight font-bold text-white xl:text-4xl">{SUBTITLE}</p>
          <p className="mt-3 max-w-md text-sm sm:text-base text-navy-100 leading-relaxed">
            Software Hub — coordinate intern operations, task schedules, attendance tracking, and verified credentials across the department.
          </p>
        </div>

        <div className="relative flex items-center justify-between text-xs text-navy-200 border-t border-navy-800/80 pt-4">
          <p>For authorized staff and interns</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1 text-navy-200 hover:text-white transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      {/* Form Column */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 safe-top safe-bottom">
        <div className="w-full max-w-sm">
          {/* Mobile Header Logo */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-navy-800 dark:text-white">Staff Sign In</h1>
            <p className="mt-1 text-sm text-ink-soft">Enter your credentials to access Software Hub.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3 rounded-card bg-danger-50 text-danger-700 border border-danger-100 text-xs font-medium"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-danger-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              required
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={Lock}
                required
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
              <div className="flex items-center justify-between mt-2 text-xs">
                <label className="flex items-center gap-2 text-ink-soft cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepMeSignedIn}
                    onChange={(e) => setKeepMeSignedIn(e.target.checked)}
                    className="size-4 text-navy-800 rounded-[4px] border-line-strong focus:ring-navy-500"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-medium text-navy-700 hover:text-navy-900 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isLoading}
              loadingText="Signing in…"
              rightIcon={ArrowRight}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>

          {/* Optional Google SSO Button */}
          {googleClientId && (
            <div className="mt-5 pt-5 border-t border-line">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  setError('Google Sign-In is configured. Please authorize via Google dialog.');
                }}
                className="gap-2"
              >
                <svg className="size-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </Button>
            </div>
          )}

          {/* Links for Create Account and Invites */}
          <div className="mt-6 pt-5 border-t border-line text-center space-y-2 text-xs">
            <div>
              <span className="text-ink-soft">Don't have an account? </span>
              <Link
                to="/signup"
                className="font-bold text-navy-800 hover:text-navy-950 hover:underline inline-flex items-center"
              >
                Create account
              </Link>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowInviteEntry(!showInviteEntry)}
                className="text-ink-faint hover:text-ink transition-colors inline-flex items-center cursor-pointer"
              >
                Have an invite link? Click here
              </button>
            </div>

            {showInviteEntry && (
              <form onSubmit={handleGoToInvite} className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Paste invite link or token"
                  value={inviteTokenInput}
                  onChange={(e) => setInviteTokenInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface border border-line-strong rounded-control text-xs text-ink min-h-10 focus:outline-none focus:border-navy-500"
                />
                <Button type="submit" size="sm">
                  Go
                </Button>
              </form>
            )}
          </div>

          {/* Public verification shortcut card */}
          <div className="mt-8 rounded-card border border-line bg-surface p-4 text-xs shadow-2xs">
            <p className="font-semibold text-ink">Public Credential Verification</p>
            <p className="mt-0.5 text-ink-soft">Verify authentic certificates issued by Software Hub 2.0 without signing in.</p>
            <div className="mt-2.5">
              <Link to="/verify" className="inline-flex items-center gap-1.5 font-semibold text-navy-700 hover:text-navy-900 hover:underline">
                <Search className="size-3.5" />
                <span>Verify a certificate</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      <Modal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Forgot Password?"
        description="Enter your email address and we'll send a single-use reset link valid for 30 minutes."
      >
        {forgotStatus ? (
          <div className="p-3.5 rounded-card bg-accent-50 border border-accent-200 text-accent-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-accent-600" />
            <span>{forgotStatus}</span>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <Input
              id="forgot-email"
              label="Account Email"
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="name@example.com"
              leftIcon={Mail}
            />

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForgotModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={isForgotLoading}
                loadingText="Sending…"
              >
                Send reset link
              </Button>
            </div>
          </form>
        )}

        {forgotStatus && (
          <div className="text-right pt-4">
            <Button size="sm" onClick={() => setShowForgotModal(false)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LoginScreen;
