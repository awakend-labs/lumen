"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { stringifyJson } from "@/lib/json-source";
import { responseErrorFormatSchema } from "@/lib/validators";
import type { ProjectSummary, ResponseErrorFormat } from "@/lib/types";
import { ResponseContractEditor, generatedResponseSchema } from "./response-contract-editor";

export function ProjectErrorFormatDialog({ projectId, value, open, onOpenChange }: {
  projectId: string; value?: ResponseErrorFormat | null; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const [example, setExample] = useState("");
  const [schema, setSchema] = useState("");
  const [mode, setMode] = useState<"generated" | "custom">("generated");
  const [error, setError] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    if (!open) { initialized.current = false; return; }
    if (initialized.current) return;
    initialized.current = true;
    const body = value ? stringifyJson(value.body, value.bodySource) : '{\n  "error": "VALIDATION_ERROR",\n  "message": "Check the submitted values."\n}';
    setExample(body); setSchema(value?.schema !== undefined ? stringifyJson(value.schema, value.schemaSource) : generatedResponseSchema(body));
    setMode(value?.schemaMode ?? (value?.schema ? "custom" : "generated")); setError("");
  }, [open, value]);
  const save = useMutation({
    mutationFn: (input: ResponseErrorFormat) => api<ResponseErrorFormat>(`/api/projects/${projectId}/response-error-format`, { method: "PUT", body: JSON.stringify(input) }),
    onMutate: () => client.cancelQueries({ queryKey: ["project-summary", projectId] }),
    onSuccess: result => {
      client.setQueryData<ProjectSummary>(["project-summary", projectId], current => current ? { ...current, responseErrorFormat: result } : current);
      client.invalidateQueries({ queryKey: ["project-summary", projectId], refetchType: "none" });
      toast.success("Project error format saved"); onOpenChange(false);
    },
    onError: (cause: Error) => setError(cause.message),
  });
  return <Dialog open={open} onOpenChange={next => { if (!save.isPending) onOpenChange(next); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Project error format</DialogTitle><DialogDescription>Define the example and contract once. Saving updates every response in this project that uses this format.</DialogDescription></DialogHeader>
      <ResponseContractEditor id="shared-error" example={example} schema={schema} mode={mode} onExampleChange={setExample} onSchemaChange={setSchema} onModeChange={setMode} disabled={save.isPending} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" disabled={save.isPending} onClick={() => {
          try {
            const contract = mode === "generated" ? generatedResponseSchema(example) : schema;
            const input = responseErrorFormatSchema.parse({ body: JSON.parse(example), bodySource: example, schema: contract.trim() ? JSON.parse(contract) : undefined, schemaSource: contract.trim() || undefined, schemaMode: mode });
            save.mutate(input);
          } catch { setError("Enter valid JSON for the example and schema before saving."); }
        }}>{save.isPending ? "Saving…" : "Save project error format"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
