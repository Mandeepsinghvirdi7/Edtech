const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

/**
 * Send password setup email to a new user
 * @param {string} userEmail - Recipient email
 * @param {string} userName - User's name
 * @param {string} userRole - User's role
 * @param {string} resetLink - Password reset link
 */
async function sendPasswordSetupEmail(userEmail, userName, userRole, resetLink) {
  try {
    const data = {
      from: `HikePAD Dashboard <${process.env.MAILGUN_FROM_EMAIL}>`,
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

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, data);
    console.log(`Password setup email sent to ${userEmail}:`, result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Failed to send password setup email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

module.exports = {
  sendPasswordSetupEmail,
};