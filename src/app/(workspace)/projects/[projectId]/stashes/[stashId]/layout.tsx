import { loadStashPage } from "@/server/page-access";

export default async function StashLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ projectId: string; stashId: string }>;
}) {
  const { projectId, stashId } = await params;
  await loadStashPage(projectId, stashId);
  return children;
}
