import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/auth" className="flex items-center text-[#00796B] mb-8 hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Login
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600">Last updated: March 18, 2025</p>
      </header>

      <div className="prose prose-green max-w-none">
        <h2>1. Introduction</h2>
        <p>
          Welcome to Pinnity ("we," "our," or "us"). These Terms of Service govern your use of the Pinnity website, mobile application, and services (collectively, the "Service").
        </p>
        <p>
          By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
        </p>

        <h2>2. Accounts</h2>
        <p>
          When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
        </p>
        <p>
          You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
        </p>
        <p>
          You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
        </p>

        <h2>3. Content</h2>
        <p>
          Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
        </p>
        <p>
          By posting Content on or through the Service, you represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
        </p>

        <h2>4. Deal Redemption</h2>
        <p>
          Pinnity offers a platform for businesses to provide special offers and deals to users ("Deals"). The redemption of these Deals is subject to the terms and conditions specified by the offering business.
        </p>
        <p>
          We do not guarantee the accuracy, completeness, or availability of any Deal. We are not responsible for any loss or damage incurred as a result of using the Deals provided through our Service.
        </p>
        <p>
          Businesses are responsible for honoring their Deals. If you encounter issues with redeeming a Deal, you should contact the business directly.
        </p>

        <h2>5. User Conduct</h2>
        <p>
          You agree not to use the Service to:
        </p>
        <ul>
          <li>Violate any applicable laws or regulations.</li>
          <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others.</li>
          <li>Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate.</li>
          <li>Submit false or misleading information.</li>
          <li>Upload or transmit viruses or any other type of malicious code.</li>
          <li>Interfere with or circumvent the security features of the Service.</li>
          <li>Engage in unauthorized framing of or linking to the Service.</li>
        </ul>

        <h2>6. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
        <p>
          Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          In no event shall Pinnity, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
        </p>

        <h2>8. Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.
        </p>
        <p>
          By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@pinnity.com.
        </p>
      </div>
    </div>
  );
}