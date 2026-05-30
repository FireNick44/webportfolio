import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDictionary, type Locale } from "@/i18n/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  return {
    title: dict.footer.privacy,
    description: dict.footer.privacy,
    robots: { index: false, follow: false },
  };
}

// Bare-bones privacy policy adapted from the 2025 beatloops repo, trimmed to
// what this portfolio actually does (no maps, no shop, no analytics). Netlify
// hosts the site; data flows we describe: the contact form (POSTs to
// /api/contact → Resend transactional email), localStorage for theme/lang/
// settings, server logs Netlify keeps for security. Refine wording with a
// lawyer before treating it as legally binding.
export default async function DatenschutzPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const isEn = lang === "en";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-16">
        {/* Framed back-link so it reads as a clear "you are on a subpage"
            breadcrumb instead of a tiny ghost arrow. */}
        <Link
          href={`/${lang}`}
          className="group mb-10 inline-flex h-9 items-center gap-2 border border-border px-3 font-mono text-xs uppercase tracking-[0.22em] text-foreground/75 transition-colors hover:border-foreground/70 hover:text-foreground"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:-translate-x-0.5"
          />
          {isEn ? "Home" : "Startseite"}
        </Link>

        <h1 className="mb-4 font-display text-4xl font-bold tracking-tight">
          {isEn ? "Privacy Policy" : "Datenschutzerklärung"}
        </h1>
        <p className="mb-10 text-xs text-foreground/40">
          {isEn ? "Last updated: May 2026" : "Stand: Mai 2026"}
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Scope & legal basis" : "Geltungsbereich & Rechtsgrundlage"}
            </h2>
            <p>
              {isEn
                ? "This site (a36.dev) is a personal portfolio operated by Yannic Studer (Switzerland). Personal data processing is based on Swiss data protection law (FADP / nFADP) and, for visitors from the EU/EEA, on Art. 6(1)(b) and 6(1)(f) GDPR."
                : "Diese Seite (a36.dev) ist ein persönliches Portfolio von Yannic Studer (Schweiz). Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage des Schweizer Datenschutzgesetzes (DSG / revDSG). Für Besucher aus dem EU/EWR-Raum gilt zudem Art. 6 Abs. 1 lit. b und f DSGVO."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Hosting (Netlify)" : "Hosting (Netlify)"}
            </h2>
            <p>
              {isEn
                ? "The site is hosted by Netlify, Inc. (San Francisco, USA). Netlify processes requests at its edge and writes short-lived server logs (IP address, timestamp, requested URL, user-agent, referrer). Netlify is the data processor; their privacy policy is at https://www.netlify.com/privacy/. Data transfer to the US is covered by Netlify's Standard Contractual Clauses."
                : "Die Seite wird von Netlify, Inc. (San Francisco, USA) gehostet. Netlify verarbeitet Anfragen am Edge und schreibt kurzlebige Server-Logs (IP-Adresse, Zeitstempel, abgerufene URL, User-Agent, Referrer). Netlify agiert als Auftragsverarbeiter; deren Datenschutzerklärung findet sich unter https://www.netlify.com/privacy/. Die Datenübermittlung in die USA ist durch Standardvertragsklauseln abgesichert."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Contact form" : "Kontaktformular"}
            </h2>
            <p>
              {isEn
                ? "When you send a message via the contact form, your name, email and message text are submitted to a serverless endpoint (/api/contact) and forwarded by email through Resend (https://resend.com/legal/privacy-policy). The message is stored only as the resulting email. There is no separate database. Legal basis: Art. 6(1)(b) GDPR (pre-contractual / contact)."
                : "Wenn Sie eine Nachricht über das Kontaktformular senden, werden Ihr Name, Ihre E-Mail-Adresse und der Nachrichtentext an einen serverlosen Endpunkt (/api/contact) übermittelt und per E-Mail über Resend (https://resend.com/legal/privacy-policy) weitergeleitet. Es erfolgt keine separate Speicherung in einer Datenbank, die Nachricht existiert nur als E-Mail. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertraglich / Kontakt)."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Local storage" : "Lokaler Speicher"}
            </h2>
            <p>
              {isEn
                ? "The site stores small preferences in your browser's localStorage (theme choice, language, design-token overrides). No cookies, no tracking, no third-party scripts. Local data never leaves your device. Clear it any time via your browser settings."
                : "Im localStorage Ihres Browsers werden kleine Präferenzen gespeichert (Theme, Sprache, Token-Overrides). Keine Cookies, kein Tracking, keine Drittanbieter-Skripte. Lokale Daten verlassen Ihr Gerät nicht. Sie können sie jederzeit über die Browser-Einstellungen löschen."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Your rights" : "Ihre Rechte"}
            </h2>
            <p>
              {isEn
                ? "Under FADP and GDPR you have the right to information, correction, deletion, restriction, data portability and to object to processing. Send any request to support@sleepingdeveloper.com. Replies usually arrive within a few working days."
                : "Nach DSG und DSGVO haben Sie das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Anfragen bitte an support@sleepingdeveloper.com. Antworten erfolgen in der Regel innerhalb weniger Werktage."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Contact" : "Kontakt"}
            </h2>
            <p>
              {isEn
                ? "Yannic Studer · support@sleepingdeveloper.com"
                : "Yannic Studer · support@sleepingdeveloper.com"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
