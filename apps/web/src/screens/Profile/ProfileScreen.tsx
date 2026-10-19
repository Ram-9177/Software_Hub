import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../components/ui/Toast.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import {
  User,
  Mail,
  Lock,
  Bell,
  Calendar,
  LogOut,
  Shield,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { currentUser, logout, changePassword, updateCurrentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Name & Avatar Edit
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Notification Preferences
  const [emailMuted, setEmailMuted] = useState(Boolean(currentUser?.emailNotificationsMuted));
  const [pushMuted, setPushMuted] = useState(Boolean(currentUser?.pushNotificationsMuted));
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Copy ICS Feed State
  const [copiedIcs, setCopiedIcs] = useState(false);

  // Google Calendar Integration Query
  const { data: googleStatus, refetch: refetchGoogle } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: () => apiRequest<any>('/calendar/google/status'),
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdatingProfile(true);
    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), avatarUrl: avatarUrl.trim() || undefined }),
      });
      updateCurrentUser({ name: res.user.name, avatarUrl: res.user.avatarUrl });
      showToast({ type: 'success', title: 'Profile Updated', message: 'Name and photo updated.' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      showToast({ type: 'error', title: 'Password Too Short', message: 'Minimum 10 characters required.' });
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      showToast({ type: 'error', title: 'Password Insecure', message: 'Must contain letters and numbers.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', title: 'Passwords Mismatch', message: 'New passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword(newPassword, currentPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed.' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Password Change Failed', message: err.message });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingPrefs(true);
    try {
      await apiRequest('/automations/preferences/mute', {
        method: 'PATCH',
        body: JSON.stringify({ emailMuted, pushMuted }),
      });
      updateCurrentUser({ emailNotificationsMuted: emailMuted, pushNotificationsMuted: pushMuted });
      showToast({ type: 'success', title: 'Preferences Saved', message: 'Notification settings updated.' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!window.confirm('Are you sure you want to sign out of all devices? This will invalidate all active sessions.')) {
      return;
    }

    try {
      await apiRequest('/auth/signout-all', { method: 'POST' });
      await logout();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sign-out Error', message: err.message });
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await apiRequest<{ authUrl: string }>('/calendar/google/auth-url');
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      showToast({
        type: 'info',
        title: 'Google OAuth Setup Required',
        message: err.message || 'GOOGLE_CLIENT_ID must be set in .env.',
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await apiRequest('/calendar/google/disconnect', { method: 'POST' });
      await refetchGoogle();
      showToast({ type: 'success', title: 'Disconnected', message: 'Google Calendar has been disconnected.' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const copyIcsUrl = () => {
    if (!googleStatus?.icsUrl) return;
    navigator.clipboard.writeText(googleStatus.icsUrl);
    setCopiedIcs(true);
    setTimeout(() => setCopiedIcs(false), 2500);
    showToast({ type: 'success', title: 'Copied', message: 'Private .ics subscription URL copied to clipboard.' });
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Personnel Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your university credentials, security sessions, and automated calendar integrations.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-black text-2xl shrink-0 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{currentUser.name}</h2>
                <Badge variant="default" size="sm">
                  {currentUser.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.email}</p>
              {currentUser.pairedPaidInternName && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  Paired Core Mentor: {currentUser.pairedPaidInternName}
                </p>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Personal Info Edit */}
      <Card padding="md">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Edit Display Information</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>
          </div>
          <Button size="sm" type="submit" isLoading={isUpdatingProfile}>
            Save Profile Info
          </Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h3>
        </div>
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password (min 10 characters, letters & numbers)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>
          <Button size="sm" type="submit" isLoading={isChangingPass}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Google Calendar & Private .ICS Sync */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Calendar Synchronization</h3>
        </div>

        <div className="space-y-4">
          {/* Google Calendar OAuth Flow */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Google Calendar Sync</span>
                {googleStatus?.isConnected ? (
                  <Badge variant="success" size="sm">Connected</Badge>
                ) : (
                  <Badge variant="default" size="sm">Not Connected</Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                One-way automatic sync of your assigned task deadlines and university meetings.
              </p>
            </div>

            {googleStatus?.isConnected ? (
              <Button size="sm" variant="outline" onClick={handleDisconnectGoogle}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnectGoogle} leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                Connect Google Calendar
              </Button>
            )}
          </div>

          {/* Private .ICS subscription link */}
          {googleStatus?.icsUrl && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Private .ICS Subscription URL (No Setup Required)
                </span>
                <span className="text-[10px] text-slate-400">Apple Calendar, Outlook, Google</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Subscribe in any calendar app using this secure personal URL:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={googleStatus.icsUrl}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 font-mono select-all focus:outline-none"
                />
                <Button size="sm" variant="outline" onClick={copyIcsUrl} leftIcon={copiedIcs ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}>
                  {copiedIcs ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Notification Muting Preferences */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Control automated notifications dispatched to your personal accounts.
        </p>

        <div className="space-y-3 max-w-md">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Mute Email Notifications</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Silence daily task reminders, schedule notices, and digest emails.
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailMuted}
              onChange={(e) => setEmailMuted(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Mute Push Notifications</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Silence browser push alerts on this device.
              </div>
            </div>
            <input
              type="checkbox"
              checked={pushMuted}
              onChange={(e) => setPushMuted(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </label>

          <Button size="sm" onClick={handleSaveNotifications} isLoading={isSavingPrefs}>
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* Security: Sign Out of All Devices */}
      <Card padding="md" className="border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Security & Active Sessions</h3>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
              Lost a phone or signed in on a public computer? Revoke all active sessions on every device immediately.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleSignOutAll} leftIcon={<Shield className="w-4 h-4" />}>
            Sign Out of All Devices
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default ProfileScreen;
