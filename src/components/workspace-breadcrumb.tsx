import Link from "next/link";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { StashRecord } from "@/lib/types";

export type WorkspaceCrumb = {
  label: string;
  href?: string;
};

export function WorkspaceBreadcrumb({ items }: { items: WorkspaceCrumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.href ?? "page"}:${item.label}:${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="max-w-48 truncate">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-64 truncate">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function endpointTrail({
  projectId,
  projectName,
  stash,
  groupId,
  current,
  endpoint,
}: {
  projectId: string;
  projectName: string;
  stash?: Pick<StashRecord, "id" | "name" | "groups">;
  groupId?: string | null;
  current: WorkspaceCrumb;
  endpoint?: { id: string; name: string };
}): WorkspaceCrumb[] {
  const items: WorkspaceCrumb[] = [
    { label: projectName, href: `/projects/${projectId}` },
  ];

  if (stash) {
    items.push({
      label: stash.name,
      href: `/projects/${projectId}/stashes/${stash.id}`,
    });
    const group = groupId
      ? stash.groups.find((item) => item.id === groupId)
      : undefined;
    if (group) {
      items.push({
        label: group.name,
        href: `/projects/${projectId}/stashes/${stash.id}#api-group-${group.id}`,
      });
    }
  }

  if (endpoint && endpoint.name !== current.label) {
    items.push({
      label: endpoint.name,
      href: `/projects/${projectId}/endpoints/${endpoint.id}`,
    });
  }

  items.push(current);
  return items;
}
