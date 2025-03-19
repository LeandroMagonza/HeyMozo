const nodemailer = require('nodemailer');

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

// Configuration for email service
let transporter;

// For production, use actual email service
if (!isDevelopment) {
  // Using a service through Render.com
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  // For development, use nodemailer's test account or log to console
  transporter = {
    sendMail: (mailOptions) => {
      console.log('==== DEVELOPMENT MODE: Email Not Sent ====');
      console.log('To: ', mailOptions.to);
      console.log('Subject: ', mailOptions.subject);
      console.log('Text: ', mailOptions.text);
      console.log('HTML: ', mailOptions.html);
      
      // Return a promise that resolves immediately
      return Promise.resolve({
        messageId: 'test-message-id',
        response: 'Logged to console'
      });
    }
  };
}

/**
 * Sends a login link to the specified email
 * @param {string} email - The recipient's email
 * @param {string} token - The authentication token
 * @param {string} loginUrl - The base URL for login
 * @returns {Promise} - A promise resolving to the mail send info
 */
const sendLoginLink = async (email, token, loginUrl) => {
  const fullLoginUrl = `${loginUrl}?token=${token}`;
  
  // Email content
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@heymozo.com',
    to: email,
    subject: 'Your Login Link for HeyMozo',
    text: `
      Hello!
      
      Here is your login link for HeyMozo. This link is valid for 15 minutes:
      
      ${fullLoginUrl}
      
      If you didn't request this link, please ignore this email.
      
      Best regards,
      The HeyMozo Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Login Link for HeyMozo</h2>
        <p>Hello!</p>
        <p>Here is your login link for HeyMozo. This link is valid for 15 minutes:</p>
        <p style="margin: 20px 0;">
          <a href="${fullLoginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Login to HeyMozo
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${fullLoginUrl}</p>
        <p>If you didn't request this link, please ignore this email.</p>
        <p>Best regards,<br>The HeyMozo Team</p>
      </div>
    `
  };

  // In development, log to console instead of sending
  if (isDevelopment) {
    console.log('==== LOGIN LINK ====');
    console.log(fullLoginUrl);
    return transporter.sendMail(mailOptions);
  }

  // Send email
  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendLoginLink
}; 