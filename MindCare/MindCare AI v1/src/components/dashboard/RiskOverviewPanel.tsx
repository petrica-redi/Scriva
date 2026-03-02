'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEMO_PATIENTS } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n/i18n-context';

const DIAGNOSIS_PANEL_RO: Record<string, string> = {
  'Major Depressive Disorder, Recurrent': 'Tulburare Depresivă Majoră, Recurentă',
  'Generalized Anxiety Disorder + Alcohol Use Disorder': 'Tulburare de Anxietate Generalizată + Tulburare de Consum de Alcool',
  'Bipolar Disorder Type II': 'Tulburare Bipolară Tip II',
  'PTSD + Borderline Personality Disorder': 'PTSD + Tulburare de Personalitate Borderline',
  'Schizophrenia, Paranoid Type': 'Schizofrenie, Tip Paranoid',
  'OCD + Social Anxiety': 'TOC + Anxietate Socială',
  'ADHD, Combined Type': 'ADHD, Tip Combinat',
  'Panic Disorder with Agoraphobia': 'Tulburare de Panică cu Agorafobie',
};

const RISK_FLAG_TYPE_RO: Record<string, string> = {
  suicidal_ideation: 'ideație suicidară',
  self_harm: 'automutilare',
  medication_noncompliance: 'neconformitate medicamentoasă',
  substance_abuse: 'abuz de substanțe',
  deterioration: 'deteriorare',
  drug_interaction: 'interacțiune medicamentoasă',
  psychotic_symptoms: 'simptome psihotice',
};

const RISK_SEVERITY_RO: Record<string, string> = {
  critical: 'critic',
  high: 'ridicat',
  medium: 'mediu',
  low: 'scăzut',
};

export function RiskOverviewPanel() {
  const { t, locale } = useI18n();
  const isRo = locale === 'ro';

  const highRisk = DEMO_PATIENTS.filter(p => p.riskLevel === 'high');
  const mediumRisk = DEMO_PATIENTS.filter(p => p.riskLevel === 'medium');
  const lowRisk = DEMO_PATIENTS.filter(p => p.riskLevel === 'low');

  const groups = [
    { key: 'high', label: isRo ? 'Risc Ridicat' : 'High Risk', countLabel: isRo ? 'Ridicat' : 'High', patients: highRisk, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
    { key: 'medium', label: isRo ? 'Risc Mediu' : 'Medium Risk', countLabel: isRo ? 'Mediu' : 'Medium', patients: mediumRisk, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
    { key: 'low', label: isRo ? 'Risc Scăzut' : 'Low Risk', countLabel: isRo ? 'Scăzut' : 'Low', patients: lowRisk, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  ];

  function translateFlag(type: string, severity: string) {
    if (!isRo) return `${type.replace(/_/g, ' ')} • ${severity}`;
    const typeRo = RISK_FLAG_TYPE_RO[type] || type.replace(/_/g, ' ');
    const sevRo = RISK_SEVERITY_RO[severity] || severity;
    return `${typeRo} • ${sevRo}`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <CardTitle>{isRo ? 'Prezentare Generală Riscuri' : 'Risk Overview'}</CardTitle>
          </div>
          <div className="flex gap-2">
            {groups.map(g => (
              <span key={g.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${g.badge}`}>
                <span className={`h-2 w-2 rounded-full ${g.dot}`} />
                {g.patients.length} {g.countLabel}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.map(group => (
            group.patients.length > 0 && (
              <div key={group.key}>
                <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${group.text}`}>{group.label} ({group.patients.length})</h4>
                <div className="space-y-2">
                  {group.patients.map(patient => (
                    <div key={patient.id} className={`rounded-lg border ${group.border} ${group.bg} p-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />
                          <span className="font-medium text-sm text-gray-900">{patient.name}</span>
                          <span className="text-xs text-gray-500 font-mono">{patient.mrn}</span>
                        </div>
                        <span className="text-xs text-gray-500">{patient.icd10}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-5">{isRo ? (DIAGNOSIS_PANEL_RO[patient.diagnosis] || patient.diagnosis) : patient.diagnosis}</p>
                      {patient.riskFlags.length > 0 && (
                        <div className="mt-1.5 ml-5 flex flex-wrap gap-1">
                          {patient.riskFlags.map((flag, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-white/80 border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
                              {translateFlag(flag.type, flag.severity)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
