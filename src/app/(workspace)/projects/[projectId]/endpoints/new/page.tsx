"use client";

import { Button } from "@/components/ui/button";
import { FolderIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EndpointForm } from "@/features/endpoints/components/endpoint-form";
import { ProjectFrame } from "@/features/projects/components/project-frame";

export default function NewEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; }>;
}) {
  const { projectId } = use(params);
  return (
    <Suspense>
      <NewEndpoint projectId={projectId} />
    </Suspense>
  );
}

function NewEndpoint({ projectId }: { projectId: string; }) {
  const search = useSearchParams();
  const stashId = search.get("stash") ?? undefined;

  return (
    <ProjectFrame projectId={projectId} editable>
      {(project) => {
        const duplicate = project.stashes.flatMap(stash => stash.endpoints).find(endpoint => endpoint.id === search.get("duplicate"));
        const selectedStash = project.stashes.find(stash => stash.id === (duplicate?.stashId ?? stashId));
        return (
        <div className="lumen-page flex flex-col gap-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {selectedStash && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link href={`/projects/${project.id}/stashes/${selectedStash.id}`}>{selectedStash.name}</Link></BreadcrumbLink></BreadcrumbItem></>}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New endpoint</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">New endpoint</h1>
            <p className="text-sm text-muted-foreground">
              Document the route, parameters, and the responses callers should expect.
            </p>
          </div>
          {!selectedStash ? <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{stashId ? "That stash is unavailable. " : ""}{project.stashes.length ? "Open a stash to create your endpoint in it." : "Create a stash in this project before adding an endpoint."}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{project.stashes.map(stash => {
              const next = new URLSearchParams(search.toString()); next.set("stash", stash.id); next.delete("duplicate");
              return <Link key={stash.id} href={`/projects/${project.id}/endpoints/new?${next}`} className="flex min-w-0 items-center gap-3 rounded-md border bg-card p-5 transition-colors hover:border-primary/50"><FolderIcon className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate font-medium">{stash.name}</span><ArrowRightIcon className="size-4 shrink-0" /></Link>;
            })}</div>
            <Button asChild variant="outline" className="w-fit"><Link href={`/projects/${project.id}`}>Back to project</Link></Button>
          </div> : <EndpointForm
            projectId={project.id}
            stashes={project.stashes}
            key={selectedStash.id}
            initialStashId={selectedStash.id}
            projectBaseUrl={project.baseUrl}
            projectAuth={project.auth}
            importCurl={search.get("import") === "curl"}
            duplicateFrom={duplicate}
          />}
        </div>
      ); }}
    </ProjectFrame>
  );
}
