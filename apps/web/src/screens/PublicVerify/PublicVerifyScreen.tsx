import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, API_BASE } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Logo } from '../../components/layout/Brand.js';
import { ShieldCheck, AlertCircle, Search, ArrowLeft, Download } from 'lucide-react';

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
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-center items-center p-4 transition-colors safe-top safe-bottom">
      <div className="w-full max-w-lg space-y-6 my-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-navy-800 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Software Hub
        </Link>

        {/* Verification Card with SMRU Chamfer Corners */}
        <Card padding="lg" className="border-t-3 border-t-navy-800 shadow-card bg-surface border-line">
          <div className="text-center space-y-2 mb-6">
            <div className="flex justify-center mb-1">
              <Logo size="md" />
            </div>
            <h1 className="font-display text-xl font-bold text-navy-800 dark:text-white tracking-tight">
              Software Hub 2.0 Credential Registry
            </h1>
            <p className="text-xs text-ink-soft">
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
            <Button size="sm" type="submit" leftIcon={Search}>
              Verify
            </Button>
          </form>

          {/* Result Presentation */}
          {isLoading ? (
            <div className="text-center py-8 text-xs text-ink-faint animate-pulse">
              Verifying credential against registry database...
            </div>
          ) : error || !cert ? (
            <div className="p-4 bg-danger-50 border border-danger-100 rounded-card text-center space-y-2">
              <AlertCircle className="size-8 text-danger-600 mx-auto" />
              <h3 className="text-xs font-bold text-danger-800">Certificate Not Found</h3>
              <p className="text-[11px] text-danger-700">
                The credential ID <strong>{activeLookup}</strong> could not be verified in the
                Software Hub 2.0 Central Office Registry.
              </p>
            </div>
          ) : (
            <div
              className={`p-5 rounded-card space-y-4 border ${
                cert.status === 'revoked'
                  ? 'bg-danger-50/70 border-danger-200'
                  : 'bg-accent-50/70 border-accent-200 shadow-card glow-accent'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-9 rounded-full text-white flex items-center justify-center shrink-0 ${
                      cert.status === 'revoked' ? 'bg-danger-600' : 'bg-accent-600'
                    }`}
                  >
                    {cert.status === 'revoked' ? <AlertCircle className="size-5" /> : <ShieldCheck className="size-5" />}
                  </div>
                  <div>
                    <Badge variant={cert.status === 'revoked' ? 'danger' : 'success'} size="sm">
                      {cert.status === 'revoked' ? 'Revoked / Superseded' : 'Verified Authentic'}
                    </Badge>
                    <h3 className="font-mono text-sm font-bold text-ink mt-0.5">
                      {cert.certificateNumber}
                    </h3>
                  </div>
                </div>

                {cert.status !== 'revoked' && (
                  <a
                    href={`${API_BASE}/certificates/${cert.certificateNumber}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy-700 font-bold hover:underline"
                  >
                    <Download className="size-3.5" /> PDF
                  </a>
                )}
              </div>

              {cert.reissuedFrom && (
                <div className="p-2.5 rounded-sm bg-gold-100 text-[11px] text-gold-900 border border-gold-300">
                  <strong>Reissue Notice:</strong> This credential was reissued from {cert.reissuedFrom}. Reason: {cert.reissueReason || 'Administrative update'}
                </div>
              )}

              <div className="divide-y divide-line text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-ink-soft font-medium">Recipient Name</span>
                  <span className="font-bold text-ink">{cert.internName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-ink-soft font-medium">Internship Category</span>
                  <span className="font-bold text-ink">
                    {cert.category === 'paid' ? 'Core (Paid) Internship' : 'Unpaid Internship Track'} (Level {cert.level})
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-ink-soft font-medium">Design Template</span>
                  <span className="font-medium text-ink">{cert.templateTitle || 'Standard Credential'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-ink-soft font-medium">Issue Date</span>
                  <span className="font-medium text-ink">
                    {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'}
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

export default PublicVerifyScreen;
