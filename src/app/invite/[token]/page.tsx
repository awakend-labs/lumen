import { ThemeToggle } from "@/components/theme-toggle";
import { InviteAccept } from "@/features/invitations/components/invite-accept";
import Link from "next/link";

export const metadata = { title: "Invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-sm font-medium">
          Lumen
        </Link>
        <ThemeToggle />
      </header>
      <InviteAccept token={token} />
    </div>
  );
}
