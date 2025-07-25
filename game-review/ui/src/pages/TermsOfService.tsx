import React from 'react';

/**
 * Comprehensive legal page that bundles Terms of Service, Privacy Policy, and Refund Policy for Sente Games.
 * This text is intended as a strong liability shield but DOES NOT constitute formal legal advice.
 */
const TermsOfService: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <div className='max-w-5xl mx-auto px-6 py-8'>
        {/* Header */}
        <header className='mb-8'>
          <h1 className='text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent'>
            Terms of Service · Privacy Policy · Refund Policy
          </h1>
          <p className='text-gray-400'>Last updated: {today}</p>
        </header>

        {/* Legal Content */}
        <div className='prose prose-invert max-w-none'>
          <div className='space-y-16'>

            {/* ============================
                I. TERMS OF SERVICE
            ============================ */}
            <section>
              <h2 className='text-2xl font-semibold mb-6 text-blue-400'>I. Terms of Service</h2>
              <div className='space-y-8'>
                {/* 1 Acceptance */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>1. Acceptance of Terms</h3>
                  <p className='text-gray-300'>
                    These Terms of Service (the 'Terms') govern your access to and use of the Sente Games website,
                    applications, APIs, and any associated services (collectively, the 'Service'). By creating an
                    account, accessing, or using the Service, you acknowledge that you have read, understood, and agree
                    to be bound by these Terms, our Privacy Policy, and our Refund Policy (together, the 'Agreement').
                    If you do not agree to the Agreement, do not access or use the Service.
                  </p>
                </article>

                {/* 2 Description */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>2. Description of Service</h3>
                  <p className='text-gray-300'>
                    Sente Games provides AI‑powered analytical tools that ingest game‑telemetry data (e.g., via
                    AOE4World) and generate post‑match reviews, recommendations, and other informational material for
                    strategy gamers. The Service is provided on an 'AS IS' and 'AS AVAILABLE' basis, subject to
                    continuous development and change at our sole discretion.
                  </p>
                </article>

                {/* 3 Eligibility & Accounts */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>3. Eligibility & User Accounts</h3>
                  <ul className='list-disc list-inside text-gray-300 space-y-2'>
                    <li>You must be at least 16 years old (or older if required by the laws of your jurisdiction).</li>
                    <li>You agree to provide accurate, current, and complete information during registration and to
                      keep it updated.</li>
                    <li>You are solely responsible for safeguarding your authentication credentials. You must notify us
                      immediately of any unauthorized use or suspected breach of your account.</li>
                    <li>Account sharing is prohibited. You may create only one account unless explicitly approved by
                      Sente Games.</li>
                  </ul>
                </article>

                {/* 4 Fees & Payments */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>4. Fees & Payments</h3>
                  <p className='text-gray-300'>
                    Some features of the Service may require payment. Prices and billing terms are described at
                    checkout and are subject to change with prior notice. You authorize us (and our third‑party payment
                    processor) to charge all applicable fees to your payment method. You are responsible for all taxes
                    associated with your use of the Service.
                  </p>
                </article>

                {/* 5 Acceptable Use */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>5. Acceptable Use</h3>
                  <ul className='list-disc list-inside text-gray-300 space-y-2'>
                    <li>No unlawful, infringing, or fraudulent activity.</li>
                    <li>Do not attempt to access, tamper with, or use non‑public areas of the Service, Sente Games' computer
                      systems, or the technical delivery systems of our providers.</li>
                    <li>Do not reverse‑engineer, decompile, or disassemble any portion of the Service or its outputs.</li>
                    <li>Do not use automated means to scrape or export content except through documented APIs with our
                      express permission.</li>
                    <li>Do not misrepresent your affiliation with any entity or impersonate any person.</li>
                  </ul>
                </article>

                {/* 6 Third‑Party Content & AI Disclaimer */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>6. Third‑Party Content & AI Disclaimers</h3>
                  <p className='text-gray-300'>
                    Sente Games is not affiliated with Microsoft, Relic Entertainment, World's Edge, or AOE4World, and
                    makes no claim to their trademarks or intellectual property. Our reviews are generated by large
                    language models and may contain inaccuracies. You acknowledge that the outputs are for
                    informational purposes only and should not be relied upon for professional advice. You agree to use
                    your own judgment before acting on any information provided.
                  </p>
                </article>

                {/* 7 Intellectual Property */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>7. Intellectual Property</h3>
                  <p className='text-gray-300'>
                    The Service, including all software, text, graphics, logos, and content (other than game data owned
                    by third parties or user‑generated input), is protected by copyright, trademark, and other
                    intellectual‑property laws. Except for the limited license explicitly granted to you to access and
                    use the Service, no rights are granted.
                  </p>
                </article>

                {/* 8 Warranty Disclaimer */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>8. Warranty Disclaimer</h3>
                  <p className='text-gray-300'>
                    THE SERVICE IS PROVIDED 'AS IS' AND WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
                    WITHOUT LIMITATION ANY WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON‑INFRINGEMENT,
                    OR COURSE OF PERFORMANCE.
                  </p>
                </article>

                {/* 9 Limitation of Liability */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>9. Limitation of Liability</h3>
                  <p className='text-gray-300'>
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, SENTE GAMES AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY
                    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
                    DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                    OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER
                    OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) USD 50.
                  </p>
                </article>

                {/* 10 Indemnification */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>10. Indemnification</h3>
                  <p className='text-gray-300'>
                    You agree to defend, indemnify, and hold harmless Sente Games, its officers, directors, employees,
                    and agents from and against any claims, damages, obligations, losses, liabilities, costs or debt,
                    and expenses (including attorneys' fees) arising from: (a) your use of and access to the Service;
                    (b) your violation of any term of this Agreement; (c) your violation of any third‑party right,
                    including without limitation any copyright, property, or privacy right.
                  </p>
                </article>

                {/* 11 Termination */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>11. Termination</h3>
                  <p className='text-gray-300'>
                    We may suspend or terminate your account and access to the Service at any time, with or without
                    cause or notice, effective immediately. Upon termination, your right to use the Service will cease
                    immediately; sections that by their nature should survive will survive (including IP provisions,
                    warranty disclaimers, limitations of liability, and dispute terms).
                  </p>
                </article>

                {/* 12 Governing Law & Dispute Resolution */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>12. Governing Law & Dispute Resolution</h3>
                  <p className='text-gray-300'>
                    This Agreement is governed by and construed in accordance with the laws of the State of Israel,
                    without regard to conflict‑of‑law principles. Any dispute arising out of or relating to the Service
                    shall be submitted to binding arbitration under the Rules of Arbitration of the International
                    Chamber of Commerce. The seat of arbitration shall be Tel Aviv, Israel, and proceedings shall be
                    conducted in English. YOU WAIVE THE RIGHT TO PARTICIPATE IN ANY CLASS ACTION OR CLASS‑WIDE
                    ARBITRATION.
                  </p>
                </article>

                {/* 13 Changes */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>13. Changes to These Terms</h3>
                  <p className='text-gray-300'>
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If the
                    changes are material, we will provide at least 30 days' notice before the new terms take effect.
                    Your continued use of the Service after the effective date constitutes acceptance.
                  </p>
                </article>
              </div>
            </section>

            {/* ============================
                II. PRIVACY POLICY
            ============================ */}
            <section>
              <h2 className='text-2xl font-semibold mb-6 text-blue-400'>II. Privacy Policy</h2>
              <div className='space-y-8'>
                {/* 1 Scope */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>1. Scope & Data Controller</h3>
                  <p className='text-gray-300'>
                    This Privacy Policy explains how Sente Games ('we', 'us', 'our') collects, uses, shares, and
                    protects personal data when you use the Service. For the purposes of EU General Data Protection
                    Regulation ('GDPR'), the data controller is Shim Razilov d/b/a Sente Games.
                  </p>
                </article>

                {/* 2 Information We Collect */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>2. Information We Collect</h3>
                  <ul className='list-disc list-inside text-gray-300 space-y-2'>
                    <li><strong>Account Data:</strong> email address, display name, authentication tokens.</li>
                    <li><strong>Game Data:</strong> public match telemetry and in‑game statistics retrieved from
                      third‑party sources like AOE4World or Steam.</li>
                    <li><strong>Usage Data:</strong> log files, IP address, browser type, pages visited, and other
                      diagnostic data.</li>
                    <li><strong>Payment Data:</strong> limited transaction identifiers (handled by our payment
                      processor—no card numbers are stored on our servers).</li>
                    <li><strong>Cookies & Similar Technologies:</strong> we use essential and analytics cookies to
                      operate and improve the Service.</li>
                  </ul>
                </article>

                {/* 3 Legal Bases */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>3. Legal Bases for Processing</h3>
                  <p className='text-gray-300'>
                    We process personal data when: (a) necessary to perform our contract with you; (b) necessary for our
                    legitimate interests (e.g., service improvement, fraud prevention); (c) you have given consent; or
                    (d) we have a legal obligation.
                  </p>
                </article>

                {/* 4 Use of Information */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>4. How We Use Information</h3>
                  <ul className='list-disc list-inside text-gray-300 space-y-2'>
                    <li>To provide, maintain, and improve the Service.</li>
                    <li>To personalize analysis and recommendations.</li>
                    <li>To process payments and manage subscriptions.</li>
                    <li>To communicate with you about updates, security alerts, and administrative messages.</li>
                    <li>To conduct research and develop new features.</li>
                  </ul>
                </article>

                {/* 5 Sharing */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>5. Sharing & Disclosure</h3>
                  <p className='text-gray-300'>
                    We do not sell personal data. We share it only with: (i) vetted service providers under contractual
                    confidentiality; (ii) competent authorities when legally required; (iii) successors in a merger,
                    acquisition, or sale of assets; and (iv) others with your explicit consent.
                  </p>
                </article>

                {/* 6 Transfers */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>6. International Data Transfers</h3>
                  <p className='text-gray-300'>
                    Your information may be transferred to—and processed on—servers located outside your jurisdiction
                    (e.g., AWS us‑east‑1). We rely on Standard Contractual Clauses or other approved safeguards to
                    protect such transfers when required by law.
                  </p>
                </article>

                {/* 7 Retention */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>7. Data Retention</h3>
                  <p className='text-gray-300'>
                    We retain personal data only as long as necessary for the purposes stated in this Policy, unless a
                    longer period is required or permitted by law.
                  </p>
                </article>

                {/* 8 Security */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>8. Security</h3>
                  <p className='text-gray-300'>
                    We employ commercially reasonable technical and organizational measures (encryption in transit and
                    at rest, access controls, periodic audits) to protect personal data. However, no Internet or e‑mail
                    transmission is ever fully secure.
                  </p>
                </article>

                {/* 9 Your Rights */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>9. Your Rights</h3>
                  <p className='text-gray-300'>
                    Depending on your jurisdiction, you may have the right to access, correct, delete, restrict, or
                    port your personal data, and to object to certain processing. Requests can be submitted via the
                    contact information below. You also have the right to lodge a complaint with a supervisory
                    authority.
                  </p>
                </article>

                {/* 10 Children */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>10. Children's Privacy</h3>
                  <p className='text-gray-300'>
                    The Service is not directed to children under 16. We do not knowingly collect personal data from
                    children. If you believe a child has provided us with personal data, please contact us so we can
                    delete it.
                  </p>
                </article>

                {/* 11 Changes to Policy */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>11. Changes to This Privacy Policy</h3>
                  <p className='text-gray-300'>
                    We may update this Policy from time to time. If we make material changes, we will notify you via
                    e‑mail or through the Service. Continued use after the effective date indicates acceptance.
                  </p>
                </article>
              </div>
            </section>

            {/* ============================
                III. REFUND POLICY
            ============================ */}
            <section>
              <h2 className='text-2xl font-semibold mb-6 text-blue-400'>III. Refund Policy</h2>
              <div className='space-y-8'>
                {/* 1 Digital Nature */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>1. Digital Service Characteristics</h3>
                  <p className='text-gray-300'>
                    Sente Games provides digital, intangible services that commence immediately upon purchase. By
                    completing a transaction, you expressly consent to the immediate provision of the Service and
                    acknowledge that your right of withdrawal is waived once delivery has begun, to the extent
                    permitted by law (e.g., Article 16 m of EU Consumer Rights Directive).
                  </p>
                </article>

                {/* 2 Eligibility */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>2. Eligibility for Refund</h3>
                  <ul className='list-disc list-inside text-gray-300 space-y-2'>
                    <li>Duplicate or accidental payments fully attributable to our billing system errors.</li>
                    <li>Technical failure on our side that prevents delivery and cannot be resolved within 72 hours of
                      your written support request.</li>
                    <li>No refunds will be granted for dissatisfaction with AI‑generated content or strategic advice, as
                      these are subjective assessments.</li>
                  </ul>
                </article>

                {/* 3 Request Procedure */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>3. How to Request a Refund</h3>
                  <p className='text-gray-300'>
                    Submit a ticket via our in‑app chat or e‑mail shim2k@gmail.com within 14 days of the charge. Your
                    request must include the transaction ID, the email associated with your account, and a detailed
                    description of the issue. We aim to process eligible refunds within 10 business days.
                  </p>
                </article>

                {/* 4 Chargebacks */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>4. Chargebacks & Payment Disputes</h3>
                  <p className='text-gray-300'>
                    Initiating a chargeback without first contacting us to resolve the issue may result in immediate
                    suspension of your account. We reserve the right to contest fraudulent chargebacks and recover any
                    associated costs.
                  </p>
                </article>

                {/* 5 Modifications */}
                <article>
                  <h3 className='text-xl font-semibold mb-2 text-blue-300'>5. Policy Modifications</h3>
                  <p className='text-gray-300'>
                    We reserve the right to amend this Refund Policy at any time. Material amendments will be
                    communicated via the Service. Continued use after the effective date signifies acceptance.
                  </p>
                </article>
              </div>
            </section>

            {/* ============================
                Contact
            ============================ */}
            <section>
              <h2 className='text-2xl font-semibold mb-6 text-blue-400'>Contact Us</h2>
              <p className='text-gray-300'>
                Questions, concerns, or requests related to this Agreement can be directed to:
              </p>
              <ul className='list-none mt-2 text-gray-300'>
                <li>Sente Games</li>
                <li>Creator: Shimi Razilov</li>
                <li>Email: support@senteai.com</li>
                <li>Attn: Legal</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className='mt-12 pt-8 border-t border-gray-800 text-center'>
          <p className='text-gray-500'>&copy; {new Date().getFullYear()} Sente Games. All rights reserved.</p>
          <p className='text-gray-600 text-xs mt-1'>Sente Games is not affiliated with Microsoft, Relic Entertainment, World's Edge, or Age of Empires IV.</p>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfService;
