import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testEmail() {
  try {
    console.log("Using EMAIL_USER:", process.env.EMAIL_USER);
    console.log("Sending to: par2001@gmail.com");
    
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"HackHub" <${process.env.EMAIL_USER || "noreply@hackhub.com"}>`,
      to: process.env.EMAIL_USER,
      subject: "HackHub Direct Test Email to Self",
      text: "This is a direct test email from the server script to itself.",
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

testEmail();
