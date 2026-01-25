import { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { getUser } from "../../../utils/serverSide/usersStore";
import { signJWT } from "../../../utils/serverSide/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = getUser(email);
    if (!user) {
      // Return success even if user not found to prevent enumeration
      return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const token = signJWT({ email, purpose: "reset-password" }, secret, 3600); // 1 hour expiration

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Configure Nodemailer
    // If you don't have these env vars, we'll log the link to console for dev testing
    if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
      console.log("---------------------------------------------------");
      console.log("No SMTP configuration found. Simulating email send.");
      console.log(`To: ${email}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log("---------------------------------------------------");
      return res.status(200).json({ message: "Email sent (simulated)" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Pomodoro App" <noreply@example.com>',
      to: email,
      subject: "Reset your password",
      html: `
        <p>Hello,</p>
        <p>You requested a password reset for your Pomodoro for Notion account.</p>
        <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return res.status(200).json({ message: "Email sent" });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
