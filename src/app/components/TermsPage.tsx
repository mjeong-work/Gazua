import AppHeader from './AppHeader';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-12 pb-24 lg:pb-12">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: May 26, 2026</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-black mb-3">1. Introduction</h2>
              <p>
                Welcome to Gazua ("we," "our," or "the platform"). By accessing or using Gazua, you agree to be bound
                by these Terms of Service. If you do not agree, please do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">2. Educational Purpose Only</h2>
              <p className="mb-3">
                Gazua is an educational community platform. All content — including posts, videos, reels, investment
                models, creator profiles, and market data — is provided for informational and educational purposes only.
              </p>
              <p className="mb-3">
                <strong>Nothing on Gazua constitutes financial, investment, tax, or legal advice.</strong> You should
                not rely on any content on this platform when making financial decisions. Always consult a licensed
                financial professional before making investment decisions.
              </p>
              <p>
                Past performance discussed by creators does not guarantee future results. All investments involve risk,
                including the possible loss of principal.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">3. User Responsibilities</h2>
              <p className="mb-3">By using Gazua, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Be at least 18 years old or have parental consent</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the platform only for lawful purposes</li>
                <li>Not attempt to manipulate markets or coordinate trading activity</li>
                <li>Disclose any material positions or compensation when discussing securities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">4. Content Standards</h2>
              <p className="mb-3">Users and creators must not post content that:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Guarantees specific investment returns or profits</li>
                <li>Coordinates or encourages group buying or selling of specific securities</li>
                <li>Constitutes direct buy/sell instructions ("buy X now", "sell immediately")</li>
                <li>Promotes undisclosed paid promotions or pump-and-dump schemes</li>
                <li>Makes unsupported fraud allegations against publicly traded companies</li>
                <li>Violates applicable securities laws or regulations</li>
              </ul>
              <p className="mt-3">
                We reserve the right to remove content that violates these standards and to suspend or terminate accounts
                that repeatedly breach these rules.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">5. Subscription & Billing</h2>
              <p className="mb-3">
                Gazua offers free and paid subscription tiers. Paid subscriptions are billed on a recurring basis via
                Stripe. You may cancel your subscription at any time through your account settings. Cancellations take
                effect at the end of the current billing period.
              </p>
              <p>
                We do not offer refunds for partial billing periods except where required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">6. Intellectual Property</h2>
              <p className="mb-3">
                You retain ownership of content you post on Gazua. By posting, you grant Gazua a non-exclusive,
                royalty-free, worldwide license to display, distribute, and promote your content within the platform.
              </p>
              <p>
                Gazua's brand, logo, interface design, and proprietary technology remain the intellectual property
                of Gazua and may not be reproduced without written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">7. Limitation of Liability</h2>
              <p className="mb-3">
                To the maximum extent permitted by law, Gazua and its affiliates, officers, directors, employees, and
                agents shall not be liable for any indirect, incidental, special, or consequential damages arising from
                your use of the platform or reliance on any content posted here.
              </p>
              <p>
                Our total liability for any claim arising under these Terms shall not exceed the amount you paid us in
                the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">8. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Delaware, United States, without regard to its
                conflict of law provisions. Any disputes shall be resolved through binding arbitration in accordance
                with the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-black mb-3">9. Contact</h2>
              <p>
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@gazua.com" className="text-[#00a86b] hover:underline">legal@gazua.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
