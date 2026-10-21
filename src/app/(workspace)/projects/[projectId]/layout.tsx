import { loadProjectPage } from "@/server/page-access";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function ProjectLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await loadProjectPage(projectId);
  const client = new QueryClient();
  client.setQueryData(["project-summary", projectId], project);
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
