"use client";

import { LumenMark } from "@/components/lumen-mark";

import { authClient } from "@/lib/auth-client";
import { stashDotClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProject, useProjects } from "@/features/projects/queries";
import {
  ChevronsUpDown,
  FolderOpen,
  LayoutDashboard,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "next-themes";
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
  SidebarMenuBadge,
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
  const projectId = projectIdFromPath(pathname);
  const projects = useProjects();
  const current = useProject(projectId);
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const onDashboard = pathname === "/dashboard";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Lumen">
              <Link href="/dashboard">
                <LumenMark className="group-data-[collapsible=icon]:size-8" />
                <span className="flex flex-col gap-0.5">
                  <span className="truncate text-lg font-semibold tracking-[-0.04em]">Lumen<span className="text-primary">.</span>
                  </span>
                  <span className="text-[10px] font-normal tracking-wide text-muted-foreground">API WORKSPACE</span>
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

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))
                : null}
              {projects.data?.map((project) => {
                const href = `/projects/${project.id}`;
                const onStash = pathname.startsWith(`${href}/stashes/`);
                const active =
                  pathname === href || (pathname.startsWith(`${href}/`) && !onStash);
                const showTree = project.id === projectId && pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild isActive={active} tooltip={project.name}>
                      <Link href={href}>
                        <FolderOpen />
                        <span>{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    {project.stashCount > 0 ? (
                      <SidebarMenuBadge>{project.stashCount}</SidebarMenuBadge>
                    ) : null}
                    {showTree ? (
                      <SidebarMenuSub>
                        {current.isLoading
                          ? Array.from({ length: 2 }).map((_, index) => (
                            <SidebarMenuSubItem key={index}>
                              <SidebarMenuSkeleton />
                            </SidebarMenuSubItem>
                          ))
                          : null}
                        {current.data && current.data.stashes.length === 0 ? (
                          <SidebarMenuSubItem>
                            <p className="px-2 py-1 text-xs text-muted-foreground">No stashes yet</p>
                          </SidebarMenuSubItem>
                        ) : null}
                        {current.data?.stashes.map((stash) => {
                          const stashHref = `${href}/stashes/${stash.id}`;
                          return (
                            <SidebarMenuSubItem key={stash.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  pathname === stashHref || pathname.startsWith(`${stashHref}/`)
                                }
                              >
                                <Link href={stashHref}>
                                  <span
                                    className={cn(
                                      "size-2 shrink-0 rounded-full",
                                      stashDotClass(stash.color),
                                    )}
                                  />
                                  <span>{stash.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
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

      <SidebarFooter className="border-t border-sidebar-border/60">
        <AccountMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data } = authClient.useSession();
  const name = data?.user.name ?? "Account";
  const email = data?.user.email ?? "";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "rounded-xl p-1",

      )}
    >
      <SidebarMenu>
        <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <span className="text-[11px] font-medium tracking-wide text-sidebar-foreground/60 uppercase">
              Account
            </span>
            <ThemeToggle />
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
          <ThemeToggle />
        </SidebarMenuItem>
        <SidebarSeparator className="mx-0 mb-1 group-data-[collapsible=icon]:hidden" />
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="min-w-0 data-[state=open]:bg-sidebar-accent"
                tooltip={name}
              >
                <Avatar className="size-8 ring-2 ring-primary/25 ring-offset-1 ring-offset-sidebar">
                  <AvatarImage src={data?.user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">{email}</span>
                </span>
                <ChevronsUpDown
                  className="ml-auto size-4 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden"
                  aria-hidden
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
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
                <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
                {themeOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
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
                  onClick={() =>
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => router.push("/login"),
                      },
                    })
                  }
                >
                  <LogOutIcon data-icon="inline-start" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
