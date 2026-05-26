import { getDictionary } from "@/i18n/dictionary";
import { type Locale } from "@/i18n/config";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Skills from "@/components/sections/Skills";
import Projects from "@/components/sections/Projects";
import Contact from "@/components/sections/Contact";

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
      <Contact dict={dict} />
    </>
  );
}
