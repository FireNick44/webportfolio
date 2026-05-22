import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { type Locale } from "@/i18n/config";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  return <SettingsPanel lang={lang} dict={dict} />;
}
