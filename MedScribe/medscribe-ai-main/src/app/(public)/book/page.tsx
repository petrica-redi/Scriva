"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ───────── Types ───────── */
interface Clinic {
  id: string;
  name: string;
  type: string;
  specialty: string[];
  city: string;
  country: string;
  country_code: string;
  address: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  services: string[] | null;
  languages: string[] | null;
  consultation_types: string[] | null;
  rating: number | null;
  reviews_count: number | null;
}

interface Physician {
  id: string;
  name: string;
  specialty: string;
  country: string;
  city: string;
  language: string[] | null;
  bio: string | null;
  consultation_types: string[] | null;
  price_consultation: number | null;
  currency: string | null;
  rating: number | null;
  reviews_count: number | null;
}

type ViewState = "search" | "results" | "profile" | "booking";

/* ───────── Utilities ───────── */
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function StarRating({ rating, reviews }: { rating: number | null; reviews?: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-500 text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < full ? "★" : i === full && half ? "★" : "☆"}</span>
      ))}
      <span className="text-gray-600 ml-1 text-xs">
        {rating.toFixed(1)}
        {reviews != null && <span className="text-gray-400"> ({reviews})</span>}
      </span>
    </span>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
      {initials.toUpperCase()}
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  Hospital: "bg-red-100 text-red-700",
  Clinic: "bg-blue-100 text-blue-700",
  Practice: "bg-green-100 text-green-700",
};

function getNext14Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) days.push(d);
  }
  return days;
}

const MOCK_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const SPECIALTIES = [
  "Psychiatry", "Psychology", "Clinical Psychology", "Psychotherapy", "Counseling",
  "Art Therapy", "Music Therapy", "Behavioral Therapy",
  "General Practice", "Internal Medicine", "Family Medicine",
  "Cardiology", "Neurology", "Dermatology", "Pediatrics",
  "Orthopedics", "Ophthalmology", "ENT", "Oncology",
  "Gastroenterology", "Endocrinology", "Pulmonology",
  "Obstetrics & Gynecology", "Urology", "Surgery",
  "Radiology", "Rheumatology", "Geriatrics",
  "Pain Management", "Sleep Medicine",
  "Occupational Therapy", "Speech & Language Therapy",
  "Physical Medicine & Rehabilitation",
  "Acupuncture", "Chiropractic", "Homeopathy", "Naturopathy", "Osteopathy",
  "Nutrition & Dietetics", "Dentistry", "Orthodontics",
];

const DOCTOR_USER_ID = "c270c2da-1ea8-4166-bc6f-28471928a672";

/* ───────── Main Component ───────── */
export default function BookingPage() {
  // Navigation
  const [view, setView] = useState<ViewState>("search");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filters (results view)
  const [filterSpecialties, setFilterSpecialties] = useState<string[]>([]);
  const [filterConsultation, setFilterConsultation] = useState("");
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterLanguage, setFilterLanguage] = useState("");

  // Profile view
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicPhysicians, setClinicPhysicians] = useState<Physician[]>([]);
  const [profileTab, setProfileTab] = useState<"doctors" | "services" | "info">("doctors");

  // Booking
  const [bookingPhysician, setBookingPhysician] = useState<Physician | null>(null);
  const [bookingStep, setBookingStep] = useState(0); // 0=type, 1=date, 2=time, 3=details, 4=confirmed
  const [visitType, setVisitType] = useState<"in-person" | "teleconsultation" | "">("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ id: string; date: string; time: string } | null>(null);
  const [error, setError] = useState("");

  const debouncedQuery = useDebounce(searchQuery, 300);
  const debouncedLocation = useDebounce(searchLocation, 300);

  const doSearch = useCallback(async (q: string, loc: string, opts?: { specialty?: string; consultationType?: string; minRating?: number; language?: string }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", opts?.specialty || q);
    if (loc) params.set("location", loc);
    if (opts?.consultationType) params.set("consultationType", opts.consultationType);
    if (opts?.minRating) params.set("minRating", String(opts.minRating));
    if (opts?.language) params.set("language", opts.language);
    if (!q && !loc) { setClinics([]); setPhysicians([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/clinics/search?${params}`);
      const data = await res.json();
      setClinics(data.results || []);
      setPhysicians(data.physicians || []);
    } catch {
      setClinics([]);
      setPhysicians([]);
    }
    setSearchLoading(false);
  }, []);

  // Debounced search for dropdown
  useEffect(() => {
    if (view === "search" && (debouncedQuery || debouncedLocation)) {
      doSearch(debouncedQuery, debouncedLocation);
      setShowDropdown(true);
      setShowSpecialtyDropdown(false);
    } else if (view === "search") {
      setShowDropdown(false);
    }
  }, [debouncedQuery, debouncedLocation, view, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFullSearch() {
    doSearch(searchQuery, searchLocation, {
      consultationType: filterConsultation,
      minRating: filterMinRating,
      language: filterLanguage,
    });
    setView("results");
    setShowDropdown(false);
  }

  function handleSpecialtyClick(spec: string) {
    setSearchQuery(spec);
    doSearch(spec, searchLocation);
    setView("results");
  }

  async function openClinicProfile(clinic: Clinic) {
    setSelectedClinic(clinic);
    setProfileTab("doctors");
    setView("profile");
    setClinicPhysicians([]);
    
    // Fetch physicians for this clinic's city+country
    try {
      const params = new URLSearchParams();
      params.set("q", clinic.specialty?.[0] || "");
      params.set("location", clinic.city);
      const res = await fetch(`/api/clinics/search?${params}`);
      const data = await res.json();
      const allPhysicians = data.physicians || [];
      
      // Match by city + specialty overlap
      const matched = allPhysicians.filter(
        (p: Physician) =>
          p.city?.toLowerCase() === clinic.city?.toLowerCase() &&
          clinic.specialty?.some(
            (s) => s.toLowerCase() === p.specialty?.toLowerCase()
          )
      );
      // Fallback: same city any specialty
      const fallback = matched.length > 0 ? matched : allPhysicians.filter(
        (p: Physician) => p.city?.toLowerCase() === clinic.city?.toLowerCase()
      );
      setClinicPhysicians(fallback.length > 0 ? fallback : allPhysicians);
    } catch {
      setClinicPhysicians([]);
    }
  }

  function startBooking(physician: Physician) {
    setBookingPhysician(physician);
    setBookingStep(0);
    setVisitType("");
    setSelectedDate("");
    setSelectedTime("");
    setForm({ name: "", email: "", phone: "", reason: "" });
    setBookingResult(null);
    setError("");
    setView("booking");
  }

  async function fetchSlots(date: string) {
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/bookings?date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.slots || MOCK_SLOTS);
    } catch {
      setAvailableSlots(MOCK_SLOTS);
    }
    setLoadingSlots(false);
  }

  async function handleSubmitBooking() {
    if (!form.name || !form.email || !form.phone) {
      setError("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_type: visitType,
          date: selectedDate,
          time: selectedTime,
          patient_name: form.name,
          patient_email: form.email,
          patient_phone: form.phone,
          reason: form.reason,
          doctor_id: DOCTOR_USER_ID,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setBookingResult({ id: data.consultation_id || "demo", date: selectedDate, time: selectedTime });
      setBookingStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Booking failed");
    }
    setSubmitting(false);
  }

  // Apply client-side specialty filter
  const filteredClinics = clinics.filter((c) => {
    if (filterSpecialties.length > 0 && !c.specialty?.some((s) => filterSpecialties.includes(s))) return false;
    return true;
  });

  const filteredPhysicians = physicians.filter((p) => {
    if (filterSpecialties.length > 0 && !filterSpecialties.some((s) => s.toLowerCase() === p.specialty?.toLowerCase())) return false;
    return true;
  });

  // Collect all specialties from results for filter
  const resultSpecialties = [...new Set([
    ...clinics.flatMap((c) => c.specialty || []),
    ...physicians.map((p) => p.specialty).filter(Boolean),
  ])].sort();

  const resultLanguages = [...new Set([
    ...clinics.flatMap((c) => c.languages || []),
    ...physicians.flatMap((p) => p.language || []),
  ])].sort();

  const days = getNext14Days();

  /* ───────── Render ───────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-blue-600">Scriva</Link>
            {view !== "search" && (
              <button
                onClick={() => setView("search")}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                ← Back to search
              </button>
            )}
          </div>
          <Link href="/auth/signin" className="text-sm text-blue-600 hover:underline">
            Doctor Login
          </Link>
        </div>
      </header>

      {/* ══════════ SEARCH VIEW ══════════ */}
      {view === "search" && (
        <>
          <section className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
            </div>
            <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 relative">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
                Live a healthier life
              </h1>
              <p className="text-blue-100 text-lg mb-8 max-w-xl">
                Book your appointment online — fast, simple, and secure
              </p>

              <div ref={searchRef} className="relative max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center p-2 gap-2 sm:gap-0">
                  <div className="flex items-center flex-1 px-4 gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSpecialtyDropdown(e.target.value.length > 0); }}
                        onFocus={() => { 
                          if (clinics.length || physicians.length) setShowDropdown(true);
                          if (searchQuery.length > 0) setShowSpecialtyDropdown(true);
                        }}
                        placeholder="Name, specialty, establishment..."
                        className="w-full text-sm sm:text-base text-gray-700 placeholder-gray-400 outline-none bg-transparent py-3"
                      />
                      {showSpecialtyDropdown && !showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[60] max-h-60 overflow-y-auto">
                          {SPECIALTIES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).map((spec) => (
                            <button
                              key={spec}
                              onClick={() => { setSearchQuery(spec); setShowSpecialtyDropdown(false); handleSpecialtyClick(spec); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              {spec}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center px-4 gap-3 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                    </svg>
                    <input
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      onFocus={() => { if (clinics.length || physicians.length) setShowDropdown(true); }}
                      placeholder="City or country"
                      className="flex-1 sm:w-36 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent py-3"
                    />
                  </div>
                  <button
                    onClick={handleFullSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm sm:text-base transition-colors whitespace-nowrap"
                  >
                    Find a doctor
                  </button>
                </div>

                {/* Dropdown */}
                {showDropdown && (clinics.length > 0 || physicians.length > 0 || searchLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-gray-500 text-sm">Searching...</span>
                      </div>
                    ) : (
                      <div className="py-2">
                        {clinics.slice(0, 5).map((c) => (
                          <button
                            key={c.id || c.name}
                            onClick={() => { openClinicProfile(c); setShowDropdown(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-lg shrink-0">🏥</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 truncate">{c.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type] || "bg-gray-100 text-gray-600"}`}>{c.type}</span>
                                </div>
                                <div className="text-xs text-gray-500">{c.city}, {c.country}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                        {physicians.slice(0, 5).map((p) => (
                          <button
                            key={p.id || p.name}
                            onClick={() => { startBooking(p); setShowDropdown(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Initials name={p.name} />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-gray-900">Dr. {p.name}</span>
                                <div className="text-xs text-gray-500">{p.specialty} · {p.city}, {p.country}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                        {(clinics.length > 5 || physicians.length > 5) && (
                          <button onClick={handleFullSearch} className="w-full text-center py-3 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                            View all results →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                {["Psychiatry", "Psychology", "General Practice", "Cardiology", "Neurology"].map((spec) => (
                  <button
                    key={spec}
                    onClick={() => handleSpecialtyClick(spec)}
                    className="bg-white/15 hover:bg-white/25 backdrop-blur text-white text-sm px-4 py-2 rounded-full transition-colors"
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Partner Booking */}
          <section className="max-w-4xl mx-auto px-4 pt-12 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Appointments</h2>
            <a
              href="http://programarionline.ana-aslan.ro/ProgramariOnline/?sd=11/03/2026&ed=20/03/2026&ls=51&sp=19&m=423500000005152&tp=90&a=1&zi=&d=&c=0&ta=0&PacientId=&relid=&relname=&loc=&o=&op=&ss=2"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0 group-hover:bg-blue-100 transition-colors">
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">Ana Aslan — Programări Online</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">HIPOCRATE</span>
                  </div>
                  <p className="text-sm text-gray-500">Psihiatrie · Ambulatoriu integrat Căldarușani · Dr. Purnichi Traian</p>
                  <p className="text-xs text-blue-600 mt-1 group-hover:underline">Deschide sistemul de programări online →</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
            </a>
          </section>

          {/* Feature cards */}
          <section className="max-w-4xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "🔍", title: "Find your doctor", desc: "Search by specialty, location, or name across our network of verified clinics." },
                { icon: "📅", title: "Book instantly", desc: "Choose your preferred date and time. Get confirmed in seconds." },
                { icon: "💻", title: "Video consultations", desc: "Can't visit in person? Book a teleconsultation from anywhere." },
              ].map((f) => (
                <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ══════════ RESULTS VIEW ══════════ */}
      {view === "results" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Search bar compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6 flex flex-col sm:flex-row gap-2">
            <div className="flex items-center flex-1 gap-2 px-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Specialty or name..."
                className="flex-1 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
              </svg>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Location"
                className="flex-1 sm:w-32 text-sm outline-none"
              />
            </div>
            <button onClick={handleFullSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              Search
            </button>
          </div>

          <div className="flex gap-6">
            {/* Left sidebar — Filters */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-20">
                <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>

                {/* Specialty */}
                <div className="mb-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Specialty</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {resultSpecialties.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterSpecialties.includes(s)}
                          onChange={() => setFilterSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Consultation type */}
                <div className="mb-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Consultation Type</h4>
                  <div className="space-y-1.5">
                    {["", "In-Person", "Video"].map((t) => (
                      <label key={t || "all"} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="radio"
                          name="consultType"
                          checked={filterConsultation === t}
                          onChange={() => setFilterConsultation(t)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {t || "All"}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Minimum Rating</h4>
                  <div className="space-y-1.5">
                    {[0, 3, 4, 4.5].map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="radio"
                          name="minRating"
                          checked={filterMinRating === r}
                          onChange={() => setFilterMinRating(r)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {r === 0 ? "Any" : `${r}+ stars`}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Language</h4>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg text-sm py-2 px-3 text-gray-600"
                  >
                    <option value="">All languages</option>
                    {resultLanguages.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleFullSearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </aside>

            {/* Main results */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {filteredClinics.length + filteredPhysicians.length} results
                  {searchQuery && <span className="text-gray-400 font-normal"> for &ldquo;{searchQuery}&rdquo;</span>}
                  {searchLocation && <span className="text-gray-400 font-normal"> in {searchLocation}</span>}
                </h2>
              </div>

              {searchLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredClinics.length === 0 && filteredPhysicians.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="font-semibold text-gray-900 mb-1">No results found</h3>
                  <p className="text-sm text-gray-500">Try adjusting your search terms or filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Clinic cards */}
                  {filteredClinics.map((c) => {
                    const matchingDocs = physicians.filter(
                      (p) => p.city === c.city && p.country === c.country && c.specialty?.some((s) => s.toLowerCase() === p.specialty?.toLowerCase())
                    ).slice(0, 3);
                    return (
                      <div key={c.id || c.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg">{c.name}</h3>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type] || "bg-gray-100 text-gray-600"}`}>
                                {c.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                              </svg>
                              {c.address || `${c.city}, ${c.country}`}
                            </p>
                            <div className="flex items-center gap-3 mb-3">
                              <StarRating rating={c.rating} reviews={c.reviews_count} />
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {c.specialty?.slice(0, 5).map((s) => (
                                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{s}</span>
                              ))}
                              {c.specialty && c.specialty.length > 5 && (
                                <span className="text-xs text-gray-400 px-2 py-1">+{c.specialty.length - 5}</span>
                              )}
                            </div>

                            {/* Matched doctors preview */}
                            {matchingDocs.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">Doctors:</span>
                                <div className="flex -space-x-2">
                                  {matchingDocs.map((d) => (
                                    <div key={d.id || d.name} className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold border-2 border-white" title={`Dr. ${d.name}`}>
                                      {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500">{matchingDocs.map((d) => `Dr. ${d.name.split(" ")[0]}`).join(", ")}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end justify-between shrink-0">
                            <button
                              onClick={() => openClinicProfile(c)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                            >
                              Book appointment
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Physician cards (standalone) */}
                  {filteredPhysicians.map((p) => (
                    <div key={p.id || p.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <Initials name={p.name} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg">Dr. {p.name}</h3>
                          <p className="text-sm text-blue-600 mb-1">{p.specialty}</p>
                          <p className="text-sm text-gray-500 mb-2">{p.city}, {p.country}</p>
                          <div className="flex items-center gap-4 mb-2">
                            <StarRating rating={p.rating} reviews={p.reviews_count} />
                            {p.price_consultation && (
                              <span className="text-sm font-medium text-gray-700">
                                {p.price_consultation} {p.currency || "EUR"}
                              </span>
                            )}
                          </div>
                          {p.language && p.language.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.language.map((l) => (
                                <span key={l} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{l}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => startBooking(p)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PROFILE VIEW ══════════ */}
      {view === "profile" && selectedClinic && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Clinic header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{selectedClinic.name}</h1>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[selectedClinic.type] || "bg-gray-100 text-gray-600"}`}>
                    {selectedClinic.type}
                  </span>
                </div>
                <p className="text-gray-500 flex items-center gap-1 mb-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                  </svg>
                  {selectedClinic.address || `${selectedClinic.city}, ${selectedClinic.country}`}
                </p>
                <StarRating rating={selectedClinic.rating} reviews={selectedClinic.reviews_count} />
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {selectedClinic.phone && (
                  <a href={`tel:${selectedClinic.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                    📞 {selectedClinic.phone}
                  </a>
                )}
                {selectedClinic.website && (
                  <a href={selectedClinic.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    🌐 Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            {(["doctors", "services", "info"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setProfileTab(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  profileTab === tab ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab === "doctors" ? "Doctors" : tab === "services" ? "Services" : "Information"}
              </button>
            ))}
          </div>

          {/* Doctors tab */}
          {profileTab === "doctors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinicPhysicians.length === 0 ? (
                <div className="col-span-2 bg-white rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-500">No physician profiles available for this clinic yet.</p>
                  <p className="text-sm text-gray-400 mt-1">You can still book an appointment directly.</p>
                  <button
                    onClick={() => { setView("booking"); setBookingStep(0); }}
                    className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    📅 Book an Appointment
                  </button>
                </div>
              ) : (
                clinicPhysicians.map((p) => (
                  <div key={p.id || p.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <Initials name={p.name} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">Dr. {p.name}</h3>
                        <p className="text-sm text-blue-600 mb-1">{p.specialty}</p>
                        <StarRating rating={p.rating} reviews={p.reviews_count} />
                        {p.bio && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.bio}</p>}
                        <div className="flex items-center gap-3 mt-3">
                          {p.price_consultation && (
                            <span className="text-sm font-semibold text-gray-900">
                              {p.price_consultation} {p.currency || "EUR"}
                            </span>
                          )}
                          {p.consultation_types && (
                            <div className="flex gap-1">
                              {p.consultation_types.map((ct) => (
                                <span key={ct} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{ct}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => startBooking(p)}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Book with Dr. {p.name.split(" ")[0]}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Services tab */}
          {profileTab === "services" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Specialties & Services</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedClinic.specialty?.map((s) => (
                  <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">{s}</span>
                ))}
              </div>
              {selectedClinic.services && selectedClinic.services.length > 0 && (
                <>
                  <h4 className="font-medium text-gray-700 mb-2">Services offered</h4>
                  <ul className="space-y-1.5">
                    {selectedClinic.services.map((s) => (
                      <li key={s} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-green-500">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {selectedClinic.consultation_types && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Consultation types</h4>
                  <div className="flex gap-2">
                    {selectedClinic.consultation_types.map((ct) => (
                      <span key={ct} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg">{ct}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info tab */}
          {profileTab === "info" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {selectedClinic.description && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedClinic.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Address</h4>
                  <p className="text-sm text-gray-600">{selectedClinic.address || `${selectedClinic.city}, ${selectedClinic.country}`}</p>
                </div>
                {selectedClinic.phone && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Phone</h4>
                    <p className="text-sm text-gray-600">{selectedClinic.phone}</p>
                  </div>
                )}
                {selectedClinic.languages && selectedClinic.languages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Languages</h4>
                    <p className="text-sm text-gray-600">{selectedClinic.languages.join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Back to results */}
          <button
            onClick={() => setView("results")}
            className="mt-6 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to results
          </button>
        </div>
      )}

      {/* ══════════ BOOKING VIEW ══════════ */}
      {view === "booking" && bookingPhysician && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Doctor info banner */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-4">
            <Initials name={bookingPhysician.name} />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Dr. {bookingPhysician.name}</h2>
              <p className="text-sm text-gray-500">{bookingPhysician.specialty} · {bookingPhysician.city}, {bookingPhysician.country}</p>
            </div>
            {bookingPhysician.price_consultation && (
              <span className="text-lg font-semibold text-gray-900">{bookingPhysician.price_consultation} {bookingPhysician.currency || "EUR"}</span>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1 mb-8">
            {["Type", "Date", "Time", "Details", "Done"].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < bookingStep ? "bg-blue-600 text-white" : i === bookingStep ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-gray-200 text-gray-500"
                  }`}>
                    {i < bookingStep ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] mt-1 text-gray-400 hidden sm:block">{label}</span>
                </div>
                {i < 4 && <div className={`w-8 sm:w-12 h-0.5 ${i < bookingStep ? "bg-blue-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
          )}

          {/* Step 0: Consultation Type */}
          {bookingStep === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: "in-person" as const, icon: "🏥", title: "In-Person Visit", desc: "Visit the clinic for your consultation" },
                { value: "teleconsultation" as const, icon: "💻", title: "Teleconsultation", desc: "Video call from the comfort of home" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setVisitType(opt.value); setBookingStep(1); }}
                  className={`bg-white rounded-xl border-2 p-8 text-center hover:shadow-md transition-all ${
                    visitType === opt.value ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="text-4xl mb-3">{opt.icon}</div>
                  <h3 className="font-semibold text-lg text-gray-900">{opt.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Date */}
          {bookingStep === 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Select a Date</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {days.map((d) => {
                  const ds = d.toISOString().split("T")[0];
                  return (
                    <button
                      key={ds}
                      onClick={() => { setSelectedDate(ds); setSelectedTime(""); fetchSlots(ds); setBookingStep(2); }}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all hover:border-blue-400 hover:bg-blue-50 ${
                        selectedDate === ds ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setBookingStep(0)} className="mt-4 text-sm text-gray-500 hover:text-blue-600">← Back</button>
            </div>
          )}

          {/* Step 2: Time */}
          {bookingStep === 2 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-lg mb-1 text-gray-900">Select a Time</h3>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              {loadingSlots ? (
                <div className="text-center py-8 text-gray-400">Loading available times...</div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No available slots. Please select another date.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => { setSelectedTime(slot); setBookingStep(3); }}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-all hover:border-blue-400 hover:bg-blue-50 ${
                        selectedTime === slot ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setBookingStep(1)} className="mt-4 text-sm text-gray-500 hover:text-blue-600">← Back</button>
            </div>
          )}

          {/* Step 3: Details */}
          {bookingStep === 3 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Your Details</h3>
              <div className="space-y-4">
                {[
                  { id: "name", label: "Full Name *", type: "text", placeholder: "John Doe", key: "name" as const },
                  { id: "email", label: "Email *", type: "email", placeholder: "john@example.com", key: "email" as const },
                  { id: "phone", label: "Phone *", type: "tel", placeholder: "+40 7XX XXX XXX", key: "phone" as const },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      id={f.id}
                      type={f.type}
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                  <textarea
                    id="reason"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Briefly describe your symptoms..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Appointment Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>👨‍⚕️ Dr. {bookingPhysician.name} — {bookingPhysician.specialty}</p>
                  <p>📋 {visitType === "in-person" ? "In-Person Visit" : "Teleconsultation"}</p>
                  <p>📅 {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                  <p>🕐 {selectedTime}</p>
                  {bookingPhysician.price_consultation && <p>💰 {bookingPhysician.price_consultation} {bookingPhysician.currency || "EUR"}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setBookingStep(2)} className="text-sm text-gray-500 hover:text-blue-600">← Back</button>
                <button
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {bookingStep === 4 && bookingResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-6">Your appointment has been scheduled successfully.</p>
              <div className="bg-blue-50 rounded-lg p-6 text-left max-w-sm mx-auto space-y-2">
                <p className="text-sm"><span className="font-medium">Doctor:</span> Dr. {bookingPhysician.name}</p>
                <p className="text-sm"><span className="font-medium">Type:</span> {visitType === "in-person" ? "In-Person" : "Teleconsultation"}</p>
                <p className="text-sm"><span className="font-medium">Date:</span> {new Date(bookingResult.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                <p className="text-sm"><span className="font-medium">Time:</span> {bookingResult.time}</p>
                <p className="text-sm text-gray-400 mt-2">Booking ID: {bookingResult.id.slice(0, 8)}</p>
              </div>
              <div className="mt-8 flex justify-center gap-3">
                <button
                  onClick={() => setView("search")}
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Back to Search
                </button>
                <button
                  onClick={() => { setBookingStep(0); setVisitType(""); setSelectedDate(""); setSelectedTime(""); setForm({ name: "", email: "", phone: "", reason: "" }); setBookingResult(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Book Another
                </button>
              </div>
            </div>
          )}

          {/* Back to profile/results */}
          {bookingStep < 4 && (
            <button
              onClick={() => setView(selectedClinic ? "profile" : "results")}
              className="mt-6 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              ← Back to {selectedClinic ? "clinic profile" : "results"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
