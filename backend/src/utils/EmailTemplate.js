export const Verification_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Login</title>
      <style>
          body {
              font-family: "DM Sans", Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #e5e7eb;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #fafafa;
              border-radius: 14px;
              box-shadow: 0 16px 32px rgba(0, 0, 0, 0.14);
              overflow: hidden;
              border: 1px solid #d4d4d4;
          }
          .header {
              background-color: #0f0f0f;
              color: #fafafa;
              padding: 22px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
              letter-spacing: 0.02em;
          }
          .content {
              padding: 25px;
              color: #171717;
              line-height: 1.7;
          }
          .verification-code {
              display: block;
              margin: 22px 0;
              font-size: 24px;
              color: #0a0a0a;
              background: #ffffff;
              border: 2px solid #0f0f0f;
              padding: 12px;
              text-align: center;
              border-radius: 10px;
              font-weight: bold;
              letter-spacing: 5px;
          }
          .footer {
              background-color: #f5f5f5;
              padding: 15px;
              text-align: center;
              color: #525252;
              font-size: 12px;
              border-top: 1px solid #d4d4d4;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Verify Login</div>
          <div class="content">
              <p>Hello,</p>
              <p>Use this 6-digit OTP to verify your login:</p>
              <span class="verification-code">{verificationCode}</span>
              <p>If this was not you, you can safely ignore this email.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KshitijaMailLogin. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;

export const Welcome_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Community</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #007BFF;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              line-height: 1.8;
          }
          .welcome-message {
              font-size: 18px;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              margin: 20px 0;
              background-color: #007BFF;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              transition: background-color 0.3s;
          }
          .button:hover {
              background-color: #0056b3;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Welcome to Our Community!</div>
          <div class="content">
              <p class="welcome-message">Hello {name},</p>
              <p>We're thrilled to have you join us! Your registration was successful, and we're committed to providing you with the best experience possible.</p>
              <p>Here's how you can get started:</p>
              <ul>
                  <li>Explore our features and customize your experience.</li>
                  <li>Stay informed by checking out our blog for the latest updates and tips.</li>
                  <li>Reach out to our support team if you have any questions or need assistance.</li>
              </ul>
              <a href="#" class="button">Get Started</a>
              <p>If you need any help, don't hesitate to contact us. We're here to support you every step of the way.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;

export const Password_Reset_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
          body {
              font-family: "DM Sans", Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #e5e7eb;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #fafafa;
              border-radius: 14px;
              box-shadow: 0 16px 32px rgba(0, 0, 0, 0.14);
              overflow: hidden;
              border: 1px solid #d4d4d4;
          }
          .header {
              background-color: #0f0f0f;
              color: #fafafa;
              padding: 22px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 0.02em;
          }
          .content {
              padding: 25px;
              color: #171717;
              line-height: 1.7;
          }
          .verification-code {
              display: block;
              margin: 22px 0;
              font-size: 24px;
              color: #0a0a0a;
              background: #ffffff;
              border: 2px solid #0f0f0f;
              padding: 12px;
              text-align: center;
              border-radius: 10px;
              font-weight: bold;
              letter-spacing: 5px;
          }
          .meta {
              font-size: 13px;
              color: #525252;
          }
          .footer {
              background-color: #f5f5f5;
              padding: 15px;
              text-align: center;
              color: #525252;
              font-size: 12px;
              border-top: 1px solid #d4d4d4;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Reset Password</div>
          <div class="content">
              <p>Use this OTP to reset password:</p>
              <span class="verification-code">{verificationCode}</span>
              <p class="meta">This OTP expires in {validForSeconds} seconds.</p>
              <p>If you did not request this, you can ignore this email.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KshitijaMailLogin. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;
