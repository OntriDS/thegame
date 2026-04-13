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

export interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
  expiresAt: string;
}

export default function PasswordResetEmail({
  userName,
  resetLink,
  expiresAt,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={emailMain}>
        <Container style={emailContainer}>
          <Text style={emailHeading}>Password Reset Request</Text>

          <Text style={emailText}>
            Hello {userName ? <strong>{userName}</strong> : ''},
          </Text>

          <Text style={emailText}>
            We received a request to reset your password for your Akiles Digital Universe account.
          </Text>

          <Text style={emailText}>Click the button below to set a new password:</Text>

          <Section style={{ textAlign: 'center' }}>
            <Button href={resetLink} style={emailButton}>
              Reset Password
            </Button>
          </Section>

          <Text style={emailText}>
            If the button does not work, you can copy and paste this link into your browser:
          </Text>
          <Text style={{ ...emailText, wordBreak: 'break-all' }}>{resetLink}</Text>

          <Text style={emailText}>This link expires in 1 hour ({expiresAt}).</Text>

          <Text style={emailText}>
            If you did not request this change, please ignore this email. Your password will remain
            unchanged.
          </Text>

          <Text style={emailFooter}>
            Akiles Digital Universe • Password Reset Service
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
