"use client";

import { GlobalSearch } from "@/features/search/components/global-search";
import { AppSidebar } from "@/components/app-sidebar";
import { useProject } from "@/features/projects/queries";
import { usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({
  children,
  defaultOpen,
}: {
  children: React.ReactNode;
  defaultOpen: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md">
          <SidebarTrigger />
          <ShellTitle />
          <GlobalSearch />
        </header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellTitle() {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? "";
  const project = useProject(projectId);
  const name = project.data?.name;
  const stashId = pathname.match(/\/stashes\/([^/]+)/)?.[1];
  const stashName = stashId
    ? project.data?.stashes.find((stash) => stash.id === stashId)?.name
    : undefined;

  let title = "Projects";
  if (projectId && pathname.includes("/settings")) {
    title = name ? `${name} · Settings` : "Settings";
  } else if (projectId && pathname.includes("/endpoints/")) {
    title = name ? `${name} · Endpoint` : "Endpoint";
  } else if (stashId) {
    title = name && stashName ? `${name} · ${stashName}` : (stashName ?? name ?? "Stash");
  } else if (projectId) {
    title = name ?? "Project";
  }

  return <p className="truncate text-sm font-medium">{title}</p>;
}
