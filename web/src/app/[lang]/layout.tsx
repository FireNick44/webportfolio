import { ReactNode } from "react";

import AppStateProvider from "@/components/AppStateProvider";
import Header from "@/components/layout/Header";
import LoadingScreen from "@/components/layout/LoadingScreen";
import { PageTransitionProvider } from "@/components/layout/PageTransitionProvider";
import ScrollTimeline from "@/components/layout/ScrollTimeline";
import OutroSection from "@/components/outro/OutroSection";
import { type Locale, locales, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { fontVariables } from "@/lib/fonts";
import { buildJsonLd } from "@/lib/seo/jsonLd";

import type { Metadata, Viewport } from "next";
import "../globals.css";

// Applies the persisted theme + token overrides before paint (no FOUC). The
// script content is constant, so React never re-injects it when this layout
// re-renders on a locale switch — it only matters pre-hydration anyway.
const ANTIFLASH = `(function(){try{var s=localStorage.getItem('yannic-portfolio-v1');var th='dark';if(s){var t=JSON.parse(s);var st=t&&t.state;if(st){var m=st.themeMode;if(m==='device'){th=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}else if(m==='light'||m==='dark'){th=m;}else if(st.theme==='dark'||st.theme==='light'){th=st.theme;}var ov=st.tokenOverrides;if(ov)for(var k in ov)document.documentElement.style.setProperty(k,ov[k]);}}document.documentElement.setAttribute('data-theme',th);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0c" },
    { media: "(prefers-color-scheme: light)", color: "#efeae0" },
  ],
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const title = "Yannic Studer — Software Developer";
  // Lead with the name so "Yannic Studer" sits at the start of the meta
  // description — branded-query CTR and entity recognition both lean on it.
  const description = `Yannic Studer — ${dict.hero.tagline}`;
  // hreflang map plus an x-default pointing at the site root's default-locale
  // route so non-localised crawlers land on the canonical English version.
  const languageAlternates: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, `/${l}`]),
  );
  languageAlternates["x-default"] = `/${defaultLocale}`;

  return {
    metadataBase: new URL("https://a36.dev"),
    title: { default: title, template: "%s · Yannic Studer" },
    description,
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      url: `/${lang}`,
      siteName: "Yannic Studer",
      locale: lang,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `/${lang}`,
      languages: languageAlternates,
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  // Schema.org graph: Person (Yannic Studer) + WebSite + WebPage. Inlining as
  // application/ld+json is the canonical way for Google to pick up structured
  // data; sameAs across the user's other profiles strengthens the entity link.
  const jsonLd = buildJsonLd({
    lang,
    title: "Yannic Studer — Software Developer",
    description: `Yannic Studer — ${dict.hero.tagline}`,
  });

  // This IS the root layout (there is no src/app/layout.tsx): the <html> shell
  // lives here so the server renders the correct lang attribute per locale —
  // patching it client-side after hydration left crawlers and screen readers
  // seeing lang="en" on German pages.
  return (
    <html
      lang={lang}
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: ANTIFLASH }} />
        <AppStateProvider lang={lang}>
          <PageTransitionProvider>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ScrollTimeline
              labels={dict.nav as unknown as Record<string, string>}
            />
            <LoadingScreen label={dict.loader.calibrating} />
            <div className="flex min-h-screen flex-col">
              <Header dict={dict} lang={lang} />
              <main className="grow">{children}</main>
              <OutroSection dict={dict} lang={lang} />
            </div>
          </PageTransitionProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
