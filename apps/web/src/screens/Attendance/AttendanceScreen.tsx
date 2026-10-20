import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { StatTile } from '../../components/ui/StatTile.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { useToast } from '../../components/ui/Toast.js';
import { USER_ROLES } from '@command-center/shared';
import {
  Clock,
  Calendar,
  Settings,
  FileText,
  Sparkles,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';

export const AttendanceScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveCategory, setLeaveCategory] = useState<'full_day' | 'half_day' | 'work_from_home' | 'other'>('full_day');
  const [partialDuration, setPartialDuration] = useState('First Half (09:00 - 13:00)');
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  // Rules modal state (Admin only)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(4.0);
  const [absentCutoffTime, setAbsentCutoffTime] = useState('11:00');

  // Review modal state
  const [reviewingLeave, setReviewingLeave] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'more_info_needed'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  const isManagement =
    currentUser?.role === USER_ROLES.ADMIN ||
    currentUser?.role === USER_ROLES.MANAGER ||
    currentUser?.role === USER_ROLES.LEAD;
  const isAdmin = currentUser?.role === USER_ROLES.ADMIN;

  // 1. Fetch today's check-ins
  const { data: todayData, isLoading: isLoadingToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => apiRequest<any>('/attendance/today'),
    refetchInterval: 10000,
  });

  // 2. Fetch user's monthly register
  const { data: registerData } = useQuery({
    queryKey: ['attendance-register', currentUser?.id],
    queryFn: () => apiRequest<any>(`/attendance/register?userId=${currentUser?.id}`),
    enabled: !!currentUser?.id,
  });

  // 3. Fetch leave requests
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['attendance-leave'],
    queryFn: () => apiRequest<any[]>('/attendance/leave'),
  });

  // 4. Fetch attendance rules
  const { data: rulesData } = useQuery<any>({
    queryKey: ['attendance-rules'],
    queryFn: () => apiRequest<any>('/attendance/rules'),
  });

  React.useEffect(() => {
    if (rulesData) {
      setOfficeStartTime(rulesData.officeStartTime || rulesData.office_start_time || '09:00');
      setGraceMinutes(rulesData.graceMinutes ?? rulesData.grace_minutes ?? 15);
      setHalfDayHours(rulesData.halfDayHours ?? rulesData.half_day_hours ?? 4.0);
      setAbsentCutoffTime(rulesData.absentCutoffTime || rulesData.absent_cutoff_time || '11:00');
    }
  }, [rulesData]);

  // Simple Check-In mutation (No GPS, purely server timestamp verification)
  const checkInMutation = useMutation({
    mutationFn: () =>
      apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Checked In', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Check-in failed', message: err.message });
    },
  });

  // Simple Check-Out mutation (No GPS)
  const checkOutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Checked Out', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Check-out failed', message: err.message });
    },
  });

  // Update attendance rules mutation (Admin only)
  const updateRulesMutation = useMutation({
    mutationFn: () =>
      apiRequest('/attendance/rules', {
        method: 'PUT',
        body: JSON.stringify({
          officeStartTime,
          graceMinutes: Number(graceMinutes),
          halfDayHours: Number(halfDayHours),
          absentCutoffTime,
        }),
      }),
    onSuccess: () => {
      showToast({ type: 'success', title: 'Rules Updated', message: 'Attendance policy rules saved successfully.' });
      setIsRulesModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['attendance-rules'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Update failed', message: err.message });
    },
  });

  // Request leave mutation
  const leaveMutation = useMutation({
    mutationFn: () =>
      apiRequest('/attendance/leave', {
        method: 'POST',
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          leaveCategory,
          partialDayDuration: leaveCategory === 'half_day' ? partialDuration : undefined,
          reason: leaveReason.trim(),
        }),
      }),
    onSuccess: (data: any) => {
      showToast({
        type: 'success',
        title: 'Application Submitted',
        message: data.message || 'Leave request submitted for administrative review.',
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      queryClient.invalidateQueries({ queryKey: ['attendance-leave'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Request failed', message: err.message });
    },
  });

  // Review leave mutation
  const reviewLeaveMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: string; comment?: string }) => {
      return apiRequest(`/attendance/leave/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Review Recorded', message: data.message });
      setReviewingLeave(null);
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['attendance-leave'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Review failed', message: err.message });
    },
  });

  // Current month calendar days
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const monthlyRegister = useMemo(() => {
    const recordsMap = new Map<number, any>();
    if (registerData?.records && Array.isArray(registerData.records)) {
      registerData.records.forEach((r: any) => {
        try {
          const parts = r.date.split('-');
          if (parts.length === 3 && parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === (currentMonth + 1)) {
            const dayNum = parseInt(parts[2], 10);
            recordsMap.set(dayNum, r);
          }
        } catch {
          // ignore
        }
      });
    }

    const days: any[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      const rec = recordsMap.get(day);
      let code = '';
      let color = 'bg-surface dark:bg-navy-900/60 border border-line text-ink-soft hover:border-navy-300 dark:hover:border-navy-600';
      let statusLabel = 'Working Day';

      if (isWeekend) {
        code = 'WO';
        color = 'bg-slate-100/70 dark:bg-navy-950/70 border border-slate-200/70 dark:border-navy-800/80 text-ink-faint font-semibold';
        statusLabel = 'Weekend (Off)';
      } else if (rec) {
        if (rec.status === 'present') {
          code = 'P';
          color = 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/70 text-emerald-800 dark:text-emerald-300 font-bold';
          statusLabel = 'Present';
        } else if (rec.status === 'late') {
          code = 'L';
          color = 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/70 text-amber-900 dark:text-amber-300 font-bold';
          statusLabel = 'Late Arrival';
        } else if (rec.status === 'half_day') {
          code = 'HD';
          color = 'bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-700/70 text-sky-900 dark:text-sky-300 font-bold';
          statusLabel = 'Half Day';
        } else if (rec.status === 'leave') {
          code = 'LV';
          color = 'bg-violet-50 dark:bg-violet-950/50 border border-violet-300 dark:border-violet-700/70 text-violet-900 dark:text-violet-300 font-bold';
          statusLabel = 'Approved Leave';
        } else if (rec.status === 'absent') {
          code = 'A';
          color = 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/70 text-rose-900 dark:text-rose-300 font-bold';
          statusLabel = 'Absent';
        }
      }

      days.push({ day, code, color, statusLabel });
    }
    return days;
  }, [registerData, currentYear, currentMonth, daysInMonth]);

  const todayRecords = todayData?.records || [];
  const inCount = todayData?.stats?.in ?? 0;
  const lateCount = todayData?.stats?.late ?? 0;
  const notYetCount = todayData?.stats?.notYet ?? 0;
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending');

  // Check if current user is checked in today
  const currentUserRecord = todayRecords.find((r: any) => r.userId === currentUser?.id);
  const isCheckedIn = Boolean(currentUserRecord?.checkInTime && !currentUserRecord?.checkOutTime);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              Attendance Register
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Privacy-First
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            University Central Office · Privacy-first attendance without location tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (rulesData) {
                  setOfficeStartTime(rulesData.officeStartTime || rulesData.office_start_time || '09:00');
                  setGraceMinutes(rulesData.graceMinutes ?? rulesData.grace_minutes ?? 15);
                  setHalfDayHours(rulesData.halfDayHours ?? rulesData.half_day_hours ?? 4.0);
                  setAbsentCutoffTime(rulesData.absentCutoffTime || rulesData.absent_cutoff_time || '11:00');
                }
                setIsRulesModalOpen(true);
              }}
              leftIcon={<Settings className="size-4" />}
            >
              Policy Rules
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLeaveModalOpen(true)}
          >
            Apply for Leave
          </Button>

          {!isCheckedIn ? (
            <Button
              size="sm"
              isLoading={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
              leftIcon={<LogIn className="size-4" />}
            >
              Check In
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              isLoading={checkOutMutation.isPending}
              onClick={() => checkOutMutation.mutate()}
              leftIcon={<LogOut className="size-4" />}
            >
              Check Out
            </Button>
          )}
        </div>
      </header>

      {/* Summary StatTiles */}
      <section aria-label="Attendance Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Monthly Attendance"
          value={`${registerData?.attendanceThisMonth ?? 0}%`}
          icon={CalendarClock}
          tone="teal"
          hint="Threshold for Cert: 75%"
        />
        <StatTile
          label="Days Present"
          value={registerData?.daysPresent ?? 0}
          icon={CheckCircle2}
          tone="success"
          hint="Full & half days attended"
        />
        <StatTile
          label="Late Arrivals"
          value={registerData?.lateArrivals ?? 0}
          icon={Clock}
          tone="amber"
          hint="After grace period"
        />
        <StatTile
          label="Approved Leave"
          value={registerData?.leaveTaken ?? 0}
          icon={FileText}
          tone="indigo"
          hint="Official days off"
        />
      </section>

      {/* Main Grid: Today's Roster + Monthly Register */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today Roster */}
        <div className="lg:col-span-5">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink font-display">
                  {isManagement ? "Today's Office Roster" : "Your Daily Status"}
                </h3>
                <span className="text-xs text-ink-soft">
                  {isManagement ? "Administrative Overview" : "Personal Record"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800/80 dark:text-emerald-300 px-2 py-0.5 rounded-sm">
                  In {inCount}
                </span>
                <span className="text-amber-800 bg-amber-50 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-800/80 dark:text-amber-300 px-2 py-0.5 rounded-sm">
                  Late {lateCount}
                </span>
                <span className="text-ink-soft bg-canvas border border-line dark:bg-navy-900/60 dark:border-navy-700 dark:text-ink-soft px-2 py-0.5 rounded-sm">
                  Not in {notYetCount}
                </span>
              </div>
            </div>

            {isLoadingToday ? (
              <div className="py-8 text-center text-xs text-ink-soft animate-pulse">
                Loading attendance records...
              </div>
            ) : todayRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-soft">
                No active records recorded for today yet.
              </div>
            ) : (
              <div className="divide-y divide-line text-xs max-h-96 overflow-y-auto">
                {todayRecords.map((item: any) => {
                  const checkInDisplay = item.checkInTime
                    ? new Date(item.checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not checked in';

                  return (
                    <div key={item.userId} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-ink font-display">{item.name}</span>
                        <div className="text-[10px] text-ink-soft font-semibold uppercase tracking-wider mt-0.5">
                          {item.role?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-ink-soft text-[11px] font-mono">
                          {checkInDisplay}
                        </span>
                        <Badge
                          variant={
                            item.status === 'present'
                              ? 'success'
                              : item.status === 'late'
                              ? 'warning'
                              : item.status === 'leave'
                              ? 'purple'
                              : 'default'
                          }
                          size="sm"
                        >
                          {item.status === 'present'
                            ? 'Present'
                            : item.status === 'late'
                            ? 'Late'
                            : item.status === 'leave'
                            ? 'On Leave'
                            : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Monthly Register Calendar Grid */}
        <div className="lg:col-span-7 space-y-6">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink font-display">
                Official Register — {monthName} {currentYear}
              </h3>
              <span className="text-xs text-ink-soft font-medium">
                {currentUser?.name}
              </span>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center font-bold text-ink-soft text-xs py-2 border-b border-line mb-2.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Register Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-xs">
              {monthlyRegister.map((d) => (
                <div
                  key={d.day}
                  title={`Day ${d.day}: ${d.statusLabel}`}
                  className={`h-11 sm:h-12 rounded-sm p-1.5 flex flex-col justify-between transition-colors ${d.color}`}
                >
                  <span className="text-[10px] font-mono font-bold leading-none text-ink">{d.day}</span>
                  <span className="text-[11px] text-center font-bold tracking-tight">{d.code}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-soft mt-4 pt-3 border-t border-line">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" /> Present (P)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" /> Late (L)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-sky-500" /> Half-Day (HD)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-400 dark:bg-navy-600" /> Weekend (WO)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-indigo-500" /> Leave (LV)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500" /> Absent (A)
              </span>
            </div>
          </Card>

          {/* Pending Leave Requests (Visible to Admin and Lead) */}
          {isManagement && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink font-display">
                  Leave & WFH Approvals ({pendingLeaves.length} Pending Review)
                </h3>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="text-center py-6 text-xs text-ink-soft">
                  No pending leave applications requiring review.
                </div>
              ) : (
                <div className="divide-y divide-line text-xs">
                  {pendingLeaves.map((lr: any) => (
                    <div key={lr.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink font-display">{lr.userName}</span>
                          <Badge variant="purple" size="sm">
                            {(lr.leaveCategory || 'full_day').replace('_', ' ').toUpperCase()}
                          </Badge>
                          {lr.partialDayDuration && (
                            <span className="text-[10px] text-ink-soft font-medium">({lr.partialDayDuration})</span>
                          )}
                        </div>
                        <p className="text-ink-soft mt-1">
                          Dates: {lr.startDate} to {lr.endDate}
                        </p>
                        <p className="text-ink italic text-[11px] mt-1 bg-tint border border-line p-2.5 rounded-sm">
                          “{lr.reason}”
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setReviewingLeave(lr);
                            setReviewAction('more_info_needed');
                          }}
                        >
                          Need Info
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => {
                            setReviewingLeave(lr);
                            setReviewAction('reject');
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => {
                            setReviewingLeave(lr);
                            setReviewAction('approve');
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Admin Attendance Policy Rules Modal */}
      {isAdmin && (
        <Modal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          title="Attendance Policy Configuration"
          description="Adjust Central Office work hours, grace window, and cutoff rules."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Office Start Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Half-Day Minimum Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="8"
                  value={halfDayHours}
                  onChange={(e) => setHalfDayHours(parseFloat(e.target.value) || 4.0)}
                  className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Absent Cutoff Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={absentCutoffTime}
                  onChange={(e) => setAbsentCutoffTime(e.target.value)}
                  className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
                />
              </div>
            </div>

            <div className="p-3 rounded-card bg-tint text-[11px] text-navy-800 dark:text-navy-100 border border-navy-200/60 dark:border-navy-700/60 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-navy-600 dark:text-navy-300" />
              <span>
                Interns checking in between {officeStartTime} and {graceMinutes} minutes after are marked Present. After grace period, arrivals are marked Late. Check-ins after {absentCutoffTime} without an approved leave request are marked Absent.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button variant="outline" size="sm" onClick={() => setIsRulesModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={updateRulesMutation.isPending}
                disabled={updateRulesMutation.isPending}
                onClick={() => updateRulesMutation.mutate()}
              >
                Save Policy
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Leave Modal */}
      {reviewingLeave && (
        <Modal
          isOpen={true}
          onClose={() => setReviewingLeave(null)}
          title={`Review Leave: ${reviewingLeave.userName}`}
          description={`Action: ${reviewAction.replace(/_/g, ' ').toUpperCase()}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-sm bg-tint border border-line text-xs space-y-1">
              <div><strong className="text-ink">Category:</strong> {reviewingLeave.leaveCategory}</div>
              <div><strong className="text-ink">Period:</strong> {reviewingLeave.startDate} to {reviewingLeave.endDate}</div>
              <div><strong className="text-ink">Applicant Reason:</strong> {reviewingLeave.reason}</div>
            </div>

            <Textarea
              label="Administrative Review Notes / Justification *"
              placeholder={
                reviewAction === 'approve'
                  ? 'e.g., Approved. Ensure all sprint deliverables are completed or handed over.'
                  : reviewAction === 'more_info_needed'
                  ? 'e.g., Please attach your examination schedule or provide clarification on ongoing task handoffs.'
                  : 'e.g., Leave cannot be accommodated during the current production release week.'
              }
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              required
            />

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <Button variant="outline" size="sm" onClick={() => setReviewingLeave(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={reviewAction === 'reject' ? 'danger' : 'primary'}
                isLoading={reviewLeaveMutation.isPending}
                disabled={reviewLeaveMutation.isPending}
                onClick={() =>
                  reviewLeaveMutation.mutate({
                    id: reviewingLeave.id,
                    action: reviewAction,
                    comment: reviewComment,
                  })
                }
              >
                Confirm {reviewAction.replace(/_/g, ' ')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Apply for Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Leave or Work From Home"
        description="Formal leave requests are routed to Central Office Administrators for review."
      >
        <div className="space-y-4">
          <Select
            label="Application Type *"
            value={leaveCategory}
            onChange={(e) => setLeaveCategory(e.target.value as any)}
            options={[
              { value: 'full_day', label: 'Full-Day Leave of Absence' },
              { value: 'half_day', label: 'Half-Day Leave (Morning / Afternoon)' },
              { value: 'work_from_home', label: 'Work From Home (Remote Sprint)' },
              { value: 'other', label: 'Other / Medical / Academic Exam' },
            ]}
          />

          {leaveCategory === 'half_day' && (
            <Select
              label="Session Duration"
              value={partialDuration}
              onChange={(e) => setPartialDuration(e.target.value)}
              options={[
                { value: 'First Half (09:00 - 13:00)', label: 'First Half (09:00 - 13:00)' },
                { value: 'Second Half (13:00 - 17:30)', label: 'Second Half (13:00 - 17:30)' },
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="w-full rounded-control border border-line py-2 px-3 text-xs bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-navy-500 min-h-11"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-ink-soft block mb-1.5">
              Quick-Fill Standard Letter Templates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setLeaveReason(
                    'Requesting formal permission to Work From Home on the specified dates to focus on development deliverables for our current project sprint. All daily standup checkpoints will be maintained and commits pushed to GitHub on schedule.'
                  )
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-tint text-navy-800 dark:text-navy-100 px-2 py-1.5 rounded-control hover:bg-navy-100 dark:hover:bg-navy-900 border border-navy-200/60 dark:border-navy-700 min-h-9 cursor-pointer"
              >
                <Sparkles className="size-3 text-navy-600 dark:text-navy-300" /> WFH Sprint
              </button>
              <button
                type="button"
                onClick={() =>
                  setLeaveReason(
                    'Requesting leave of absence due to medical consultation and recovery. Ongoing task parts have been documented and handed over to fellow team members.'
                  )
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent-50 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 px-2 py-1.5 rounded-control hover:bg-accent-100 border border-accent-200/60 dark:border-accent-800 min-h-9 cursor-pointer"
              >
                <FileText className="size-3 text-accent-600 dark:text-accent-300" /> Medical Leave
              </button>
              <button
                type="button"
                onClick={() =>
                  setLeaveReason(
                    'Requesting academic leave of absence for semester university examination schedule. Academic examination timetable is available for Central Office verification.'
                  )
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-1.5 rounded-control hover:bg-purple-100 border border-purple-200 dark:border-purple-800 min-h-9 cursor-pointer"
              >
                <Calendar className="w-3 h-3" /> Exam Leave
              </button>
            </div>
          </div>

          <Textarea
            label="Formal Reason / Justification *"
            placeholder="Type your formal leave letter or select a quick-fill template above..."
            rows={4}
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
            <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={leaveMutation.isPending}
              disabled={!leaveReason.trim() || leaveMutation.isPending}
              onClick={() => leaveMutation.mutate()}
            >
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
