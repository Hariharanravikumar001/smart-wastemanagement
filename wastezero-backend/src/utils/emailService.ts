import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const emailUser = (process.env['EMAIL_USER'] || '').trim();
const emailPass = (process.env['EMAIL_PASS'] || '').trim();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export const sendEmail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  try {
    if (!emailUser || !emailPass) {
      console.error('❌ Email credentials are not fully configured in .env');
      return false;
    }

    const info = await transporter.sendMail({
      from: `"WasteZero Support" <${emailUser}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
};
