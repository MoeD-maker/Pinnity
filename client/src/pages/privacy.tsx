import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Privacy Policy Page
 * This component displays the full privacy policy with proper formatting and navigation.
 */
export default function PrivacyPolicyPage() {
  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Back button and header */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link href="/auth">
          <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Authentication
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-primary">Privacy Policy</h1>
        <p className="text-muted-foreground">Last Updated: March 18, 2025</p>
      </div>
      
      {/* Policy content with proper semantic markup */}
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <section>
          <h2>1. INTRODUCTION</h2>
          <p>
            Pinnity, Inc. ("Pinnity," "we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our website, mobile application, and services (collectively, the "Service").
          </p>
          <p>
            Please read this Privacy Policy carefully. By using the Service, you consent to the practices 
            described in this policy. If you do not agree with this Privacy Policy, please do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. INFORMATION WE COLLECT</h2>
          
          <h3>2.1 Information You Provide to Us</h3>
          <p>We collect information you provide directly to us, including:</p>
          
          <h4>For All Users:</h4>
          <ul>
            <li><strong>Account information:</strong> When you create an account, we collect your name, email address, password, and other registration information.</li>
            <li><strong>Profile information:</strong> Information you add to your profile, such as profile picture, phone number, and preferences.</li>
            <li><strong>Communications:</strong> Information you provide when you contact us for support or communicate with other users.</li>
            <li><strong>Transaction information:</strong> Records of Deals you've viewed, saved, or redeemed.</li>
          </ul>
          
          <h4>For Business Users:</h4>
          <ul>
            <li><strong>Business information:</strong> Business name, category, address, contact information, and other details about your business.</li>
            <li><strong>Verification documents:</strong> Government ID, proof of address, and proof of business ownership.</li>
            <li><strong>Deal information:</strong> Details about Deals you create, including descriptions, values, restrictions, and expiration dates.</li>
          </ul>
          
          <h3>2.2 Information We Collect Automatically</h3>
          <p>When you use our Service, we automatically collect:</p>
          <ul>
            <li><strong>Device information:</strong> IP address, device type, operating system, browser type, mobile network information.</li>
            <li><strong>Usage information:</strong> Pages viewed, time spent on pages, links clicked, and other actions taken within the Service.</li>
            <li><strong>Location information:</strong> Precise or approximate location, with your consent, to show you relevant local Deals.</li>
            <li><strong>Cookies and similar technologies:</strong> Information collected through cookies, web beacons, and similar technologies.</li>
          </ul>
          
          <h3>2.3 Information from Third Parties</h3>
          <p>We may receive information about you from third parties, including:</p>
          <ul>
            <li><strong>Social media platforms:</strong> When you connect your social media accounts to Pinnity.</li>
            <li><strong>Business partners:</strong> Information shared by our business partners to facilitate Deals or promotions.</li>
            <li><strong>Service providers:</strong> Information from third-party service providers who help us with user verification, payment processing, and analytics.</li>
          </ul>
        </section>

        <section>
          <h2>3. HOW WE USE YOUR INFORMATION</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Create and maintain your account</li>
            <li>Process transactions between Individual Users and Business Users</li>
            <li>Send you technical notices, updates, security alerts, and administrative messages</li>
            <li>Provide customer service and respond to your inquiries</li>
            <li>Personalize your experience by delivering content and Deals relevant to your interests and location</li>
            <li>Monitor and analyze trends, usage, and activities in connection with the Service</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Verify Business User credentials and information</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. HOW WE SHARE YOUR INFORMATION</h2>
          <p>We may share your information in the following circumstances:</p>
          
          <h3>4.1 With Other Users</h3>
          <ul>
            <li><strong>For Individual Users:</strong> Basic profile information may be visible to Business Users whose Deals you've saved or redeemed.</li>
            <li><strong>For Business Users:</strong> Business information and Deal details are shared with Individual Users of the Service.</li>
          </ul>
          
          <h3>4.2 With Service Providers</h3>
          <p>We share information with third-party vendors, consultants, and other service providers who perform services on our behalf, such as:</p>
          <ul>
            <li>Payment processors</li>
            <li>Cloud storage providers</li>
            <li>Analytics providers</li>
            <li>Email service providers</li>
            <li>Customer support providers</li>
          </ul>
          
          <h3>4.3 For Legal Reasons</h3>
          <p>We may disclose your information if we believe it is reasonably necessary to:</p>
          <ul>
            <li>Comply with a law, regulation, legal process, or governmental request</li>
            <li>Protect the safety, rights, or property of Pinnity, our users, or the public</li>
            <li>Detect, prevent, or address fraud, security, or technical issues</li>
          </ul>
          
          <h3>4.4 Business Transfers</h3>
          <p>If Pinnity is involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction.</p>
        </section>

        <section>
          <h2>5. YOUR RIGHTS AND CHOICES</h2>
          
          <h3>5.1 Account Information</h3>
          <p>
            You may update, correct, or delete your account information at any time by logging into your account or 
            contacting us. Note that we may retain certain information as required by law or for legitimate business purposes.
          </p>
          
          <h3>5.2 Location Information</h3>
          <p>
            You can prevent us from collecting precise location information by adjusting the settings on your device, 
            but this may limit your ability to use certain features of the Service.
          </p>
          
          <h3>5.3 Cookies and Similar Technologies</h3>
          <p>
            Most web browsers are set to accept cookies by default. You can usually adjust your browser settings to remove or 
            reject cookies, but this may affect your ability to use the Service.
          </p>
          
          <h3>5.4 Marketing Communications</h3>
          <p>
            You may opt out of receiving promotional communications from us by following the instructions in those communications. 
            If you opt out, we may still send you non-promotional communications, such as those about your account or our ongoing business relations.
          </p>
          
          <h3>5.5 Data Subject Rights</h3>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Object to our processing of your personal information</li>
            <li>Request restriction of processing of your personal information</li>
            <li>Request transfer of your personal information</li>
            <li>Withdraw consent where we rely on consent to process your personal information</li>
          </ul>
          <p>To exercise these rights, please contact us using the information provided at the end of this policy.</p>
        </section>

        <section>
          <h2>6. DATA SECURITY</h2>
          <p>
            We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, 
            disclosure, alteration, and destruction. However, no security system is impenetrable, and we cannot guarantee the security of our systems.
          </p>
          <p>For Business Users who upload verification documents, we implement enhanced security measures:</p>
          <ul>
            <li>Documents are encrypted during transmission and storage</li>
            <li>Access to documents is strictly limited to authorized personnel</li>
            <li>Documents are only retained for as long as necessary for verification purposes</li>
          </ul>
        </section>

        <section>
          <h2>7. DATA RETENTION</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide you with the Service, 
            comply with our legal obligations, resolve disputes, and enforce our agreements.
          </p>
          <p>
            For Business Users, verification documents are retained for the duration of your active Business account and for a 
            period thereafter as required by law or for legitimate business purposes.
          </p>
        </section>

        <section>
          <h2>8. CHILDREN'S PRIVACY</h2>
          <p>
            The Service is not intended for children under the age of 18, and we do not knowingly collect personal information from 
            children under 18. If we learn that we have collected personal information from a child under 18, we will take steps to delete such information.
          </p>
        </section>

        <section>
          <h2>9. INTERNATIONAL DATA TRANSFERS</h2>
          <p>
            Pinnity is based in the United States, and the information we collect is governed by U.S. law. If you are accessing the Service 
            from outside the United States, you consent to the transfer, processing, and storage of your information in the United States and 
            other countries, where different data protection standards may apply.
          </p>
        </section>

        <section>
          <h2>10. CHANGES TO THIS PRIVACY POLICY</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page 
            and updating the "Last Updated" date. For material changes, we will provide more prominent notice, such as an email notification. 
            Your continued use of the Service after any changes indicates your acceptance of the new Privacy Policy.
          </p>
        </section>

        <section>
          <h2>11. CONTACT INFORMATION</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p>
            <a href="mailto:hello@pinnity.ca">hello@pinnity.ca</a>
          </p>
        </section>

        <section>
          <h2>12. CALIFORNIA PRIVACY RIGHTS</h2>
          <p>
            California residents have specific rights regarding their personal information. For more information on your 
            California privacy rights, please visit our California Privacy Rights page.
          </p>
        </section>

        <section>
          <h2>13. DOCUMENT SECURITY</h2>
          <p>
            We understand the sensitivity of the verification documents that Business Users provide. 
            We employ the following security measures to protect these documents:
          </p>
          <ul>
            <li>Bank-level encryption (AES-256) for all uploaded documents</li>
            <li>Secure, access-controlled storage systems</li>
            <li>Regular security audits and assessments</li>
            <li>Automatic deletion of documents after the verification process is complete and required retention periods have elapsed</li>
            <li>Strict access controls limiting document access to authorized personnel only</li>
          </ul>
          <p>
            Your trust is important to us, and we are committed to protecting the documents you share with us with the highest level of security.
          </p>
        </section>
      </div>
      
      {/* Footer with back to top button */}
      <div className="max-w-4xl mx-auto mt-10 pt-6 border-t">
        <div className="flex justify-between items-center">
          <Link href="/auth">
            <Button variant="outline">Back to Authentication</Button>
          </Link>
          <Button 
            variant="secondary" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to Top
          </Button>
        </div>
      </div>
    </div>
  );
}