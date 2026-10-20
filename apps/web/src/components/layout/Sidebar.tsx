import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  BarChart2,
  Award,
  Zap,
  LogOut,
  Sun,
  Moon,
  User,
} from 'lucide-react';
import { USER_ROLES, type UserRole } from '@command-center/shared';
import { useTheme } from '../../contexts/ThemeContext.js';
import { Brand } from './Brand.js';
import { cn, initials } from '../ui/utils.js';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  internType?: 'paid' | 'unpaid' | null;
  currentLevel?: number;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

interface SidebarProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  onSwitchUser?: (role: UserRole) => void;
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onLogout,
  className = '',
  onNavigate,
}) => {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const isAdmin = currentUser.role === USER_ROLES.ADMIN;
  const isManager = currentUser.role === USER_ROLES.MANAGER;
  const isLead = currentUser.role === USER_ROLES.LEAD;
  const isPaid = currentUser.role === USER_ROLES.PAID_INTERN;
  const isUnpaid = currentUser.role === USER_ROLES.UNPAID_INTERN;
  const isIntern = isPaid || isUnpaid;

  const certsLabel = isIntern ? 'My Certificate' : 'Certificates';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/todo', label: 'To-Do', icon: CheckSquare },
    { to: '/interns', label: 'Team Roster', icon: Users },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/tracker', label: 'Tracker', icon: BarChart2 },
    { to: '/certificates', label: certsLabel, icon: Award },
    ...(isAdmin || isManager || isLead ? [{ to: '/automations', label: 'Automations', icon: Zap }] : []),
    { to: '/profile', label: 'Profile & Settings', icon: User },
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'Super Admin';
      case USER_ROLES.MANAGER:
        return 'Manager';
      case USER_ROLES.LEAD:
        return 'Team Lead';
      case USER_ROLES.PAID_INTERN:
        return 'Intern (Paid)';
      case USER_ROLES.UNPAID_INTERN:
        return 'Intern (Unpaid)';
      default:
        return 'Intern';
    }
  };

  return (
    <aside
      className={cn(
        'w-64 bg-navy-950 text-slate-300 flex flex-col justify-between shrink-0 select-none border-r border-navy-900',
        className
      )}
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-navy-900/80">
          <Brand />
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-control text-xs sm:text-sm font-medium transition-all duration-150',
                    'focus-visible:outline-2 focus-visible:outline-navy-500',
                    isActive
                      ? 'bg-navy-800 text-white font-semibold ring-1 ring-gold-400/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-navy-900/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-4 shrink-0', isActive ? 'text-gold-400' : 'text-slate-400')} />
                    <span className="flex-1 truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-navy-900/80 bg-navy-950">
        <div className="flex items-center justify-between p-2 rounded-control bg-navy-900/70 border border-navy-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="size-8 rounded-full bg-linear-to-br from-gold-400 to-gold-500 text-navy-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs ring-1 ring-gold-300/40"
              aria-hidden
            >
              {initials(currentUser.name)}
            </span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</h4>
              <p className="text-[10px] text-gold-300/90 truncate font-medium">{getRoleBadge(currentUser.role)}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-1.5 text-slate-400 hover:text-gold-400 hover:bg-navy-800/80 rounded-control transition-colors cursor-pointer"
            >
              {resolvedTheme === 'dark' ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-navy-800/80 rounded-control transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
