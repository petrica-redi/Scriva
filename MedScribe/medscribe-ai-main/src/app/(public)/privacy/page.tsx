import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Scriva",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Scriva
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Introduction</h2>
            <p>
              Scriva (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;) is a medical documentation platform that uses
              artificial intelligence to assist healthcare professionals with clinical documentation. We are committed
              to protecting your personal data and complying with the General Data Protection Regulation (GDPR) and
              applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Data We Collect</h2>
            <p>We collect and process the following categories of data:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Account information:</strong> Name, email address, medical specialty, license number</li>
              <li><strong>Audio recordings:</strong> Voice recordings of medical consultations (with patient consent)</li>
              <li><strong>Transcripts:</strong> Text transcriptions generated from audio recordings</li>
              <li><strong>Clinical notes:</strong> AI-generated and manually edited medical documentation</li>
              <li><strong>Patient information:</strong> Patient names, medical record numbers, dates of birth, gender, contact information</li>
              <li><strong>Usage data:</strong> Audit logs, access timestamps, feature usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Purpose of Processing</h2>
            <p>We process your data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Clinical documentation:</strong> Transcribing consultations and generating clinical notes</li>
              <li><strong>AI-assisted analysis:</strong> Providing diagnostic suggestions and clinical summaries</li>
              <li><strong>Service operation:</strong> User authentication, settings management, and platform functionality</li>
              <li><strong>Compliance:</strong> Maintaining audit trails as required by healthcare regulations</li>
              <li><strong>Service improvement:</strong> Improving transcription accuracy and AI model performance</li>
            </ul>
            <p className="mt-2">
              The legal basis for processing is: (a) performance of a contract (providing the service),
              (b) legitimate interest (improving the service), and (c) legal obligation (medical record-keeping requirements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Retention</h2>
            <p>
              Medical records and clinical documentation are retained for a default period of <strong>7 years</strong>,
              in accordance with medical records retention laws. This period is configurable based on your jurisdiction&apos;s
              requirements. Audio recordings may be deleted sooner at your request. Account data is retained for the
              duration of your account and deleted upon account closure (subject to legal retention requirements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Third-Party Data Processors</h2>
            <p>We use the following third-party processors to deliver our services:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>AI Transcription Service</strong> — Audio transcription service. Audio data is transmitted
                securely for real-time transcription. Audio is processed transiently and is not retained after processing.
              </li>
              <li>
                <strong>AI Analysis Service</strong> — Clinical analysis and note generation. Transcript text is
                sent for AI processing. API data is not used for model training.
              </li>
              <li>
                <strong>Supabase</strong> — Database hosting and authentication. All data at rest is encrypted.
                Infrastructure is hosted in secure data centers with SOC 2 compliance.
              </li>
            </ul>
          </section>

          <section id="ai-transparency">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. AI Transparency</h2>
            <p>
              Scriva uses artificial intelligence at multiple stages of clinical documentation.
              We believe in full transparency about how AI is used and its limitations.
            </p>
            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">6.1 AI Technologies Used</h3>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Real-time speech-to-text transcription:</strong> Audio from consultations
                is streamed in real-time to secure servers for transcription. Audio is processed transiently
                and is not retained after processing.
              </li>
              <li>
                <strong>Clinical analysis and note generation:</strong> Transcript text is sent to
                an AI service for diagnostic suggestions, clinical summaries, drug interaction checks, and
                clinical note generation. API data is not used for model training.
              </li>
            </ul>
            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">6.2 Limitations of AI</h3>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>AI-generated suggestions, diagnoses, and clinical notes are <strong>not a substitute for professional clinical judgment</strong>.</li>
              <li>All AI outputs must be reviewed and verified by a qualified healthcare professional before being used in patient care.</li>
              <li>AI models can produce inaccurate or incomplete results. The clinician retains full responsibility for all clinical decisions.</li>
            </ul>
            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">6.3 Patient Notification</h3>
            <p>
              Healthcare professionals using Scriva are required to inform patients that AI technology is used
              during the consultation for transcription and clinical analysis. Patient consent for AI-assisted
              processing is obtained alongside recording consent before each consultation begins.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Data Transfers &amp; Security</h2>
            <p>
              Data may be transferred to servers located outside your country of residence. All transfers are protected
              by appropriate safeguards including encryption in transit (TLS 1.2+) and at rest (AES-256). We implement
              industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>End-to-end encryption for audio streaming</li>
              <li>Row-level security on all database tables</li>
              <li>Multi-factor authentication support</li>
              <li>Comprehensive audit logging</li>
              <li>Regular security assessments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Your Rights</h2>
            <p>Under GDPR, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Right of access:</strong> Request a copy of all your personal data</li>
              <li><strong>Right to rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Right to erasure:</strong> Request deletion of all your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Right to data portability:</strong> Export your data in machine-readable format (JSON)</li>
              <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interest</li>
            </ul>
            <p className="mt-2">
              You can exercise your rights directly through the Settings page (data export, data deletion) or by
              contacting us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Contact Information</h2>
            <p>
              For data protection inquiries, requests, or complaints:
            </p>
            <ul className="list-none space-y-1 mt-2">
              <li><strong>Email:</strong> privacy@medscribe.ai</li>
              <li><strong>Data Protection Officer:</strong> dpo@medscribe.ai</li>
            </ul>
            <p className="mt-2">
              You also have the right to lodge a complaint with your local data protection supervisory authority.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 flex gap-4">
          <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
          <span>·</span>
          <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Scriva</Link>
        </div>
      </div>
    </div>
  );
}
