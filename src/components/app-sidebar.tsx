"use client";

import { authClient } from "@/lib/auth-client";
import { stashDotClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProject, useProjects } from "@/features/projects/queries";
import { FolderOpen, LayoutDashboard, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";

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
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  L
                </span>
                <span className="truncate font-semibold tracking-tight">Lumen</span>
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
                <SidebarMenuButton asChild isActive={onDashboard} tooltip="All projects">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>All projects</span>
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

      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { data } = authClient.useSession();
  const name = data?.user.name ?? "Account";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="min-w-0 flex-1"
                tooltip={name}
              >
                <Avatar className="size-7">
                  <AvatarImage src={data?.user.image ?? undefined} alt="" />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {data?.user.email}
                  </span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {data?.user.email}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
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
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
