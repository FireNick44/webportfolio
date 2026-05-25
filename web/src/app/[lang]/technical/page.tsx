import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { type Locale } from "@/i18n/config";
import TechnicalPanel from "@/components/technical/TechnicalPanel";

export const metadata: Metadata = {
  title: "Technical",
  robots: { index: false, follow: false },
};

export default async function TechnicalPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  return <TechnicalPanel lang={lang} dict={dict} />;
}
