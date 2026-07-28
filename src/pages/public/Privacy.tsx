import { Helmet } from 'react-helmet-async';
import { CONTACT_INFO } from '../../config/contact';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Drapé Collective</title>
        <meta name="description" content="Privacy Policy for Drapé Collective. Learn how we collect, use, and protect your personal data." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-foreground/50 mb-8">Last updated: March 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">1. Introduction</h2>
            <p>
              Drapé Collective ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you visit our platform or use our services.
            </p>
            <p>
              By using Drapé Collective, you agree to the collection and use of information
              in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">2. Information We Collect</h2>
            <h3 className="font-medium text-foreground mt-4 mb-2">Personal Data</h3>
            <p>We may collect personally identifiable information such as:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address</li>
              <li>Username</li>
              <li>Profile information (bio, brand name, location)</li>
              <li>Account preferences and settings</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">Usage Data</h3>
            <p>We automatically collect information about how you interact with our platform:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Pages visited and products viewed</li>
              <li>Time spent on pages</li>
              <li>Browser type and device information</li>
              <li>IP address and approximate location</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">3. How We Use Your Information</h2>
            <p>We use the collected data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain our platform</li>
              <li>To personalize your experience and recommend products</li>
              <li>To facilitate communication between customers and designers</li>
              <li>To process transactions and manage accounts</li>
              <li>To improve our platform and develop new features</li>
              <li>To send administrative information and updates</li>
              <li>To detect, prevent, and address technical issues and fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">4. Data Sharing and Disclosure</h2>
            <p>We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>With Designers:</strong> When you message a designer or express interest in a product, necessary contact information may be shared to facilitate the transaction.</li>
              <li><strong>Service Providers:</strong> We may employ third-party companies to facilitate our platform (e.g., hosting, analytics, payment processing).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid legal requests.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption (SSL/TLS),
              secure data storage, and access controls to protect your personal information.
              However, no method of transmission over the Internet is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">6. Your Data Protection Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request copies of your personal data.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data.</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten").</li>
              <li><strong>Restriction:</strong> Request restriction of processing.</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service.</li>
              <li><strong>Objection:</strong> Object to how we process your data.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{' '}
              <a href={`mailto:${CONTACT_INFO.privacyEmail}`} className="text-primary hover:underline">
                {CONTACT_INFO.privacyEmail}
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">7. Cookies</h2>
            <p>
              We use essential cookies to maintain the functionality of our platform and
              analytics cookies to understand how you use our services. You can control
              cookie preferences through your browser settings. See our Cookie Banner for
              more details when you first visit the site.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">8. Third-Party Services</h2>
            <p>
              Our platform may contain links to third-party websites or services. We are not
              responsible for the privacy practices of these third parties. We encourage you
              to review their privacy policies before providing any personal information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">9. Children's Privacy</h2>
            <p>
              Our platform is not intended for individuals under the age of 16. We do not
              knowingly collect personal information from children. If we become aware that
              a child has provided us with personal data, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on servers located outside
              your country of residence. We ensure appropriate safeguards are in place to
              protect your data in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the "Last updated"
              date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">12. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy,
              please contact us:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{' '}
              <a href={`mailto:${CONTACT_INFO.privacyEmail}`} className="text-primary hover:underline">
                {CONTACT_INFO.privacyEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}