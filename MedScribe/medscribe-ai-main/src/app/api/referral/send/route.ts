import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.REFERRAL_FROM_EMAIL || "referrals@medscribe.ai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      toEmail,
      documentTitle,
      documentContent,
      documentType,
      patientName,
      specialty,
      clinicName,
      physicianName,
    } = body;

    if (!toEmail || !documentTitle || !documentContent) {
      return NextResponse.json(
        { error: "Missing required fields: toEmail, documentTitle, documentContent" },
        { status: 400 }
      );
    }

    const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(String(toEmail).trim());
    if (!emailMatch) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const recipientEmail = emailMatch[0];

    if (!resend) {
      return NextResponse.json(
        {
          error: "Email service not configured. Please set RESEND_API_KEY in environment variables.",
          code: "EMAIL_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const referralContext: string[] = [];
    if (patientName) referralContext.push(`Patient: ${patientName}`);
    if (documentType) referralContext.push(`Document type: ${documentType}`);
    if (specialty) referralContext.push(`Specialty: ${specialty}`);
    if (clinicName) referralContext.push(`Clinic: ${clinicName}`);
    if (physicianName) referralContext.push(`Physician: ${physicianName}`);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(documentTitle)}</title></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 24px;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; color: #1e40af; margin: 0 0 8px 0;">Scriva — Referral</h1>
    <p style="margin: 0; font-size: 13px; color: #6b7280;">
      ${referralContext.length > 0 ? referralContext.join(" &nbsp;|&nbsp; ") : "Clinical referral document"}
    </p>
  </div>
  <h2 style="font-size: 16px; color: #1e40af; margin-bottom: 12px;">${escapeHtml(documentTitle)}</h2>
  <div style="white-space: pre-wrap; font-size: 14px;">${escapeHtml(documentContent).replace(/\n/g, "<br/>")}</div>
  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
    Sent via Scriva Documentation — ${new Date().toISOString().slice(0, 10)}
  </p>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Referral: ${documentTitle}${patientName ? ` — ${patientName}` : ""}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[ReferralSend] Resend error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
      message: `Referral sent to ${recipientEmail}`,
    });
  } catch (err) {
    console.error("[ReferralSend] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
