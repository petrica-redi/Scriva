"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/i18n-context";

const TAB_KEYS = ["Profile", "Audio", "Templates", "Security", "Integrations", "Notifications"];

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  license_number: string | null;
  settings: {
    audio_quality?: "standard" | "high";
    silence_threshold?: number;
    default_template_id?: string;
  };
}

interface NoteTemplate {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);

  const TAB_LABELS: Record<string, string> = {
    Profile: t('settings.profile'),
    Audio: t('settings.audio'),
    Templates: t('settings.templates'),
    Security: t('settings.security'),
    Integrations: t('settings.integrations'),
    Notifications: t('settings.notifications'),
  };

  // Profile tab state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Audio tab state
  const [audioQuality, setAudioQuality] = useState<"standard" | "high">(
    "standard"
  );
  const [silenceThreshold, setSilenceThreshold] = useState(3);

  // Templates tab state
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState("");

  // Security tab state
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) return;

        // Fetch user profile
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (userData) {
          setProfile(userData);
          setFullName(userData.full_name || "");
          setEmail(userData.email || authUser.email || "");
          setSpecialty(userData.specialty || "");
          setLicenseNumber(userData.license_number || "");
          setAudioQuality(userData.settings?.audio_quality || "standard");
          setSilenceThreshold(userData.settings?.silence_threshold || 3);
          setDefaultTemplate(userData.settings?.default_template_id || "");
        }

        // Fetch note templates for default template selection
        const { data: templatesData } = await supabase
          .from("note_templates")
          .select("id, name")
          .order("name");

        if (templatesData) {
          setTemplates(templatesData);
        }

        // Get last sign-in time from user metadata
        if (authUser.last_sign_in_at) {
          setLastSignIn(authUser.last_sign_in_at);
        }
      } catch (error) {
        toast("Error loading settings", "error");
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [supabase, toast]);

  // Save Profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName,
          specialty: specialty || null,
          license_number: licenseNumber || null,
        })
        .eq("id", authUser.id);

      if (error) throw error;

      toast("Profile updated successfully", "success");
    } catch (error) {
      toast("Error saving profile", "error");
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Audio Settings
  const handleSaveAudio = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      // Merge with existing settings to avoid overwriting other fields
      const { data: currentUser } = await supabase
        .from("users")
        .select("settings")
        .eq("id", authUser.id)
        .single();

      const { error } = await supabase
        .from("users")
        .update({
          settings: {
            ...(currentUser?.settings || {}),
            audio_quality: audioQuality,
            silence_threshold: silenceThreshold,
          },
        })
        .eq("id", authUser.id);

      if (error) throw error;

      toast("Audio settings updated successfully", "success");
    } catch (error) {
      toast("Error saving audio settings", "error");
      console.error("Error saving audio settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Template Settings
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      // Merge with existing settings to avoid overwriting other fields
      const { data: currentUser } = await supabase
        .from("users")
        .select("settings")
        .eq("id", authUser.id)
        .single();

      const { error } = await supabase
        .from("users")
        .update({
          settings: {
            ...(currentUser?.settings || {}),
            default_template_id: defaultTemplate || null,
          },
        })
        .eq("id", authUser.id);

      if (error) throw error;

      toast("Default template updated successfully", "success");
    } catch (error) {
      toast("Error saving template settings", "error");
      console.error("Error saving template settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast("Password updated successfully", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast(error.message || "Error updating password", "error");
      console.error("Error updating password:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-medical-muted">{t('settings.loadingSettings')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-medical-text">{t('settings.title')}</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-medical-border">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-medical-muted hover:text-medical-text"
            }`}
          >
            {TAB_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "Profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              id="full_name"
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. John Doe"
            />

            <Input
              id="email"
              label="Email Address"
              value={email}
              readOnly
              className="bg-gray-50"
              disabled
            />

            <Select
              id="specialty"
              label="Medical Specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              options={[
                { value: "", label: "Select a specialty" },
                { value: "cardiology", label: "Cardiology" },
                { value: "dermatology", label: "Dermatology" },
                { value: "emergency_medicine", label: "Emergency Medicine" },
                { value: "family_medicine", label: "Family Medicine" },
                { value: "gastroenterology", label: "Gastroenterology" },
                { value: "internal_medicine", label: "Internal Medicine" },
                { value: "neurology", label: "Neurology" },
                { value: "orthopedics", label: "Orthopedics" },
                { value: "pediatrics", label: "Pediatrics" },
                { value: "psychiatry", label: "Psychiatry" },
                { value: "radiology", label: "Radiology" },
                { value: "surgery", label: "Surgery" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select your specialty"
            />

            <Input
              id="license_number"
              label="Medical License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Enter your license number"
            />

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Tab */}
      {activeTab === "Audio" && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="audio_quality"
              label="Audio Quality"
              value={audioQuality}
              onChange={(e) =>
                setAudioQuality(e.target.value as "standard" | "high")
              }
              options={[
                { value: "standard", label: "Standard (48kbps)" },
                { value: "high", label: "High (128kbps)" },
              ]}
            />

            <div className="space-y-3">
              <label htmlFor="silence_threshold" className="block text-sm font-medium text-medical-text">
                Silence Detection Threshold: {silenceThreshold}s
              </label>
              <input
                id="silence_threshold"
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-medical-muted">
                Pauses longer than {silenceThreshold} seconds will be marked as
                silence
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveAudio}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Audio Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "Templates" && (
        <Card>
          <CardHeader>
            <CardTitle>Default Note Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="default_template"
              label="Default Template"
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value)}
              options={[
                { value: "", label: "Select a default template" },
                ...templates.map((t) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
              placeholder="Select a template to use by default"
            />

            <p className="text-sm text-medical-muted">
              This template will be automatically selected when generating new
              clinical notes.
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Template Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === "Security" && (
        <div className="space-y-6">
          {/* Last Sign-In */}
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-medical-text">
                  Last Sign-In
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  {lastSignIn
                    ? new Date(lastSignIn).toLocaleString()
                    : "No sign-in information available"}
                </p>
              </div>

              <div className="border-t border-medical-border pt-4">
                <p className="text-sm font-medium text-medical-text">
                  Active Sessions
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  1 active session
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              <Input
                id="new_password"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />

              <Input
                id="confirm_password"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />

              <p className="text-xs text-medical-muted">
                Password must be at least 8 characters long.
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  {isSaving ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MFA */}
          <MFASection supabase={supabase} toast={toast} />
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "Integrations" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>EHR Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                Connect to your Electronic Health Record system to import patient data and export finalized notes.
              </p>
              <EHRStatusCard />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">Patient Import</p>
                  <p className="mt-1 text-xs text-medical-muted">Search and import patient records from your connected EHR system.</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">Configure &rarr;</button>
                </div>
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">Note Export</p>
                  <p className="mt-1 text-xs text-medical-muted">Automatically push finalized clinical notes to your EHR.</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">Configure &rarr;</button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Collaboration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                Enable note sharing and multi-user review workflows within your organization.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">Note Sharing</p>
                    <p className="text-xs text-medical-muted">Allow sharing notes with other clinicians for review</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">Review Workflow</p>
                    <p className="text-xs text-medical-muted">Require reviewer approval before finalizing notes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">Auto-assign Reviewer</p>
                    <p className="text-xs text-medical-muted">Automatically assign notes to a designated reviewer</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "Notifications" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">Choose what notifications you receive and how.</p>
              {[
                { id: "pending-review", label: "Pending Review Reminders", desc: "Get reminded about notes awaiting review", defaultOn: true },
                { id: "note-finalized", label: "Note Finalized", desc: "When a shared note is finalized by a reviewer", defaultOn: true },
                { id: "consultation-complete", label: "Transcription Complete", desc: "When audio transcription is finished processing", defaultOn: true },
                { id: "daily-summary", label: "Daily Summary", desc: "Receive a daily email summary of your activity", defaultOn: false },
                { id: "weekly-report", label: "Weekly Analytics Report", desc: "Receive a weekly analytics digest via email", defaultOn: false },
              ].map((pref) => (
                <div key={pref.id} className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{pref.label}</p>
                    <p className="text-xs text-medical-muted">{pref.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={pref.defaultOn} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Reminders</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">Set automatic reminders for pending actions.</p>
              <div className="flex items-center gap-4 rounded-lg border border-medical-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-medical-text">Review Reminder Frequency</p>
                  <p className="text-xs text-medical-muted">How often to remind about pending reviews</p>
                </div>
                <select className="rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none">
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MFA Section Component
// ============================================================================
function MFASection({ supabase, toast }: { supabase: ReturnType<typeof createClient>; toast: (msg: string, type?: "info" | "success" | "error") => void }) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMFA = async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const totpFactors = data?.totp || [];
        const verified = totpFactors.find((f: { status: string }) => f.status === "verified");
        if (verified) {
          setMfaEnabled(true);
          setFactorId(verified.id);
        }
      } catch {
        // MFA not supported or error
      } finally {
        setLoading(false);
      }
    };
    checkMFA();
  }, [supabase]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "MindCare AI Authenticator",
      });
      if (error) throw error;
      if (data) {
        setQrCode(data.totp.qr_code);
        setFactorId(data.id);
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to start 2FA enrollment", "error");
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      setMfaEnabled(true);
      setEnrolling(false);
      setQrCode(null);
      toast("Two-factor authentication enabled!", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Invalid verification code", "error");
    }
  };

  const handleUnenroll = async () => {
    if (!factorId) return;
    if (!confirm("Are you sure you want to disable 2FA? This will reduce your account security.")) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaEnabled(false);
      setFactorId(null);
      toast("Two-factor authentication disabled", "info");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to disable 2FA", "error");
    }
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-medical-muted">Loading 2FA status...</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle>Two-Factor Authentication</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-medical-muted">
          Multi-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app.
        </p>

        {mfaEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-sm font-medium text-green-800">2FA is enabled</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnenroll}>
              Disable 2FA
            </Button>
          </div>
        ) : enrolling && qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-medical-text">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-medical-border" />
            </div>
            <div className="space-y-2">
              <label htmlFor="verify-code" className="block text-sm font-medium text-medical-text">
                Enter the 6-digit code from your app
              </label>
              <div className="flex gap-3">
                <input
                  id="verify-code"
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-32 rounded-lg border border-medical-border px-4 py-2.5 text-center text-lg font-mono tracking-widest text-medical-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button onClick={handleVerify} disabled={verifyCode.length !== 6}>
                  Verify & Enable
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQrCode(null); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={handleEnroll}>
            Enable Two-Factor Authentication
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EHR Status Card Component
// ============================================================================
function EHRStatusCard() {
  const [status, setStatus] = useState<{ connected: boolean; provider: string | null } | null>(null);

  useEffect(() => {
    // Try to reach the Python AI pipeline EHR status endpoint
    fetch("http://localhost:8000/ehr/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, provider: null }));
  }, []);

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-4 ${status?.connected ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
      <div className={`h-3 w-3 rounded-full ${status?.connected ? "bg-green-500" : "bg-amber-500"}`} />
      <div>
        <p className="text-sm font-medium text-medical-text">
          {status?.connected ? `Connected to ${status.provider}` : "No EHR Connected"}
        </p>
        <p className="text-xs text-medical-muted">
          {status?.connected ? "Patient data sync is active" : "Configure your EHR system to enable patient import and note export"}
        </p>
      </div>
    </div>
  );
}
