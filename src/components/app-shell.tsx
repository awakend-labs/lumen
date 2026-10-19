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
      <a href="#workspace-content" className="sr-only fixed top-3 left-3 z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only">Skip to content</a>
      <AppSidebar />
      <SidebarInset className="workspace min-w-0">
        <header
          className="workspace-toolbar sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-10"
        >
          <SidebarTrigger className="-ml-1 shrink-0" />
          <ShellTitle />
          <div className="ml-auto flex min-w-0 flex-1 justify-end sm:max-w-80">
            <GlobalSearch />
          </div>
        </header>
        <div id="workspace-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">{children}</div>
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

  return (
    <p className="min-w-0 max-w-[45%] truncate text-sm font-medium tracking-tight sm:max-w-none sm:flex-1">
      {title}
    </p>
  );
}
