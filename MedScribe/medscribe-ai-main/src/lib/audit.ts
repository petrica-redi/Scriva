import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuditAction =
  | "data_access"
  | "data_export_pdf"
  | "data_export_json"
  | "data_deletion"
  | "data_modification"
  | "consent_change"
  | "login"
  | "password_change"
  | "settings_update";

export interface AuditLogEntry {
  user_id: string;
  action: AuditAction | string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      metadata: entry.metadata || {},
      ip_address: entry.ip_address || null,
    });
    if (error) console.error("Audit log error:", error);
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Backward-compatible signature used by existing routes:
// logAuditEvent(supabaseClient, userId, action, resourceType, resourceId, metadata?)
export async function logAuditEvent(
  _supabase: unknown,
  user_id: string,
  action: string,
  resource_type: string,
  resource_id: string,
  metadata?: Record<string, unknown>
) {
  return logAudit({ user_id, action, resource_type, resource_id, metadata });
}

export { supabaseAdmin };
