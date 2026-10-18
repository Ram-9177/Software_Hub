import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Input } from '../../components/ui/Input.js';
import { useToast } from '../../components/ui/Toast.js';
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
      const firstIntern = users.find((u: any) => u.role !== USER_ROLES.ADMIN && u.role !== USER_ROLES.LEAD) || users[0];
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

  const isManagement = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.LEAD;

  const currentIntern = users.find((u: any) => u.id === selectedInternId) || users[0];
  const activeTemplate = templates.find((t: any) => t.id === selectedTemplateId) || templates[0];

  const internAtt = currentIntern?.attendancePercentage ?? 92;
  const isAttMet = internAtt >= (activeTemplate?.min_attendance_percentage ?? 75);
  const isMarksheetMet =
    activeTemplate?.category === 'unpaid' ||
    (Boolean(currentIntern?.marksheetConfirmed) && (currentIntern?.marksheetPercentage ?? 0) >= (activeTemplate?.min_marksheet_percentage ?? 80));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Central Office Credential Registry
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official St. Mary’s Rehabilitation University credentials for Software Hub 2.0.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tabs for Admin / Lead */}
          {isManagement && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('issued')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'issued'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Issued Credentials ({certificates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'templates'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
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
      </div>

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

              <Card padding="md" className="border-t-4 border-t-blue-600 bg-linear-to-br from-blue-50/40 to-white dark:from-blue-950/20 dark:to-slate-900">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="info" size="sm">
                    Core (Paid) Track
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Template #1</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Modern Central Office Design</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
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
                          <tr key={cert.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${isRevoked ? 'opacity-60 bg-rose-50/20' : ''}`}>
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {cert.certificateNumber}
                              {cert.reissuedFrom && (
                                <span className="block text-[10px] text-amber-600 font-normal">
                                  Reissued from {cert.reissuedFrom}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">{cert.userName}</span>
                              <span className="text-[11px] text-slate-400">{cert.userEmail}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={cert.category === 'paid' ? 'info' : 'warning'} size="sm">
                                {cert.category === 'paid' ? 'Paid Track' : 'Unpaid Track'} (L{cert.level})
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{cert.issueDate}</td>
                            <td className="py-3.5 px-4">
                              <Badge variant={isRevoked ? 'danger' : 'success'} size="sm">
                                {isRevoked ? 'Revoked' : 'Verified'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={`/verify/${cert.certificateNumber}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="View Public Verification Page"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Verify
                                </a>
                                {!isRevoked && (
                                  <a
                                    href={`/api/certificates/${cert.certificateNumber}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100"
                                  >
                                    <Download className="w-3.5 h-3.5" /> PDF
                                  </a>
                                )}
                                {isManagement && !isRevoked && (
                                  <button
                                    type="button"
                                    onClick={() => setReissueTarget(cert)}
                                    className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-semibold px-2 py-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                    title="Reissue this certificate"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" /> Reissue
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
              <Card padding="md" className="border-t-4 border-t-blue-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Candidate Pre-Issuance Verification
                  </h3>
                  <Badge variant="info" size="sm">
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
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-md aspect-16/11 bg-slate-900 group">
                <img
                  src={activeTemplate?.background_image_path || '/assets/cert_paid_template.jpg'}
                  alt="Certificate Template"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-102 transition-transform duration-300"
                />
                
                {/* Live Data Overlays on the real template */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                  <div className="mt-8">
                    <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight drop-shadow-xs block">
                      {currentIntern?.name || 'Intern Recipient Name'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-800 font-semibold block mt-1">
                      {activeTemplate?.category === 'paid'
                        ? 'Core Software Engineering Track'
                        : 'Unpaid Internship Programme'} · Level {currentIntern?.current_level || 1}
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-6 text-left">
                    <span className="font-mono text-[9px] text-slate-800 font-bold block">
                      ID: SH2-L{currentIntern?.current_level || 1}-PREVIEW
                    </span>
                    <span className="text-[8px] text-slate-600 block">
                      {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="absolute bottom-6 right-6 p-1 bg-white rounded shadow-xs">
                    <QrCode className="w-8 h-8 text-slate-900" />
                  </div>
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
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="templateActive" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
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
