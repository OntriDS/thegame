import { Body, Button, Container, Head, Html, Section, Text } from '@react-email/components';
import {
  emailMain,
  emailContainer,
  emailHeading,
  emailText,
  emailButton,
  emailFooter,
  emailLink,
} from './email-styles';

export interface AccountVerificationEmailProps {
  userName: string;
  verificationLink: string;
  expiresAt: string;
}

export default function AccountVerificationEmail({
  userName,
  verificationLink,
  expiresAt,
}: AccountVerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={emailMain}>
        <Container style={emailContainer}>
          <Text style={emailHeading}>Verify Your Email</Text>

          <Text style={emailText}>Hi {userName ? <strong>{userName}</strong> : ''},</Text>

          <Text style={emailText}>
            Thank you for creating an account in Akiles Digital Universe.
          </Text>

          <Text style={emailText}>Please verify your email address to activate your account:</Text>

          <Section style={{ textAlign: 'center' }}>
            <Button href={verificationLink} style={emailButton}>
              Verify Email
            </Button>
          </Section>

          <Text style={emailText}>
            If the button does not work, you can copy and paste this link into your browser:
          </Text>
          <Text style={{ ...emailText, wordBreak: 'break-all' }}>{verificationLink}</Text>

          <Text style={emailText}>This link expires in 60 minutes (at {expiresAt}).</Text>

          <Text style={emailText}>
            If you did not create this account, please ignore this message. Your email address will not
            be used.
          </Text>

          <Text style={emailFooter}>
            Akiles Digital Universe • Account Verification
            <br />
            Questions? Contact{' '}
            <a href="mailto:help@akiles-ecosystem.com" style={emailLink}>
              help@akiles-ecosystem.com
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
