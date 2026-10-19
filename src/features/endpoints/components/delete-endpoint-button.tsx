"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { useDeleteEndpoint } from "@/features/endpoints/queries";
import type { EndpointRecord } from "@/lib/types";

export function DeleteEndpointButton({ projectId, endpoint, disabled, className, onDeleted }: {
  projectId: string;
  endpoint: Pick<EndpointRecord, "id" | "name" | "stashId">;
  disabled?: boolean;
  className?: string;
  onDeleted?: () => void;
}) {
  const remove = useDeleteEndpoint(projectId);
  const router = useRouter();
  return <ConfirmDelete title="Delete endpoint?"
    description={`Delete “${endpoint.name}” and its documentation? This cannot be undone.`}
    pending={remove.isPending}
    onConfirm={() => remove.mutate(endpoint.id, { onSuccess: () => {
      onDeleted?.();
      router.replace(`/projects/${projectId}/stashes/${endpoint.stashId}`);
    } })}
    trigger={<Button type="button" variant="destructive" size="sm" className={className} disabled={disabled || remove.isPending}>
      <Trash2Icon data-icon="inline-start" />Delete endpoint
    </Button>} />;
}
