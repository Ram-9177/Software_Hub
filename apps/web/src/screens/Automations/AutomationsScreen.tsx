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
import { cn } from '../../components/ui/utils.js';
import {
  Send,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Eye,
  Sliders,
  ExternalLink,
  Zap,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Award,
  Users,
  CheckSquare,
  FileText,
  KeyRound,
} from 'lucide-react';

export const AutomationsScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'power-automate' | 'templates' | 'workflows' | 'logs'>('power-automate');
  const [selectedAuto, setSelectedAuto] = useState<any | null>(null);

  // Power Automate state
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [paEnabled, setPaEnabled] = useState(true);
  const [hasCopiedSchema, setHasCopiedSchema] = useState(false);
  const [isPaGuideOpen, setIsPaGuideOpen] = useState(false);

  // Power Automate Test Modal state
  const [isPaTestModalOpen, setIsPaTestModalOpen] = useState(false);
  const [paTestRecipient, setPaTestRecipient] = useState(currentUser?.email || '');
  const [paTestStep, setPaTestStep] = useState('new_task_assigned');

  // Selected email template for editing
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<any | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');

  // Standard test email state
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(currentUser?.email || '');
  const [testEventType, setTestEventType] = useState('welcome_user');

  // Fetch automations & real metrics
  const { data } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiRequest<any>('/automations'),
  });

  // Fetch Microsoft Power Automate status
  const { data: paStatus, refetch: refetchPaStatus } = useQuery({
    queryKey: ['power-automate-status'],
    queryFn: () => apiRequest<any>('/automations/power-automate/status'),
  });

  // Sync Power Automate form when data loads
  React.useEffect(() => {
    if (paStatus) {
      if (paStatus.webhookUrl) {
        setWebhookUrlInput(paStatus.webhookUrl);
      }
      setPaEnabled(paStatus.isEnabled ?? true);
    }
  }, [paStatus]);

  // Fetch official email templates
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => apiRequest<any[]>('/automations/email-templates/list').catch(() => []),
  });

  // Fetch delivery logs
  const { data: emailLogs = [] } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => apiRequest<any[]>('/automations/email-logs/list').catch(() => []),
    refetchInterval: 8000,
  });

  const automations = data?.automations || [];
  const metrics = data?.metrics || { sentThisWeek: emailLogs.length, failed: 0 };

  // Set default selected automation
  React.useEffect(() => {
    if (automations.length > 0 && !selectedAuto) {
      const match = automations.find((a: any) => a.key === 'new_task_assigned') || automations[0];
      setSelectedAuto(match);
    }
  }, [automations, selectedAuto]);

  // Toggle automation mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      return apiRequest(`/automations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  // Save Power Automate config mutation
  const savePaConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/automations/power-automate/config', {
        method: 'PUT',
        body: JSON.stringify({
          webhookUrl: webhookUrlInput.trim(),
          isEnabled: paEnabled,
        }),
      });
    },
    onSuccess: (res: any) => {
      showToast({
        type: 'success',
        title: 'Power Automate Saved',
        message: res.message || 'Webhook URL configuration updated successfully.',
      });
      refetchPaStatus();
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    },
  });

  // Test Power Automate dispatch mutation
  const testPaMutation = useMutation({
    mutationFn: async () => {
      const email = paTestRecipient.trim() || currentUser?.email;
      if (!email) throw new Error('Recipient email is required.');
      return apiRequest('/automations/power-automate/test', {
        method: 'POST',
        body: JSON.stringify({
          webhookUrl: webhookUrlInput.trim() || paStatus?.webhookUrl,
          recipientEmail: email,
          stepKey: paTestStep,
        }),
      });
    },
    onSuccess: (res: any) => {
      showToast({
        type: 'success',
        title: 'Power Automate Dispatched!',
        message: res.message || 'Transmission verified through Microsoft Power Automate.',
      });
      setIsPaTestModalOpen(false);
      refetchPaStatus();
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Power Automate Test Failed',
        message: err.message || 'Could not dispatch to the specified webhook.',
      });
    },
  });

  // Update email template mutation
  const updateEmailTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!editingEmailTemplate) return;
      return apiRequest(`/automations/email-templates/${editingEmailTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: templateSubject,
          body: templateBody,
        }),
      });
    },
    onSuccess: () => {
      showToast({ type: 'success', title: 'Template Saved', message: 'Email template wording updated.' });
      setEditingEmailTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    },
  });

  // Standard Test email dispatch mutation
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const email = testEmailAddress.trim();
      if (!email) throw new Error('Recipient email is required.');
      return apiRequest('/automations/email-templates/test', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: email,
          eventType: testEventType || 'new_task_assigned',
          ruleKey: testEventType || 'new_task_assigned',
        }),
      });
    },
    onSuccess: (res: any) => {
      showToast({ type: 'success', title: 'Email Dispatched', message: res.message });
      setIsTestEmailModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Test Failed', message: err.message });
    },
  });

  // Retry email mutation
  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      return apiRequest(`/automations/email-logs/${logId}/retry`, { method: 'POST' });
    },
    onSuccess: (res: any) => {
      showToast({ type: 'success', title: 'Notification Retried', message: res.message });
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
  });

  const handleOpenEditTemplate = (tpl: any) => {
    setEditingEmailTemplate(tpl);
    setTemplateSubject(tpl.subject || tpl.emailSubjectTemplate || '');
    setTemplateBody(tpl.body || tpl.emailBodyTemplate || '');
  };

  const insertVariable = (varName: string) => {
    setTemplateBody((prev) => `${prev} {{${varName}}}`);
  };

  const copyJsonSchema = () => {
    const schemaStr = JSON.stringify(
      paStatus?.schema || {
        type: 'object',
        properties: {
          to: { type: 'string' },
          recipientName: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          htmlBody: { type: 'string' },
          step: { type: 'string' },
          actionUrl: { type: 'string' },
          systemName: { type: 'string' },
          timestamp: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
      null,
      2
    );
    navigator.clipboard.writeText(schemaStr);
    setHasCopiedSchema(true);
    showToast({
      type: 'success',
      title: 'Schema Copied to Clipboard',
      message: 'Paste this into Power Automate HTTP trigger "Request Body JSON Schema".',
    });
    setTimeout(() => setHasCopiedSchema(false), 3000);
  };

  // End-to-End System Steps definition
  const endToEndSteps = [
    {
      id: 'onboarding-signup',
      key: 'welcome_email',
      name: '1. User Signup & Onboarding',
      icon: Users,
      badge: 'Account Provision',
      category: 'onboarding',
      recipient: 'New Intern / Staff Member',
      description: 'Dispatches when an account is provisioned or an intern accepts their invitation.',
    },
    {
      id: 'invite-send',
      key: 'welcome_email',
      name: '2. Intern Invitation Dispatch',
      icon: Mail,
      badge: 'Access Token',
      category: 'onboarding',
      recipient: 'Invited Intern',
      description: 'Dispatches single-use secure invite link with designated role and pairing mentor.',
    },
    {
      id: 'task-assign',
      key: 'new_task_assigned',
      name: '3. Task / Part Assignment',
      icon: CheckSquare,
      badge: 'Sprint Delegation',
      category: 'tasks',
      recipient: 'Assigned Intern',
      description: 'Dispatches immediately with task title, part number, priority, deadline, and direct link.',
    },
    {
      id: 'work-submit',
      key: 'work_submitted',
      name: '4. Proof of Work Submission',
      icon: FileText,
      badge: 'Review Queue',
      category: 'tasks',
      recipient: 'Reviewer / Team Lead',
      description: 'Alerts the mentor/reviewer when an intern uploads proof of work for review.',
    },
    {
      id: 'work-review',
      key: 'reviewed_or_sent_back',
      name: '5. Work Approved / Changes Requested',
      icon: CheckCircle2,
      badge: 'Feedback Decision',
      category: 'tasks',
      recipient: 'Deliverable Assignee',
      description: 'Notifies intern with decision status, rating, and feedback comment.',
    },
    {
      id: 'att-checkin',
      key: 'attendance_checkin',
      name: '6. Attendance Check-In Confirmed',
      icon: Clock,
      badge: 'Daily Roster',
      category: 'attendance',
      recipient: 'Checking-In Member',
      description: 'Dispatches confirmation when user clocks in, logging exact check-in time and status.',
    },
    {
      id: 'leave-submit',
      key: 'leave_requested',
      name: '7. Leave / WFH Request Submitted',
      icon: Calendar,
      badge: 'Leave Pipeline',
      category: 'attendance',
      recipient: 'Requester & Supervisor',
      description: 'Logs leave start/end dates, reason, and queues request for supervisor review.',
    },
    {
      id: 'leave-decision',
      key: 'leave_reviewed',
      name: '8. Leave Request Review Decision',
      icon: Calendar,
      badge: 'Review Decision',
      category: 'attendance',
      recipient: 'Requester',
      description: 'Dispatches approval or rejection with reviewer commentary and next steps.',
    },
    {
      id: 'cert-issue',
      key: 'certificate_issued',
      name: '9. Official Certificate Issued',
      icon: Award,
      badge: 'Credential Registry',
      category: 'levels',
      recipient: 'Certified Intern',
      description: 'Dispatches official certificate with verification QR link and attached signed PDF.',
    },
    {
      id: 'pwd-reset',
      key: 'password_reset',
      name: '10. Password Reset & Security Notice',
      icon: KeyRound,
      badge: 'Security Authentication',
      category: 'general',
      recipient: 'Account Owner',
      description: 'Dispatches single-use 30-min password reset link and change confirmation notice.',
    },
    {
      id: 'due-tomorrow',
      key: 'due_tomorrow',
      name: '11. 24h Due Tomorrow Reminder',
      icon: Clock,
      badge: 'Daily Cron (09:00)',
      category: 'tasks',
      recipient: 'Interns with upcoming parts',
      description: 'Automated 09:00 AM daily notice for deliverables due within 24 hours.',
    },
    {
      id: 'overdue-alert',
      key: 'overdue_reminder',
      name: '12. Overdue Deliverable Notice',
      icon: AlertTriangle,
      badge: 'Daily Cron (10:00)',
      category: 'tasks',
      recipient: 'Assignee & Team Lead',
      description: 'Urgent 10:00 AM daily alert for unsubmitted deliverables past deadline.',
    },
  ];

  const filteredTemplates = emailTemplates.filter((t: any) => {
    if (templateCategoryFilter === 'all') return true;
    return t.category === templateCategoryFilter;
  });

  const isPaReady = Boolean(paStatus?.isConfigured && paStatus?.isEnabled);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* SMRU Institutional Executive Header Banner */}
      <header className="min-w-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-card border border-line/70 bg-linear-to-r from-surface via-surface to-indigo-50/30 p-5 sm:p-6 shadow-card glow-navy">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
              Automations & Email System
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200/80 px-2.5 py-0.5 text-xs font-semibold text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
              Engine Online
            </span>
            {isPaReady ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                <Zap className="size-3 text-sky-600 fill-sky-600" /> Power Automate Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3" /> Power Automate Webhook Pending
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
            End-to-end notification engine connecting Software Hub operations with Microsoft Power Automate (No Entra ID).
          </p>
        </div>

        {/* Top metrics derived from real database */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[11px] text-ink-faint block font-semibold">Total Logged</span>
            <span className="text-2xl font-display font-black text-ink">{emailLogs.length}</span>
          </div>
          <div className="text-right border-l border-line/70 pl-6">
            <span className="text-[11px] text-ink-faint font-semibold flex items-center justify-end gap-1">
              <Zap className="size-3 text-sky-600" /> Via Power Automate
            </span>
            <span className="text-2xl font-display font-black text-sky-700 dark:text-sky-300">
              {paStatus?.totalDispatched || 0}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPaTestRecipient(currentUser?.email || '');
              setIsPaTestModalOpen(true);
            }}
            leftIcon={<Zap className="size-4 text-gold-400" />}
            className="hidden sm:inline-flex"
          >
            Test Power Automate
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('power-automate')}
          className={cn(
            'pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'power-automate'
              ? 'border-gold-400 text-navy-950 dark:text-gold-300 font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          )}
        >
          <Zap className="size-3.5 text-gold-500" />
          Microsoft Power Automate (No Entra ID)
          {isPaReady && (
            <span className="size-2 rounded-full bg-accent-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={cn(
            'pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'templates'
              ? 'border-gold-400 text-navy-950 dark:text-gold-300 font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          )}
        >
          <Mail className="size-3.5" />
          End-to-End Steps & Templates ({endToEndSteps.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workflows')}
          className={cn(
            'pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'workflows'
              ? 'border-gold-400 text-navy-950 dark:text-gold-300 font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          )}
        >
          <Sliders className="size-3.5" />
          Workflow Triggers ({automations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={cn(
            'pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'logs'
              ? 'border-gold-400 text-navy-950 dark:text-gold-300 font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          )}
        >
          <Clock className="size-3.5" />
          Delivery Audit Logs ({emailLogs.length})
        </button>
      </div>

      {/* TAB 1: MICROSOFT POWER AUTOMATE (NO ENTRA ID) STUDIO */}
      {activeTab === 'power-automate' && (
        <div className="space-y-6">
          {/* Main Power Automate Configuration Card */}
          <Card padding="lg" className="border-navy-200/70 dark:border-navy-800 shadow-card">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-control bg-navy-800 text-white flex items-center justify-center font-black">
                    <Zap className="size-5 text-gold-400 fill-gold-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-ink">
                      Microsoft Power Automate (No Entra ID)
                    </h2>
                    <span className="text-xs text-ink-soft">
                      Zero Azure App Registrations, tenant admin consents, or OAuth secrets required.
                    </span>
                  </div>
                </div>

                <p className="text-xs text-ink-soft leading-relaxed pt-1">
                  Connect your personal or institutional Outlook account using a standard Power Automate Cloud Flow triggered by an HTTP Request. Software Hub automatically dispatches rich JSON payloads for every user action directly to this webhook.
                </p>

                {/* Designated Sender Account Banner */}
                <div className="flex items-center gap-2.5 p-3 rounded-control bg-navy-50/80 dark:bg-navy-950/80 border border-navy-200/80 dark:border-navy-800 text-xs text-navy-950 dark:text-navy-100">
                  <ShieldCheck className="size-4.5 text-accent-600 shrink-0" />
                  <div>
                    <span className="font-bold">Designated Sender Account: </span>
                    <span className="font-mono font-bold text-navy-800 dark:text-gold-300 bg-white dark:bg-navy-900 px-1.5 py-0.5 rounded border border-navy-200 dark:border-navy-700">
                      sriram@smru.edu.in
                    </span>
                    <span className="text-ink-soft ml-1.5 text-[11px] block sm:inline mt-0.5 sm:mt-0">
                      (Sri Ram — Software Hub Primary Administrator)
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Pill Card */}
              <div className="p-4 rounded-card bg-tint/60 dark:bg-navy-900/60 border border-line flex flex-col gap-2 min-w-60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-faint font-semibold">Engine Status:</span>
                  <Badge variant={isPaReady ? 'institutional' : 'gold'} size="sm">
                    {isPaReady ? 'Connected & Active' : 'Setup Required'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-faint font-semibold">Total Delivered:</span>
                  <span className="font-mono font-bold text-ink">{paStatus?.totalDispatched || 0} emails</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-faint font-semibold">Last Dispatch:</span>
                  <span className="font-mono text-[11px] text-ink-soft">
                    {paStatus?.lastDispatchedAt ? new Date(paStatus.lastDispatchedAt).toLocaleTimeString() : 'None yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Webhook Configuration Field */}
            <div className="mt-6 pt-6 border-t border-line space-y-4">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">
                  Power Automate HTTP POST Webhook URL *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="https://prod-XX.location.logic.azure.com:443/workflows/.../triggers/manual/paths/invoke?api-version=2016-06-01..."
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      className="font-mono text-xs pr-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      isLoading={savePaConfigMutation.isPending}
                      onClick={() => savePaConfigMutation.mutate()}
                      variant="primary"
                    >
                      Save Configuration
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPaTestRecipient(currentUser?.email || '');
                        setIsPaTestModalOpen(true);
                      }}
                      leftIcon={<Zap className="size-3.5 text-gold-500" />}
                    >
                      Test Flow
                    </Button>
                  </div>
                </div>
                <span className="text-[11px] text-ink-faint mt-1 block">
                  Generated by Power Automate's trigger: <code className="font-mono bg-tint px-1 py-0.5 rounded text-navy-800 font-bold">When an HTTP request is received</code>.
                </span>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink select-none">
                    <input
                      type="checkbox"
                      checked={paEnabled}
                      onChange={(e) => setPaEnabled(e.target.checked)}
                      className="size-4 accent-navy-800 rounded cursor-pointer"
                    />
                    Route all system emails through Power Automate
                  </label>
                  <span className="text-[11px] text-ink-faint">(Falls back to SMTP/Simulation if webhook is unreachable)</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={copyJsonSchema}
                    leftIcon={hasCopiedSchema ? <Check className="size-3 text-accent-600" /> : <Copy className="size-3" />}
                  >
                    {hasCopiedSchema ? 'Schema Copied!' : 'Copy Request Body JSON Schema'}
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setIsPaGuideOpen(!isPaGuideOpen)}
                    leftIcon={<ExternalLink className="size-3" />}
                  >
                    {isPaGuideOpen ? 'Hide 60s Setup Guide' : '60s Setup Guide'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive 60-Second Setup Guide (Expandable) */}
          {isPaGuideOpen && (
            <Card padding="lg" className="bg-canvas border-gold-200/80 dark:border-gold-800/40 glow-gold-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-gold-500" />
                  <h3 className="text-sm font-display font-bold text-ink">
                    60-Second Setup Guide: Microsoft Power Automate (No Entra ID)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaGuideOpen(false)}
                  className="text-xs text-ink-soft hover:text-ink cursor-pointer font-semibold"
                >
                  Close Guide
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Step 1 */}
                <div className="p-4 rounded-control bg-surface border border-line space-y-2">
                  <div className="size-6 rounded-full bg-navy-800 text-white font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-ink">1. Sign In & Create Flow</h4>
                  <p className="text-ink-soft leading-relaxed text-[11px]">
                    Go to <a href="https://make.powerautomate.com" target="_blank" rel="noreferrer" className="text-navy-700 dark:text-gold-300 font-bold underline inline-flex items-center gap-0.5">make.powerautomate.com <ExternalLink className="size-2.5" /></a> and sign in with <strong className="text-navy-900 dark:text-gold-300 font-mono">sriram@smru.edu.in</strong>.
                  </p>
                  <p className="text-ink-soft leading-relaxed text-[11px]">
                    Create an <strong>Instant cloud flow</strong> with trigger: <strong className="text-navy-900 dark:text-navy-100">"When an HTTP request is received"</strong>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-control bg-surface border border-line space-y-2">
                  <div className="size-6 rounded-full bg-navy-800 text-white font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-ink">Paste JSON Schema</h4>
                  <p className="text-ink-soft leading-relaxed text-[11px]">
                    Click <button type="button" onClick={copyJsonSchema} className="text-navy-800 dark:text-gold-300 font-bold underline cursor-pointer">Copy JSON Schema</button> and paste it into the <em>Request Body JSON Schema</em> box in Power Automate.
                  </p>
                  <p className="text-ink-soft leading-relaxed text-[11px]">
                    This exposes dynamic variables like <code className="bg-tint px-1 rounded text-navy-800 font-mono">to</code>, <code className="bg-tint px-1 rounded text-navy-800 font-mono">subject</code>, and <code className="bg-tint px-1 rounded text-navy-800 font-mono">htmlBody</code>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-control bg-surface border border-line space-y-2">
                  <div className="size-6 rounded-full bg-navy-800 text-white font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-ink">Add "Send an email (V2)"</h4>
                  <p className="text-ink-soft leading-relaxed text-[11px]">
                    Add action: <strong>Office 365 Outlook &gt; Send an email (V2)</strong>.
                  </p>
                  <div className="p-2 bg-tint/60 rounded text-[10px] font-mono space-y-0.5 text-navy-900">
                    <div>To: <span className="font-bold">triggerBody()?['to']</span></div>
                    <div>Subject: <span className="font-bold">triggerBody()?['subject']</span></div>
                    <div>Body: <span className="font-bold">triggerBody()?['htmlBody']</span></div>
                  </div>
                  <p className="text-ink-soft text-[11px]">
                    Save your flow, copy the generated Webhook URL, paste it above, and click <strong>Test Flow</strong>!
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* End-to-End Steps Integration Matrix */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-display font-bold text-ink">
                  End-to-End User Flow: Real-Time Email Triggers
                </h3>
                <p className="text-xs text-ink-soft">
                  Every step across user lifecycle, tasks, attendance, and credentials is automatically dispatched.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  leftIcon={<RefreshCw className="size-3" />}
                  onClick={() => {
                    refetchPaStatus();
                    queryClient.invalidateQueries({ queryKey: ['automations'] });
                    queryClient.invalidateQueries({ queryKey: ['email-logs'] });
                    showToast({ type: 'success', title: 'Refreshed', message: 'Flow metrics synchronized.' });
                  }}
                >
                  Refresh Triggers
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {endToEndSteps.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.id}
                    className="p-4 rounded-card bg-surface border border-line hover:border-navy-300 transition-all shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-navy-800 dark:text-gold-300 uppercase tracking-wide">
                          <IconComponent className="size-3 text-gold-500" />
                          {step.badge}
                        </span>
                        <span className="size-2 rounded-full bg-accent-500" title="Step active in notification pipeline" />
                      </div>

                      <h4 className="text-xs font-bold text-ink group-hover:text-navy-800 dark:group-hover:text-gold-300 transition-colors">
                        {step.name}
                      </h4>
                      <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">
                        {step.description}
                      </p>
                      <div className="mt-2 text-[10px] text-ink-faint font-semibold flex items-center gap-1">
                        <span className="text-ink-soft">Recipient:</span> {step.recipient}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between">
                      <code className="text-[10px] font-mono text-navy-700 dark:text-navy-300 bg-tint px-1.5 py-0.5 rounded">
                        {step.key}
                      </code>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setPaTestStep(step.key);
                          setPaTestRecipient(currentUser?.email || '');
                          setIsPaTestModalOpen(true);
                        }}
                        leftIcon={<Zap className="size-2.5 text-gold-500" />}
                      >
                        Test Step
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES STUDIO */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-ink-faint uppercase mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All Templates' },
              { id: 'onboarding', label: 'User Onboarding' },
              { id: 'tasks', label: 'Task Sprints' },
              { id: 'attendance', label: 'Leave & Attendance' },
              { id: 'levels', label: 'Credentials & Certificates' },
              { id: 'general', label: 'Security & Notices' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategoryFilter(cat.id)}
                className={cn(
                  'px-3 py-1 rounded-control font-semibold transition-colors cursor-pointer',
                  templateCategoryFilter === cat.id
                    ? 'bg-navy-800 text-white shadow-xs'
                    : 'bg-surface border border-line text-ink-soft hover:bg-tint hover:text-navy-800'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface/70 text-ink-soft font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Template Name</th>
                    <th className="py-3 px-4">Event Trigger</th>
                    <th className="py-3 px-4">Subject Preview</th>
                    <th className="py-3 px-4">Available Placeholders</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredTemplates.map((tpl: any) => (
                    <tr key={tpl.id} className="hover:bg-tint/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-ink block">{tpl.name}</span>
                        <span className="text-[10px] text-ink-faint uppercase font-mono">{tpl.category || 'general'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-navy-800 dark:text-gold-300 font-semibold">
                        {tpl.event_type || tpl.eventType || tpl.key}
                      </td>
                      <td className="py-3.5 px-4 text-ink-soft max-w-xs truncate">
                        {tpl.subject || tpl.emailSubjectTemplate}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(tpl.available_variables || tpl.availableVariables || ['recipient_name', 'action_url']).slice(0, 4).map((v: string) => (
                            <span key={v} className="bg-tint text-navy-800 text-[10px] px-1.5 py-0.5 rounded font-mono">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            leftIcon={<Sliders className="size-3" />}
                            onClick={() => handleOpenEditTemplate(tpl)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            leftIcon={<Zap className="size-3 text-gold-500" />}
                            onClick={() => {
                              setPaTestStep(tpl.key || tpl.event_type || tpl.eventType);
                              setPaTestRecipient(currentUser?.email || '');
                              setIsPaTestModalOpen(true);
                            }}
                          >
                            Test
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface/70 text-ink-soft font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Automation</th>
                      <th className="py-3 px-4">Trigger / Schedule</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {automations.map((auto: any) => (
                      <tr
                        key={auto.id}
                        onClick={() => setSelectedAuto(auto)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedAuto?.id === auto.id ? 'bg-tint' : 'hover:bg-tint/50'
                        )}
                      >
                        <td className="py-3.5 px-4 font-bold text-ink">{auto.name}</td>
                        <td className="py-3.5 px-4 text-ink-soft font-mono text-[11px]">{auto.triggerEvent}</td>
                        <td className="py-3.5 px-4 text-ink-soft">{auto.recipientDescription}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate({ id: auto.id, isEnabled: !auto.isEnabled });
                            }}
                            className={cn(
                              'w-9 h-5 inline-flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer',
                              auto.isEnabled ? 'bg-navy-800 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            )}
                          >
                            <span className="size-4 bg-white rounded-full shadow-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card padding="md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block mb-2">
                WORKFLOW TRIGGER DETAILS
              </span>
              <h3 className="text-base font-bold text-ink">
                {selectedAuto?.name || 'Select a workflow'}
              </h3>
              <p className="text-xs text-ink-soft mt-1 font-mono">
                {selectedAuto?.triggerEvent}
              </p>
              <div className="mt-4 p-3.5 bg-canvas rounded-control text-xs space-y-2.5 border border-line">
                <div>
                  <span className="font-semibold text-ink block">Recipients:</span>
                  <span className="text-ink-soft">{selectedAuto?.recipientDescription}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink block">Delivery Pipeline:</span>
                  <span className="text-ink-soft flex items-center gap-1.5 mt-0.5">
                    <Zap className="size-3 text-sky-600" /> Microsoft Power Automate &gt; Outlook Relay
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-ink block">Status:</span>
                  <Badge variant={selectedAuto?.isEnabled ? 'institutional' : 'gold'} size="sm">
                    {selectedAuto?.isEnabled ? 'Active & Monitored' : 'Temporarily Disabled'}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY AUDIT LOGS */}
      {activeTab === 'logs' && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface/70 text-ink-soft font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Delivery Channel</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-faint">
                      No notifications logged yet. Click "Test Power Automate" above to dispatch a live test notification.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log: any) => {
                    const isPa = log.channel === 'power_automate';
                    const isSmtp = log.channel === 'smtp';

                    return (
                      <tr key={log.id} className="hover:bg-tint/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-ink">{log.recipient_email || log.recipient}</td>
                        <td className="py-3 px-4 text-ink-soft">{log.subject}</td>
                        <td className="py-3 px-4">
                          {isPa ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Zap className="size-2.5 fill-sky-600" /> Power Automate
                            </span>
                          ) : isSmtp ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Mail className="size-2.5" /> SMTP Relay
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Simulated Dispatch
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-faint font-mono text-[11px]">
                          {new Date(log.sent_at || log.sentTime || Date.now()).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={log.status === 'delivered' ? 'institutional' : 'gold'} size="sm">
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.status === 'failed' && (
                            <Button
                              size="xs"
                              variant="outline"
                              isLoading={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(log.id)}
                              leftIcon={<RefreshCw className="size-3" />}
                            >
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Power Automate Quick Test Modal */}
      <Modal
        isOpen={isPaTestModalOpen}
        onClose={() => setIsPaTestModalOpen(false)}
        title="Test Microsoft Power Automate Flow"
        description="Dispatches a live HTTP payload to your configured Power Automate webhook URL (No Entra ID needed)."
      >
        <div className="space-y-4">
          <Input
            label="Recipient Email Address *"
            placeholder="e.g. intern@smru.edu.in or personal@outlook.com"
            value={paTestRecipient}
            onChange={(e) => setPaTestRecipient(e.target.value)}
          />

          <Select
            label="System Step / Event Trigger *"
            value={paTestStep}
            onChange={(e) => setPaTestStep(e.target.value)}
            options={endToEndSteps.map((s) => ({
              value: s.key,
              label: `${s.name} (${s.badge})`,
            }))}
          />

          <div className="p-3 bg-tint/60 rounded-control border border-line text-xs space-y-1">
            <span className="font-semibold text-ink block">Webhook Endpoint:</span>
            <span className="font-mono text-[11px] text-ink-soft break-all block">
              {webhookUrlInput || paStatus?.webhookUrl || 'No Webhook URL configured! Please configure above.'}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsPaTestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={testPaMutation.isPending}
              onClick={() => testPaMutation.mutate()}
              leftIcon={<Zap className="size-3.5 text-gold-400" />}
            >
              Dispatch via Power Automate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Email Template Modal */}
      {editingEmailTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setEditingEmailTemplate(null)}
          title={`Edit Email Template: ${editingEmailTemplate.name}`}
          description={`Event Trigger: ${editingEmailTemplate.event_type || editingEmailTemplate.eventType || editingEmailTemplate.key}`}
        >
          <div className="space-y-4">
            <Input
              label="Subject Line *"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink">
                  Email Body Content *
                </label>
                <span className="text-[10px] text-ink-faint">Click a variable to insert:</span>
              </div>

              {/* Clickable variable chips */}
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-canvas rounded-control border border-line">
                {(editingEmailTemplate.available_variables || editingEmailTemplate.availableVariables || ['recipient_name', 'action_url', 'system_name']).map(
                  (v: string) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-tint border border-navy-200/60 text-navy-800 hover:bg-navy-100 font-bold transition-colors cursor-pointer"
                      title={`Insert {{${v}}}`}
                    >
                      + {`{{${v}}}`}
                    </button>
                  )
                )}
              </div>

              <Textarea
                rows={7}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Live Rendered Email Preview */}
            <div className="p-4 bg-canvas border border-line rounded-card space-y-2">
              <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="size-3 text-navy-700" /> Live Power Automate Rendered Preview
              </div>
              <div className="bg-surface p-4 rounded-lg shadow-xs border border-line space-y-2 text-xs">
                <div className="font-bold text-ink pb-1 border-b border-line">
                  {templateSubject
                    .replace(/{{recipient_name}}|{recipient_name}/g, '[Recipient Name]')
                    .replace(/{{task_title}}|{task_title}/g, 'Network Infrastructure Audit')
                    .replace(/{{certificate_number}}|{certificate_number}/g, 'SH2-L2-0001')
                    .replace(/{{[a-zA-Z_]+}}|{[a-zA-Z_]+}/g, 'Value')}
                </div>
                <div className="whitespace-pre-line text-ink-soft text-[11px] leading-relaxed">
                  {templateBody
                    .replace(/{{recipient_name}}|{recipient_name}/g, '[Recipient Name]')
                    .replace(/{{task_title}}|{task_title}/g, 'Network Infrastructure Audit')
                    .replace(/{{due_date}}|{due_date}/g, '24 Oct 2026')
                    .replace(/{{certificate_number}}|{certificate_number}/g, 'SH2-L2-0001')
                    .replace(/{{certificate_type}}|{certificate_type}/g, 'Core Engineering Track')
                    .replace(/{{sender_name}}|{sender_name}/g, 'Sri Ram')
                    .replace(/{{action_url}}|{action_url}/g, 'https://softwarehub.smru.edu.in')
                    .replace(/{{[a-zA-Z_]+}}|{[a-zA-Z_]+}/g, 'Value')}
                </div>
                <div className="pt-2 text-[10px] text-ink-faint border-t border-line italic">
                  Software Hub · St. Mary’s Rehabilitation University
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingEmailTemplate(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={updateEmailTemplateMutation.isPending}
                onClick={() => updateEmailTemplateMutation.mutate()}
              >
                Save Template
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Standard Test Email Modal */}
      <Modal
        isOpen={isTestEmailModalOpen}
        onClose={() => setIsTestEmailModalOpen(false)}
        title="Send Test System Notification"
        description="Verify delivery through your configured email provider (or view live delivery log)."
      >
        <div className="space-y-4">
          <Input
            label="Recipient Email Address *"
            placeholder="e.g. intern@smru.edu.in"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
          />

          <Select
            label="Template Event Type *"
            value={testEventType}
            onChange={(e) => setTestEventType(e.target.value)}
            options={emailTemplates.map((t: any) => {
              const key = t.key || t.triggerEvent || t.event_type || t.eventType;
              return {
                value: key,
                label: `${t.name} (${key})`,
              };
            })}
          />

          <div className="flex justify-end gap-2.5 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsTestEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={testEmailMutation.isPending}
              onClick={() => testEmailMutation.mutate()}
            >
              Dispatch Test Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
