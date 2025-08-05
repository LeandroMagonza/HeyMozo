const { Resend } = require('resend');

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends a login link to the specified email
 * @param {string} email - The recipient's email
 * @param {string} token - The authentication token
 * @param {string} loginUrl - The base URL for login
 * @returns {Promise} - A promise resolving to the mail send info
 */
const sendLoginLink = async (email, token, loginUrl) => {
  const fullLoginUrl = `${loginUrl}?token=${token}`;
  
  // ALWAYS show the token in console for testing
  console.log('='.repeat(60));
  console.log('🔐 AUTH TOKEN GENERATED');
  console.log('='.repeat(60));
  console.log('📧 Email:', email);
  console.log('🔑 Token:', token);
  console.log('🔗 Full URL (Frontend):', fullLoginUrl);
  console.log('⏰ Valid for: 15 minutes');
  console.log('💡 Note: Make sure to use the frontend URL (port 3000) not backend (port 3001)');
  console.log('='.repeat(60));
  
  // Email content
  const emailData = {
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: email,
    subject: 'Tu Enlace de Acceso para HeyMozo',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Tu Enlace de Acceso para HeyMozo</h2>
        <p>¡Hola!</p>
        <p>Aquí tienes tu enlace de acceso para HeyMozo. Este enlace es válido por 15 minutos:</p>
        <p style="margin: 20px 0;">
          <a href="${fullLoginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Acceder a HeyMozo
          </a>
        </p>
        <p>O copia y pega esta URL en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${fullLoginUrl}</p>
        <p>Si no solicitaste este enlace, puedes ignorar este correo.</p>
        <p>Saludos cordiales,<br>El Equipo de HeyMozo</p>
      </div>
    `
  };

  // If Resend is not configured, just log to console
  if (!resend) {
    console.log('==== RESEND NOT CONFIGURED: Email Not Sent ====');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('HTML:', emailData.html);
    console.log('💡 Set RESEND_API_KEY environment variable to enable email sending');
    
    return Promise.resolve({
      messageId: 'no-resend-key',
      response: 'Logged to console (Resend not configured)'
    });
  }

  // Send actual email via Resend API
  try {
    console.log('📧 Sending email via Resend...');
    console.log('📋 Email data being sent:', JSON.stringify(emailData, null, 2));
    
    const result = await resend.emails.send(emailData);
    
    console.log('📨 Full Resend response:', JSON.stringify(result, null, 2));
    console.log('✅ Email sent successfully. Message ID:', result?.data?.id || result?.id || 'No ID returned');
    
    return result;
  } catch (error) {
    console.error('❌ Failed to send email via Resend:');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    
    // In development, also log to console as fallback
    if (isDevelopment) {
      console.log('==== FALLBACK: Logging email content due to send failure ====');
      console.log('To:', emailData.to);
      console.log('Subject:', emailData.subject);
      console.log('HTML:', emailData.html);
    }
    
    throw error;
  }
};

module.exports = {
  sendLoginLink
};