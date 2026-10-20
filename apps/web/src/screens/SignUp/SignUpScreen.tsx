import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import {
  User as UserIcon,
  Mail,
  Lock,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { Logo, APP_NAME, SUBTITLE } from '../../components/layout/Brand.js';
import { Button, IconButton } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export const SignUpScreen: React.FC = () => {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  // Live password validation checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid =
    name.trim().length >= 2 &&
    email.includes('@') &&
    hasMinLength &&
    hasLetter &&
    hasNumber &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);
    setIsDuplicateEmail(false);

    try {
      await register(name.trim(), email.trim(), password);
      navigate('/');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already')) {
        setIsDuplicateEmail(true);
        setError('An account with this email already exists.');
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      {/* SMRU Institutional Brand Hero Panel (Desktop) */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-linear-to-br from-navy-950 via-navy-900 to-[#0e274b] p-10 text-white lg:flex xl:p-14">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-navy-700/40 blur-xl" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -right-20 size-60 rounded-full bg-gold-500/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-navy-900/70" />

        <div className="relative inline-flex w-fit rounded-card bg-white px-4 py-3 shadow-card ring-1 ring-gold-400/30">
          <Logo size="lg" />
        </div>

        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-300 ring-1 ring-gold-400/30">
            Account Registration
          </div>
          <p className="font-display text-3xl leading-tight font-bold text-white xl:text-4xl">{SUBTITLE}</p>
          <p className="mt-3 max-w-md text-sm sm:text-base text-navy-100 leading-relaxed">
            Register your profile to participate in daily tasks, project sprints, attendance logging, and verifiable certificates.
          </p>
        </div>

        <div className="relative flex items-center justify-between text-xs text-navy-200 border-t border-navy-800/80 pt-4">
          <p>For staff and interns</p>
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
            <h1 className="font-display text-2xl font-bold text-navy-800 dark:text-white">Create Account</h1>
            <p className="mt-1 text-sm text-ink-soft">Join the central Software Hub workspace.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3 rounded-card bg-danger-50 text-danger-700 border border-danger-100 text-xs font-medium"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-danger-600" />
              <div>
                <span>{error}</span>
                {isDuplicateEmail && (
                  <div className="mt-1">
                    <Link to="/login" className="font-bold underline hover:no-underline text-danger-800">
                      Click here to sign in instead
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={UserIcon}
              required
            />

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (isDuplicateEmail) setIsDuplicateEmail(false);
              }}
              leftIcon={Mail}
              required
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
              <div className="mt-2 space-y-1 text-[11px] text-ink-soft">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-accent-700 font-semibold' : ''}`}>
                  <Check className={`size-3 ${hasMinLength ? 'opacity-100' : 'opacity-40'}`} />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-accent-700 font-semibold' : ''}`}>
                  <Check className={`size-3 ${hasLetter ? 'opacity-100' : 'opacity-40'}`} />
                  <span>At least one letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-accent-700 font-semibold' : ''}`}>
                  <Check className={`size-3 ${hasNumber ? 'opacity-100' : 'opacity-40'}`} />
                  <span>At least one number</span>
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={Lock}
                required
                rightElement={
                  <IconButton
                    size="sm"
                    icon={showConfirmPassword ? EyeOff : Eye}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-ink-faint hover:text-ink cursor-pointer"
                  />
                }
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-danger-600 mt-1">Passwords do not match.</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={!isFormValid || isLoading}
              loading={isLoading}
              loadingText="Creating account…"
              rightIcon={ArrowRight}
              className="mt-2"
            >
              Create account
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center text-xs">
            <span className="text-ink-soft">Already have an account? </span>
            <Link
              to="/login"
              className="font-bold text-navy-800 hover:text-navy-950 hover:underline inline-flex items-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignUpScreen;
