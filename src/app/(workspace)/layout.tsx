import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getServerSession } from "@/server/session";
import { listProjects } from "@/server/projects";
import { getEndpointView } from "@/server/preferences";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const client = new QueryClient();
  const session = await getServerSession();
  if (session) {
    const [projects, endpointView] = await Promise.all([
      listProjects(session.user.id),
      getEndpointView(session.user.id),
    ]);
    client.setQueryData(["projects"], projects);
    client.setQueryData(["preferences"], { endpointView });
  }
  return <HydrationBoundary state={dehydrate(client)}><AppShell defaultOpen={defaultOpen}>{children}</AppShell></HydrationBoundary>;
}
