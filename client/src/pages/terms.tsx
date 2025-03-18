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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">TERMS AND CONDITIONS</h1>
        <p className="text-gray-600">Last Updated: March 18, 2025</p>
      </header>

      <div className="prose prose-green max-w-none">
        <h2>1. INTRODUCTION</h2>
        <p>
          Welcome to Pinnity. These Terms and Conditions ("Terms") govern your access to and use of the Pinnity website, mobile application, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
        </p>
        <p>
          Pinnity is a platform that connects users with local businesses and experiences in their area.
        </p>

        <h2>2. DEFINITIONS</h2>
        <ul>
          <li>"Pinnity," "we," "us," and "our" refer to Pinnity, Inc. and its subsidiaries and affiliates.</li>
          <li>"User," "you," and "your" refer to any individual who accesses or uses the Service, including both Individual Users and Business Users.</li>
          <li>"Individual User" refers to a person who uses the Service to discover and engage with local businesses and experiences.</li>
          <li>"Business User" refers to a business entity or individual representing a business who uses the Service to create and offer deals to Individual Users.</li>
          <li>"Content" includes text, images, photos, audio, video, and all other forms of data or communication.</li>
          <li>"User Content" means Content that users submit or transmit to, through, or in connection with the Service.</li>
          <li>"Deal" refers to any offer, discount, promotion, or other incentive created by a Business User and made available to Individual Users through the Service.</li>
        </ul>

        <h2>3. ELIGIBILITY AND ACCOUNTS</h2>
        <h3>3.1 Account Creation</h3>
        <p>
          To use certain features of the Service, you must create an account. When creating an account, you must provide accurate and complete information. You are solely responsible for the activity that occurs on your account, and you must keep your account password secure.
        </p>
        <h3>3.2 Account Types</h3>
        <p>The Service offers two types of accounts:</p>
        <ul>
          <li>Individual Accounts: For personal use to discover and engage with local businesses.</li>
          <li>Business Accounts: For businesses to create and offer deals to users.</li>
        </ul>
        <h3>3.3 Business Account Verification</h3>
        <p>Business Users must provide additional information for verification purposes, which may include:</p>
        <ul>
          <li>Business name and category</li>
          <li>Contact information</li>
          <li>Business address</li>
          <li>Government ID</li>
          <li>Proof of address</li>
          <li>Proof of business ownership</li>
        </ul>
        <p>Pinnity reserves the right to reject any Business Account application if the verification information provided is deemed insufficient or inaccurate.</p>
        <h3>3.4 Minimum Age</h3>
        <p>
          You must be at least 18 years old to create an account and use the Service. By creating an account, you represent and warrant that you are at least 18 years old.
        </p>

        <h2>4. USER CONDUCT</h2>
        <h3>4.1 General Conduct</h3>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose or in violation of any local, state, national, or international law.</li>
          <li>Harass, abuse, or harm another person or entity.</li>
          <li>Impersonate another user or entity.</li>
          <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
          <li>Upload viruses or other malicious code.</li>
          <li>Attempt to gain unauthorized access to parts of the Service not intended for public access.</li>
        </ul>
        <h3>4.2 Business User Conduct</h3>
        <p>Business Users additionally agree not to:</p>
        <ul>
          <li>Create false, misleading, or deceptive Deals.</li>
          <li>Offer Deals for products or services they cannot fulfill.</li>
          <li>Discriminate against Individual Users who attempt to redeem valid Deals.</li>
          <li>Use the Service for any purpose other than offering legitimate Deals to consumers.</li>
        </ul>

        <h2>5. DEALS AND TRANSACTIONS</h2>
        <h3>5.1 Deal Creation and Management</h3>
        <p>Business Users are responsible for creating and managing their Deals, including:</p>
        <ul>
          <li>Setting accurate Deal terms and conditions</li>
          <li>Ensuring they can honor all Deals created</li>
          <li>Setting appropriate expiration dates</li>
          <li>Clearly describing any limitations or restrictions</li>
        </ul>
        <h3>5.2 Deal Redemption</h3>
        <p>Individual Users are responsible for:</p>
        <ul>
          <li>Understanding the terms and conditions of each Deal before redemption</li>
          <li>Redeeming Deals within the specified timeframe</li>
          <li>Complying with any specific requirements for redemption</li>
        </ul>
        <h3>5.3 Transaction Disputes</h3>
        <p>
          Pinnity is not responsible for disputes arising between Business Users and Individual Users regarding Deal redemption or fulfillment. However, Pinnity may, at its sole discretion, mediate disputes and take appropriate action against users who violate these Terms.
        </p>

        <h2>6. CONTENT AND INTELLECTUAL PROPERTY</h2>
        <h3>6.1 User Content</h3>
        <p>
          You retain all rights in the User Content you submit, post, or display on or through the Service. By submitting, posting, or displaying User Content on or through the Service, you grant Pinnity a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such User Content in any and all media or distribution methods.
        </p>
        <h3>6.2 Content Guidelines</h3>
        <p>You agree not to post User Content that:</p>
        <ul>
          <li>Is false, misleading, or deceptive</li>
          <li>Infringes on any patent, trademark, trade secret, copyright, or other intellectual property rights</li>
          <li>Violates the privacy or publicity rights of any third party</li>
          <li>Is defamatory, obscene, pornographic, vulgar, or offensive</li>
          <li>Promotes discrimination, bigotry, racism, hatred, or harm against any individual or group</li>
        </ul>
        <h3>6.3 Content Monitoring</h3>
        <p>
          Pinnity reserves the right, but has no obligation, to monitor User Content. We may remove or refuse to display User Content that we believe violates these Terms or may harm Pinnity, our users, or third parties.
        </p>

        <h2>7. PRIVACY</h2>
        <p>
          Your privacy is important to us. Our Privacy Policy explains how we collect, use, and disclose information about you. By using the Service, you agree to the collection, use, and disclosure of your information as described in our Privacy Policy.
        </p>

        <h2>8. TERMINATION</h2>
        <h3>8.1 Termination by You</h3>
        <p>
          You may terminate your account at any time by following the instructions on the Service or by contacting us.
        </p>
        <h3>8.2 Termination by Pinnity</h3>
        <p>
          Pinnity may terminate or suspend your account and access to the Service at any time, without prior notice or liability, for any reason, including if you breach these Terms.
        </p>
        <h3>8.3 Effect of Termination</h3>
        <p>Upon termination:</p>
        <ul>
          <li>Your right to use the Service will immediately cease</li>
          <li>Business Users will have all active Deals removed from the Service</li>
          <li>Individual Users will lose access to any saved Deals</li>
          <li>We may delete your account information and User Content</li>
        </ul>

        <h2>9. DISCLAIMERS AND LIMITATIONS OF LIABILITY</h2>
        <h3>9.1 Service Provided "As Is"</h3>
        <p>
          The Service is provided on an "as is" and "as available" basis. Pinnity makes no warranties, expressed or implied, and hereby disclaims all warranties, including without limitation, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
        </p>
        <h3>9.2 Deal Accuracy</h3>
        <p>
          Pinnity does not guarantee the accuracy, completeness, or quality of any Deals offered by Business Users. Individual Users acknowledge that Pinnity is not responsible for the availability, accuracy, or fulfillment of any Deals.
        </p>
        <h3>9.3 Limitation of Liability</h3>
        <p>
          In no event shall Pinnity, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
        </p>
        <ul>
          <li>Your access to or use of or inability to access or use the Service</li>
          <li>Any conduct or content of any third party on the Service</li>
          <li>Any content obtained from the Service</li>
          <li>Unauthorized access, use, or alteration of your transmissions or content</li>
        </ul>

        <h2>10. DISPUTE RESOLUTION</h2>
        <h3>10.1 Governing Law</h3>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
        </p>
        <h3>10.2 Arbitration Agreement</h3>
        <p>
          You agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service will be settled by binding arbitration, except that each party retains the right to seek injunctive or other equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.
        </p>
        <h3>10.3 Class Action Waiver</h3>
        <p>
          You agree that any arbitration will be conducted on an individual basis and not in a class, consolidated, or representative action.
        </p>

        <h2>11. CHANGES TO TERMS</h2>
        <p>
          Pinnity reserves the right to modify or replace these Terms at any time. We will provide notice of any material changes through the Service or by other means. By continuing to access or use the Service after revisions become effective, you agree to be bound by the revised Terms.
        </p>

        <h2>12. CONTACT INFORMATION</h2>
        <p>
          If you have any questions about these Terms, please contact us at:
          <br />
          <a href="mailto:legal@pinnity.com" className="text-[#00796B] hover:underline">legal@pinnity.com</a>
        </p>
      </div>
    </div>
  );
}