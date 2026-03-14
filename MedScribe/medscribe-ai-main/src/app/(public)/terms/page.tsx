import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Scriva",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Scriva
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Service Description</h2>
            <p>
              Scriva is a medical documentation platform that provides AI-powered transcription of medical
              consultations, automated clinical note generation, patient record management, and clinical decision
              support tools. The Service is designed for licensed healthcare professionals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>You must be a licensed healthcare professional to use this Service</li>
              <li>You are responsible for obtaining patient consent before recording consultations</li>
              <li>You must verify and review all AI-generated content before clinical use</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must comply with all applicable medical regulations, privacy laws, and professional standards</li>
              <li>You must not use the Service for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. AI Disclaimer</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
              <p className="font-semibold text-amber-800 mb-2">⚠️ Important Medical Disclaimer</p>
              <p className="text-amber-900">
                AI-generated suggestions, clinical notes, diagnostic recommendations, and billing codes are
                provided as <strong>decision support tools only</strong> and are <strong>not a substitute for
                professional clinical judgment</strong>. All AI output must be reviewed, verified, and approved
                by a qualified healthcare professional before being used for patient care, medical records, or
                billing purposes. Scriva does not provide medical advice, diagnosis, or treatment.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Processing</h2>
            <p>
              By using the Service, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Audio recordings will be transmitted to secure third-party transcription services</li>
              <li>Transcript data will be processed by AI models for clinical note generation</li>
              <li>All data is stored in encrypted databases (Supabase) with row-level security</li>
              <li>You are the data controller for patient data; Scriva acts as a data processor</li>
              <li>Our processing activities are described in detail in our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Intellectual Property</h2>
            <p>
              You retain ownership of all patient data, clinical notes, and medical records created using the Service.
              We retain ownership of the Service, its technology, algorithms, and interfaces. AI-generated content is
              provided as a tool output and becomes part of your medical records upon your review and approval.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>The Service is provided &quot;as is&quot; without warranties of any kind</li>
              <li>We are not liable for any clinical decisions made based on AI-generated content</li>
              <li>We are not liable for any errors or inaccuracies in transcriptions or generated notes</li>
              <li>Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim</li>
              <li>We are not liable for indirect, incidental, special, or consequential damages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Account Termination</h2>
            <p>
              You may terminate your account at any time through the Settings page. Upon termination, you may request
              deletion of all your data (right to erasure). We may suspend or terminate accounts that violate these
              terms. Data retention obligations under medical records laws may apply after termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes via email or
              in-app notification. Continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Contact</h2>
            <p>
              For questions about these Terms, contact us at <strong>legal@medscribe.ai</strong>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 flex gap-4">
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          <span>·</span>
          <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Scriva</Link>
        </div>
      </div>
    </div>
  );
}
