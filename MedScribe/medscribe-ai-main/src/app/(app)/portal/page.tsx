"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, BookOpen, Send, Search, User, FileText } from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  mrn: string | null;
}

interface Message {
  id: string;
  sender_type: "patient" | "provider";
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Education {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function PortalPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "education" | "summaries">("messages");

  useEffect(() => {
    fetch("/api/patients?limit=100")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => setPatients(data.data || []))
      .catch(() => {});

    fetch("/api/education")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => setEducation(data.data || []))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback(async (patientId: string) => {
    const response = await fetch(`/api/portal/messages?patient_id=${patientId}`);
    if (response.ok) {
      const data = await response.json();
      setMessages(data.data || []);
    }
  }, []);

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    loadMessages(patient.id);
  };

  const sendMessage = async () => {
    if (!selectedPatient || !newMessage.trim()) return;
    await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: selectedPatient.id, body: newMessage }),
    });
    setNewMessage("");
    loadMessages(selectedPatient.id);
  };

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.mrn || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-medical-text">Patient Portal</h1>
        <p className="text-sm text-medical-muted">Manage patient communications, education resources, and visit summaries</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 min-h-[600px]">
        {/* Patient List */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Patients</CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-medical-muted" />
              <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 text-sm" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
            {filtered.map((p) => (
              <button key={p.id} className={`w-full text-left p-2.5 rounded-lg transition-colors ${selectedPatient?.id === p.id ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`} onClick={() => selectPatient(p)}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-medical-muted" />
                  <div>
                    <p className="text-sm font-medium text-medical-text">{p.full_name}</p>
                    {p.mrn && <p className="text-xs text-medical-muted">MRN: {p.mrn}</p>}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Content Area */}
        <Card className="md:col-span-2">
          {selectedPatient ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedPatient.full_name}</CardTitle>
                  <div className="flex gap-1">
                    {(["messages", "education", "summaries"] as const).map((tab) => (
                      <button key={tab} className={`px-3 py-1 text-xs rounded-full border transition-colors ${activeTab === tab ? "bg-brand-50 border-brand-300 text-brand-700" : "border-medical-border text-medical-muted"}`} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === "messages" && (
                  <div className="flex flex-col h-[450px]">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                      {messages.length === 0 ? (
                        <p className="text-sm text-medical-muted text-center py-8">No messages yet. Send the first message to this patient.</p>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id} className={`flex ${m.sender_type === "provider" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] p-3 rounded-lg ${m.sender_type === "provider" ? "bg-brand-50 text-brand-900 border border-brand-200" : "bg-gray-100 dark:bg-gray-800"}`}>
                              {m.subject && <p className="text-xs font-medium mb-1">{m.subject}</p>}
                              <p className="text-sm">{m.body}</p>
                              <p className="text-xs text-medical-muted mt-1">{new Date(m.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 border-t pt-3">
                      <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "education" && (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto">
                    {education.length === 0 ? (
                      <p className="text-sm text-medical-muted text-center py-8">No education resources available.</p>
                    ) : (
                      education.map((e) => (
                        <div key={e.id} className="p-3 border border-medical-border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-medical-text">{e.title}</p>
                            <Badge variant="secondary" className="text-xs">{e.category}</Badge>
                          </div>
                          <p className="text-xs text-medical-muted line-clamp-2">{e.content}</p>
                          <Button size="sm" variant="outline" className="mt-2 text-xs">Share with Patient</Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "summaries" && (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-medical-muted mx-auto mb-2" />
                    <p className="text-sm text-medical-muted">Visit summaries will appear here after consultations.</p>
                    <p className="text-xs text-medical-muted mt-1">Auto-generated patient-friendly summaries from your clinical notes.</p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-medical-muted mx-auto mb-2" />
                <p className="text-sm text-medical-muted">Select a patient to view their portal</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
