import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  CheckCheck,
  Inbox,
  Calendar,
  Award,
  CheckSquare,
  FileText,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Sidebar, type CurrentUser } from './Sidebar.js';
import type { UserRole } from '@command-center/shared';
import { USER_ROLES } from '@command-center/shared';
import { useTheme } from '../../contexts/ThemeContext.js';
import { apiRequest } from '../../lib/api.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  onSwitchUser?: (role: UserRole) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'notifications' | 'approvals'>('notifications');
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const isManagement =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  // 1. Fetch live notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<{ unreadCount: number; notifications: any[] }>('/notifications'),
    refetchInterval: 8000,
  });

  // 2. Fetch approval inbox if management
  const { data: approvalData } = useQuery({
    queryKey: ['approval-inbox'],
    queryFn: () => apiRequest<any>('/notifications/approvals/inbox'),
    enabled: isManagement,
    refetchInterval: 10000,
  });

  // Mark notification read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close popover on outside click
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
  const pendingApprovalsCount = approvalData?.summary?.totalPending ?? 0;

  const totalBadgeCount = unreadCount + (isManagement ? pendingApprovalsCount : 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar
          currentUser={currentUser}
          onLogout={onLogout}
          onSwitchUser={onSwitchUser}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0e1629] z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              currentUser={currentUser}
              onLogout={onLogout}
              onSwitchUser={onSwitchUser}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0e1629] text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                CC
              </div>
              <span className="text-xs font-bold tracking-tight">Command Center</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {totalBadgeCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#0e1629]" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="text-xs font-semibold text-slate-300">{currentUser.name}</span>
          </div>
        </header>

        {/* Desktop Top Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-3">
            <img src="/assets/university_logo.png" alt="University Logo" className="h-6 w-auto object-contain" />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Central Office • Software Hub 2.0 Command Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell Button */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                title="Central Office Notifications & Approvals"
              >
                <Bell className="w-4 h-4" />
                {totalBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white font-bold text-[10px] rounded-full ring-2 ring-white dark:ring-slate-900">
                    {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header */}
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Command Hub
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markReadMutation.mutate('all')}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs if Admin/Lead */}
                  {isManagement && (
                    <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold bg-slate-50/40 dark:bg-slate-800/30">
                      <button
                        type="button"
                        onClick={() => setNotifTab('notifications')}
                        className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                          notifTab === 'notifications'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                        }`}
                      >
                        Updates ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifTab('approvals')}
                        className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                          notifTab === 'approvals'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                        }`}
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        Approval Inbox
                        {pendingApprovalsCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Popover Content */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {notifTab === 'notifications' && (
                      <>
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                              You're all caught up!
                            </p>
                            <p className="text-[11px] mt-0.5">
                              Central Office notifications and updates will appear here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((n: any) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (!n.is_read) markReadMutation.mutate(n.id);
                                if (n.action_url) {
                                  setIsNotifOpen(false);
                                  navigate(n.action_url);
                                }
                              }}
                              className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                !n.is_read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <div className="mt-0.5 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                                {n.type === 'leave_request' ? (
                                  <Calendar className="w-3.5 h-3.5" />
                                ) : n.type === 'certificate_review' ? (
                                  <Award className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {n.title}
                                  </span>
                                  {!n.is_read && (
                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}

                    {notifTab === 'approvals' && isManagement && (
                      <div className="p-3 space-y-3">
                        {/* Summary Pill Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div
                            onClick={() => {
                              setIsNotifOpen(false);
                              navigate('/attendance');
                            }}
                            className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 transition-colors"
                          >
                            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 block">
                              Leave Requests
                            </span>
                            <span className="text-lg font-black text-purple-900 dark:text-purple-100">
                              {approvalData?.summary?.pendingLeavesCount ?? 0}
                            </span>
                          </div>

                          <div
                            onClick={() => {
                              setIsNotifOpen(false);
                              navigate('/tracker');
                            }}
                            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 block">
                              Task Reviews
                            </span>
                            <span className="text-lg font-black text-blue-900 dark:text-blue-100">
                              {approvalData?.summary?.pendingTasksCount ?? 0}
                            </span>
                          </div>
                        </div>

                        {/* Quick links to review workflows */}
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotifOpen(false);
                              navigate('/attendance');
                            }}
                            className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Review Leave & WFH
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsNotifOpen(false);
                              navigate('/interns');
                            }}
                            className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Review Intern Promotions (1–15)
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsNotifOpen(false);
                              navigate('/certificates');
                            }}
                            className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Issue & Reissue Certificates
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* User Persona Pill */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {currentUser.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {currentUser.role}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport for Application Screens */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-slate-950 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
