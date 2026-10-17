import React, { useState, useMemo } from 'react';
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
import { USER_ROLES } from '@command-center/shared';
import {
  Check,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  MapPin,
  Shield,
  Home,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const AttendanceScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveCategory, setLeaveCategory] = useState<'full_day' | 'half_day' | 'work_from_home' | 'other'>('full_day');
  const [partialDuration, setPartialDuration] = useState('First Half (09:00 - 13:00)');
  const [leaveStart, setLeaveStart] = useState('2026-10-21');
  const [leaveEnd, setLeaveEnd] = useState('2026-10-22');
  const [leaveReason, setLeaveReason] = useState('');

  // Review modal state
  const [reviewingLeave, setReviewingLeave] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'more_info_needed'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  const isManagement =
    currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.LEAD;

  // 1. Fetch today's check-ins
  const { data: todayData, isLoading: isLoadingToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => apiRequest<any>('/attendance/today'),
    refetchInterval: 5000,
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

  // Geolocation helper
  const getCurrentLocation = (): Promise<{ latitude?: number; longitude?: number; accuracy?: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({});
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('[Geolocation] Not available or denied:', err.message);
          resolve({});
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getCurrentLocation();
      return apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(coords),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Checked In', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Check-in failed', message: err.message });
    },
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getCurrentLocation();
      return apiRequest('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify(coords),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Checked Out', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-register'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Check-out failed', message: err.message });
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

  // Review leave request mutation (for Admin/Lead)
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

  // Dynamically map monthly register for October 2026
  const octoberRegister = useMemo(() => {
    const recordsMap = new Map<number, any>();
    if (registerData?.records && Array.isArray(registerData.records)) {
      registerData.records.forEach((r: any) => {
        try {
          const parts = r.date.split('-');
          if (parts.length === 3 && parts[0] === '2026' && parts[1] === '10') {
            const dayNum = parseInt(parts[2], 10);
            recordsMap.set(dayNum, r);
          }
        } catch {
          // ignore parsing error
        }
      });
    }

    const days: any[] = [];
    for (let day = 1; day <= 31; day++) {
      const d = new Date(2026, 9, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      const rec = recordsMap.get(day);
      let code = '';
      let color = 'bg-slate-50 dark:bg-slate-800/40 text-slate-400';

      if (isWeekend) {
        code = 'WO';
        color = 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold';
      } else if (day === 2) {
        code = 'HO';
        color = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold';
      } else if (rec) {
        if (rec.status === 'present') {
          code = 'P';
          color = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold';
        } else if (rec.status === 'late') {
          code = 'L';
          color = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold';
        } else if (rec.status === 'half_day') {
          code = 'HD';
          color = 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold';
        } else if (rec.status === 'leave') {
          code = 'LV';
          color = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold';
        } else if (rec.status === 'absent') {
          code = 'A';
          color = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold';
        }
      }

      days.push({ day, code, color });
    }
    return days;
  }, [registerData]);

  // Real today members list
  const todayRecords = todayData?.records || [];
  const inCount = todayData?.stats?.in ?? 0;
  const lateCount = todayData?.stats?.late ?? 0;
  const notYetCount = todayData?.stats?.notYet ?? 0;

  // Pending leave requests
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Attendance & Campus Verification
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            St. Mary’s Rehabilitation University Geofence (800m Boundary) · Strict privacy enforced.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(true)}>
            Apply for Leave / WFH
          </Button>
          <Button
            size="sm"
            isLoading={checkInMutation.isPending}
            onClick={() => checkInMutation.mutate()}
          >
            Check in
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={checkOutMutation.isPending}
            onClick={() => checkOutMutation.mutate()}
          >
            Check out
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Attendance</span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {registerData?.attendanceThisMonth || 94}%
          </div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days Present</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {registerData?.daysPresent ?? 12}
          </div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Late Arrivals</span>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {registerData?.lateArrivals ?? 2}
          </div>
        </Card>
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Leave Taken</span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {registerData?.leaveTaken ?? 1}
          </div>
        </Card>
      </div>

      {/* Main Grid: Today's Real Roster + October Register */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today Roster */}
        <div className="lg:col-span-5">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isManagement ? "Today's Central Office Roster" : "Your Daily Status"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {isManagement ? "Authorized Administrative View" : "Strict Attendance Privacy"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  In {inCount}
                </span>
                <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Late {lateCount}
                </span>
                <span className="text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  Not yet {notYetCount}
                </span>
              </div>
            </div>

            {isLoadingToday ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading live check-ins...
              </div>
            ) : todayRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active records found for today.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-96 overflow-y-auto">
                {todayRecords.map((item: any) => {
                  const checkInDisplay = item.checkInTime
                    ? new Date(item.checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not checked in';

                  return (
                    <div key={item.userId} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-400 text-[10px]">
                            {item.role?.replace('_', ' ').toUpperCase()}
                          </span>
                          {item.withinCampus === true && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.2 rounded">
                              Campus Verified
                            </span>
                          )}
                          {item.withinCampus === false && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.2 rounded">
                              Off-Campus / Remote
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
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

        {/* October Register Calendar Grid */}
        <div className="lg:col-span-7 space-y-6">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Official Register — October 2026
              </h3>
              <span className="text-[11px] text-slate-400">
                {currentUser?.name}
              </span>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center font-bold text-slate-500 dark:text-slate-400 text-xs py-1 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Register Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-xs">
              <div className="h-10 rounded-lg bg-slate-50/40 dark:bg-slate-800/20 p-1 flex items-start text-slate-300 text-[10px]">
                28
              </div>
              <div className="h-10 rounded-lg bg-slate-50/40 dark:bg-slate-800/20 p-1 flex items-start text-slate-300 text-[10px]">
                29
              </div>
              <div className="h-10 rounded-lg bg-slate-50/40 dark:bg-slate-800/20 p-1 flex items-start text-slate-300 text-[10px]">
                30
              </div>

              {octoberRegister.map((d) => (
                <div
                  key={d.day}
                  className={`h-10 rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-1 flex flex-col justify-between ${d.color}`}
                >
                  <span className="text-[10px] leading-none opacity-80">{d.day}</span>
                  <span className="text-[11px] text-center">{d.code}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present (P)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late (L)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Holiday (HO)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Weekend (WO)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Leave (LV)
              </span>
            </div>
          </Card>

          {/* Pending Leave Requests (Visible to Admin and Lead) */}
          {isManagement && (
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Leave & WFH Approvals ({pendingLeaves.length} Pending Review)
                </h3>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No pending leave or WFH applications requiring review.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {pendingLeaves.map((lr: any) => (
                    <div key={lr.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{lr.userName}</span>
                          <Badge variant="purple" size="sm">
                            {(lr.leaveCategory || 'full_day').replace('_', ' ').toUpperCase()}
                          </Badge>
                          {lr.partialDayDuration && (
                            <span className="text-[10px] text-slate-500 font-medium">({lr.partialDayDuration})</span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          Dates: {lr.startDate} to {lr.endDate}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 italic text-[11px] mt-0.5 bg-slate-50 dark:bg-slate-800 p-2 rounded">
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

      {/* Review Leave Modal */}
      {reviewingLeave && (
        <Modal
          isOpen={true}
          onClose={() => setReviewingLeave(null)}
          title={`Review Leave: ${reviewingLeave.userName}`}
          description={`Action: ${reviewAction.replace(/_/g, ' ').toUpperCase()}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div><strong className="text-slate-700 dark:text-slate-300">Category:</strong> {reviewingLeave.leaveCategory}</div>
              <div><strong className="text-slate-700 dark:text-slate-300">Period:</strong> {reviewingLeave.startDate} to {reviewingLeave.endDate}</div>
              <div><strong className="text-slate-700 dark:text-slate-300">Applicant Reason:</strong> {reviewingLeave.reason}</div>
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

            <div className="flex justify-end gap-2.5 pt-3">
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 py-2 px-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 py-2 px-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick-Fill Template Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
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
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-100 border border-blue-200 dark:border-blue-800"
              >
                <Sparkles className="w-3 h-3" /> WFH Sprint Template
              </button>
              <button
                type="button"
                onClick={() =>
                  setLeaveReason(
                    'Requesting leave of absence due to medical consultation and recovery. Ongoing task parts have been documented and handed over to fellow team members.'
                  )
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              >
                <FileText className="w-3 h-3" /> Medical Leave Template
              </button>
              <button
                type="button"
                onClick={() =>
                  setLeaveReason(
                    'Requesting academic leave of absence for semester university examination schedule. Academic examination timetable is available for Central Office verification.'
                  )
                }
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md hover:bg-purple-100 border border-purple-200 dark:border-purple-800"
              >
                <Calendar className="w-3 h-3" /> Exam Leave Template
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

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
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
