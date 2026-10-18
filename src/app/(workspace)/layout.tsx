import { AppHeader } from "@/components/app-header";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
