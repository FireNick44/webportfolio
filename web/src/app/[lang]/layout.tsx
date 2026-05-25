import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import AppStateProvider from "@/components/AppStateProvider";
import Header from "@/components/layout/Header";
import OutroSection from "@/components/outro/OutroSection";
import LoadingScreen from "@/components/layout/LoadingScreen";
import ScrollTimeline from "@/components/layout/ScrollTimeline";
import { PageTransitionProvider } from "@/components/layout/PageTransitionProvider";
import { getDictionary } from "@/i18n/dictionary";
import { type Locale, locales } from "@/i18n/config";

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
  const description = dict.hero.tagline;

  return {
    metadataBase: new URL("https://noelstuder.dev"),
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
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
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

  return (
    <AppStateProvider lang={lang}>
      <PageTransitionProvider>
        <ScrollTimeline labels={dict.nav as unknown as Record<string, string>} />
        <LoadingScreen />
        <div className="flex min-h-screen flex-col">
          <Header dict={dict} lang={lang} />
          <main className="grow">{children}</main>
          <OutroSection dict={dict} lang={lang} />
        </div>
      </PageTransitionProvider>
    </AppStateProvider>
  );
}
