import { FollowUpManager } from "@/components/features/FollowUpManager";

export const metadata = {
  title: "Follow-Ups - MedScribe AI",
  description: "Manage patient follow-ups and reminders",
};

export default function FollowUpsPage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-medical-text">Follow-Up Management</h1>
        <p className="text-sm text-medical-muted">Track patient follow-ups, reminders, and pending actions</p>
      </div>
      <FollowUpManager />
    </div>
  );
}
