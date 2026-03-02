'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEMO_PATIENTS } from '@/lib/demo-data';

const DIAGNOSIS_RO: Record<string, string> = {
  'Major Depressive Disorder, Recurrent': 'Tulburare Depresivă Majoră, Recurentă',
  'Generalized Anxiety Disorder + Alcohol Use Disorder': 'Tulburare de Anxietate Generalizată + Tulburare de Consum de Alcool',
  'Bipolar Disorder Type II': 'Tulburare Bipolară Tip II',
  'PTSD + Borderline Personality Disorder': 'PTSD + Tulburare de Personalitate Borderline',
  'Schizophrenia, Paranoid Type': 'Schizofrenie, Tip Paranoid',
  'OCD + Social Anxiety': 'TOC + Anxietate Socială',
  'ADHD, Combined Type': 'ADHD, Tip Combinat',
  'Panic Disorder with Agoraphobia': 'Tulburare de Panică cu Agorafobie',
};

const FLAG_TYPE_RO: Record<string, string> = {
  suicidal_ideation: 'Ideație suicidară',
  self_harm: 'Automutilare',
  medication_noncompliance: 'Neconformitate medicamentoasă',
  substance_abuse: 'Abuz de substanțe',
  deterioration: 'Deteriorare',
  drug_interaction: 'Interacțiune medicamentoasă',
  psychotic_symptoms: 'Simptome psihotice',
};

const SEVERITY_RO: Record<string, string> = {
  critical: 'Critic',
  high: 'Ridicat',
  medium: 'Mediu',
  low: 'Scăzut',
};

interface Props {
  locale: string;
  t: (key: string) => string;
}

export function RiskPatientsTable({ locale, t }: Props) {
  const isRo = locale === 'ro';
  const riskPatients = DEMO_PATIENTS.filter(p => p.riskLevel === 'high' || p.riskLevel === 'medium');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <CardTitle>{isRo ? 'Pacienți cu Risc' : 'Patients at Risk'}</CardTitle>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {riskPatients.filter(p => p.riskLevel === 'high').length} {isRo ? 'Ridicat' : 'High'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {riskPatients.filter(p => p.riskLevel === 'medium').length} {isRo ? 'Mediu' : 'Medium'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-medical-border bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">{isRo ? 'Pacient' : 'Patient'}</th>
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">{isRo ? 'Cod' : 'MRN'}</th>
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">{isRo ? 'Diagnostic' : 'Diagnosis'}</th>
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">ICD-10</th>
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">{isRo ? 'Risc' : 'Risk'}</th>
                <th className="px-4 py-3 text-left font-semibold text-medical-muted">{isRo ? 'Semnale de Risc' : 'Risk Signals'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-medical-border">
              {riskPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-medical-text">{patient.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-medical-muted">{patient.mrn}</td>
                  <td className="px-4 py-3 text-medical-muted text-xs">{isRo ? (DIAGNOSIS_RO[patient.diagnosis] || patient.diagnosis) : patient.diagnosis}</td>
                  <td className="px-4 py-3 font-mono text-xs text-medical-muted">{patient.icd10}</td>
                  <td className="px-4 py-3">
                    {patient.riskLevel === 'high' ? (
                      <span className="text-red-600 font-medium text-xs">{isRo ? 'Ridicat' : 'High'}</span>
                    ) : (
                      <span className="text-amber-600 font-medium text-xs">{isRo ? 'Mediu' : 'Medium'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {patient.riskFlags.map((flag, i) => (
                        <span key={i} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                          flag.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          flag.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {isRo ? (FLAG_TYPE_RO[flag.type] || flag.type.replace(/_/g, ' ')) : flag.type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
