"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const TAB_KEYS = [
  { key: "Profile", labelKey: "settings.profile" },
  { key: "Audio", labelKey: "settings.audio" },
  { key: "Templates", labelKey: "settings.templates" },
  { key: "Security", labelKey: "settings.security" },
  { key: "Integrations", labelKey: "settings.integrations" },
  { key: "Notifications", labelKey: "settings.notifications" },
  { key: "DataPrivacy", labelKey: "Data & Privacy" },
  { key: "DataProcessors", labelKey: "Data Processors" },
  { key: "AuditLog", labelKey: "Audit Log" },
] as const;

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
    note_sharing?: boolean;
    review_workflow?: boolean;
    auto_assign_reviewer?: boolean;
    notif_pending_review?: boolean;
    notif_note_finalized?: boolean;
    notif_transcription_complete?: boolean;
    notif_daily_summary?: boolean;
    notif_weekly_report?: boolean;
    reminder_frequency?: string;
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
  const supabase = createClient();
  const { t } = useTranslation();

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

  // Integrations tab state
  const [noteSharing, setNoteSharing] = useState(true);
  const [reviewWorkflow, setReviewWorkflow] = useState(false);
  const [autoAssignReviewer, setAutoAssignReviewer] = useState(false);

  // Notifications tab state
  const [pendingReviewReminders, setPendingReviewReminders] = useState(true);
  const [noteFinalized, setNoteFinalized] = useState(true);
  const [transcriptionComplete, setTranscriptionComplete] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState("daily");

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
          setNoteSharing(userData.settings?.note_sharing ?? true);
          setReviewWorkflow(userData.settings?.review_workflow ?? false);
          setAutoAssignReviewer(userData.settings?.auto_assign_reviewer ?? false);
          setPendingReviewReminders(userData.settings?.notif_pending_review ?? true);
          setNoteFinalized(userData.settings?.notif_note_finalized ?? true);
          setTranscriptionComplete(userData.settings?.notif_transcription_complete ?? true);
          setDailySummary(userData.settings?.notif_daily_summary ?? false);
          setWeeklyReport(userData.settings?.notif_weekly_report ?? false);
          setReminderFrequency(userData.settings?.reminder_frequency || "daily");
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
  const handleSaveAudio = () =>
    saveSettings({
      audio_quality: audioQuality,
      silence_threshold: silenceThreshold,
    });

  // Save Template Settings
  const handleSaveTemplate = () =>
    saveSettings({
      default_template_id: defaultTemplate || undefined,
    });

  // Helper to merge settings into the existing jsonb column
  const saveSettings = async (partial: Partial<UserProfile["settings"]>) => {
    setIsSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: current } = await supabase
        .from("users")
        .select("settings")
        .eq("id", authUser.id)
        .single();

      const merged = { ...(current?.settings || {}), ...partial };

      const { error } = await supabase
        .from("users")
        .update({ settings: merged })
        .eq("id", authUser.id);

      if (error) throw error;
      toast("Settings saved", "success");
    } catch (error) {
      toast("Error saving settings", "error");
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Integrations
  const handleSaveIntegrations = () =>
    saveSettings({
      note_sharing: noteSharing,
      review_workflow: reviewWorkflow,
      auto_assign_reviewer: autoAssignReviewer,
    });

  // Save Notifications
  const handleSaveNotifications = () =>
    saveSettings({
      notif_pending_review: pendingReviewReminders,
      notif_note_finalized: noteFinalized,
      notif_transcription_complete: transcriptionComplete,
      notif_daily_summary: dailySummary,
      notif_weekly_report: weeklyReport,
      reminder_frequency: reminderFrequency,
    });

  // Change Password
  const handleChangePassword = async () => {
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError(t("settings.fillBothPasswords"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordsNoMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error updating password";
      toast(message, "error");
      console.error("Error updating password:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-medical-muted">{t("settings.loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-medical-text">{t("settings.title")}</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-medical-border">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-medical-muted hover:text-medical-text"
            }`}
          >
            {t(tab.labelKey as any)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "Profile" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profileSettings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              id="full_name"
              label={t("settings.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. John Doe"
            />

            <Input
              id="email"
              label={t("settings.emailAddress")}
              value={email}
              readOnly
              className="bg-gray-50"
              disabled
            />

            <Select
              id="specialty"
              label={t("settings.medicalSpecialty")}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              options={[
                { value: "", label: t("settings.selectSpecialty") },
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
              label={t("settings.licenseNumber")}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={t("settings.enterLicense")}
            />

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? t("common.saving") : t("settings.saveProfile")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Tab */}
      {activeTab === "Audio" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.audioSettings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="audio_quality"
              label={t("settings.audioQuality")}
              value={audioQuality}
              onChange={(e) =>
                setAudioQuality(e.target.value as "standard" | "high")
              }
              options={[
                { value: "standard", label: t("settings.standard") },
                { value: "high", label: t("settings.high") },
              ]}
            />

            <div className="space-y-3">
              <label htmlFor="silence_threshold" className="block text-sm font-medium text-medical-text">
                {`${t("settings.silenceThreshold")}: ${silenceThreshold}s`}
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
                {t("settings.silenceDesc").replace("{seconds}", String(silenceThreshold))}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveAudio}
                disabled={isSaving}
              >
                {isSaving ? t("common.saving") : t("settings.saveAudio")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "Templates" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.defaultTemplate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="default_template"
              label={t("settings.defaultTemplate")}
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value)}
              options={[
                { value: "", label: t("settings.selectTemplate") },
                ...templates.map((tmpl) => ({
                  value: tmpl.id,
                  label: tmpl.name,
                })),
              ]}
              placeholder="Select a template to use by default"
            />

            <p className="text-sm text-medical-muted">
              {t("settings.templateDesc")}
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? t("common.saving") : t("settings.saveTemplate")}
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
              <CardTitle>{t("settings.accountSecurity")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-medical-text">
                  {t("settings.lastSignIn")}
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  {lastSignIn
                    ? new Date(lastSignIn).toLocaleString()
                    : t("settings.noSignIn")}
                </p>
              </div>

              <div className="border-t border-medical-border pt-4">
                <p className="text-sm font-medium text-medical-text">
                  {t("settings.activeSessions")}
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  {t("settings.oneSession")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.changePassword")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              <Input
                id="new_password"
                label={t("settings.newPassword")}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.enterNewPassword")}
              />

              <Input
                id="confirm_password"
                label={t("settings.confirmPassword")}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmNewPassword")}
              />

              <p className="text-xs text-medical-muted">
                {t("settings.passwordMin")}
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  {isSaving ? t("settings.updating") : t("settings.changePassword")}
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
            <CardHeader><CardTitle>{t("settings.ehrIntegration")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                {t("settings.ehrDesc")}
              </p>
              <EHRStatusCard />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">{t("settings.patientImport")}</p>
                  <p className="mt-1 text-xs text-medical-muted">{t("settings.patientImportDesc")}</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">{t("common.configure") + " →"}</button>
                </div>
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">{t("settings.noteExport")}</p>
                  <p className="mt-1 text-xs text-medical-muted">{t("settings.noteExportDesc")}</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">{t("common.configure") + " →"}</button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("settings.collaboration")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                {t("settings.collaborationDesc")}
              </p>
              <div className="space-y-3">
                {([
                  { label: t("settings.noteSharing"), desc: t("settings.noteSharingDesc"), value: noteSharing, setter: setNoteSharing },
                  { label: t("settings.reviewWorkflow"), desc: t("settings.reviewWorkflowDesc"), value: reviewWorkflow, setter: setReviewWorkflow },
                  { label: t("settings.autoAssign"), desc: t("settings.autoAssignDesc"), value: autoAssignReviewer, setter: setAutoAssignReviewer },
                ] as const).map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                    <div>
                      <p className="text-sm font-medium text-medical-text">{item.label}</p>
                      <p className="text-xs text-medical-muted">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={item.value} onChange={(e) => item.setter(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveIntegrations} disabled={isSaving}>
                  {isSaving ? t("common.saving") : t("settings.saveIntegrations")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data & Privacy Tab */}
      {activeTab === "DataPrivacy" && (
        <DataPrivacySection supabase={supabase} toast={toast} />
      )}

      {/* Data Processors Tab */}
      {activeTab === "DataProcessors" && (
        <DataProcessorsSection />
      )}

      {/* Audit Log Tab */}
      {activeTab === "AuditLog" && (
        <AuditLogSection supabase={supabase} />
      )}

      {/* Notifications Tab */}
      {activeTab === "Notifications" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("settings.notifPreferences")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">{t("settings.notifDesc")}</p>
              {([
                { id: "pending-review", label: t("settings.pendingReview"), desc: t("settings.pendingReviewDesc"), value: pendingReviewReminders, setter: setPendingReviewReminders },
                { id: "note-finalized", label: t("settings.noteFinalized"), desc: t("settings.noteFinalizedDesc"), value: noteFinalized, setter: setNoteFinalized },
                { id: "consultation-complete", label: t("settings.transcriptionComplete"), desc: t("settings.transcriptionCompleteDesc"), value: transcriptionComplete, setter: setTranscriptionComplete },
                { id: "daily-summary", label: t("settings.dailySummary"), desc: t("settings.dailySummaryDesc"), value: dailySummary, setter: setDailySummary },
                { id: "weekly-report", label: t("settings.weeklyReport"), desc: t("settings.weeklyReportDesc"), value: weeklyReport, setter: setWeeklyReport },
              ] as const).map((pref) => (
                <div key={pref.id} className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{pref.label}</p>
                    <p className="text-xs text-medical-muted">{pref.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={pref.value} onChange={(e) => pref.setter(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("settings.reminders")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">{t("settings.remindersDesc")}</p>
              <div className="flex items-center gap-4 rounded-lg border border-medical-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-medical-text">{t("settings.reminderFrequency")}</p>
                  <p className="text-xs text-medical-muted">{t("settings.reminderFrequencyDesc")}</p>
                </div>
                <select value={reminderFrequency} onChange={(e) => setReminderFrequency(e.target.value)} className="rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none">
                  <option value="daily">{t("settings.daily")}</option>
                  <option value="twice-daily">{t("settings.twiceDaily")}</option>
                  <option value="weekly">{t("settings.weekly")}</option>
                  <option value="never">{t("settings.never")}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              {isSaving ? t("common.saving") : t("settings.saveNotifications")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MFA Section Component
// ============================================================================
function MFASection({ supabase, toast }: { supabase: ReturnType<typeof createClient>; toast: (msg: string, type?: "info" | "success" | "error") => void }) {
  const { t } = useTranslation();
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
        friendlyName: "MedScribe AI Authenticator",
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
    if (!confirm(t("settings.disable2FAConfirm"))) return;
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

  if (loading) return <Card><CardContent className="py-8 text-center text-medical-muted">{t("settings.loading2FA")}</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.twoFactor")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-medical-muted">
          {t("settings.twoFactorDesc")}
        </p>

        {mfaEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-sm font-medium text-green-800">{t("settings.twoFactorEnabled")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnenroll}>
              {t("settings.disable2FA")}
            </Button>
          </div>
        ) : enrolling && qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-medical-text">{t("settings.scanQR")}</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-medical-border" />
            </div>
            <div className="space-y-2">
              <label htmlFor="verify-code" className="block text-sm font-medium text-medical-text">
                {t("settings.enterCode")}
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
                  {t("settings.verifyEnable")}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQrCode(null); }}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button onClick={handleEnroll}>
            {t("settings.enable2FA")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Data & Privacy Section
// ============================================================================
function DataPrivacySection({ supabase, toast }: { supabase: ReturnType<typeof createClient>; toast: (msg: string, type?: "info" | "success" | "error") => void }) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportJSON = () => {
    window.open("/api/export/json", "_blank");
  };

  const handleExportPDF = () => {
    window.open("/api/export/pdf", "_blank");
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/data-deletion", { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      toast("All your data has been deleted. You will be signed out.", "success");
      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = "/auth/signin";
      }, 2000);
    } catch {
      toast("Failed to delete data. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader><CardTitle>Export Your Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-medical-muted">
            Download a copy of all your data stored in MedScribe AI. This includes your profile, patients,
            consultations, transcripts, clinical notes, and audit logs.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportJSON}>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export as JSON
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              Export as HTML/PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete All Data */}
      <Card className="border-red-200">
        <CardHeader className="border-red-200">
          <CardTitle className="text-red-700">⚠️ Delete All My Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800 font-medium mb-1">This action is permanent and cannot be undone.</p>
            <p className="text-sm text-red-700">
              This will permanently delete your entire account including all patients, consultations,
              transcripts, clinical notes, templates, and audit logs. You will be signed out immediately.
            </p>
          </div>

          {!showDeleteDialog ? (
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              Delete All My Data
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-red-300 bg-red-50/50 p-4">
              <p className="text-sm font-medium text-red-800">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm text-red-900 placeholder-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteAllData}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                >
                  {deleting ? "Deleting..." : "Permanently Delete Everything"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Audit Log Section
// ============================================================================
interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

function AuditLogSection({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const loadAuditLog = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("audit_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (filter) {
          query = query.ilike("action", `%${filter}%`);
        }

        const { data } = await query;
        setEntries((data || []) as AuditEntry[]);
      } catch (err) {
        console.error("Failed to load audit log:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAuditLog();
  }, [supabase, page, filter]);

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Log</CardTitle>
          <a
            href="/api/settings/audit-export"
            target="_blank"
            className="text-sm text-brand-600 hover:underline"
          >
            Export Full Log
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-medical-muted">
          A record of all actions performed on your account for compliance and transparency.
        </p>

        {/* Filter */}
        <input
          type="text"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          placeholder="Filter by action (e.g., export, deletion, access)..."
          className="w-full rounded-lg border border-medical-border px-4 py-2 text-sm text-medical-text placeholder-medical-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />

        {loading ? (
          <div className="py-8 text-center text-medical-muted text-sm">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-medical-muted text-sm">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-medical-border">
                  <th className="px-3 py-2 text-left font-medium text-medical-muted">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-medical-muted">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-medical-muted">Resource</th>
                  <th className="px-3 py-2 text-left font-medium text-medical-muted">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medical-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-medical-muted whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-medical-text">
                      {entry.resource_type}
                      {entry.resource_id && (
                        <span className="text-medical-muted ml-1 text-xs">
                          ({entry.resource_id.substring(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-medical-muted text-xs max-w-xs truncate">
                      {entry.metadata && Object.keys(entry.metadata).length > 0
                        ? JSON.stringify(entry.metadata)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Previous
          </Button>
          <span className="text-xs text-medical-muted">Page {page + 1}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={entries.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Data Processors Section (DPA)
// ============================================================================
const DATA_PROCESSORS = [
  {
    name: "Deepgram",
    purpose: "Real-time audio transcription (speech-to-text)",
    dataShared: "Audio streams from consultation recordings",
    dpaStatus: "pending" as const,
    privacyUrl: "https://deepgram.com/privacy",
    notes: "Audio is processed transiently and not retained after transcription. Uses Nova Medical model for clinical accuracy.",
  },
  {
    name: "Anthropic",
    purpose: "AI clinical analysis and note generation",
    dataShared: "Transcript text, visit type, patient name (for context)",
    dpaStatus: "pending" as const,
    privacyUrl: "https://www.anthropic.com/privacy",
    notes: "Claude AI is used for diagnostic suggestions, drug interaction checks, and clinical note generation. API data is not used for model training.",
  },
  {
    name: "Supabase",
    purpose: "Database hosting, authentication, and file storage",
    dataShared: "All application data: user profiles, patient records, consultations, transcripts, clinical notes, audit logs",
    dpaStatus: "pending" as const,
    privacyUrl: "https://supabase.com/privacy",
    notes: "All data at rest is encrypted (AES-256). Row-level security enforced on all tables. SOC 2 compliant infrastructure.",
  },
];

const DPA_STATUS_STYLES = {
  signed: { label: "DPA Signed", className: "bg-green-100 text-green-800" },
  pending: { label: "DPA Pending", className: "bg-amber-100 text-amber-800" },
  "not-required": { label: "Not Required", className: "bg-gray-100 text-gray-600" },
};

function DataProcessorsSection() {
  return (
    <div className="space-y-6">
      {/* DPA Warning */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900">Data Processing Agreements Required for Production Use</p>
            <p className="mt-1 text-sm text-amber-800">
              Under GDPR Article 28, a Data Processing Agreement (DPA) must be signed with each third-party processor
              before processing personal data in production. Contact each provider to execute their standard DPA before
              deploying MedScribe AI with real patient data.
            </p>
          </div>
        </div>
      </div>

      {/* Processors List */}
      {DATA_PROCESSORS.map((processor) => {
        const statusStyle = DPA_STATUS_STYLES[processor.dpaStatus];
        return (
          <Card key={processor.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{processor.name}</CardTitle>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.className}`}>
                  {statusStyle.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide">Purpose</p>
                  <p className="mt-1 text-sm text-medical-text">{processor.purpose}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide">Data Shared</p>
                  <p className="mt-1 text-sm text-medical-text">{processor.dataShared}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-medical-muted uppercase tracking-wide">Notes</p>
                <p className="mt-1 text-sm text-medical-text">{processor.notes}</p>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-medical-border">
                <a
                  href={processor.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                >
                  Privacy Policy
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* GDPR Reference */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <p className="text-xs text-medical-muted leading-relaxed">
            <strong>GDPR Article 28 — Processor:</strong> Where processing is to be carried out on behalf of a controller,
            the controller shall use only processors providing sufficient guarantees to implement appropriate technical and
            organisational measures. Processing by a processor shall be governed by a contract or other legal act that is
            binding on the processor with regard to the controller.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EHR Status Card Component
// ============================================================================
function EHRStatusCard() {
  const { t } = useTranslation();
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
          {status?.connected ? t("settings.connectedTo") + ` ${status.provider}` : t("settings.noEHR")}
        </p>
        <p className="text-xs text-medical-muted">
          {status?.connected ? t("settings.syncActive") : t("settings.ehrConfigure")}
        </p>
      </div>
    </div>
  );
}
