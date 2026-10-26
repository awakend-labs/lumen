// Server-only: credentials are read when sending, after Worker bindings are available.
export async function sendPasswordResetEmail({ email, url }: { email: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const templateId = process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID?.trim() || "password-reset";
  if (!apiKey) throw new Error("Password reset email is not configured.");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [email],
        // Sender, subject and reply-to come from the published Resend template.
        template: { id: templateId, variables: { RESET_URL: url } },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Do not include provider responses, addresses or reset links in errors/logs.
    throw new Error("Password reset email could not be sent. Please try again.");
  }
  if (!response.ok) throw new Error(`Password reset email failed (status ${response.status}).`);
  const result = await response.json().catch(() => null) as { id?: unknown } | null;
  if (typeof result?.id !== "string" || !result.id) {
    throw new Error("Password reset email was not accepted. Please try again.");
  }
}
