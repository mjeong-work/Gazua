import AppHeader from './AppHeader';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-12 pb-24 lg:pb-12">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: May 26, 2026</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-black mb-3">1. What We Collect</h2>
              <p className="mb-3">We collect the following categories of information:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Account data:</strong> email address, display name, profile photo</li>
                <li><strong>Onboarding data:</strong> investment experience level, interests, risk tolerance</li>
                <li><strong>Usage data:</strong> pages visited, content viewed, interactions (likes, saves, follows)</li>
                <li><strong>Content data:</strong> posts, comments, and reels you create</li>
                <li><strong>Payment data:</strong> billing information processed by Stripe (we do not store card numbers)</li>
                <li><strong>Device data:</strong> IP address, browser type, operating system</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">2. How We Use It</h2>
              <p className="mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Provide, maintain, and improve the Gazua platform</li>
                <li>Personalize your content feed and recommendations</li>
                <li>Process subscription payments and manage your account</li>
                <li>Enforce our Terms of Service and Community Guidelines</li>
                <li>Send you service-related notifications (you can opt out of marketing emails)</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal data to third parties for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">3. Data Storage</h2>
              <p className="mb-3">
                Gazua uses <strong>Supabase</strong> (backed by Amazon Web Services) to store user data. Data is stored
                in the United States. Supabase implements industry-standard security controls including encryption at
                rest and in transit.
              </p>
              <p>
                We retain your data for as long as your account is active, or as required by law. If you delete your
                account, we will delete or anonymize your personal data within 30 days, except where retention is
                required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">4. Third-Party Services</h2>
              <p className="mb-3">We use the following third-party services that may process your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Supabase</strong> — database, authentication, and storage</li>
                <li><strong>Stripe</strong> — payment processing (governed by Stripe's Privacy Policy)</li>
                <li><strong>Polygon.io</strong> — real-time and historical market data (no personal data shared)</li>
                <li><strong>Anthropic Claude</strong> — AI-generated investment insights (usage data only, not shared)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">5. Your Rights (GDPR / CCPA)</h2>
              <p className="mb-3">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> request that we correct inaccurate data</li>
                <li><strong>Deletion:</strong> request that we delete your personal data</li>
                <li><strong>Portability:</strong> receive your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> opt out of marketing communications at any time</li>
                <li><strong>Non-discrimination:</strong> we will not discriminate against you for exercising these rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">6. Data Deletion Request</h2>
              <p>
                To request deletion of your account and personal data, email{' '}
                <a href="mailto:privacy@gazua.com" className="text-[#00a86b] hover:underline">privacy@gazua.com</a>{' '}
                with the subject line "Data Deletion Request." We will process your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">7. Contact</h2>
              <p>
                For privacy questions or to exercise your rights, contact our Privacy Team at{' '}
                <a href="mailto:privacy@gazua.com" className="text-[#00a86b] hover:underline">privacy@gazua.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
