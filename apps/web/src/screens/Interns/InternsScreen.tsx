import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { useToast } from '../../components/ui/Toast.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { cn } from '../../components/ui/utils.js';
import { USER_ROLES, INTERN_TYPES } from '@command-center/shared';
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export const InternsScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'roster' | 'invites'>('roster');
  const [activeFilter, setActiveFilter] = useState<'all' | 'managers' | 'paid' | 'unpaid'>('all');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(
    currentUser?.role === USER_ROLES.PAID_INTERN || currentUser?.role === USER_ROLES.UNPAID_INTERN
      ? USER_ROLES.UNPAID_INTERN
      : USER_ROLES.UNPAID_INTERN
  );
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bulk Creation Modal State (PDF Page 2)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [bulkInternType, setBulkInternType] = useState<string>(INTERN_TYPES.UNPAID);
  const [bulkMentorId, setBulkMentorId] = useState<string>('');

  // 1. Fetch Users Roster
  const { data: interns = [], isLoading: isLoadingRoster } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users'),
  });

  // 2. Fetch Invites List
  const { data: invites = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ['invites'],
    queryFn: () => apiRequest<any[]>('/invites'),
  });

  // Create single-use invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteName.trim() || !inviteEmail.trim()) {
        throw new Error('Name and email are required');
      }

      return apiRequest('/invites', {
        method: 'POST',
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          internType:
            inviteRole === USER_ROLES.PAID_INTERN
              ? INTERN_TYPES.PAID
              : inviteRole === USER_ROLES.UNPAID_INTERN
              ? INTERN_TYPES.UNPAID
              : undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Invite Dispatched', message: data.message });
      if (data.inviteLink) {
        setGeneratedInviteLink(data.inviteLink);
      } else {
        setIsInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
      }
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Invite Failed', message: err.message });
    },
  });

  // Resend invite mutation
  const resendMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/invites/${id}/resend`, { method: 'POST' }),
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Invite Resent', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Resend Failed', message: err.message });
    },
  });

  // Cancel invite mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/invites/${id}/cancel`, { method: 'POST' }),
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Invite Cancelled', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Cancel Failed', message: err.message });
    },
  });

  // Level 15 promotion mutation
  const promoteMutation = useMutation({
    mutationFn: async ({ internId, decision }: { internId: string; decision: 'approve' | 'reject' }) => {
      return apiRequest('/users/promote', {
        method: 'POST',
        body: JSON.stringify({ internId, decision }),
      });
    },
    onSuccess: (data) => {
      showToast({ type: 'success', title: 'Promotion Status', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Action failed', message: err.message });
    },
  });

  // Bulk create mutation (PDF Page 2)
  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      const emailList = bulkEmailsText
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => Boolean(e) && e.includes('@'));
      if (emailList.length === 0) {
        throw new Error('Please enter at least one valid email address.');
      }

      return apiRequest('/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          emails: emailList,
          internType: bulkInternType,
          paidInternId: bulkInternType === INTERN_TYPES.UNPAID ? bulkMentorId || undefined : undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Batch Interns Created', message: data.message });
      setIsBulkModalOpen(false);
      setBulkEmailsText('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Batch Creation Failed', message: err.message });
    },
  });

  // Confirm marksheet mutation (PDF Page 6)
  const confirmMarksheetMutation = useMutation({
    mutationFn: async (internId: string) => {
      return apiRequest(`/users/${internId}`, {
        method: 'PATCH',
        body: JSON.stringify({ marksheetConfirmed: true }),
      });
    },
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Marksheet Confirmed',
        message: 'Academic marksheet percentage officially confirmed for Level 2 Certificate eligibility.',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Confirmation Failed', message: err.message });
    },
  });

  const filteredInterns = interns.filter((intern) => {
    if (activeFilter === 'managers') {
      return (
        intern.role === USER_ROLES.ADMIN ||
        intern.role === USER_ROLES.MANAGER ||
        intern.role === USER_ROLES.LEAD
      );
    }
    if (activeFilter === 'paid') return intern.role === USER_ROLES.PAID_INTERN;
    if (activeFilter === 'unpaid') return intern.role === USER_ROLES.UNPAID_INTERN;
    return true;
  });

  const candidateForPromotion = interns.find(
    (i) => i.currentLevel === 15 && i.role === USER_ROLES.UNPAID_INTERN
  );

  const canInvite =
    currentUser?.role === USER_ROLES.ADMIN ||
    currentUser?.role === USER_ROLES.MANAGER ||
    currentUser?.role === USER_ROLES.LEAD ||
    currentUser?.role === USER_ROLES.PAID_INTERN ||
    currentUser?.role === USER_ROLES.UNPAID_INTERN;

  const roleOptions =
    currentUser?.role === USER_ROLES.ADMIN
      ? [
          { value: USER_ROLES.ADMIN, label: 'Super Admin (Limit: 5)' },
          { value: USER_ROLES.MANAGER, label: 'Manager' },
          { value: USER_ROLES.LEAD, label: 'Team Lead' },
          { value: USER_ROLES.PAID_INTERN, label: 'Intern (Paid Track)' },
          { value: USER_ROLES.UNPAID_INTERN, label: 'Intern (Unpaid Track)' },
        ]
      : currentUser?.role === USER_ROLES.MANAGER
      ? [
          { value: USER_ROLES.LEAD, label: 'Team Lead' },
          { value: USER_ROLES.PAID_INTERN, label: 'Intern (Paid Track)' },
          { value: USER_ROLES.UNPAID_INTERN, label: 'Intern (Unpaid Track)' },
        ]
      : currentUser?.role === USER_ROLES.LEAD
      ? [
          { value: USER_ROLES.PAID_INTERN, label: 'Intern (Paid Track)' },
          { value: USER_ROLES.UNPAID_INTERN, label: 'Intern (Unpaid Track)' },
        ]
      : [
          { value: USER_ROLES.UNPAID_INTERN, label: 'Intern (Unpaid Track)' },
        ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              Institutional Roster & Invites
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Active Cohort
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage cohort personnel, send single-use invitation links, and review level progression.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canInvite && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setGeneratedInviteLink(null);
                  setIsInviteModalOpen(true);
                }}
                leftIcon={<UserPlus className="size-4" />}
              >
                Invite Member
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsBulkModalOpen(true)}
                leftIcon={<Users className="size-4" />}
              >
                Batch Add Interns
              </Button>
            </>
          )}

          <div className="inline-flex p-1 bg-tint rounded-control border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={cn(
                'px-3 py-1.5 rounded-control transition-colors cursor-pointer',
                activeTab === 'roster'
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'text-ink-soft hover:text-navy-800'
              )}
            >
              Active Roster ({interns.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              className={cn(
                'px-3 py-1.5 rounded-control transition-colors cursor-pointer',
                activeTab === 'invites'
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'text-ink-soft hover:text-navy-800'
              )}
            >
              Pending Invites ({invites.filter((inv: any) => inv.status === 'pending').length})
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'roster' && (
        <>
          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-soft">View:</span>
            {(['all', 'managers', 'paid', 'unpaid'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-3 py-1 rounded-control text-xs font-semibold capitalize transition-colors cursor-pointer',
                  activeFilter === filter
                    ? 'bg-navy-800 text-white shadow-xs'
                    : 'bg-surface border border-line text-ink-soft hover:bg-tint hover:text-navy-800'
                )}
              >
                {filter === 'all'
                  ? 'All Roles'
                  : filter === 'managers'
                  ? 'Leadership & Management'
                  : filter === 'paid'
                  ? 'Core (Paid)'
                  : 'Unpaid Interns'}
              </button>
            ))}
          </div>

          {/* Interns Table */}
          <Card padding="none" className="overflow-hidden border-t-2 border-t-navy-800">
            {isLoadingRoster ? (
              <div className="py-12 text-center text-xs text-ink-faint animate-pulse">
                Loading official roster...
              </div>
            ) : filteredInterns.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Users className="size-8" />}
                  title="No team members match this filter"
                  description="When team members accept invites, their records and monthly levels will appear here."
                  actionLabel={canInvite ? 'Invite New Member' : undefined}
                  onAction={() => setIsInviteModalOpen(true)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-ink-faint font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Assigned Mentor</th>
                      <th className="py-3 px-4">Level (of 15)</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4">Marksheet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredInterns.map((intern) => {
                      const isPaid = intern.role === USER_ROLES.PAID_INTERN;
                      const isUnpaid = intern.role === USER_ROLES.UNPAID_INTERN;

                      return (
                        <tr key={intern.id} className="hover:bg-tint transition-colors">
                          <td className="py-3.5 px-4 font-bold text-ink flex items-center gap-2.5">
                            <Avatar name={intern.name} size="sm" />
                            <div>
                              <span className="font-semibold text-ink">{intern.name}</span>
                              <span className="block text-[10px] text-ink-faint font-normal">{intern.email}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              tone={
                                intern.role === USER_ROLES.ADMIN
                                  ? 'navy'
                                  : intern.role === USER_ROLES.MANAGER
                                  ? 'amber'
                                  : intern.role === USER_ROLES.LEAD
                                  ? 'sky'
                                  : isPaid
                                  ? 'mint'
                                  : 'violet'
                              }
                            >
                              {intern.role === USER_ROLES.ADMIN
                                ? 'Super Admin'
                                : intern.role === USER_ROLES.MANAGER
                                ? 'Manager'
                                : intern.role === USER_ROLES.LEAD
                                ? 'Team Lead'
                                : isPaid
                                ? 'Intern · Paid'
                                : 'Intern · Unpaid'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-ink-soft font-medium">
                            {intern.pairedPaidInternName || (isPaid ? 'Lead / Independent' : 'Assigned Mentor')}
                          </td>

                          <td className="py-3.5 px-4">
                            {isPaid || isUnpaid ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-canvas rounded-full overflow-hidden border border-line">
                                  <div
                                    style={{ width: `${Math.min(100, ((intern.currentLevel || 1) / 15) * 100)}%` }}
                                    className="h-full bg-navy-800 rounded-full"
                                  />
                                </div>
                                <span className="font-semibold text-ink">
                                  {intern.currentLevel || 1}/15
                                </span>
                              </div>
                            ) : (
                              <span className="text-ink-faint font-semibold">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {intern.attendancePercentage !== undefined && intern.attendancePercentage !== null
                              ? `${intern.attendancePercentage}%`
                              : '—'}
                          </td>

                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <div className="flex items-center gap-2">
                                {intern.marksheetConfirmed ? (
                                  <Badge variant="success" size="sm">
                                    {intern.marksheetPercentage}% Confirmed
                                  </Badge>
                                ) : intern.marksheetPercentage !== undefined && intern.marksheetPercentage !== null ? (
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant={intern.marksheetPercentage >= 80 ? 'warning' : 'danger'} size="sm">
                                      {intern.marksheetPercentage}% Pending
                                    </Badge>
                                    {(currentUser?.role === USER_ROLES.ADMIN ||
                                      currentUser?.role === USER_ROLES.MANAGER ||
                                      currentUser?.role === USER_ROLES.LEAD) && (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        isLoading={confirmMarksheetMutation.isPending}
                                        onClick={() => confirmMarksheetMutation.mutate(intern.id)}
                                      >
                                        Confirm
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">Pending upload</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Not required</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Promotion Candidate Review */}
          {candidateForPromotion && (
            <Card padding="md" className="border-t-4 border-t-amber-500">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Candidate for Core (Paid) Promotion
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                <strong>{candidateForPromotion.name}</strong> has passed all 15 monthly levels.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  isLoading={promoteMutation.isPending}
                  onClick={() =>
                    promoteMutation.mutate({ internId: candidateForPromotion.id, decision: 'approve' })
                  }
                >
                  Approve Promotion to Core Team
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={promoteMutation.isPending}
                  onClick={() =>
                    promoteMutation.mutate({ internId: candidateForPromotion.id, decision: 'reject' })
                  }
                >
                  Reject
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'invites' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Single-Use Invites</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Single-use links valid for 7 days. Stored cryptographically hashed.
              </p>
            </div>
            {canInvite && (
              <Button size="xs" onClick={() => setIsInviteModalOpen(true)} leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                New Invite
              </Button>
            )}
          </div>

          {isLoadingInvites ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading invitations...
            </div>
          ) : invites.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Mail className="w-8 h-8" />}
                title="No invitations dispatched yet"
                description="Use the Invite Member button to invite new colleagues via single-use email links."
                actionLabel={canInvite ? 'Invite First Member' : undefined}
                onAction={() => setIsInviteModalOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Invitee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invites.map((inv: any) => {
                    const isPending = inv.status === 'pending';
                    const isExpired = new Date(inv.expiresAt) < new Date() || inv.status === 'expired';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div>{inv.name}</div>
                          <span className="text-[11px] text-slate-400 font-normal">{inv.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="default">{inv.role.replace('_', ' ').toUpperCase()}</Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending && !isExpired ? (
                            <Badge variant="warning">Pending</Badge>
                          ) : inv.status === 'accepted' ? (
                            <Badge variant="success">Accepted</Badge>
                          ) : inv.status === 'cancelled' ? (
                            <Badge variant="danger">Cancelled</Badge>
                          ) : (
                            <Badge variant="default">Expired</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="xs"
                                variant="outline"
                                isLoading={resendMutation.isPending}
                                onClick={() => resendMutation.mutate(inv.id)}
                                leftIcon={<RefreshCw className="w-3 h-3" />}
                              >
                                Resend
                              </Button>
                              <Button
                                size="xs"
                                variant="danger"
                                isLoading={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(inv.id)}
                                leftIcon={<XCircle className="w-3 h-3" />}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="Invite Institutional Member"
        >
          {generatedInviteLink ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs">
                <span className="font-bold block mb-1">Invitation Dispatched!</span>
                An invitation email was sent to <strong>{inviteEmail}</strong>. You can also copy the single-use invite link directly below:
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInviteLink}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setGeneratedInviteLink(null);
                    setInviteName('');
                    setInviteEmail('');
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Full Name (e.g. Dr. Rajesh)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@smru.edu.in"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select
                label="Assigned Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                options={roleOptions}
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  isLoading={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                  leftIcon={<Mail className="w-4 h-4" />}
                >
                  Send Single-Use Invite
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Batch Add Interns Modal (PDF Page 2) */}
      {isBulkModalOpen && (
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Batch Add Interns at Once"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create multiple interns simultaneously per Central Office rules. Enter one email per line or separate by commas. Default credentials and welcome instructions will be dispatched.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Intern Email Addresses
              </label>
              <Textarea
                rows={5}
                placeholder={"intern1@smru.edu.in\nintern2@smru.edu.in\nintern3@smru.edu.in"}
                value={bulkEmailsText}
                onChange={(e) => setBulkEmailsText(e.target.value)}
              />
            </div>

            <Select
              label="Intern Tier"
              value={bulkInternType}
              onChange={(e) => setBulkInternType(e.target.value)}
              options={
                currentUser?.role === USER_ROLES.PAID_INTERN
                  ? [{ value: INTERN_TYPES.UNPAID, label: 'Unpaid Intern (Auto-paired to you)' }]
                  : [
                      { value: INTERN_TYPES.UNPAID, label: 'Unpaid Intern (Foundational - 15 Levels)' },
                      { value: INTERN_TYPES.PAID, label: 'Core Intern (Paid Tier)' },
                    ]
              }
            />

            {bulkInternType === INTERN_TYPES.UNPAID && currentUser?.role !== USER_ROLES.PAID_INTERN && (
              <Select
                label="Assigned Core Intern (Mentor)"
                value={bulkMentorId}
                onChange={(e) => setBulkMentorId(e.target.value)}
                options={[
                  { value: '', label: 'Unassigned / Central Office Lead' },
                  ...interns
                    .filter((u: any) => u.role === USER_ROLES.PAID_INTERN)
                    .map((p: any) => ({ value: p.id, label: `${p.name} (Core Intern)` })),
                ]}
              />
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={bulkCreateMutation.isPending}
                onClick={() => bulkCreateMutation.mutate()}
                leftIcon={<Users className="w-4 h-4" />}
              >
                Create Interns
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default InternsScreen;
