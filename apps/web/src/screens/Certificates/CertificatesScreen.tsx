import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, API_BASE } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Input } from '../../components/ui/Input.js';
import { useToast } from '../../components/ui/Toast.js';
import { cn } from '../../components/ui/utils.js';
import {
  Download,
  Award,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  ExternalLink,
  FileText,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { USER_ROLES } from '@command-center/shared';

export const CertificatesScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'issued' | 'templates'>('issued');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedInternId, setSelectedInternId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-cert-paid');
  const [selectedLevel, setSelectedLevel] = useState<number>(2);

  // Reissue state
  const [reissueTarget, setReissueTarget] = useState<any | null>(null);
  const [reissueReason, setReissueReason] = useState<string>('');

  // Template edit state
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const { data: certificates = [], isLoading: isLoadingCerts } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => apiRequest<any[]>('/certificates'),
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => apiRequest<any[]>('/certificates/templates').catch(() => []),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<any[]>('/users').catch(() => []),
  });

  // Ensure selectedInternId defaults to first valid intern
  React.useEffect(() => {
    if (!selectedInternId && users.length > 0) {
      const firstIntern = users.find((u: any) => u.role !== USER_ROLES.ADMIN && u.role !== USER_ROLES.MANAGER && u.role !== USER_ROLES.LEAD) || users[0];
      if (firstIntern) setSelectedInternId(firstIntern.id);
    }
  }, [users, selectedInternId]);

  // Issue mutation
  const issueMutation = useMutation({
    mutationFn: async ({
      internId,
      templateId,
      level,
    }: {
      internId: string;
      templateId?: string;
      level?: number;
    }) => {
      return apiRequest('/certificates/issue', {
        method: 'POST',
        body: JSON.stringify({ internId, templateId, level }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Certificate Issued', message: data.message });
      setIsIssueModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Issuance Blocked', message: err.message });
    },
  });

  // Reissue mutation
  const reissueMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest(`/certificates/${id}/reissue`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: (data: any) => {
      showToast({ type: 'success', title: 'Certificate Reissued', message: data.message });
      setReissueTarget(null);
      setReissueReason('');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Reissue Failed', message: err.message });
    },
  });

  // Template update mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest(`/certificates/templates/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'Template Saved', message: 'Rules and layout updated.' });
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Failed to update template', message: err.message });
    },
  });

  const isManagement =
    currentUser?.role === USER_ROLES.ADMIN ||
    currentUser?.role === USER_ROLES.MANAGER ||
    currentUser?.role === USER_ROLES.LEAD;

  const currentIntern = users.find((u: any) => u.id === selectedInternId) || users[0];
  const activeTemplate = templates.find((t: any) => t.id === selectedTemplateId) || templates[0];

  // Live database calculation for attendance & eligibility
  const { data: eligibilityData } = useQuery({
    queryKey: ['certificate-eligibility', currentIntern?.id, activeTemplate?.min_level || 1],
    queryFn: () =>
      currentIntern?.id
        ? apiRequest<any>(`/certificates/eligibility?internId=${currentIntern.id}&level=${activeTemplate?.min_level || 1}`).catch(() => null)
        : null,
    enabled: !!currentIntern?.id,
  });

  const internAtt = eligibilityData?.attendancePct ?? (currentIntern?.attendancePercentage ?? 0);
  const isAttMet = eligibilityData?.attendanceMet ?? (internAtt >= (activeTemplate?.min_attendance_percentage ?? 75));
  const isMarksheetMet =
    eligibilityData?.marksheetMet ??
    (activeTemplate?.category === 'unpaid' ||
      (Boolean(currentIntern?.marksheetConfirmed) && (currentIntern?.marksheetPercentage ?? 0) >= (activeTemplate?.min_marksheet_percentage ?? 80)));

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/25 p-4 sm:p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              Central Office Credential Registry
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              SMRU Certified
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Official St. Mary’s Rehabilitation University credentials for Software Hub 2.0.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tabs for Admin / Lead */}
          {isManagement && (
            <div className="flex bg-tint p-1 rounded-control border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('issued')}
                className={cn(
                  'px-3 py-1.5 rounded-control transition-all cursor-pointer',
                  activeTab === 'issued'
                    ? 'bg-navy-800 text-white shadow-xs font-bold'
                    : 'text-ink-soft hover:text-navy-800'
                )}
              >
                Issued Credentials ({certificates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={cn(
                  'px-3 py-1.5 rounded-control transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'templates'
                    ? 'bg-navy-800 text-white shadow-xs font-bold'
                    : 'text-ink-soft hover:text-navy-800'
                )}
              >
                <Sliders className="size-3.5" />
                Templates & Rules ({templates.length})
              </button>
            </div>
          )}

          {isManagement && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                onClick={async () => {
                  try {
                    const blob = await apiRequest('/exports/certificates');
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Command-Center-Certificates.xlsx';
                    a.click();
                  } catch (e: any) {
                    showToast({ type: 'error', title: 'Export Failed', message: e.message });
                  }
                }}
              >
                Export Excel
              </Button>
              <Button size="sm" onClick={() => setIsIssueModalOpen(true)}>
                Issue Certificate
              </Button>
            </>
          )}
        </div>
      </header>

      {/* TAB 1: ISSUED CREDENTIALS */}
      {activeTab === 'issued' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Requirements & Issued List */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top 2 Requirement Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card padding="md" className="border-t-4 border-t-amber-500 bg-linear-to-br from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="warning" size="sm">
                    Unpaid Track
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Template #2</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Classic Gold Design</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Required: Attendance ≥ 75% · Minimum Level 1 · St. Mary’s Seal.
                </p>
              </Card>

              <Card padding="md" className="border-t-3 border-t-navy-800 bg-linear-to-br from-tint to-surface">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge tone="navy" size="sm">
                    Core (Paid) Track
                  </Badge>
                  <span className="text-[10px] font-bold text-ink-faint uppercase">Template #1</span>
                </div>
                <h4 className="text-sm font-display font-bold text-ink">Modern Central Office Design</h4>
                <p className="text-xs text-ink-soft mt-1">
                  Required: Attendance ≥ 75% · Marksheet ≥ 80% confirmed · Level 2–15.
                </p>
              </Card>
            </div>

            {/* Issued Certificates Table */}
            <Card padding="none" className="overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Official Credential Registry ({certificates.length} Records)
                </h3>
              </div>

              {certificates.length === 0 ? (
                <div className="p-12 text-center">
                  <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No certificates issued yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Eligible interns will appear here once certified by the Central Office.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-4">Credential ID</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Issued Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {certificates.map((cert: any) => {
                        const isRevoked = cert.status === 'revoked';
                        return (
                          <tr key={cert.id} className={`hover:bg-tint transition-colors ${isRevoked ? 'opacity-60 bg-danger-50/20' : ''}`}>
                            <td className="py-3.5 px-4 font-mono font-bold text-navy-800 dark:text-gold-300">
                              {cert.certificateNumber}
                              {cert.reissuedFrom && (
                                <span className="block text-[10px] text-gold-700 font-normal">
                                  Reissued from {cert.reissuedFrom}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-ink block">{cert.userName}</span>
                              <span className="text-[11px] text-ink-soft">{cert.userEmail}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge tone={cert.category === 'paid' ? 'navy' : 'gold'} size="sm">
                                {cert.category === 'paid' ? 'Paid Track' : 'Unpaid Track'} (L{cert.level})
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-ink-soft">{cert.issueDate}</td>
                            <td className="py-3.5 px-4">
                              <Badge tone={isRevoked ? 'danger' : 'success'} size="sm">
                                {isRevoked ? 'Revoked' : 'Verified'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={`/verify/${cert.certificateNumber}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-navy-800 font-semibold px-2 py-1 rounded-control hover:bg-tint"
                                  title="View Public Verification Page"
                                >
                                  <ExternalLink className="size-3.5" /> Verify
                                </a>
                                {!isRevoked && (
                                  <a
                                    href={`${API_BASE}/certificates/${cert.certificateNumber}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-navy-800 font-semibold px-2 py-1 rounded-control bg-tint border border-navy-200/60 hover:bg-navy-100"
                                  >
                                    <Download className="size-3.5" /> PDF
                                  </a>
                                )}
                                {isManagement && !isRevoked && (
                                  <button
                                    type="button"
                                    onClick={() => setReissueTarget(cert)}
                                    className="inline-flex items-center gap-1 text-[11px] text-gold-700 hover:text-gold-900 font-semibold px-2 py-1 rounded-control hover:bg-gold-50 cursor-pointer"
                                    title="Reissue this certificate"
                                  >
                                    <RefreshCw className="size-3.5" /> Reissue
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Pre-Issuance Inspector & Graphic Preview */}
          <div className="lg:col-span-5 space-y-6">
            {isManagement && (
              <Card padding="md" className="border-t-3 border-t-navy-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-display font-bold text-ink">
                    Candidate Pre-Issuance Verification
                  </h3>
                  <Badge tone={activeTemplate?.category === 'paid' ? 'navy' : 'gold'} size="sm">
                    {activeTemplate?.category === 'paid' ? 'Paid Track' : 'Unpaid Track'}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <Select
                    label="Candidate to Certify"
                    value={selectedInternId}
                    onChange={(e) => setSelectedInternId(e.target.value)}
                    options={users.map((u: any) => ({
                      value: u.id,
                      label: `${u.name} — ${u.role.replace('_', ' ').toUpperCase()} (L${u.current_level || 1})`,
                    }))}
                    className="text-xs"
                  />

                  <Select
                    label="Official Design Template"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    options={templates.map((t: any) => ({
                      value: t.id,
                      label: `${t.title} (${t.category.toUpperCase()})`,
                    }))}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-slate-700 dark:text-slate-300">
                      Attendance {internAtt}% (Min required: {activeTemplate?.min_attendance_percentage ?? 85}%)
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isAttMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {isAttMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {isAttMet ? 'Eligible' : 'Below Minimum'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeTemplate?.category === 'paid'
                        ? `Confirmed Marksheet: ${currentIntern?.marksheetPercentage || 0}% (Min: ${activeTemplate?.min_marksheet_percentage ?? 80}%)`
                        : 'Academic Marksheet: Not mandatory for Unpaid'}
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isMarksheetMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                      }`}
                    >
                      {isMarksheetMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {isMarksheetMet ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  isLoading={issueMutation.isPending}
                  disabled={!currentIntern || !isAttMet || !isMarksheetMet || issueMutation.isPending}
                  onClick={() =>
                    issueMutation.mutate({
                      internId: currentIntern.id,
                      templateId: activeTemplate?.id,
                      level: currentIntern.current_level || 1,
                    })
                  }
                >
                  Authorize & Issue Official Certificate
                </Button>
              </Card>
            )}

            {/* Official Graphic Template Preview */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  LIVE CERTIFICATE GRAPHIC PREVIEW
                </span>
                <Badge variant="purple" size="sm">
                  {activeTemplate?.category === 'paid' ? 'Paid Modern' : 'Classic Gold'}
                </Badge>
              </div>

              {/* Graphical Card rendering background template with overlay */}
              <div className="relative rounded-xl overflow-hidden border-2 border-line shadow-md aspect-16/11 bg-slate-900 group select-none">
                <img
                  src={activeTemplate?.background_image_path || (activeTemplate?.category === 'paid' ? '/assets/cert_paid_template.jpg' : '/assets/cert_unpaid_template.jpg')}
                  alt="Certificate Template"
                  className="w-full h-full object-cover opacity-95 group-hover:scale-101 transition-transform duration-300"
                />
                
                {/* Live Data Overlays on the real template */}
                <div className="absolute inset-0 pointer-events-none text-slate-900">
                  {/* Recipient Name centered right above line */}
                  <div className={`absolute w-full text-center ${activeTemplate?.category === 'paid' ? 'top-[47%]' : 'top-[46%]'}`}>
                    <span className="text-sm sm:text-base md:text-xl font-black text-navy-950 uppercase tracking-wide drop-shadow-xs px-4">
                      {currentIntern?.name || 'Intern Recipient Name'}
                    </span>
                  </div>

                  {activeTemplate?.category === 'paid' ? (
                    <>
                      {/* Designation */}
                      <span className="absolute left-[30%] top-[76%] text-[9px] sm:text-[11px] font-bold text-slate-900">
                        Core Software Engineering Intern
                      </span>
                      {/* Level */}
                      <span className="absolute left-[75%] top-[76%] text-[9px] sm:text-[11px] font-bold text-slate-900">
                        Level {currentIntern?.currentLevel || 2}
                      </span>
                      {/* Period */}
                      <span className="absolute left-[36%] top-[85%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        01 Aug 2026 – {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {/* Date of Issue */}
                      <span className="absolute left-[81%] top-[85%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {/* Signatory */}
                      <span className="absolute left-[40%] top-[95%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        {activeTemplate?.authorized_signatory || 'Director, Central Office, SMRU'}
                      </span>
                      {/* QR verification badge */}
                      <div className="absolute bottom-[2%] right-[5%] flex flex-col items-center p-0.5 bg-white/90 rounded shadow-xs">
                        <QrCode className="size-5 sm:size-7 text-slate-900" />
                        <span className="font-mono text-[7px] text-slate-700 font-bold">
                          SH2-L{currentIntern?.currentLevel || 2}-REG
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Designation */}
                      <span className="absolute left-[23%] top-[71%] text-[9px] sm:text-[11px] font-bold text-slate-900">
                        Foundational Central Office Intern
                      </span>
                      {/* Level */}
                      <span className="absolute left-[70%] top-[71%] text-[9px] sm:text-[11px] font-bold text-slate-900">
                        Level {currentIntern?.currentLevel || 1}
                      </span>
                      {/* Period */}
                      <span className="absolute left-[26%] top-[79%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        01 Sep 2026 – {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {/* Date of Issue */}
                      <span className="absolute left-[23%] top-[88%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {/* Signatory */}
                      <span className="absolute left-[30%] top-[96%] text-[8px] sm:text-[10px] font-bold text-slate-800">
                        {activeTemplate?.authorized_signatory || 'Lead & Director, Central Office, SMRU'}
                      </span>
                      {/* QR verification badge */}
                      <div className="absolute bottom-[6%] right-[11%] flex flex-col items-center p-1 bg-white/95 rounded shadow-xs">
                        <QrCode className="size-6 sm:size-8 text-slate-900" />
                        <span className="font-mono text-[7px] text-slate-700 font-bold mt-0.5">
                          SH2-L{currentIntern?.currentLevel || 1}-REG
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Rendered with official St. Mary’s Rehabilitation University background.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE STUDIO & VERIFICATION RULES (Admin/Lead) */}
      {activeTab === 'templates' && isManagement && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tpl: any) => (
              <Card key={tpl.id} padding="none" className="overflow-hidden border-2 border-slate-200 dark:border-slate-800">
                <div className="relative aspect-16/10 bg-slate-900 overflow-hidden">
                  <img
                    src={tpl.background_image_path}
                    alt={tpl.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Badge variant={tpl.category === 'paid' ? 'info' : 'warning'} size="sm">
                      {tpl.category.toUpperCase()}
                    </Badge>
                    <Badge variant={tpl.is_active ? 'success' : 'default'} size="sm">
                      {tpl.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{tpl.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Authorized Signatory: {tpl.authorized_signatory}
                    </p>
                  </div>

                  {/* Rules breakdown */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Attendance</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">{tpl.min_attendance_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Marksheet</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">{tpl.min_marksheet_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Level</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">Level {tpl.min_level}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400 font-mono">Template ID: {tpl.id}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Sliders className="w-3.5 h-3.5" />}
                      onClick={() => setEditingTemplate(tpl)}
                    >
                      Configure Rules & Signatory
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTemplate(null)}
          title={`Configure ${editingTemplate.title}`}
          description="Adjust eligibility thresholds and signatory details for this credential."
        >
          <div className="space-y-4">
            <Input
              label="Template Display Title"
              value={editingTemplate.title}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min Attendance (%)"
                type="number"
                value={String(editingTemplate.min_attendance_percentage)}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, min_attendance_percentage: Number(e.target.value) })
                }
              />
              <Input
                label="Min Marksheet (%)"
                type="number"
                value={String(editingTemplate.min_marksheet_percentage)}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, min_marksheet_percentage: Number(e.target.value) })
                }
              />
            </div>

            <Input
              label="Authorized Signatory Designation"
              value={editingTemplate.authorized_signatory}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, authorized_signatory: e.target.value })
              }
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="templateActive"
                checked={editingTemplate.is_active}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                className="size-4 text-navy-800 rounded-control focus:ring-navy-500"
              />
              <label htmlFor="templateActive" className="text-xs text-ink font-medium">
                Template is active and available for issuance
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={updateTemplateMutation.isPending}
                onClick={() => updateTemplateMutation.mutate(editingTemplate)}
              >
                Save Template
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reissue Certificate Modal */}
      {reissueTarget && (
        <Modal
          isOpen={true}
          onClose={() => setReissueTarget(null)}
          title="Reissue Credential with Audit Trail"
          description={`Reissuing will revoke certificate ${reissueTarget.certificateNumber} for ${reissueTarget.userName} and generate an updated credential.`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
              A permanent audit log entry will be created and the intern will receive an updated email and in-app notification.
            </div>

            <Input
              label="Formal Reissue Reason"
              placeholder="e.g., Name spelling correction / Promotion track level update"
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2.5 pt-3">
              <Button variant="outline" size="sm" onClick={() => setReissueTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!reissueReason.trim() || reissueMutation.isPending}
                isLoading={reissueMutation.isPending}
                onClick={() =>
                  reissueMutation.mutate({
                    id: reissueTarget.id,
                    reason: reissueReason,
                  })
                }
              >
                Confirm & Reissue
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Issue Certificate Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Software Hub 2.0 Credential"
        description="Select candidate and template. Minimum attendance and marksheet requirements will be enforced."
      >
        <div className="space-y-4">
          <Select
            label="Select Intern"
            value={selectedInternId}
            onChange={(e) => setSelectedInternId(e.target.value)}
            options={users.map((u: any) => ({
              value: u.id,
              label: `${u.name} (${u.role.replace('_', ' ')}) - Level ${u.current_level || 1}`,
            }))}
          />

          <Select
            label="Template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            options={templates.map((t: any) => ({
              value: t.id,
              label: `${t.title} (${t.category.toUpperCase()})`,
            }))}
          />

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Candidate Attendance:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{internAtt}%</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Candidate Level:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">Level {currentIntern?.current_level || 1}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Eligibility:</span>
              <span className={`font-bold ${isAttMet && isMarksheetMet ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isAttMet && isMarksheetMet ? 'Passed all checks' : 'Requirements not met'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!isAttMet || !isMarksheetMet || issueMutation.isPending}
              isLoading={issueMutation.isPending}
              onClick={() =>
                issueMutation.mutate({
                  internId: selectedInternId,
                  templateId: selectedTemplateId,
                  level: currentIntern?.current_level || 1,
                })
              }
            >
              Verify & Issue Credential
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
