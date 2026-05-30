import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getDictionary, type Locale } from "@/i18n/dictionary";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  return {
    title: dict.footer.impressum,
    description: dict.footer.impressum,
    robots: { index: false, follow: false },
  };
}

// Bare-bones imprint. In Switzerland the federal e-commerce rule (UWG Art. 3)
// requires an imprint for commercial sites; this is a non-commercial portfolio,
// but having an imprint covers EU visitors (DE TMG / Telemediengesetz § 5)
// and avoids any "missing imprint" grey area. Fill physical-address fields
// before treating this as legally complete.
export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const isEn = lang === "en";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-16">
        {/* Bigger, framed back-link so it reads as a clear "you are on a
            subpage" breadcrumb instead of a tiny ghost arrow. */}
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

        <h1 className="mb-10 font-display text-4xl font-bold tracking-tight">
          {isEn ? "Legal Notice" : "Impressum"}
        </h1>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Operator" : "Betreiber"}
            </h2>
            <p>Yannic Studer</p>
            <p className="text-foreground/60">
              {isEn ? "Switzerland" : "Schweiz"}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Contact" : "Kontakt"}
            </h2>
            <p>
              <a
                href="mailto:support@sleepingdeveloper.com"
                className="border-b border-transparent transition-colors hover:border-foreground/60"
              >
                support@sleepingdeveloper.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Disclaimer" : "Haftungsausschluss"}
            </h2>
            <p>
              {isEn
                ? "This site is a personal portfolio, not a commercial offering. All content is provided as-is without warranty of any kind, express or implied. External links open in a new tab; the operator is not responsible for content on linked third-party sites."
                : "Diese Seite ist ein persönliches Portfolio und kein kommerzielles Angebot. Alle Inhalte werden ohne Gewähr bereitgestellt, weder ausdrücklich noch stillschweigend. Externe Links öffnen in einem neuen Tab; für Inhalte verlinkter Drittseiten übernimmt der Betreiber keine Verantwortung."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-foreground/60">
              {isEn ? "Source" : "Quellcode"}
            </h2>
            <p>
              {isEn ? (
                <>
                  The site&apos;s source is open and{" "}
                  <a
                    href="https://github.com/FireNick44/webportfolio/blob/main/LICENSE"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border-b border-transparent transition-colors hover:border-foreground/60"
                  >
                    MIT-licensed on GitHub
                  </a>
                  . Third-party assets (logos, icons, fonts) belong to their
                  respective owners and are used under their own licenses.
                </>
              ) : (
                <>
                  Der Quellcode der Seite ist offen und{" "}
                  <a
                    href="https://github.com/FireNick44/webportfolio/blob/main/LICENSE"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border-b border-transparent transition-colors hover:border-foreground/60"
                  >
                    auf GitHub unter MIT-Lizenz
                  </a>{" "}
                  veröffentlicht. Drittanbieter-Inhalte (Logos, Icons,
                  Schriften) gehören den jeweiligen Inhabern und werden unter
                  deren Lizenzen verwendet.
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
