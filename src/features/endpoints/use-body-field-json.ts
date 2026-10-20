"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { bodyFieldsToJson, sameJson } from "@/lib/body-field-json";
import type { EndpointFormValues } from "./components/endpoint-form";

type JsonField = "requestSchema" | "requestExample";
const documents = ["requestSchema", "requestExample"] as const;

export function useBodyFieldJson(form: UseFormReturn<EndpointFormValues>, paused: boolean) {
  const [fields, bodyFormat, schema, example] = useWatch({ control: form.control, name: ["bodyFields", "bodyFormat", "requestSchema", "requestExample"] });
  const generated = useMemo(() => bodyFieldsToJson(fields ?? []), [fields]);
  const linked = useRef<Record<JsonField, boolean | null>>({ requestSchema: null, requestExample: null });

  useEffect(() => {
    const subscription = form.watch((_values, event) => {
      // A restored/imported/discarded form needs its own ownership assessment.
      if (!event.name) linked.current = { requestSchema: null, requestExample: null };
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (paused || bodyFormat === "text/plain") return;
    for (const document of documents) {
      const current = form.getValues(document);
      if (linked.current[document] === null) linked.current[document] = !current.trim() || sameJson(current, generated[document]);
      if (linked.current[document] && !sameJson(current, generated[document])) {
        form.setValue(document, generated[document], { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [paused, bodyFormat, schema, example, generated, form]);

  return {
    hasCustomJson: documents.some(document => {
      const current = form.getValues(document);
      return Boolean(current.trim()) && !sameJson(current, generated[document]);
    }),
    trackEdit(document: JsonField, value: string) { linked.current[document] = sameJson(value, generated[document]); },
    regenerate() {
      for (const document of documents) {
        linked.current[document] = true;
        form.setValue(document, generated[document], { shouldDirty: true, shouldValidate: true });
      }
    },
  };
}
