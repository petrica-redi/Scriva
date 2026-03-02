'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { RiskPatientsTable } from './RiskPatientsTable';

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
  description_ro?: string;
}

const DEMO_RISK_FLAGS: RiskFlagItem[] = [
  { patientName: 'Maria Popescu', flagType: 'suicidal_ideation', severity: 'critical', description: 'Expressed passive suicidal thoughts during last session', description_ro: 'A exprimat gânduri suicidare pasive în ultima ședință' },
  { patientName: 'Elena Vasile', flagType: 'self_harm', severity: 'high', description: 'History of self-harm, recent stressor identified', description_ro: 'Istoric de automutilare, factor de stres recent identificat' },
  { patientName: 'Ion Ionescu', flagType: 'medication_noncompliance', severity: 'high', description: 'Missed last 3 medication refills', description_ro: 'A ratat ultimele 3 reumpleri de medicație' },
  { patientName: 'Ion Ionescu', flagType: 'substance_abuse', severity: 'medium', description: 'Reported increased alcohol consumption', description_ro: 'A raportat consum crescut de alcool' },
  { patientName: 'Ana Dumitrescu', flagType: 'deterioration', severity: 'medium', description: 'PHQ-9 score increased from 12 to 18', description_ro: 'Scorul PHQ-9 a crescut de la 12 la 18' },
  { patientName: 'Andrei Popa', flagType: 'drug_interaction', severity: 'low', description: 'Potential interaction between fluoxetine and tramadol', description_ro: 'Posibilă interacțiune între fluoxetină și tramadol' },
  { patientName: 'Cristina Marin', flagType: 'psychotic_symptoms', severity: 'high', description: 'New onset auditory hallucinations reported', description_ro: 'Halucinații auditive nou apărute raportate' },
];

const SEVERITY_CONFIG = {
  critical: { emoji: '🔴', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', ring: 'ring-red-500' },
  high: { emoji: '🟠', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', ring: 'ring-orange-500' },
  medium: { emoji: '🟡', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', ring: 'ring-yellow-500' },
  low: { emoji: '🟢', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', ring: 'ring-green-500' },
};

const DIAGNOSIS_RO: Record<string, string> = {
  'Recurrent depression': 'Depresie recurentă',
  'Generalized anxiety disorder': 'Tulburare de anxietate generalizată',
  'Post-traumatic stress disorder': 'Tulburare de stres post-traumatic',
  'Bipolar disorder type I': 'Tulburare bipolară tip I',
  'Adult ADHD': 'ADHD la adult',
  'Panic disorder': 'Tulburare de panică',
  'Paranoid schizophrenia': 'Schizofrenie paranoidă',
  'Obsessive-compulsive disorder': 'Tulburare obsesiv-compulsivă',
  'Alcohol dependence': 'Dependență de alcool',
  'Anorexia nervosa': 'Anorexie nervoasă',
  'Major depressive disorder': 'Tulburare depresivă majoră',
  'Chronic insomnia': 'Insomnie cronică',
  'Social phobia': 'Fobie socială',
  'Borderline personality disorder': 'Tulburare de personalitate borderline',
  'Depression with anxiety': 'Depresie cu anxietate',
  'Bulimia nervosa': 'Bulimie nervoasă',
  'Adjustment disorder': 'Tulburare de adaptare',
  'Bipolar disorder type II': 'Tulburare bipolară tip II',
  'Combined ADHD': 'ADHD combinat',
  'Severe depression': 'Depresie severă',
  'Schizoaffective disorder': 'Tulburare schizoafectivă',
  'Body dysmorphic disorder': 'Tulburare dismorfică corporală',
  'Conversion disorder': 'Tulburare de conversie',
  'Dissociative identity disorder': 'Tulburare disociativă de identitate',
  'Reactive attachment disorder': 'Tulburare reactivă de atașament',
  'Selective mutism': 'Mutism selectiv',
  'Persistent depressive disorder': 'Tulburare depresivă persistentă',
  'Cyclothymic disorder': 'Tulburare ciclotimică',
  'Illness anxiety disorder': 'Tulburare de anxietate legată de boală',
  'Gambling disorder': 'Tulburare de joc patologic',
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
  const { t, locale } = useI18n();
  const greeting = useGreeting();
  const dxRo = (dx: string) => locale === 'ro' ? (DIAGNOSIS_RO[dx] || dx) : dx;

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
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{locale === 'ro' ? 'Semnale' : 'Signals'}</th>
                    <th className="px-4 py-3 text-left font-semibold text-medical-muted">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-medical-border">
                  {todayItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-medical-muted">{item.patientCode}</td>
                      <td className="px-4 py-3 font-medium text-medical-text">{item.patientName}</td>
                      <td className="px-4 py-3 text-medical-muted">{t(`visitType.${item.visit_type}`)}</td>
                      <td className="px-4 py-3 text-medical-muted">{dxRo(item.diagnosis)}</td>
                      <td className="px-4 py-3 text-xs text-medical-muted">
                        {item.riskStatus === 'at_risk' ? (
                          <span className="text-red-600 font-medium">{locale === 'ro' ? 'Ridicat' : 'High'}</span>
                        ) : item.riskStatus === 'watch' ? (
                          <span className="text-amber-600 font-medium">{locale === 'ro' ? 'Mediu' : 'Medium'}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-medical-muted text-xs">
                        <span className="font-semibold text-sm text-medical-text">{new Date(item.created_at).toLocaleTimeString(locale === 'ro' ? 'ro-RO' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        <br />
                        {new Date(item.created_at).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const flags = DEMO_RISK_FLAGS.filter(f => f.patientName === item.patientName);
                          return flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {flags.map((f, i) => {
                                const sevConfig = SEVERITY_CONFIG[f.severity];
                                return (
                                  <span key={i} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${sevConfig?.bg} ${sevConfig?.text}`} title={locale === 'ro' && f.description_ro ? f.description_ro : f.description}>
                                    {sevConfig?.emoji}
                                  </span>
                                );
                              })}
                            </div>
                          ) : <span className="text-gray-300">—</span>;
                        })()}
                      </td>
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

      {/* Patients at Risk Table */}
      <RiskPatientsTable locale={locale} t={t} />

    </div>
  );
}
