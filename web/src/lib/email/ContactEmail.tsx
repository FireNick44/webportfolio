import {
  Body,
  Container,
  Heading,
  Hr,
  Html,
  Section,
  Text,
} from "@react-email/components";

export function ContactEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
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
            New transmission
          </Text>
          <Heading style={{ color: "#ece6da", fontSize: "24px", margin: "8px 0 16px" }}>
            {name}
          </Heading>
          <Text style={{ margin: "0 0 4px", color: "rgba(236,230,218,0.8)" }}>
            {email}
          </Text>
          <Hr style={{ borderColor: "rgba(236,230,218,0.14)", margin: "20px 0" }} />
          <Section>
            <Text
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                color: "#ece6da",
                margin: 0,
              }}
            >
              {message}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactEmail;
