// Structured data for Google. One `@graph` per page with stable `@id`s so
// Google can reconcile the Person + the WebSite + the current WebPage as one
// entity across crawls. The bigger `sameAs` is, the easier Google connects
// "Yannic" search results to this site as the canonical home for the entity.

const SITE = "https://a36.dev";

// Profiles to link the entity to — add new lines as the user shares more.
// Order doesn't matter; quantity + authority of these does.
const SAME_AS: string[] = [
  "https://github.com/FireNick44",
  // TODO: add LinkedIn, X/Twitter, Mastodon, dev.to, Instagram, etc. as the
  // user provides them — each one strengthens the entity-recognition signal.
];

const PERSON_ID = `${SITE}/#person`;
const WEBSITE_ID = `${SITE}/#website`;

const JOB_TITLE: Record<string, string> = {
  en: "Software Developer",
  de: "Softwareentwickler",
};

export interface JsonLdInput {
  /** Locale code, e.g. "en" or "de". */
  lang: string;
  /** Resolved page title (already includes "Yannic Studer" in our case). */
  title: string;
  /** Resolved description used in <meta name="description">. */
  description: string;
}

/** Returns the `@graph` Schema.org object to inline as application/ld+json. */
export function buildJsonLd({ lang, title, description }: JsonLdInput) {
  const pageUrl = `${SITE}/${lang}`;
  const webpageId = `${pageUrl}#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: "Yannic Studer",
        alternateName: "Yannic",
        url: `${SITE}/`,
        image: `${SITE}/opengraph-image`,
        jobTitle: JOB_TITLE[lang] ?? JOB_TITLE.en,
        description: `Yannic Studer — ${description}`,
        sameAs: SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: `${SITE}/`,
        name: "Yannic Studer",
        alternateName: "a36.dev",
        description,
        inLanguage: lang,
        publisher: { "@id": PERSON_ID },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: pageUrl,
        name: title,
        description,
        inLanguage: lang,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": PERSON_ID },
        primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}/opengraph-image` },
      },
    ],
  };
}
