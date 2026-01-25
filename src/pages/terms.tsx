import Head from "next/head";
import React from "react";

export default function Terms() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Terms of Service | Ryzira</title>
      </Head>
      <style jsx global>{`
        :root {
          --bg: #0f1115;
          --card: #151820;
          --text: #e6e6eb;
          --muted: #a1a1b3;
          --accent: #7c7cff;
          --border: #232635;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          line-height: 1.6;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .card {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(to right, #fff, #a1a1b3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        h2 {
          color: var(--accent);
          font-size: 1.5rem;
          margin-top: 30px;
          margin-bottom: 15px;
        }

        p {
          color: var(--muted);
          margin-bottom: 15px;
        }

        ul {
          color: var(--muted);
          margin-bottom: 15px;
          padding-left: 20px;
        }

        li {
          margin-bottom: 8px;
        }

        .updated {
          font-size: 0.9rem;
          color: var(--muted);
          margin-bottom: 40px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 20px;
        }

        a {
          color: var(--accent);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        a:hover {
          opacity: 0.8;
        }

        .contact {
          background: rgba(124, 124, 255, 0.08);
          border: 1px solid rgba(124, 124, 255, 0.25);
          padding: 20px;
          border-radius: 12px;
          margin-top: 24px;
        }
        
        footer {
          text-align: center;
          color: var(--muted);
          margin-top: 40px;
          font-size: 0.9rem;
        }

        @media (max-width: 600px) {
          .container {
            padding: 20px;
          }
          .card {
            padding: 25px;
          }
          h1 {
            font-size: 2rem;
          }
        }
      `}</style>
      <div className="container">
        <div className="card">
          <h1>Terms of Service</h1>
          <div className="updated">Last updated: December 31, 2025</div>

          <p>
            These Terms of Service (“Terms”) govern your access to and use of the
            website, products, and services provided by <strong>Ryzira</strong>
            (“we”, “us”, or “our”) (collectively, the “Service”).
          </p>

          <p>
            By accessing or using the Service, you agree to be bound by these Terms.
            If you do not agree to these Terms, you must not access or use the
            Service.
          </p>

          <h2>Use of the Service</h2>
          <p>
            You agree to use the Service only for lawful purposes and in a manner
            that does not violate these Terms or interfere with the operation,
            security, or integrity of the Service.
          </p>

          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful, harmful, or abusive purpose</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Reverse engineer, copy, or misuse the Service except as permitted</li>
          </ul>

          <h2>Accounts</h2>
          <p>
            Certain features of the Service may require you to create an account.
            You are responsible for maintaining the confidentiality of your account
            information and for all activities that occur under your account.
          </p>

          <p>
            We reserve the right to suspend or terminate accounts that violate these
            Terms or pose a risk to the Service or other users.
          </p>

          <h2>Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service, including but
            not limited to text, design, graphics, logos, and software, are owned by
            or licensed to Ryzira and are protected by applicable intellectual
            property laws.
          </p>

          <p>
            You may not reproduce, distribute, modify, or create derivative works
            from any part of the Service without prior written permission.
          </p>

          <h2>User Content</h2>
          <p>
            You may be permitted to submit, upload, or otherwise make content
            available through the Service (“User Content”).
          </p>

          <p>
            You retain ownership of your User Content. By submitting User Content,
            you grant us a non-exclusive, worldwide, royalty-free license to use,
            host, store, and display such content solely for the purpose of operating
            and improving the Service.
          </p>

          <h2>Availability and Modifications</h2>
          <p>
            We may modify, suspend, or discontinue the Service or any part of it at
            any time, with or without notice. We do not guarantee that the Service
            will be available at all times or without interruption.
          </p>

          <h2>Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an “as is” and “as available” basis. We make
            no warranties or representations of any kind, express or implied,
            regarding the operation or availability of the Service.
          </p>

          <p>
            To the maximum extent permitted, we disclaim all warranties, including
            implied warranties of merchantability, fitness for a particular purpose,
            and non-infringement.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted, Ryzira shall not be liable for any
            indirect, incidental, consequential, or special damages arising out of
            or related to your use of the Service.
          </p>

          <p>
            Your use of the Service is at your own risk.
          </p>

          <h2>Third-Party Links</h2>
          <p>
            The Service may contain links to third-party websites or services. We are
            not responsible for the content, policies, or practices of third parties.
            Your use of third-party services is at your own risk.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time if you
            violate these Terms or if continued access would pose a risk to the
            Service or others.
          </p>

          <h2>Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes will be posted on
            this page with an updated revision date. Continued use of the Service
            after changes are posted constitutes acceptance of the revised Terms.
          </p>

          <h2>Contact Us</h2>
          <div className="contact">
            <p>
              If you have any questions about these Terms, you may contact us at:
            </p>
            <p>
              📧 <a href="mailto:ryzira.info@gmail.com">ryzira.info@gmail.com</a>
            </p>
          </div>
        </div>

        <footer>
          © Ryzira. All rights reserved.
        </footer>
      </div>
    </>
  );
}
