import { requireProjectPageAccess } from "@/server/page-access";

export default async function EditEndpointLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = await params;
  await requireProjectPageAccess(projectId, `/projects/${projectId}/endpoints/${endpointId}/edit`, true);
  return children;
}
