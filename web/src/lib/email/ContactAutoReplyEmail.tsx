import {
  Body,
  Container,
  Heading,
  Hr,
  Html,
  Section,
  Text,
} from "@react-email/components";

type Lang = "en" | "de";

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    heading: (name: string) => string;
    intro: string;
    body: string;
    footnote: string;
    signoff: string;
  }
> = {
  en: {
    eyebrow: "Auto-reply",
    heading: (name) => `Hey ${name},`,
    intro: "Thanks for writing. Your message landed safely.",
    body: "I'll read it properly and get back to you within a couple of days. If it's urgent, just reply to this email.",
    footnote: "Automated confirmation. No action needed.",
    signoff: "Cheers, Yannic",
  },
  de: {
    eyebrow: "Auto-Antwort",
    heading: (name) => `Hey ${name},`,
    intro: "Danke für deine Nachricht. Sie ist angekommen.",
    body: "Ich schaue sie mir in Ruhe an und melde mich in den nächsten Tagen. Falls es dringend ist, antworte einfach auf diese E-Mail.",
    footnote: "Automatische Bestätigung. Keine Aktion nötig.",
    signoff: "Gruss, Yannic",
  },
};

export function ContactAutoReplyEmail({
  name,
  lang = "en",
}: {
  name: string;
  lang?: Lang;
}) {
  const t = COPY[lang] ?? COPY.en;
  return (
    <Html>
      <Body
        style={{
          backgroundColor: "#0a0b0c",
          color: "#ece6da",
          fontFamily: "Helvetica, Arial, sans-serif",
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#121316",
            border: "1px solid rgba(236,230,218,0.14)",
            maxWidth: "560px",
            margin: "0 auto",
            padding: "32px",
          }}
        >
          <Text
            style={{
              fontFamily: "monospace",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontSize: "11px",
              color: "rgba(236,230,218,0.55)",
              margin: 0,
            }}
          >
            {t.eyebrow}
          </Text>
          <Heading
            style={{
              color: "#ece6da",
              fontSize: "24px",
              margin: "8px 0 16px",
            }}
          >
            {t.heading(name)}
          </Heading>
          <Section>
            <Text
              style={{
                lineHeight: 1.6,
                color: "#ece6da",
                margin: "0 0 12px",
              }}
            >
              {t.intro}
            </Text>
            <Text
              style={{
                lineHeight: 1.6,
                color: "rgba(236,230,218,0.85)",
                margin: 0,
              }}
            >
              {t.body}
            </Text>
          </Section>
          <Hr style={{ borderColor: "rgba(236,230,218,0.14)", margin: "20px 0" }} />
          <Text
            style={{
              fontFamily: "monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontSize: "10px",
              color: "rgba(236,230,218,0.5)",
              margin: 0,
            }}
          >
            {t.footnote}
          </Text>
          <Text style={{ color: "#ece6da", margin: "16px 0 0" }}>
            {t.signoff}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactAutoReplyEmail;
