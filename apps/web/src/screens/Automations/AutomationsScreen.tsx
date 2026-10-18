import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card } from '../../components/ui/Card.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { useToast } from '../../components/ui/Toast.js';
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
} from 'lucide-react';

export const AutomationsScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'logs'>('templates');
  const [selectedAuto, setSelectedAuto] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');

  // Selected email template for editing
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<any | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');

  // Test email state
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('admin@softwarehub2.org');
  const [testEventType, setTestEventType] = useState('welcome_user');

  // Fetch automations & real metrics
  const { data } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiRequest<any>('/automations'),
  });

  // Fetch official email templates (all 16 templates)
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
      showToast({ type: 'success', title: 'Template Saved', message: 'Email wording updated successfully.' });
      setEditingEmailTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    },
  });

  // Test email dispatch mutation
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      if (!testEmailAddress.trim()) throw new Error('Recipient email is required.');
      return apiRequest('/automations/email-templates/test', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: testEmailAddress.trim(),
          eventType: testEventType,
        }),
      });
    },
    onSuccess: (res: any) => {
      showToast({ type: 'success', title: 'Test Email Dispatched', message: res.message });
      setIsTestEmailModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Test Email Failed', message: err.message });
    },
  });

  // Retry email mutation
  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      return apiRequest(`/automations/email-logs/${logId}/retry`, { method: 'POST' });
    },
    onSuccess: (res: any) => {
      showToast({ type: 'success', title: 'Email Retried', message: res.message });
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
  });

  const handleOpenEditTemplate = (tpl: any) => {
    setEditingEmailTemplate(tpl);
    setTemplateSubject(tpl.subject);
    setTemplateBody(tpl.body);
  };

  const insertVariable = (varName: string) => {
    setTemplateBody((prev) => `${prev} {{${varName}}}`);
  };

  const filteredTemplates = emailTemplates.filter((t: any) => {
    if (templateCategoryFilter === 'all') return true;
    return t.category === templateCategoryFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Automations & Email System
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Software Hub 2.0 Central Office communication engine & delivery registry.
          </p>
        </div>

        {/* Top metrics derived from real database */}
        <div className="flex items-center gap-6 text-right">
          <div>
            <span className="text-[11px] text-slate-400 block font-semibold">Logged Emails</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{emailLogs.length}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-semibold">Active Templates</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{emailTemplates.length || 16}</span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsTestEmailModalOpen(true)}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Send Test Email
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Email Templates Studio ({emailTemplates.length || 16})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('workflows')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'workflows'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Workflow Triggers ({automations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Delivery Audit Logs ({emailLogs.length})
        </button>
      </div>

      {/* TAB 1: 16 EMAIL TEMPLATES STUDIO */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All 16 Templates' },
              { id: 'onboarding', label: 'User Onboarding' },
              { id: 'tasks', label: 'Task Sprints' },
              { id: 'attendance', label: 'Leave & WFH' },
              { id: 'levels', label: 'Levels & Certificates' },
              { id: 'general', label: 'Announcements' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  templateCategoryFilter === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Template Name</th>
                    <th className="py-3 px-4">Event Trigger</th>
                    <th className="py-3 px-4">Subject Preview</th>
                    <th className="py-3 px-4">Placeholders</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTemplates.map((tpl: any) => (
                    <tr key={tpl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{tpl.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{tpl.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {tpl.event_type || tpl.eventType}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {tpl.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(tpl.available_variables || tpl.availableVariables || []).slice(0, 4).map((v: string) => (
                            <span key={v} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
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
                            leftIcon={<Sliders className="w-3 h-3" />}
                            onClick={() => handleOpenEditTemplate(tpl)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            leftIcon={<Send className="w-3 h-3" />}
                            onClick={() => {
                              setTestEventType(tpl.event_type || tpl.eventType);
                              setIsTestEmailModalOpen(true);
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

      {/* TAB 2: WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Automation</th>
                      <th className="py-3 px-4">Trigger / Schedule</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4 text-center">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {automations.map((auto: any) => (
                      <tr
                        key={auto.id}
                        onClick={() => setSelectedAuto(auto)}
                        className={`cursor-pointer transition-colors ${
                          selectedAuto?.id === auto.id ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{auto.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{auto.triggerEvent}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{auto.recipientDescription}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate({ id: auto.id, isEnabled: !auto.isEnabled });
                            }}
                            className={`w-9 h-5 inline-flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                              auto.isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 bg-white rounded-full shadow-xs" />
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                WORKFLOW DETAILS
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedAuto?.name || 'Select a workflow'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {selectedAuto?.triggerEvent}
              </p>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-2">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">Recipients:</span>
                  <span className="text-slate-500">{selectedAuto?.recipientDescription}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">Status:</span>
                  <Badge variant={selectedAuto?.isEnabled ? 'success' : 'default'} size="sm">
                    {selectedAuto?.isEnabled ? 'Operational' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No notifications logged yet. Click "Send Test Email" above to test.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{log.recipient_email}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.subject}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={log.status === 'delivered' ? 'success' : 'danger'} size="sm">
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
                            leftIcon={<RefreshCw className="w-3 h-3" />}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Email Template Modal */}
      {editingEmailTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setEditingEmailTemplate(null)}
          title={`Edit Email Template: ${editingEmailTemplate.name}`}
          description={`Event Type: ${editingEmailTemplate.event_type || editingEmailTemplate.eventType}`}
        >
          <div className="space-y-4">
            <Input
              label="Subject Line *"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Body Content *
                </label>
                <span className="text-[10px] text-slate-400">Click a variable to insert:</span>
              </div>

              {/* Clickable variable chips */}
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-750">
                {(editingEmailTemplate.available_variables || editingEmailTemplate.availableVariables || []).map(
                  (v: string) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 font-bold transition-colors"
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

            {/* Live Email Preview Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-blue-600" /> Live Rendered Preview
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 pb-1 border-b border-slate-100 dark:border-slate-700">
                  {templateSubject.replace(/{{[a-zA-Z_]+}}/g, 'Sample Value')}
                </div>
                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  {templateBody.replace(/{{[a-zA-Z_]+}}/g, 'Sample Value')}
                </div>
                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 italic">
                  Software Hub 2.0 Central Office · St. Mary’s Rehabilitation University
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

      {/* Test Email Modal */}
      <Modal
        isOpen={isTestEmailModalOpen}
        onClose={() => setIsTestEmailModalOpen(false)}
        title="Send Test System Notification"
        description="Verify delivery through your configured email provider (or view live delivery log)."
      >
        <div className="space-y-4">
          <Input
            label="Recipient Email Address *"
            placeholder="e.g. manohar@softwarehub2.org or admin@softwarehub2.org"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
          />

          <Select
            label="Template Event Type *"
            value={testEventType}
            onChange={(e) => setTestEventType(e.target.value)}
            options={emailTemplates.map((t: any) => ({
              value: t.event_type || t.eventType,
              label: `${t.name} (${t.event_type || t.eventType})`,
            }))}
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
