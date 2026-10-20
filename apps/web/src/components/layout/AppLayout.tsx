import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Moon,
  Bell,
  CheckCheck,
  CheckSquare,
  Home,
  MessageSquare,
  Clock,
  MoreHorizontal,
  BarChart2,
  Award,
  Calendar,
  Users,
  Zap,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Sidebar, type CurrentUser } from './Sidebar.js';
import { Brand } from './Brand.js';
import { USER_ROLES } from '@command-center/shared';
import { useTheme } from '../../contexts/ThemeContext.js';
import { apiRequest } from '../../lib/api.js';
import { Sheet } from '../ui/Sheet.js';
import { cn } from '../ui/utils.js';

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentUser, onLogout }) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const isManagement =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: currentUser.email }),
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch {
      // ignore
    } finally {
      setIsResending(false);
    }
  };

  // 1. Live notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiRequest<{ unreadCount: number; notifications: any[] }>('/notifications').catch(() => ({
        unreadCount: 0,
        notifications: [],
      })),
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.notifications ?? [];

  const mainMobileTabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'To-Do', path: '/todo', icon: CheckSquare },
    { label: 'Chat', path: '/chat', icon: MessageSquare },
    { label: 'Attendance', path: '/attendance', icon: Clock },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink transition-colors duration-200">
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar currentUser={currentUser} onLogout={onLogout} />
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* SMRU Institutional Top Header with gold accent line */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-surface border-b border-line border-t-2 border-t-gold-400 safe-top shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-accent-500 animate-pulse" />
              <span className="text-xs font-semibold text-ink-soft">Central Office Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative size-9 rounded-control border border-line-strong hover:border-navy-300 text-ink-soft hover:text-navy-800 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-navy-500"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 bg-danger-600 rounded-full ring-2 ring-surface" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-card bg-surface border border-line shadow-pop z-50 overflow-hidden animate-pop-in">
                  <div className="p-3.5 border-b border-line flex items-center justify-between bg-canvas/70">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate('all')}
                        className="text-[11px] font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="size-3.5" /> Mark read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-line">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-ink-faint italic">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={cn(
                            'p-3 text-xs transition-colors hover:bg-tint cursor-pointer',
                            !n.is_read ? 'bg-navy-50/60 font-semibold' : ''
                          )}
                        >
                          <h4 className="font-bold text-ink">{n.title}</h4>
                          <p className="text-ink-soft mt-0.5 font-normal">{n.message}</p>
                          <span className="text-[10px] text-ink-faint mt-1 block font-normal">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="size-9 rounded-control border border-line-strong hover:border-navy-300 text-ink-soft hover:text-navy-800 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-navy-500"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>

            {/* User Pill */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-line">
              <span className="text-xs font-semibold text-ink">
                {currentUser.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm bg-navy-50 text-navy-800 ring-1 ring-inset ring-navy-200">
                {currentUser.role}
              </span>
            </div>
          </div>
        </header>

        {/* Email verification reminder banner */}
        {currentUser && currentUser.emailVerified === false && (
          <div className="bg-gold-100 border-b border-gold-300/80 px-4 py-2 flex items-center justify-between text-xs text-gold-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-gold-600 animate-pulse" />
              <span>Verify your email to secure your account.</span>
              {resendSuccess && (
                <span className="text-accent-700 font-semibold">
                  (Verification email sent!)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="font-bold underline hover:no-underline text-gold-950 min-h-8 px-2 flex items-center disabled:opacity-50 cursor-pointer"
            >
              {isResending ? 'Sending...' : 'Resend link'}
            </button>
          </div>
        )}

        {/* Scrollable Viewport for Screen Content */}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* SMRU Mobile Bottom Navigation Bar (< 1024px) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line flex items-center justify-around px-2 py-1 shadow-card safe-bottom"
          aria-label="Mobile Navigation"
        >
          {mainMobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-3 rounded-control min-h-11 min-w-11 transition-colors',
                  isActive
                    ? 'text-navy-800 font-bold'
                    : 'text-ink-faint hover:text-ink'
                )}
              >
                {isActive && (
                  <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-400" />
                )}
                <Icon className={cn('size-5', isActive ? 'stroke-[2.25]' : 'stroke-2')} />
                <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
              </NavLink>
            );
          })}

          {/* 5th Button: More Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center py-1.5 px-3 rounded-control min-h-11 min-w-11 transition-colors cursor-pointer',
              isMoreSheetOpen
                ? 'text-navy-800 font-bold'
                : 'text-ink-faint hover:text-ink'
            )}
            aria-label="Open secondary navigation menu"
          >
            {isMoreSheetOpen && (
              <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-400" />
            )}
            <MoreHorizontal className="size-5" />
            <span className="text-[10px] mt-0.5 leading-none">More</span>
          </button>
        </nav>
      </div>

      {/* "More" Bottom Sheet for secondary mobile navigation */}
      <Sheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        title="Central Office Menu"
        description={`Signed in as ${currentUser.name} (${currentUser.role})`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                navigate('/tracker');
                setIsMoreSheetOpen(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
            >
              <BarChart2 className="size-4 text-navy-700" />
              <span>Operations Tracker</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/certificates');
                setIsMoreSheetOpen(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
            >
              <Award className="size-4 text-gold-600" />
              <span>Certificates</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/calendar');
                setIsMoreSheetOpen(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
            >
              <Calendar className="size-4 text-accent-600" />
              <span>Office Calendar</span>
            </button>

            {isManagement && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/interns');
                    setIsMoreSheetOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
                >
                  <Users className="size-4 text-violet-600" />
                  <span>Roster & Interns</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate('/automations');
                    setIsMoreSheetOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
                >
                  <Zap className="size-4 text-amber-600" />
                  <span>Automations</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                navigate('/profile');
                setIsMoreSheetOpen(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
            >
              <User className="size-4 text-navy-600" />
              <span>Profile & Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/verify');
                setIsMoreSheetOpen(false);
              }}
              className="flex items-center gap-2.5 p-3 rounded-control bg-canvas hover:bg-tint border border-line text-left min-h-11 transition-colors cursor-pointer text-ink"
            >
              <ShieldCheck className="size-4 text-indigo-600" />
              <span>Verify Credential</span>
            </button>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-ink min-h-11 p-2 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="size-4 text-amber-400" /> Light Mode
                </>
              ) : (
                <>
                  <Moon className="size-4" /> Dark Mode
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMoreSheetOpen(false);
                onLogout();
              }}
              className="flex items-center gap-2 text-xs font-semibold text-danger-600 hover:text-danger-700 min-h-11 p-2 cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default AppLayout;
