import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/auth" className="flex items-center text-[#00796B] mb-8 hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Login
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600">Last updated: March 18, 2025</p>
      </header>

      <div className="prose prose-green max-w-none">
        <h2>1. Introduction</h2>
        <p>
          Pinnity ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and mobile application (collectively, the "Service").
        </p>
        <p>
          We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We collect several different types of information for various purposes to provide and improve our Service to you:
        </p>
        <h3>Personal Data</h3>
        <p>
          While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
        </p>
        <ul>
          <li>Email address</li>
          <li>First name and last name</li>
          <li>Phone number</li>
          <li>Address, State, Province, ZIP/Postal code, City</li>
          <li>Cookies and Usage Data</li>
        </ul>

        <h3>Location Data</h3>
        <p>
          We may use and store information about your location if you give us permission to do so ("Location Data"). We use this data to provide features of our Service and to improve and customize our Service.
        </p>
        <p>
          You can enable or disable location services when you use our Service at any time, through your device settings.
        </p>

        <h3>Business Data</h3>
        <p>
          If you are a business user, we may collect additional information such as:
        </p>
        <ul>
          <li>Business name and description</li>
          <li>Business address and contact information</li>
          <li>Business registration documents</li>
          <li>Deal information and images</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>
          We use the collected data for various purposes:
        </p>
        <ul>
          <li>To provide and maintain our Service</li>
          <li>To notify you about changes to our Service</li>
          <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
          <li>To provide customer support</li>
          <li>To gather analysis or valuable information so that we can improve our Service</li>
          <li>To monitor the usage of our Service</li>
          <li>To detect, prevent and address technical issues</li>
          <li>To provide you with news, special offers and general information about other goods, services and events which we offer</li>
        </ul>

        <h2>4. Security of Data</h2>
        <p>
          The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
        </p>
        <p>
          All personal data is encrypted both in transit and at rest. We implement industry-standard security measures including access controls, encryption, and regular security audits to protect your information.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your Personal Data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies.
        </p>
        <p>
          We will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a shorter period of time, except when this data is used to strengthen the security or to improve the functionality of our Service, or we are legally obligated to retain this data for longer time periods.
        </p>

        <h2>6. Your Data Protection Rights</h2>
        <p>
          You have certain data protection rights. If you wish to be informed what Personal Data we hold about you and if you want it to be removed from our systems, please contact us.
        </p>
        <p>
          In certain circumstances, you have the following data protection rights:
        </p>
        <ul>
          <li>The right to access, update or to delete the information we have on you</li>
          <li>The right of rectification - the right to have your information corrected if it is inaccurate or incomplete</li>
          <li>The right to object - the right to object to our processing of your Personal Data</li>
          <li>The right of restriction - the right to request that we restrict the processing of your personal information</li>
          <li>The right to data portability - the right to be provided with a copy of the information we have on you in a structured, machine-readable and commonly used format</li>
          <li>The right to withdraw consent - the right to withdraw your consent at any time where we relied on your consent to process your personal information</li>
        </ul>

        <h2>7. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
        </p>
        <p>
          You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at privacy@pinnity.com.
        </p>
      </div>
    </div>
  );
}