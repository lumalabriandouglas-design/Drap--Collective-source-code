import { Helmet } from 'react-helmet-async';
import { CONTACT_INFO } from '../../config/contact';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Drapé Collective</title>
        <meta name="description" content="Terms of Service for Drapé Collective. Understand the rules and guidelines for using our platform." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-foreground/50 mb-8">Last updated: March 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Drapé Collective ("the Platform"), you agree to be bound
              by these Terms of Service. If you do not agree with any part of these terms,
              you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">2. Description of Service</h2>
            <p>
              Drapé Collective is a curated marketplace that connects independent fashion
              designers with customers. The Platform allows designers to showcase and sell
              their creations, and customers to discover, browse, and purchase unique fashion pieces.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">3. User Accounts</h2>
            <h3 className="font-medium text-foreground mt-4 mb-2">Registration</h3>
            <p>
              To access certain features, you must create an account. You agree to provide
              accurate, current, and complete information and to update it as necessary.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Account Responsibility</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account. Notify us
              immediately of any unauthorized use.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-2">Account Types</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Customers:</strong> Can browse, save, and purchase products, as well as message designers.</li>
              <li><strong>Designers:</strong> Can create listings, manage their showroom, and communicate with customers. Designer accounts are subject to review and approval.</li>
              <li><strong>Admins:</strong> Platform moderators who manage content and user compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">4. Designer Terms</h2>
            <p>
              Designers listing products on Drapé Collective agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate descriptions, images, and pricing for all products.</li>
              <li>Ensure all listed items are original designs or properly licensed.</li>
              <li>Maintain inventory accuracy and fulfill orders in a timely manner.</li>
              <li>Communicate professionally with customers.</li>
              <li>Comply with all applicable laws regarding the sale of goods.</li>
            </ul>
            <p className="mt-3">
              Drapé Collective reserves the right to reject, remove, or hide any listing
              that violates these terms or our community guidelines.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">5. Customer Terms</h2>
            <p>
              Customers using Drapé Collective agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate contact and shipping information.</li>
              <li>Communicate respectfully with designers.</li>
              <li>Not misuse the platform for any unlawful purpose.</li>
              <li>Not engage in harassment, spam, or abusive behavior.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">6. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the platform for any illegal purpose or in violation of any laws.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation.</li>
              <li>Upload or transmit viruses, malware, or any malicious code.</li>
              <li>Attempt to gain unauthorized access to any part of the platform.</li>
              <li>Interfere with or disrupt the platform or servers.</li>
              <li>Scrape, crawl, or reproduce content without permission.</li>
              <li>List counterfeit or infringing products.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">7. Intellectual Property</h2>
            <p>
              The Drapé Collective name, logo, and platform design are our intellectual
              property. Content posted by designers and users remains their respective
              intellectual property. By posting content, you grant us a license to display
              and distribute it on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">8. Reporting and Moderation</h2>
            <p>
              Users may report content or behavior that violates these terms via the
              reporting feature or by contacting{' '}
              <a href={`mailto:${CONTACT_INFO.reportEmail}`} className="text-primary hover:underline">
                {CONTACT_INFO.reportEmail}
              </a>.
              We reserve the right to moderate content, suspend accounts, and take
              appropriate action in response to violations.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">9. Limitation of Liability</h2>
            <p>
              Drapé Collective is provided "as is" without warranties of any kind. We are
              not liable for damages arising from your use of the platform, interactions
              between users, or any transactions conducted through the platform. We are a
              marketplace facilitator and are not directly a party to transactions between
              designers and customers.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these
              terms or for any other reason at our discretion. Upon termination, your right
              to use the platform ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be
              effective immediately upon posting. Your continued use of the platform after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">12. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws
              of the jurisdiction in which Drapé Collective operates, without regard to
              its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3">13. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{' '}
              <a href={`mailto:${CONTACT_INFO.legalEmail}`} className="text-primary hover:underline">
                {CONTACT_INFO.legalEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}