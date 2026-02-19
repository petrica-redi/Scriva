'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-context';

interface ConsultationItem {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  patientName: string;
}

interface ScheduleItem {
  id: string;
  visit_type: string;
  status: string;
  created_at: string;
  patientName: string;
  patientCode: string;
  diagnosis: string;
  riskStatus: string;
}

interface AtRiskItem {
  id: string;
  visit_type: string;
  status: string;
  patientName: string;
}

interface RiskFlagItem {
  patientName: string;
  flagType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

const DEMO_RISK_FLAGS: RiskFlagItem[] = [
  { patientName: 'Maria Popescu', flagType: 'suicidal_ideation', severity: 'critical', description: 'Expressed passive suicidal thoughts during last session' },
  { patientName: 'Elena Vasile', flagType: 'self_harm', severity: 'high', description: 'History of self-harm, recent stressor identified' },
  { patientName: 'Ion Ionescu', flagType: 'medication_noncompliance', severity: 'high', description: 'Missed last 3 medication refills' },
  { patientName: 'Ion Ionescu', flagType: 'substance_abuse', severity: 'medium', description: 'Reported increased alcohol consumption' },
  { patientName: 'Ana Dumitrescu', flagType: 'deterioration', severity: 'medium', description: 'PHQ-9 score increased from 12 to 18' },
  { patientName: 'Andrei Popa', flagType: 'drug_interaction', severity: 'low', description: 'Potential interaction between fluoxetine and tramadol' },
  { patientName: 'Cristina Marin', flagType: 'psychotic_symptoms', severity: 'high', description: 'New onset auditory hallucinations reported' },
];

const SEVERITY_CONFIG = {
  critical: { emoji: '🔴', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', ring: 'ring-red-500' },
  high: { emoji: '🟠', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', ring: 'ring-orange-500' },
  medium: { emoji: '🟡', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', ring: 'ring-yellow-500' },
  low: { emoji: '🟢', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', ring: 'ring-green-500' },
};

interface DashboardContentProps {
  displayName: string;
  todayCount: number;
  pendingCount: number;
  finalizedCount: number;
  consultationsWithPatients: ConsultationItem[];
  todayItems: ScheduleItem[];
  atRiskItems: AtRiskItem[];
}

function useGreeting() {
  const { t } = useI18n();
  const hour = new Date().getHours();
  if (hour < 12) return t('greeting.morning');
  if (hour < 18) return t('greeting.afternoon');
  return t('greeting.evening');
}

export function DashboardContent({
  displayName,
  todayCount,
  pendingCount,
  finalizedCount,
  consultationsWithPatients,
  todayItems,
  atRiskItems,
}: DashboardContentProps) {
  const { t } = useI18n();
  const greeting = useGreeting();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-medical-text">
            {greeting}, Dr. {displayName}
          </h1>
          <p className="mt-1 text-medical-muted">
            {t('dashboard.welcome')}
          </p>
        </div>
        <Link href="/consultation/new">
          <Button size="lg">{t('dashboard.startNew')}</Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
              </div>
              <div>
                <p className="text-sm text-medical-muted">{t('dashboard.todayConsultations')}</p>
                <p className="text-2xl font-bold text-medical-text">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              </div>
              <div>
                <p className="text-sm text-medical-muted">{t('dashboard.pendingReviews')}</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              </div>
              <div>
                <p className="text-sm text-medical-muted">{t('dashboard.notesFinalized')}</p>
                <p className="text-2xl font-bold text-green-600">{finalizedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2.5">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
              <div>
                <p className="text-sm text-medical-muted">{t('dashboard.patientsAtRisk')}</p>
                <p className="text-2xl font-bold text-red-600">{atRiskItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Flags */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>
              <CardTitle>{t('dashboard.riskFlags')}</CardTitle>
            </div>
            <span className="text-xs text-medical-muted">{DEMO_RISK_FLAGS.length} {t('risk.activeFlags').toLowerCase()}</span>
          </div>
          <p className="text-sm text-medical-muted mt-1">{t('dashboard.riskFlagsDesc')}</p>
        </CardHeader>
        <CardContent>
          {DEMO_RISK_FLAGS.length === 0 ? (
            <p className="text-sm text-medical-muted text-center py-4">{t('dashboard.noRiskFlags')}</p>
          ) : (
            <div className="space-y-2">
              {DEMO_RISK_FLAGS.map((flag, idx) => {
                const config = SEVERITY_CONFIG[flag.severity];
                return (
                  <div key={idx} className={`flex items-start gap-3 rounded-lg border ${config.border} ${config.bg} px-4 py-3`}>
                    <span className="text-lg mt-0.5">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-medical-text text-sm">{flag.patientName}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text}`}>
                          {t(`risk.${flag.severity}`)}
                        </span>
                        <span className="text-xs text-medical-muted">{t(`risk.${flag.flagType}`)}</span>
                      </div>
                      <p className="text-xs text-medical-muted mt-0.5">{flag.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patients at Risk */}
      {atRiskItems.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              <CardTitle className="text-red-800">{t('dashboard.pendingActions')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRiskItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-white border border-red-100 px-4 py-3">
                  <div>
                    <p className="font-medium text-medical-text">{item.patientName}</p>
                    <p className="text-xs text-medical-muted">
                      {item.visit_type} &middot; {item.status === 'transcribed' ? t('dashboard.reviewTranscript') : t('dashboard.reviewGeneratedNote')}
                    </p>
                  </div>
                  <Link href={`/consultation/${item.id}/note`} className="text-sm text-red-600 hover:underline font-medium">
                    {t('dashboard.reviewNow')}
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dashboard.todaySchedule')}</CardTitle>
            <Link href="/calendar" className="text-sm text-brand-600 hover:underline">{t('dashboard.viewCalendar')}</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {todayItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-medical-border bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.patientCode')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.name')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.type')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.diagnosis')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.risk')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.appointment')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.status')}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-medical-border">
                  {todayItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-medical-muted">{item.patientCode}</td>
                      <td className="px-4 py-3 font-medium text-medical-text">{item.patientName}</td>
                      <td className="px-4 py-3 text-medical-muted">{item.visit_type}</td>
                      <td className="px-4 py-3 text-medical-muted">{item.diagnosis}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.riskStatus === 'at_risk' ? 'bg-red-100 text-red-700' :
                          item.riskStatus === 'watch' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.riskStatus === 'at_risk' ? 'bg-red-500' :
                            item.riskStatus === 'watch' ? 'bg-amber-500' :
                            'bg-green-500'
                          }`} />
                          {item.riskStatus === 'at_risk' ? t('risk.atRisk') : item.riskStatus === 'watch' ? t('risk.watch') : t('risk.normal')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-medical-muted text-xs">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/consultation/${item.id}/note`} className="text-sm text-brand-600 hover:underline">
                          {t('dashboard.view')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-medical-muted">
              <p>{t('dashboard.noConsultationsToday')}</p>
              <Link href="/consultation/new" className="mt-2 inline-block text-sm text-brand-600 hover:underline">{t('dashboard.startNewConsultation')}</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Consultations */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentConsultations')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {consultationsWithPatients.length > 0 ? (
            <div className="divide-y divide-medical-border">
              {consultationsWithPatients.map((consultation) => (
                <div key={consultation.id} className="flex items-center justify-between border-t border-medical-border px-6 py-4 transition hover:bg-gray-50">
                  <div className="flex-1">
                    <Link href={`/consultation/${consultation.id}/note`} className="font-medium text-medical-text hover:text-brand-600">
                      {consultation.patientName}
                    </Link>
                    <p className="mt-1 text-sm text-medical-muted">
                      {consultation.visit_type} &middot; {formatDateTime(consultation.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={consultation.status} />
                    <Link href={`/consultation/${consultation.id}/note`} className="text-sm text-brand-600 hover:underline">
                      {t('dashboard.viewNote')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-medical-muted">
              <p>{t('dashboard.noConsultationsYet')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
