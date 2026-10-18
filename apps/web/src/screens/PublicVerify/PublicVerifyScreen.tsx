import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { ShieldCheck, AlertCircle, Search, ArrowLeft, Download, Award, School } from 'lucide-react';

export const PublicVerifyScreen: React.FC = () => {
  const { certNumber: routeCertNumber } = useParams<{ certNumber?: string }>();
  const [searchNumber, setSearchNumber] = useState(routeCertNumber || '');
  const [activeLookup, setActiveLookup] = useState(routeCertNumber || '');

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-verify', activeLookup],
    queryFn: () => apiRequest<any>(`/certificates/verify/${activeLookup}`),
    enabled: Boolean(activeLookup),
    retry: false,
  });

  const cert = data?.certificate;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white transition-colors">
      <div className="w-full max-w-lg space-y-6 my-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Command Center
        </Link>

        {/* Verification Card */}
        <Card padding="lg" className="border-t-4 border-t-blue-600 shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-center space-y-2 mb-6">
            <img
              src="/assets/university_logo.png"
              alt="St. Mary's Rehabilitation University"
              className="h-10 w-auto mx-auto object-contain mb-1"
            />
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Software Hub 2.0 Credential Registry
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Central Office Verification Portal • St. Mary’s Rehabilitation University
            </p>
          </div>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchNumber.trim()) setActiveLookup(searchNumber.trim());
            }}
            className="flex gap-2 mb-6"
          >
            <Input
              placeholder="e.g. SH2-L2-0007 or SH2-L1-0031"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="font-mono text-xs"
            />
            <Button size="sm" type="submit" leftIcon={<Search className="w-3.5 h-3.5" />}>
              Verify
            </Button>
          </form>

          {/* Result Presentation */}
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400 animate-pulse">
              Verifying credential against registry database...
            </div>
          ) : error || !cert ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200">Certificate Not Found</h3>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                The credential ID <strong>{activeLookup}</strong> could not be verified in the
                Software Hub 2.0 Central Office Registry.
              </p>
            </div>
          ) : (
            <div className={`p-5 rounded-xl space-y-4 border ${
              cert.status === 'revoked'
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 ${
                    cert.status === 'revoked' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {cert.status === 'revoked' ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <Badge variant={cert.status === 'revoked' ? 'danger' : 'success'} size="sm">
                      {cert.status === 'revoked' ? 'Revoked / Superseded' : 'Verified Authentic'}
                    </Badge>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {cert.certificateNumber}
                    </h3>
                  </div>
                </div>

                {cert.status !== 'revoked' && (
                  <a
                    href={`/api/certificates/${cert.certificateNumber}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
              </div>

              {cert.reissuedFrom && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <strong>Reissue Notice:</strong> This credential was reissued from {cert.reissuedFrom}. Reason: {cert.reissueReason || 'Administrative update'}
                </div>
              )}

              <div className="divide-y divide-emerald-200/60 dark:divide-slate-800 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Recipient Name</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{cert.internName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Internship Category</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {cert.category === 'paid' ? 'Core (Paid) Internship' : 'Unpaid Internship Track'} (Level {cert.level})
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Design Template</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{cert.templateTitle || 'Standard Credential'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance Performance</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{cert.attendancePercentage}% Verified</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Completed Sprint Tasks</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{cert.tasksCompleted} Tasks</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Date of Official Issue</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{cert.issueDate}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Issuing Authority</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {cert.issuedByName || 'Central Office Administrator'} • Central Office Lead
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
