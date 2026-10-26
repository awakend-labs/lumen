import { PasswordResetForm } from "@/features/auth/components/password-reset-form";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" && !params.error ? params.token : undefined;
  return <PasswordResetForm mode="reset" token={token} />;
}
