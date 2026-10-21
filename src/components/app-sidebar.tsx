"use client";

import { LumenMark } from "@/components/lumen-mark";

import { authClient } from "@/lib/auth-client";
import { confirmSignOut } from "@/lib/unsaved-changes";
import { stashDotClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProject, useProjects } from "@/features/projects/queries";
import {
  ChevronRight,
  ChevronsUpDown,
  FolderClosed,
  FolderOpen,
  Layers2,
  LayoutDashboard,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProjectListItem, StashSummary } from "@/lib/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useThemePreference } from "@/components/theme-preference-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "System", icon: MonitorIcon },
];

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? "";
}

export function AppSidebar() {
  const pathname = usePathname();
  const projects = useProjects();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const iconCollapsed = state === "collapsed";
  const activeProjectId = projectIdFromPath(pathname);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const onDashboard = pathname === "/dashboard";

  const visibleProjects =
    iconCollapsed && activeProjectId
      ? projects.data?.filter((project) => project.id === activeProjectId)
      : projects.data;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Lumen"
              className="hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground data-[state=open]:hover:bg-transparent data-open:hover:bg-transparent data-open:hover:text-sidebar-foreground group-data-[collapsible=icon]:size-8!"
            >
              <Link href="/dashboard" aria-label="Lumen dashboard">
                <LumenMark iconClassName="!size-6 group-data-[collapsible=icon]:!size-4" />
                <span className="truncate text-lg font-semibold tracking-[-0.04em] group-data-[collapsible=icon]:hidden">
                  Lumen<span className="text-primary">.</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onDashboard} tooltip="Overview">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className={cn(iconCollapsed && !activeProjectId && "hidden")}>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.isLoading
                ? Array.from({ length: iconCollapsed ? 1 : 3 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))
                : null}
              {visibleProjects?.map((project) => (
                <ProjectTree key={project.id} project={project} pathname={pathname} iconCollapsed={iconCollapsed} />
              ))}
              {projects.data && projects.data.length === 0 ? (
                <SidebarMenuItem>
                  <p className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    No projects yet
                  </p>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="overflow-visible border-t border-sidebar-border/60 group-data-[collapsible=icon]:overflow-x-clip">
        <AccountMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

const treeToggleClass =
  "absolute top-0 left-0 z-10 flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring group-data-[collapsible=icon]:hidden";

function useTreeOpen(pathname: string, defaultOpen: boolean) {
  const [choice, setChoice] = useState<{ path: string; open: boolean } | null>(null);
  return [choice?.path === pathname ? choice.open : defaultOpen,
    (open: boolean) => setChoice({ path: pathname, open })] as const;
}

function ProjectTree({
  project,
  pathname,
  iconCollapsed,
}: {
  project: ProjectListItem;
  pathname: string;
  iconCollapsed: boolean;
}) {
  const current = projectIdFromPath(pathname) === project.id;
  const [open, setOpen] = useTreeOpen(pathname, current);
  const href = `/projects/${project.id}`;
  return (
    <Collapsible asChild open={open && !iconCollapsed} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <div className="relative group-data-[collapsible=icon]:contents">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={treeToggleClass}
              aria-label={`${open ? "Collapse" : "Expand"} project ${project.name}`}
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <SidebarMenuButton
            asChild
            isActive={current}
            tooltip={project.name}
            className="pl-8 font-medium data-active:bg-transparent data-active:shadow-none group-data-[collapsible=icon]:pl-0! group-data-[collapsible=icon]:font-normal group-data-[collapsible=icon]:data-active:bg-sidebar-accent group-data-[collapsible=icon]:data-active:shadow-none"
          >
            <Link href={href} prefetch={false} aria-current={pathname === href ? "page" : undefined}>
              {open && !iconCollapsed ? (
                <FolderOpen className="text-primary" />
              ) : (
                <FolderClosed className={cn(current && iconCollapsed && "text-primary")} />
              )}
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              <span
                className="ml-1 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border border-sidebar-border/70 bg-sidebar-accent/40 px-1.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden"
                title={`${project.stashCount} ${project.stashCount === 1 ? "stash" : "stashes"}`}
                aria-label={`${project.stashCount} ${project.stashCount === 1 ? "stash" : "stashes"}`}
              >
                {project.stashCount}
              </span>
            </Link>
          </SidebarMenuButton>
        </div>
        <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
          {open && <ProjectStashes projectId={project.id} pathname={pathname} />}
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function ProjectStashes({ projectId, pathname }: { projectId: string; pathname: string }) {
  const project = useProject(projectId);
  return (
    <SidebarMenuSub className="mx-0 translate-x-0 gap-0.5 border-sidebar-border/70 py-0.5 pl-3 ml-3">
      {project.isLoading && <SidebarMenuSubItem><SidebarMenuSkeleton /></SidebarMenuSubItem>}
      {project.isError && (
        <SidebarMenuSubItem>
          <p role="status" className="px-2 py-1 text-xs text-muted-foreground">Could not load stashes.</p>
        </SidebarMenuSubItem>
      )}
      {project.data?.stashes.length === 0 && (
        <SidebarMenuSubItem>
          <p className="px-2 py-1 text-xs text-muted-foreground">No stashes yet</p>
        </SidebarMenuSubItem>
      )}
      {project.data?.stashes.map((stash) => (
        <StashTree key={stash.id} stash={stash} projectId={projectId} pathname={pathname} />
      ))}
    </SidebarMenuSub>
  );
}

function StashTree({ stash, projectId, pathname }: { stash: StashSummary; projectId: string; pathname: string }) {
  const href = `/projects/${projectId}/stashes/${stash.id}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const [open, setOpen] = useTreeOpen(pathname, active);
  const groups = stash.groups;
  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <SidebarMenuSubItem>
        <div className="relative flex min-w-0 items-stretch">
          {groups.length > 0 ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={treeToggleClass}
                aria-label={`${open ? "Collapse" : "Expand"} stash ${stash.name}`}
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform motion-reduce:transition-none",
                    open && "rotate-90",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          ) : null}
          <SidebarMenuSubButton
            asChild
            isActive={active}
            className="h-8 min-w-0 flex-1 translate-x-0 gap-2 pr-2 pl-8 text-[13px] data-active:bg-transparent data-active:font-medium"
            aria-current={active ? "page" : undefined}
          >
            <Link href={href} prefetch={false} title={stash.name} className="flex min-w-0 items-center gap-2">
              <span className="flex w-4 shrink-0 items-center justify-center">
                <span className={cn("size-1.5 rounded-sm", stashDotClass(stash.color))} />
              </span>
              <span className="truncate">{stash.name}</span>
            </Link>
          </SidebarMenuSubButton>
        </div>
        {groups.length > 0 && (
          <CollapsibleContent>
            <SidebarMenuSub className="mx-0 translate-x-0 gap-0.5 border-sidebar-border/60 py-0.5 pl-3 ml-3">
              {groups.map((group) => (
                <SidebarMenuSubItem key={group.id}>
                  <SidebarMenuSubButton
                    asChild
                    size="sm"
                    className="h-8 translate-x-0 gap-2 pl-2 text-sidebar-foreground/75 hover:text-sidebar-foreground"
                  >
                    <Link
                      href={`${href}#api-group-${group.id}`}
                      prefetch={false}
                      title={group.name}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <Layers2 className="size-3.5 shrink-0 text-sidebar-foreground/50" />
                      <span className="truncate">{group.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { theme, setTheme, isSaving } = useThemePreference();
  const { data } = authClient.useSession();
  const name = data?.user.name ?? "Account";
  const email = data?.user.email ?? "";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:gap-4">
      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <div className="mb-2 flex h-8 items-center gap-2 px-2 pb-1 pt-0.5">
          <span className="text-[11px] font-medium tracking-wide text-sidebar-foreground/60 uppercase">
            Account
          </span>
          <div className="ml-auto flex w-8 shrink-0 items-center justify-center">
            <ThemeToggle
              className="size-8 shrink-0 border-0 bg-transparent shadow-none hover:bg-sidebar-accent"
            />
          </div>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <ThemeToggle
          className="size-8 shrink-0 border-0 bg-transparent shadow-none hover:bg-sidebar-accent"
          aria-label="Change theme"
        />
      </SidebarMenuItem>
      <SidebarSeparator className="mx-0 mb-1 group-data-[collapsible=icon]:hidden" />
      <SidebarMenuItem className="min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="max-w-full min-w-0 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground data-[state=open]:hover:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:overflow-hidden"
              tooltip={name}
            >
              <Avatar
                className="size-8 shrink-0 ring-2 ring-primary/25 ring-offset-0 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:ring-0! group-data-[collapsible=icon]:after:border-primary/25"
              >
                <AvatarImage src={data?.user.image ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{email}</span>
              </span>
              <span
                className="ml-auto flex w-8 shrink-0 items-center justify-center group-data-[collapsible=icon]:hidden"
                aria-hidden
              >
                <ChevronsUpDown className="size-4 text-sidebar-foreground/50" />
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className="w-56 min-w-0 max-w-[min(15rem,calc(100vw-1.5rem))]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-2">
                  <Avatar className="size-10 ring-2 ring-primary/20">
                    <AvatarImage src={data?.user.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-sm font-semibold">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile"><UserRoundIcon data-icon="inline-start" />Profile</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
              {themeOptions.map((option) => (
                <DropdownMenuItem key={option.value} disabled={isSaving} onClick={() => setTheme(option.value)}>
                  <option.icon data-icon="inline-start" />
                  {option.label}
                  {theme === option.value ? (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (!confirmSignOut()) return;
                  return authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => { router.push("/login"); router.refresh(); },
                    },
                  });
                }}
              >
                <LogOutIcon data-icon="inline-start" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
