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
  const { t, locale } = useI18n();
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
      setPasswordError(t('settings.fillBothPasswords'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('settings.passwordMinLength'));
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
            <CardTitle>{t('settings.profileSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              id="full_name"
              label={t('settings.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. John Doe"
            />

            <Input
              id="email"
              label={t('settings.emailAddress')}
              value={email}
              readOnly
              className="bg-gray-50"
              disabled
            />

            <Select
              id="specialty"
              label={t('settings.medicalSpecialty')}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              options={[
                { value: "", label: t('settings.selectSpecialty') },
                { value: "cardiology", label: t('specialty.cardiology') },
                { value: "dermatology", label: t('specialty.dermatology') },
                { value: "emergency_medicine", label: t('specialty.emergencyMedicine') },
                { value: "family_medicine", label: t('specialty.familyMedicine') },
                { value: "gastroenterology", label: t('specialty.gastroenterology') },
                { value: "internal_medicine", label: t('specialty.internalMedicine') },
                { value: "neurology", label: t('specialty.neurology') },
                { value: "orthopedics", label: t('specialty.orthopedics') },
                { value: "pediatrics", label: t('specialty.pediatrics') },
                { value: "psychiatry", label: t('specialty.psychiatry') },
                { value: "radiology", label: t('specialty.radiology') },
                { value: "surgery", label: t('specialty.surgery') },
                { value: "other", label: t('specialty.other') },
              ]}
              placeholder={t('settings.selectSpecialty')}
            />

            <Input
              id="license_number"
              label={t('settings.licenseNumber')}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={t('settings.enterLicense')}
            />

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? t('settings.saving') : t('settings.saveProfile')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Tab */}
      {activeTab === "Audio" && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.audioSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="audio_quality"
              label={t('settings.audioQuality')}
              value={audioQuality}
              onChange={(e) =>
                setAudioQuality(e.target.value as "standard" | "high")
              }
              options={[
                { value: "standard", label: t('settings.audioStandard') },
                { value: "high", label: t('settings.audioHigh') },
              ]}
            />

            <div className="space-y-3">
              <label htmlFor="silence_threshold" className="block text-sm font-medium text-medical-text">
                {t('settings.silenceThreshold')}: {silenceThreshold}s
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
                {t('settings.silenceDesc').replace('{threshold}', String(silenceThreshold))}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveAudio}
                disabled={isSaving}
              >
                {isSaving ? t('settings.saving') : t('settings.saveAudio')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "Templates" && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.defaultTemplate')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              id="default_template"
              label={t('settings.defaultTemplate')}
              value={defaultTemplate}
              onChange={(e) => setDefaultTemplate(e.target.value)}
              options={[
                { value: "", label: t('settings.selectTemplate') },
                ...templates.map((tmpl) => ({
                  value: tmpl.id,
                  label: tmpl.name,
                })),
              ]}
              placeholder={t('settings.selectTemplate')}
            />

            <p className="text-sm text-medical-muted">
              {t('settings.templateDesc')}
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? t('settings.saving') : t('settings.saveTemplate')}
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
              <CardTitle>{t('settings.accountSecurity')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-medical-text">
                  {t('settings.lastSignIn')}
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  {lastSignIn
                    ? new Date(lastSignIn).toLocaleString()
                    : t('settings.noSignIn')}
                </p>
              </div>

              <div className="border-t border-medical-border pt-4">
                <p className="text-sm font-medium text-medical-text">
                  {t('settings.activeSessions')}
                </p>
                <p className="mt-1 text-sm text-medical-muted">
                  {t('settings.oneSession')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.changePassword')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              <Input
                id="new_password"
                label={t('settings.newPassword')}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('settings.enterNewPassword')}
              />

              <Input
                id="confirm_password"
                label={t('settings.confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('settings.confirmNewPassword')}
              />

              <p className="text-xs text-medical-muted">
                {t('settings.passwordMinLength')}
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  {isSaving ? t('settings.updating') : t('settings.changePassword')}
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
            <CardHeader><CardTitle>{t('settings.ehrIntegration')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                {t('settings.ehrDesc')}
              </p>
              <EHRStatusCard />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">{t('settings.patientImport')}</p>
                  <p className="mt-1 text-xs text-medical-muted">{t('settings.patientImportDesc')}</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">{t('settings.configure')} &rarr;</button>
                </div>
                <div className="rounded-lg border border-medical-border p-4">
                  <p className="text-sm font-medium text-medical-text">{t('settings.noteExport')}</p>
                  <p className="mt-1 text-xs text-medical-muted">{t('settings.noteExportDesc')}</p>
                  <button className="mt-3 text-sm text-brand-600 hover:underline">{t('settings.configure')} &rarr;</button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('settings.collaboration')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">
                {t('settings.collaborationDesc')}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{t('settings.noteSharing')}</p>
                    <p className="text-xs text-medical-muted">{t('settings.noteSharingDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{t('settings.reviewWorkflow')}</p>
                    <p className="text-xs text-medical-muted">{t('settings.reviewWorkflowDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-medical-border p-4">
                  <div>
                    <p className="text-sm font-medium text-medical-text">{t('settings.autoAssign')}</p>
                    <p className="text-xs text-medical-muted">{t('settings.autoAssignDesc')}</p>
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
            <CardHeader><CardTitle>{t('settings.notificationPrefs')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">{t('settings.notificationDesc')}</p>
              {[
                { id: "pending-review", label: t('settings.pendingReviewReminders'), desc: t('settings.pendingReviewDesc'), defaultOn: true },
                { id: "note-finalized", label: t('settings.noteFinalized'), desc: t('settings.noteFinalizedDesc'), defaultOn: true },
                { id: "consultation-complete", label: t('settings.transcriptionComplete'), desc: t('settings.transcriptionDesc'), defaultOn: true },
                { id: "daily-summary", label: t('settings.dailySummary'), desc: t('settings.dailySummaryDesc'), defaultOn: false },
                { id: "weekly-report", label: t('settings.weeklyReport'), desc: t('settings.weeklyReportDesc'), defaultOn: false },
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
            <CardHeader><CardTitle>{t('settings.reminders')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-medical-muted">{t('settings.remindersDesc')}</p>
              <div className="flex items-center gap-4 rounded-lg border border-medical-border p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-medical-text">{t('settings.reminderFrequency')}</p>
                  <p className="text-xs text-medical-muted">{t('settings.reminderFreqDesc')}</p>
                </div>
                <select className="rounded-lg border border-medical-border px-3 py-2 text-sm text-medical-text focus:border-brand-500 focus:outline-none">
                  <option value="daily">{t('settings.freqDaily')}</option>
                  <option value="twice-daily">{t('settings.freqTwiceDaily')}</option>
                  <option value="weekly">{t('settings.freqWeekly')}</option>
                  <option value="never">{t('settings.freqNever')}</option>
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
  const { t } = useI18n();
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

  if (loading) return <Card><CardContent className="py-8 text-center text-medical-muted">{t('settings.loading2FA')}</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle>{t('settings.twoFactor')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-medical-muted">
          {t('settings.twoFactorDesc')}
        </p>

        {mfaEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-sm font-medium text-green-800">{t('settings.twoFactorEnabled')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnenroll}>
              {t('settings.disable2FA')}
            </Button>
          </div>
        ) : enrolling && qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-medical-text">{t('settings.scanQR')}</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-medical-border" />
            </div>
            <div className="space-y-2">
              <label htmlFor="verify-code" className="block text-sm font-medium text-medical-text">
                {t('settings.enterCode')}
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
                  {t('settings.verifyEnable')}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQrCode(null); }}>
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <Button onClick={handleEnroll}>
            {t('settings.enable2FA')}
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
  const { t } = useI18n();
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
          {status?.connected ? `${t('settings.connectedTo')} ${status.provider}` : t('settings.noEHR')}
        </p>
        <p className="text-xs text-medical-muted">
          {status?.connected ? t('settings.ehrActive') : t('settings.noEHRDesc')}
        </p>
      </div>
    </div>
  );
}
