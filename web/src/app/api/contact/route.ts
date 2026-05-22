import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { ContactEmail } from "@/lib/email/ContactEmail";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  let payload: {
    name?: string;
    email?: string;
    message?: string;
    company?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const message = payload.message?.trim();

  // Honeypot — bots fill hidden fields. Pretend success, send nothing.
  if (payload.company) return NextResponse.json({ ok: true });

  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESEND_TO;
  if (!apiKey || !to) {
    console.error("Contact form: RESEND_API_KEY / RESEND_TO not configured.");
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Portfolio <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: `New message from ${name}`,
      react: ContactEmail({ name, email, message }),
    });
    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Contact form send failed:", e);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
}
