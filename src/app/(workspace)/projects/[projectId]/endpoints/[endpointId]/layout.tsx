import { loadEndpointPage } from "@/server/page-access";

export default async function EndpointLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = await params;
  await loadEndpointPage(projectId, endpointId);
  return children;
}
