import { loadEndpointPage } from "@/server/page-access";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function EndpointLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = await params;
  const data = await loadEndpointPage(projectId, endpointId);
  const client = new QueryClient();
  client.setQueryData(["endpoints", projectId, endpointId], data);
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
