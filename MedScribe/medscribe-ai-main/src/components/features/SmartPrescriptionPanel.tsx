"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pill, Calculator, BookOpen, Search, ChevronDown, ChevronUp } from "lucide-react";

interface MedicationOption {
  id: string;
  name: string;
  atc_code?: string;
  list_type?: string;
  compensated?: boolean;
}

interface PathwayLine {
  line: number;
  label: string;
  options: Array<{
    medication: { id: string; name: string; list_type?: string; compensated?: boolean } | null;
    list_type?: string;
    compensated?: boolean;
    source?: string;
    notes?: string;
  }>;
}

interface SmartPrescriptionPanelProps {
  /** ICD-10 or diagnosis name from consultation (optional) */
  diagnosisCode?: string;
  diagnosisName?: string;
  /** Callback when user picks a medication to add */
  onSelectMedication?: (name: string) => void;
}

export function SmartPrescriptionPanel({
  diagnosisCode,
  diagnosisName,
  onSelectMedication,
}: SmartPrescriptionPanelProps) {
  const [pathway, setPathway] = useState<{ diagnosis_icd10?: string; diagnosis_name?: string; pathway: PathwayLine[] } | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [pathwayOpen, setPathwayOpen] = useState(true);

  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState<MedicationOption[]>([]);
  const [medSearching, setMedSearching] = useState(false);
  const [medDropdownOpen, setMedDropdownOpen] = useState(false);

  const [fromMed, setFromMed] = useState("");
  const [fromDose, setFromDose] = useState("");
  const [toMed, setToMed] = useState("");
  const [equivResult, setEquivResult] = useState<{
    to: { medication: string; dose: number; unit: string };
    note?: string;
  } | null>(null);
  const [equivLoading, setEquivLoading] = useState(false);
  const [equivOpen, setEquivOpen] = useState(false);

  const [manualDiagnosis, setManualDiagnosis] = useState("");
  const diagnosisParam = diagnosisCode || diagnosisName || manualDiagnosis.trim();
  const looksLikeIcd = (s: string) => /^[A-Za-z]\d{2}(\.\d{1,2})?$/i.test(s.trim());

  const fetchPathway = useCallback(async () => {
    if (!diagnosisParam) return;
    setPathwayLoading(true);
    try {
      const params = new URLSearchParams();
      const useCode = diagnosisCode || (manualDiagnosis.trim() && looksLikeIcd(manualDiagnosis) ? manualDiagnosis.trim() : "");
      const useName = diagnosisName || (manualDiagnosis.trim() && !looksLikeIcd(manualDiagnosis) ? manualDiagnosis.trim() : "");
      if (useCode) params.set("diagnosis", useCode);
      if (useName) params.set("diagnosis_name", useName);
      const res = await fetch(`/api/smart-prescription/treatment-pathway?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPathway({ pathway: data.pathway || [], diagnosis_icd10: data.diagnosis_icd10, diagnosis_name: data.diagnosis_name });
      } else {
        setPathway(null);
      }
    } catch {
      setPathway(null);
    } finally {
      setPathwayLoading(false);
    }
  }, [diagnosisCode, diagnosisName, diagnosisParam, manualDiagnosis]);

  useEffect(() => {
    fetchPathway();
  }, [fetchPathway]);

  const searchMeds = useCallback(async () => {
    const q = medSearch.trim();
    if (!q) {
      setMedResults([]);
      return;
    }
    setMedSearching(true);
    try {
      const res = await fetch(`/api/smart-prescription/medications?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setMedResults(data.medications || []);
        setMedDropdownOpen(true);
      }
    } catch {
      setMedResults([]);
    } finally {
      setMedSearching(false);
    }
  }, [medSearch]);

  useEffect(() => {
    const t = setTimeout(() => searchMeds(), 300);
    return () => clearTimeout(t);
  }, [medSearch, searchMeds]);

  const calculateEquiv = async () => {
    if (!fromMed.trim() || !fromDose.trim() || !toMed.trim()) return;
    setEquivLoading(true);
    setEquivResult(null);
    try {
      const params = new URLSearchParams({
        from: fromMed,
        fromDose: fromDose.trim(),
        to: toMed,
      });
      const res = await fetch(`/api/smart-prescription/dose-equivalence?${params}`);
      const data = await res.json();
      if (res.ok && data.to?.dose != null) {
        setEquivResult({
          to: { medication: data.to.medication, dose: data.to.dose, unit: data.to.unit || "mg" },
          note: data.note,
        });
      } else {
        setEquivResult({
          to: { medication: data.to?.medication || toMed, dose: 0, unit: "mg" },
          note: data.note || "No equivalence data.",
        });
      }
    } catch {
      setEquivResult(null);
    } finally {
      setEquivLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pill className="w-4 h-4 text-amber-600" />
          Prescripție Inteligentă
        </CardTitle>
        <p className="text-xs text-medical-muted">
          Sugestii după diagnostic, căutare medicamente, echivalență doză (Maudsley/CANMAT).
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Treatment pathway by diagnosis */}
        <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
          {!(diagnosisCode || diagnosisName) && (
            <div className="p-2.5 border-b border-amber-200">
              <label className="block text-xs font-medium text-medical-text mb-1">Diagnostic (opțional — pentru sugestii tratament)</label>
              <input
                type="text"
                value={manualDiagnosis}
                onChange={(e) => setManualDiagnosis(e.target.value)}
                placeholder="ex. F32.1 sau Depresie moderată"
                className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          )}
          {(diagnosisParam || pathway) && (
            <>
            <button
              type="button"
              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-amber-50"
              onClick={() => setPathwayOpen(!pathwayOpen)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-medical-text">Tratament recomandat (diagnostic)</span>
                {pathway?.diagnosis_icd10 && (
                  <Badge variant="secondary" className="text-xs">{pathway.diagnosis_icd10}</Badge>
                )}
              </div>
              {pathwayOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {pathwayOpen && (
              <div className="border-t border-amber-200 p-2.5 space-y-2">
                {pathwayLoading && (
                  <p className="text-xs text-medical-muted">Se încarcă...</p>
                )}
                {!pathwayLoading && pathway?.pathway?.length === 0 && (
                  <p className="text-xs text-medical-muted">
                    {diagnosisParam
                      ? "Niciun protocol găsit pentru acest diagnostic. Adaugă date în medication_protocols."
                      : "Introdu un cod ICD-10 sau nume diagnostic pentru sugestii."}
                  </p>
                )}
                {!pathwayLoading && (pathway?.pathway?.length ?? 0) > 0 && (pathway?.pathway ?? []).map((line) => (
                  <div key={line.line} className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">{line.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {line.options.map((opt, i) => {
                        const name = opt.medication?.name;
                        if (!name) return null;
                        return (
                          <button
                            key={`${line.line}-${i}`}
                            type="button"
                            onClick={() => onSelectMedication?.(name)}
                            className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
                          >
                            {name}
                            {opt.list_type && <span className="ml-1 text-amber-600">({opt.list_type})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </>
          )}
        </div>

        {/* Medication search */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-medical-text">
            <Search className="w-3.5 h-3.5" />
            Caută medicament
          </label>
          <div className="relative">
            <input
              type="text"
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              onFocus={() => medResults.length > 0 && setMedDropdownOpen(true)}
              placeholder="ex. Sertraline, Escitalopram"
              className="w-full rounded-lg border border-medical-border bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {medSearching && (
              <span className="absolute right-3 top-2 text-xs text-medical-muted">...</span>
            )}
            {medDropdownOpen && medResults.length > 0 && (
              <div
                className="absolute z-10 mt-1 w-full rounded-lg border border-medical-border bg-white shadow-lg max-h-48 overflow-auto"
                role="listbox"
              >
                {medResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    onClick={() => {
                      onSelectMedication?.(m.name);
                      setMedSearch("");
                      setMedResults([]);
                      setMedDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-amber-50"
                  >
                    <span className="font-medium">{m.name}</span>
                    {m.list_type && <Badge variant="outline" className="text-xs">Listă {m.list_type}</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dose equivalence */}
        <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-2.5 text-left hover:bg-amber-50"
            onClick={() => setEquivOpen(!equivOpen)}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-medical-text">Echivalență doză</span>
            </div>
            {equivOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {equivOpen && (
            <div className="border-t border-amber-200 p-2.5 space-y-2">
              <p className="text-xs text-medical-muted">
                Schimb de la un medicament la altul: introduce doza actuală și medicamentul țintă.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="De la (ex. Sertraline)"
                  value={fromMed}
                  onChange={(e) => setFromMed(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Doza (ex. 100)"
                  type="text"
                  value={fromDose}
                  onChange={(e) => setFromDose(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="La (ex. Escitalopram)"
                  value={toMed}
                  onChange={(e) => setToMed(e.target.value)}
                  className="text-sm sm:col-span-2"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={calculateEquiv}
                disabled={equivLoading || !fromMed.trim() || !fromDose.trim() || !toMed.trim()}
                className="w-full sm:w-auto"
              >
                {equivLoading ? "Calculez..." : "Calculează doza echivalentă"}
              </Button>
              {equivResult && (
                <div className="rounded-md bg-amber-100 p-2 text-sm text-amber-900">
                  <p className="font-medium">
                    Doză echivalentă: {equivResult.to.dose} {equivResult.to.unit} {equivResult.to.medication}
                  </p>
                  {equivResult.note && <p className="text-xs mt-1 text-amber-700">{equivResult.note}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
