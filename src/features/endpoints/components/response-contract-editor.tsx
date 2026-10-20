"use client";

import { useState } from "react";
import { BracesIcon, ChevronRightIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { JsonEditor } from "./json-editor";
import { inferResponseSchema } from "@/lib/response-contract";

export function generatedResponseSchema(example: string): string {
  return example.trim() ? JSON.stringify(inferResponseSchema(JSON.parse(example)), null, 2) : "";
}

export function ResponseContractEditor({ id, example, schema, mode, onExampleChange, onSchemaChange, onModeChange, disabled, exampleError, schemaError }: {
  id: string; example: string; schema: string; mode: "generated" | "custom";
  onExampleChange: (value: string) => void; onSchemaChange: (value: string) => void; onModeChange: (value: "generated" | "custom") => void;
  disabled?: boolean; exampleError?: string; schemaError?: string;
}) {
  const [editing, setEditing] = useState(false);
  return <div className="flex min-w-0 flex-col gap-3">
    <Field data-invalid={Boolean(exampleError) || undefined}>
      <FieldLabel htmlFor={`response-body-${id}`}>Example body</FieldLabel>
      <JsonEditor id={`response-body-${id}`} label="Response example body" value={example} disabled={disabled}
        invalid={Boolean(exampleError)} placeholder={'{ "token": "example-token", "user": { "image": null } }'}
        onChange={value => {
          onExampleChange(value);
          if (mode === "generated") { try { onSchemaChange(generatedResponseSchema(value)); } catch { /* Keep the last contract while JSON is incomplete. */ } }
        }} />
      {exampleError && <p role="alert" className="text-xs text-destructive">{exampleError}</p>}
    </Field>
    <div className="rounded-md border border-border/70">
      <button type="button" className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/30" aria-expanded={editing} aria-controls={`response-contract-${id}`} onClick={() => setEditing(value => !value)}>
        <BracesIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="flex-1">{mode === "generated" ? "Generated from example" : "Custom schema"} <span aria-hidden>·</span> <span className="font-medium text-foreground">{editing ? "Close" : "Edit"}</span></span>
        <ChevronRightIcon className={`size-3.5 transition-transform ${editing ? "rotate-90" : ""}`} aria-hidden />
      </button>
      {editing && <div id={`response-contract-${id}`} className="flex min-w-0 flex-col gap-3 border-t border-border/70 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">Review required fields and nullable types. A single example cannot show every possible value. Use a type array, such as <code>{'["string", "null"]'}</code>, for fields that allow null.</p>
        <Field>
          <FieldLabel htmlFor={`response-schema-${id}`}>Response schema</FieldLabel>
          <JsonEditor id={`response-schema-${id}`} label="Response schema" value={schema} disabled={disabled} invalid={Boolean(schemaError)}
            placeholder={'{ "type": "object", "properties": {} }'} onChange={value => { onModeChange("custom"); onSchemaChange(value); }} />
          {schemaError && <p role="alert" className="text-xs text-destructive">{schemaError}</p>}
        </Field>
        <Button type="button" size="sm" variant="outline" className="w-fit" disabled={disabled || !example.trim()} onClick={() => {
          if (mode === "custom" && !window.confirm("Replace your custom schema with one generated from this example?")) return;
          try { onSchemaChange(generatedResponseSchema(example)); onModeChange("generated"); } catch { /* Example validation is shown by the form. */ }
        }}><RefreshCwIcon className="size-3.5" aria-hidden />Regenerate from example</Button>
      </div>}
    </div>
    {mode === "generated" && !editing && <p className="text-[11px] leading-relaxed text-muted-foreground">Review required and nullable fields in Edit; one example cannot prove every case.</p>}
    {!editing && schemaError && <p role="alert" className="text-xs text-destructive">{schemaError} Open Edit to correct the schema.</p>}
  </div>;
}
