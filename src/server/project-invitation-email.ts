import { HttpError } from "./http";

// Read credentials at send time, after Cloudflare Worker bindings are available.
export async function sendProjectInvitationEmail(input: {
  email: string;
  url: string;
  inviterName: string;
  projectName: string;
  role: "editor" | "viewer";
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(503, "Invitation email is not configured. Ask the administrator to configure Resend.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [input.email],
        // Sender, subject and reply-to come from the published Resend template.
        template: {
          id: "lumen-project-invitation-template",
          variables: {
            INVITER_NAME: input.inviterName,
            PROJECT_NAME: input.projectName,
            ROLE: input.role === "editor" ? "Editor" : "Viewer",
            INVITE_URL: input.url,
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Never expose provider errors, recipient addresses or invitation tokens.
    throw new HttpError(502, "The invitation was saved, but sending could not be confirmed. Try sending again or copy the pending invitation link.");
  }
  if (!response.ok) {
    throw new HttpError(502, "The invitation was saved, but the email could not be sent. Try sending again or copy the pending invitation link.");
  }
  const result = await response.json().catch(() => null) as { id?: unknown } | null;
  if (typeof result?.id !== "string" || !result.id) {
    throw new HttpError(502, "The invitation was saved, but sending could not be confirmed. Try sending again or copy the pending invitation link.");
  }
}
