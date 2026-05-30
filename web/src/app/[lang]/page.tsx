import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import Projects from "@/components/sections/Projects";
import Skills from "@/components/sections/Skills";
import { type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <>
      <Hero dict={dict} />
      <About dict={dict} lang={lang} />
      <Skills dict={dict} />
      <Projects dict={dict} />
      <Contact dict={dict} lang={lang} />
    </>
  );
}
