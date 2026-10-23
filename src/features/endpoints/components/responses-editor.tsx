"use client";

import { DeferredDialog } from "@/components/deferred-dialog";

import { lazy, memo, useEffect, useMemo, useState } from "react";
import { useFormState, useWatch, type UseFieldArrayReturn, type UseFormReturn } from "react-hook-form";
import { PlusIcon, StarIcon, Trash2Icon, LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useProject } from "@/features/projects/queries";
import { nextResponseStatus } from "@/lib/response-status";
import type { EndpointFormValues } from "./endpoint-form";
import type { ResponseErrorFormat } from "@/lib/types";
import { ResponseStatusField } from "./response-status-field";
import { ResponseContractEditor, generatedResponseSchema } from "./response-contract-editor";
const loadProjectErrorFormatDialog = () => import("./project-error-format-dialog").then(module => ({ default: module.ProjectErrorFormatDialog }));
const ProjectErrorFormatDialog = lazy(loadProjectErrorFormatDialog);

type Props = { projectId: string; form: UseFormReturn<EndpointFormValues>; rows: UseFieldArrayReturn<EndpointFormValues, "responses">; disabled: boolean; paused: boolean };

export function ResponsesEditor({ projectId, form, rows, disabled, paused }: Props) {
  const project = useProject(projectId);
  const shared = project.data?.responseErrorFormat;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const values = useWatch({ control: form.control, name: "responses", compute: values => values.map(({ statusCode, isSuccess }) => ({ statusCode, isSuccess })) });
  const codes = useMemo(() => values.map(response => response.statusCode), [values]);
  const next = nextResponseStatus(values);
  return <div className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">Start with a real response. Lumen generates its contract; you can refine it when needed.</p>
      <Button type="button" size="sm" variant="outline" onPointerEnter={() => { void loadProjectErrorFormatDialog(); }} onFocus={() => { void loadProjectErrorFormatDialog(); }} onClick={() => setSettingsOpen(true)}><LayersIcon className="size-3.5" aria-hidden />Project error format</Button>
    </div>
    <div className="flex flex-col gap-6">
      {rows.fields.map((row, index) => <ResponseRow key={row.id} id={row.id} index={index} form={form} shared={shared} disabled={disabled} paused={paused} usedCodes={codes} onRemove={rows.remove} />)}
    </div>
    {!rows.fields.length && <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">Add the successful response first, then document the errors callers should handle.</p>}
    <Button type="button" variant="outline" size="sm" className="w-fit" disabled={next === undefined} onClick={() => rows.append({ statusCode: next ?? 200, description: "", body: "", schema: "", schemaMode: "generated", isSuccess: !values.some(response => response.isSuccess) && (next ?? 200) < 300, useSharedError: false })}><PlusIcon data-icon="inline-start" />Add response</Button>
    {settingsOpen && <DeferredDialog title="Project error format" onClose={() => setSettingsOpen(false)}><ProjectErrorFormatDialog projectId={projectId} value={shared} open={settingsOpen} onOpenChange={setSettingsOpen} /></DeferredDialog>}
  </div>;
}

const ResponseRow = memo(function ResponseRow({ id, index, form, shared, disabled, paused, usedCodes, onRemove }: {
  id: string; index: number; form: UseFormReturn<EndpointFormValues>; shared?: ResponseErrorFormat | null; disabled: boolean; paused: boolean; usedCodes: (number | "")[]; onRemove: (index: number) => void;
}) {
  const value = useWatch({ control: form.control, name: `responses.${index}` });
  const mode = value.schemaMode ?? (value.schema.trim() ? "custom" : "generated");
  const errorResponse = value.statusCode !== "" && value.statusCode >= 400;
  const successResponse = value.statusCode !== "" && value.statusCode >= 200 && value.statusCode < 300;
  const state = useFormState({ control: form.control, name: `responses.${index}` });
  const errors = state.errors.responses?.[index];
  const set = (key: "body" | "schema", next: string) => form.setValue(`responses.${index}.${key}`, next, { shouldDirty: true, shouldValidate: true });
  useEffect(() => {
    if (paused || mode !== "generated" || value.useSharedError) return;
    try {
      const generated = generatedResponseSchema(value.body);
      if (generated !== value.schema) form.setValue(`responses.${index}.schema`, generated, { shouldDirty: true });
      if (!value.schemaMode) form.setValue(`responses.${index}.schemaMode`, "generated", { shouldDirty: true });
    } catch { /* Keep the last contract until the example is valid again. */ }
  }, [paused, mode, value.body, value.schema, value.schemaMode, value.useSharedError, form, index]);
  return <div className="flex min-w-0 flex-col gap-4 border-t border-border pt-5 first:pt-0 first:border-t-0">
    <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-end">
      <ResponseStatusField id={`status-${id}`} value={value.statusCode} usedCodes={usedCodes.filter((_, row) => row !== index)} error={errors?.statusCode}
        onChange={statusCode => {
          form.setValue(`responses.${index}.statusCode`, statusCode, { shouldDirty: true });
          if (statusCode === "" || statusCode < 400) form.setValue(`responses.${index}.useSharedError`, false, { shouldDirty: true });
          if (statusCode === "" || statusCode < 200 || statusCode >= 300) form.setValue(`responses.${index}.isSuccess`, false, { shouldDirty: true });
          void form.trigger("responses");
        }} />
      <Field className="min-w-0"><FieldLabel htmlFor={`response-desc-${id}`}>When it happens</FieldLabel><Input id={`response-desc-${id}`} placeholder={errorResponse ? "Email already registered" : "Login succeeded"} {...form.register(`responses.${index}.description`)} /></Field>
      <Button type="button" variant="ghost" size="icon" className="justify-self-end text-muted-foreground hover:text-destructive" aria-label={`Remove response ${value.statusCode || index + 1}`} onClick={() => onRemove(index)}><Trash2Icon /></Button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {successResponse && <Button type="button" size="sm" variant={value.isSuccess ? "secondary" : "ghost"} aria-pressed={Boolean(value.isSuccess)} className={value.isSuccess ? "text-amber-700 dark:text-primary" : "text-muted-foreground"} onClick={() => {
        form.getValues("responses").forEach((_, row) => form.setValue(`responses.${row}.isSuccess`, row === index, { shouldDirty: true }));
      }}><StarIcon className="size-3.5" aria-hidden />{value.isSuccess ? "Primary success" : "Mark as primary success"}</Button>}
      {errorResponse && <label className="flex min-h-8 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" className="size-4 rounded-sm accent-[var(--primary)]" checked={Boolean(value.useSharedError)} disabled={!shared} onChange={event => form.setValue(`responses.${index}.useSharedError`, event.target.checked, { shouldDirty: true, shouldValidate: true })} />Use project error format{!shared && <span>· define it above</span>}</label>}
    </div>
    {value.useSharedError && errorResponse ? <div className="rounded-md border border-primary/25 bg-primary/5 p-4 text-sm"><p className="font-medium">Uses the project error format</p><p className="mt-1 text-xs text-muted-foreground">The shared example and contract appear automatically on the endpoint page. Only this status description is specific to this response.</p>{!shared && <p role="alert" className="mt-2 text-xs text-destructive">The project error format is unavailable. Define it above or switch to a custom response.</p>}</div>
      : <ResponseContractEditor id={id} example={value.body} schema={value.schema} mode={mode} onExampleChange={next => set("body", next)} onSchemaChange={next => set("schema", next)} onModeChange={next => form.setValue(`responses.${index}.schemaMode`, next, { shouldDirty: true })} disabled={disabled} exampleError={errors?.body?.message} schemaError={errors?.schema?.message} />}
    {errors?.description && <p role="alert" className="text-xs text-destructive">{errors.description.message}</p>}
  </div>;
});
