import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Select } from '../../components/ui/Select.js';
import { useToast } from '../../components/ui/Toast.js';
import { USER_ROLES, INTERN_TYPES } from '@command-center/shared';

export const InternsScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [bulkEmails, setBulkEmails] = useState('');
  const [internType, setInternType] = useState<string>(INTERN_TYPES.UNPAID);
  const [worksWithId, setWorksWithId] = useState<string>('');

  const { data: interns = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users'),
  });

  const coreInterns = interns.filter((i) => i.role === USER_ROLES.PAID_INTERN);

  // Set default core intern for worksWithId
  React.useEffect(() => {
    if (coreInterns.length > 0 && !worksWithId) {
      setWorksWithId(coreInterns[0].id);
    }
  }, [coreInterns, worksWithId]);

  // Bulk create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const emailList = bulkEmails
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      if (emailList.length === 0) {
        throw new Error('Please enter at least one valid email address');
      }

      return apiRequest('/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          emails: emailList,
          type: internType,
          worksWithId: internType === INTERN_TYPES.UNPAID ? worksWithId : undefined,
        }),
      });
    },
    onSuccess: (data) => {
      showToast({ type: 'success', title: 'Interns Created', message: data.message });
      setBulkEmails('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Creation failed', message: err.message });
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

  const filteredInterns = interns.filter((intern) => {
    if (activeFilter === 'paid') return intern.role === USER_ROLES.PAID_INTERN;
    if (activeFilter === 'unpaid') return intern.role === USER_ROLES.UNPAID_INTERN;
    return true;
  });

  // Candidate for Level 15 promotion (Arjun T.)
  const candidateForPromotion = interns.find(
    (i) => i.currentLevel === 15 && i.role === USER_ROLES.UNPAID_INTERN
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Interns</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Paid (core) interns lead their unpaid interns. Unpaid interns move up through 15 monthly levels.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('paid')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeFilter === 'paid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid (core)
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unpaid')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeFilter === 'unpaid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unpaid
          </button>
        </div>
      </div>

      {/* Interns Table (Matching Screen 7) */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Works with</th>
                <th className="py-3 px-4">Level (of 15)</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Marksheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInterns.map((intern) => {
                const isPaid = intern.role === USER_ROLES.PAID_INTERN;
                const levelFraction = `${intern.currentLevel}/15`;

                return (
                  <tr key={intern.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {intern.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')}
                      </div>
                      <span>{intern.name}</span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <Badge variant={isPaid ? 'primary' : 'purple'}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </td>

                    {/* Works with */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {isPaid ? 'Core team' : intern.pairedPaidInternName || 'Pending pairing'}
                    </td>

                    {/* Level */}
                    <td className="py-3.5 px-4">
                      {isPaid ? (
                        <span className="text-slate-400 font-semibold">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              style={{ width: `${(intern.currentLevel / 15) * 100}%` }}
                              className="h-full bg-blue-600 rounded-sm"
                            />
                          </div>
                          <span className="font-semibold text-slate-700">{levelFraction}</span>
                        </div>
                      )}
                    </td>

                    {/* Attendance */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {intern.attendancePercentage || 92}%
                    </td>

                    {/* Marksheet */}
                    <td className="py-3.5 px-4">
                      {isPaid ? (
                        intern.marksheetPercentage && intern.marksheetPercentage >= 80 ? (
                          <span className="text-emerald-700 font-semibold">
                            {intern.marksheetPercentage}% confirmed
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            {intern.marksheetPercentage || 78}% below 80%
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">Not needed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom Panels: Add Interns & Waiting for Admin Approval */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add Several Interns */}
        <div className="lg:col-span-7">
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add several interns</h3>
            <p className="text-xs text-slate-500 mb-4">Emails, one per line</p>

            <div className="space-y-4">
              <Textarea
                placeholder="name@university.edu"
                rows={4}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  value={internType}
                  onChange={(e) => setInternType(e.target.value)}
                  options={[
                    { value: INTERN_TYPES.UNPAID, label: 'Unpaid' },
                    { value: INTERN_TYPES.PAID, label: 'Paid (Core)' },
                  ]}
                />

                <Select
                  label="Works with"
                  value={worksWithId}
                  onChange={(e) => setWorksWithId(e.target.value)}
                  disabled={internType === INTERN_TYPES.PAID}
                  options={coreInterns.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>

              <Button
                size="sm"
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create interns
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Waiting for Admin Approval (Screen 7) */}
        <div className="lg:col-span-5">
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Waiting for admin approval</h3>
            {candidateForPromotion ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <p className="text-xs text-slate-800">
                  <strong>{candidateForPromotion.name}</strong> passed level 15 and can become a paid intern.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    isLoading={promoteMutation.isPending}
                    onClick={() =>
                      promoteMutation.mutate({ internId: candidateForPromotion.id, decision: 'approve' })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    isLoading={promoteMutation.isPending}
                    onClick={() =>
                      promoteMutation.mutate({ internId: candidateForPromotion.id, decision: 'reject' })
                    }
                  >
                    Not yet
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No interns currently awaiting promotion to paid level.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
