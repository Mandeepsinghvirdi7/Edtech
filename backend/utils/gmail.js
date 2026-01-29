const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

/**
 * Create Gmail transporter with OAuth2
 */
async function createGmailTransporter() {
  try {
    // Get access token
    const accessToken = await oauth2Client.getAccessToken();

    if (!accessToken.token) {
      throw new Error('Failed to get Gmail access token');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    return transporter;
  } catch (error) {
    console.error('Failed to create Gmail transporter:', error);
    throw error;
  }
}

/**
 * Send password setup email to a new user
 * @param {string} userEmail - Recipient email
 * @param {string} userName - User's name
 * @param {string} userRole - User's role
 * @param {string} resetLink - Password reset link
 */
async function sendPasswordSetupEmail(userEmail, userName, userRole, resetLink) {
  try {
    const transporter = await createGmailTransporter();

    const mailOptions = {
      from: `HikePAD Dashboard <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: 'Set Your Password - HikePAD Dashboard Access',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to HikePAD Dashboard</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your account has been created with the role: <strong>${userRole}</strong></p>
              <p>To access the HikePAD Dashboard, you need to set up your password first.</p>
              <p>Click the button below to set your password:</p>
              <a href="${resetLink}" class="button">Set My Password</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p><strong>Important:</strong> This link will expire in 60 minutes for security reasons.</p>
              <p>If you didn't request this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from HikePAD Dashboard. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${userName},

Your account has been created with the role: ${userRole}

To access the HikePAD Dashboard, you need to set up your password first.

Click this link to set your password: ${resetLink}

This link will expire in 60 minutes for security reasons.

If you didn't request this account, please ignore this email.

This is an automated message from HikePAD Dashboard.
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Password setup email sent to ${userEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

module.exports = {
  sendPasswordSetupEmail,
};