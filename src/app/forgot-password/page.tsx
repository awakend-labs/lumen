import { PasswordResetForm } from "@/features/auth/components/password-reset-form";

export const metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <PasswordResetForm mode="request" />;
}
