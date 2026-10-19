import { requireProjectPageAccess } from "@/server/page-access";

export default async function NewEndpointLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await requireProjectPageAccess(projectId, `/projects/${projectId}/endpoints/new`, true);
  return children;
}
