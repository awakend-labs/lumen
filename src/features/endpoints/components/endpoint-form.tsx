"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { pathParameterNames, validEndpointPath } from "@/lib/endpoint-path";
import { baseUrlSchema, endpointInputSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlignLeftIcon,
  BracesIcon,
  Code2Icon,
  EyeIcon,
  FileTextIcon,
  InboxIcon,
  ListTreeIcon,
  MapPinIcon,
  PencilLineIcon,
  PlusIcon,
  QuoteIcon,
  RouteIcon,
  SaveIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
  TypeIcon,
  VariableIcon,
  XIcon,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { CurlImportDialog } from "./curl-import-dialog";
import { EndpointTagsField } from "./endpoint-tags-field";
import type { CurlDraft } from "@/lib/curl";
import { SectionNav, sectionId } from "@/components/section-nav";
import { MarkdownView } from "@/components/markdown-view";
import { MethodBadge, methodTextClass } from "@/components/method-badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSaveEndpoint } from "@/features/endpoints/queries";
import {
  HTTP_METHODS,
  FIELD_TYPES,
  ACCESS_LEVELS,
  type ParamField,
  type EndpointRecord,
  type StashRecord,
} from "@/lib/types";
import type { EndpointInput } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { registerSignOutGuard } from "@/lib/unsaved-changes";
import { useEndpointDraft } from "../use-endpoint-draft";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { nextResponseStatus } from "@/lib/response-status";
import { ResponseStatusField } from "./response-status-field";
import { DeleteEndpointButton } from "./delete-endpoint-button";

const sectionSurfaceClass = "lumen-section";

const insetSurfaceClass = "lumen-inset";

const JSON_SCHEMA_PLACEHOLDER = '{ "type": "object" }';
const JSON_EXAMPLE_PLACEHOLDER = '{ "id": "example" }';
const JSON_RESPONSE_BODY_PLACEHOLDER = '{ "ok": true }';

const JSON_EDITOR_ROWS = 8;
const jsonEditorTextareaClass = cn(
  "field-sizing-fixed min-h-44 resize-y font-mono text-xs leading-5",
  insetSurfaceClass,
);

const jsonText = z.string().refine((value) => {
  if (!value.trim()) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}, "Enter valid JSON");

const paramFormSchema = z.object({
  type: z.enum(FIELD_TYPES),
  enumValues: z.array(z.string()),
  default: z.string(),
  format: z.string(),
  min: z.string(),
  max: z.string(),
  key: z.string(),
  value: z.string(),
  required: z.boolean(),
  description: z.string(),
});

const responseFormSchema = z.object({
  statusCode: z
    .union([z.number().int().min(100).max(599), z.literal("")])
    .refine((value): boolean => value !== "", "Enter a status code."),
  description: z.string(),
  body: jsonText,
  schema: jsonText,
});

const endpointFormSchema = z.object({
  baseUrl: baseUrlSchema,
  bodyFormat: z.enum([
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
  ]),
  requestRaw: z.string().max(20000),
  access: z.enum(ACCESS_LEVELS),
  bodyFields: z.array(paramFormSchema),
  stashId: z.string().min(1, "Choose a stash"),
  groupId: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer."),
  method: z.enum(HTTP_METHODS),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(300)
    .refine(
      validEndpointPath,
      "Start with /; use {id} or :id for parameters. Spaces, # and ? are not allowed.",
    ),
  description: z.string().max(20000),
  headers: z.array(paramFormSchema),
  queryParams: z.array(paramFormSchema),
  pathParams: z.array(paramFormSchema),
  requestSchema: jsonText,
  requestExample: jsonText,
  responses: z.array(responseFormSchema).superRefine((responses, ctx) => {
    const used = new Set<number>();
    responses.forEach((response, index) => {
      if (response.statusCode === "") return;
      if (used.has(response.statusCode))
        ctx.addIssue({
          code: "custom",
          path: [index, "statusCode"],
          message: "Each response must have a different status code.",
        });
      used.add(response.statusCode);
    });
  }),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tag cannot be empty")
        .max(40, "Tag is too long"),
    )
    .max(5, "You can add up to 5 tags"),
  version: z
    .string()
    .trim()
    .min(1, "Version is required")
    .max(12)
    .regex(/^v\d+$/i, "Use a version like v1 or v2"),
  isDeprecated: z.boolean(),
});

type EndpointFormValues = z.infer<typeof endpointFormSchema>;

function normalizeTagsForForm(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

const endpointDraftFormSchema = endpointFormSchema.extend({
  baseUrl: z.string(),
  name: z.string(),
  path: z.string(),
  version: z.string(),
  requestSchema: z.string(),
  requestExample: z.string(),
  responses: z.array(
    responseFormSchema.extend({
      statusCode: z.union([z.number(), z.literal("")]),
      body: z.string(),
      schema: z.string(),
    }),
  ),
});

function parseEndpointDraftPayload(payload: string) {
  const parsed = JSON.parse(payload) as Record<string, unknown>;
  return endpointDraftFormSchema.parse({
    ...parsed,
    tags: normalizeTagsForForm(parsed.tags),
  });
}

const emptyParam = {
  type: "string" as const,
  enumValues: [] as string[],
  default: "",
  format: "",
  min: "",
  max: "",
  key: "",
  value: "",
  required: false,
  description: "",
};

type ParamSectionName = "headers" | "queryParams" | "pathParams" | "bodyFields";

const QUERY_AND_PATH_TYPES = [
  "string",
  "integer",
  "number",
  "boolean",
] as const;

const PARAM_COPY: Record<
  ParamSectionName,
  {
    nameLabel: string;
    nameIcon: LucideIcon;
    namePlaceholder: string;
    valueLabel: string;
    valueIcon: LucideIcon;
    valuePlaceholder: string;
    descriptionPlaceholder: string;
    empty: string;
    add: string;
    showType: boolean;
    types: readonly string[];
  }
> = {
  headers: {
    nameLabel: "Header",
    nameIcon: ListTreeIcon,
    namePlaceholder: "Authorization",
    valueLabel: "Value",
    valueIcon: Code2Icon,
    valuePlaceholder: "Bearer token",
    descriptionPlaceholder: "What this header is for",
    empty: "No headers yet.",
    add: "Add header",
    showType: false,
    types: ["string"],
  },
  queryParams: {
    nameLabel: "Parameter",
    nameIcon: SearchIcon,
    namePlaceholder: "page",
    valueLabel: "Example",
    valueIcon: QuoteIcon,
    valuePlaceholder: "1",
    descriptionPlaceholder: "How this query value is used",
    empty: "No query parameters yet.",
    add: "Add parameter",
    showType: true,
    types: QUERY_AND_PATH_TYPES,
  },
  pathParams: {
    nameLabel: "Parameter",
    nameIcon: VariableIcon,
    namePlaceholder: "id",
    valueLabel: "Example",
    valueIcon: QuoteIcon,
    valuePlaceholder: "42",
    descriptionPlaceholder: "What this path segment represents",
    empty:
      "No path parameters yet. Add {id} to the route, or use Add parameter.",
    add: "Add parameter",
    showType: true,
    types: QUERY_AND_PATH_TYPES,
  },
  bodyFields: {
    nameLabel: "Field",
    nameIcon: BracesIcon,
    namePlaceholder: "email",
    valueLabel: "Example",
    valueIcon: QuoteIcon,
    valuePlaceholder: "user@example.com",
    descriptionPlaceholder: "What this field represents",
    empty: "No body fields yet.",
    add: "Add field",
    showType: true,
    types: FIELD_TYPES,
  },
};

function pretty(value: unknown) {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function toFormValues(
  endpoint: Partial<EndpointRecord> | undefined,
  stashId: string,
  projectBaseUrl = "",
): EndpointFormValues {
  return {
    baseUrl: endpoint?.baseUrl ?? projectBaseUrl,
    bodyFormat: (endpoint?.requestBody?.contentType ??
      "application/json") as EndpointFormValues["bodyFormat"],
    requestRaw: endpoint?.requestBody?.raw ?? "",
    access: endpoint?.access ?? "public",
    bodyFields: (endpoint?.requestBody?.fields ?? []).map(fieldToForm),
    stashId: endpoint?.stashId ?? stashId,
    groupId: endpoint?.groupId ?? "ungrouped",
    name: endpoint?.name ?? "",
    method: endpoint?.method ?? "GET",
    path: endpoint?.path ?? "/",
    description: endpoint?.description ?? "",
    headers: (endpoint?.headers ?? []).map(fieldToForm),
    queryParams: (endpoint?.queryParams ?? []).map(fieldToForm),
    pathParams: (endpoint?.pathParams ?? []).map(fieldToForm),
    requestSchema: pretty(endpoint?.requestBody?.schema),
    requestExample: pretty(endpoint?.requestBody?.example),
    responses:
      endpoint?.responses && endpoint.responses.length > 0
        ? endpoint.responses.map((response) => ({
            statusCode: response.statusCode,
            description: response.description,
            body: pretty(response.body),
            schema: pretty(response.schema),
          }))
        : [
            {
              statusCode: endpoint?.method === "POST" ? 201 : 200,
              description: endpoint?.method === "POST" ? "Created" : "Success",
              body: "",
              schema: "",
            },
          ],
    tags: endpoint?.tags ?? [],
    version: endpoint?.version ?? "v1",
    isDeprecated: endpoint?.isDeprecated ?? false,
  };
}

function parseJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed) as unknown;
}

function cleanParams(params: EndpointFormValues["headers"]) {
  return params
    .filter((param) => param.key.trim())
    .map((param) => ({
      type: param.type,
      enum: param.enumValues.length ? param.enumValues : undefined,
      default: param.default || undefined,
      format: param.format || undefined,
      min: param.min.trim() ? Number(param.min) : undefined,
      max: param.max.trim() ? Number(param.max) : undefined,
      key: param.key.trim(),
      value: param.value,
      required: param.required,
      description: param.description,
    }));
}

export function EndpointForm({
  projectId,
  stashes,
  endpoint,
  initialStashId,
  duplicateFrom,
  projectBaseUrl = "",
  importCurl = false,
}: {
  projectId: string;
  stashes: StashRecord[];
  endpoint?: EndpointRecord;
  initialStashId?: string;
  duplicateFrom?: EndpointRecord;
  projectBaseUrl?: string;
  importCurl?: boolean;
}) {
  const router = useRouter();
  const formElement = useRef<HTMLFormElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [importOpen, setImportOpen] = useState(importCurl);
  const [imported, setImported] = useState(false);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [pathParameterName, setPathParameterName] = useState("");
  const save = useSaveEndpoint(projectId, endpoint?.id);
  const fixedStashId =
    endpoint?.stashId ?? duplicateFrom?.stashId ?? initialStashId ?? "";
  const form = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: toFormValues(
      endpoint ??
        (duplicateFrom
          ? {
              ...duplicateFrom,
              name: `${duplicateFrom.name.slice(0, 113)} (copy)`,
            }
          : undefined),
      fixedStashId,
      projectBaseUrl,
    ),
  });
  const headers = useFieldArray({ control: form.control, name: "headers" });
  const queryParams = useFieldArray({
    control: form.control,
    name: "queryParams",
  });
  const pathParams = useFieldArray({
    control: form.control,
    name: "pathParams",
  });
  const bodyFields = useFieldArray({
    control: form.control,
    name: "bodyFields",
  });
  const responses = useFieldArray({ control: form.control, name: "responses" });
  const draft = useEndpointDraft(
    projectId,
    endpoint
      ? `endpoint:${endpoint.id}`
      : `new:${fixedStashId}${duplicateFrom ? `:${duplicateFrom.id}` : ""}`,
    form,
    (payload) => ({
      ...parseEndpointDraftPayload(payload),
      stashId: fixedStashId,
    }),
  );
  const description = form.watch("description");
  const method = form.watch("method");
  const path = form.watch("path");
  const name = form.watch("name");
  useEffect(() => {
    if (endpoint || draft.loading || !form.getFieldState("method").isDirty)
      return;
    const current = form.getValues("responses");
    if (
      current.length === 1 &&
      (current[0].statusCode === 200 || current[0].statusCode === 201) &&
      ["Success", "Created"].includes(current[0].description) &&
      !current[0].body &&
      !current[0].schema &&
      !form.getFieldState("responses").isDirty
    ) {
      form.setValue("responses.0.statusCode", method === "POST" ? 201 : 200);
      form.setValue(
        "responses.0.description",
        method === "POST" ? "Created" : "Success",
      );
    }
  }, [method, endpoint, draft.loading, form]);

  const allowLeave = useRef(false);
  const dirty = form.formState.isDirty || Boolean(duplicateFrom) || imported;
  function importRequest(draft: CurlDraft) {
    form.reset({
      ...toFormValues(draft, form.getValues("stashId")),
      groupId: form.getValues("groupId"),
    });
    setImported(true);
    toast.success(
      "Request imported. Review the fields and save your endpoint.",
    );
  }
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!allowLeave.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (
        anchor &&
        !allowLeave.current &&
        !event.ctrlKey &&
        !event.metaKey &&
        !window.confirm(
          "Leave this page? Changes that have not finished autosaving may be lost.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    const removeSignOutGuard = registerSignOutGuard(
      () =>
        allowLeave.current ||
        window.confirm(
          "Sign out? Changes that have not finished autosaving may be lost.",
        ),
    );
    return () => {
      removeSignOutGuard();
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  useEffect(() => {
    const current = form.getValues("pathParams");
    const next = pathParameterNames(path).map((key) => ({
      ...(current.find((field) => field.key === key) ?? emptyParam),
      key,
      required: true,
    }));
    if (JSON.stringify(current) !== JSON.stringify(next))
      form.setValue("pathParams", next, { shouldDirty: true });
  }, [path, form]);

  function submit(values: EndpointFormValues) {
    if (draft.loading || draft.hasRecoveredDraft) {
      toast.error(
        draft.loading
          ? "Wait for the saved-draft check before saving."
          : "Choose which draft to keep before saving.",
      );
      return;
    }
    const requestSchema = parseJson(values.requestSchema);
    const requestExample = parseJson(values.requestExample);
    if (
      ["application/x-www-form-urlencoded", "multipart/form-data"].includes(
        values.bodyFormat,
      ) &&
      (requestExample === null ||
        typeof requestExample !== "object" ||
        Array.isArray(requestExample))
    ) {
      toast.error(
        "For form bodies, enter a JSON object of field names and values in Example.",
      );
      return;
    }
    const payload: EndpointInput = {
      draft: draft.token(),
      baseUrl: values.baseUrl,
      access: values.access,
      stashId: fixedStashId,
      ...(!endpoint || values.groupId !== (endpoint.groupId ?? "ungrouped")
        ? { groupId: values.groupId === "ungrouped" ? null : values.groupId }
        : {}),
      name: values.name.trim(),
      method: values.method,
      path: values.path.trim(),
      description: values.description,
      headers: cleanParams(values.headers),
      queryParams: cleanParams(values.queryParams),
      pathParams: cleanParams(values.pathParams),
      requestBody:
        requestSchema === undefined &&
        requestExample === undefined &&
        !values.bodyFields.length &&
        !values.requestRaw &&
        values.bodyFormat === "application/json"
          ? null
          : {
              contentType: values.bodyFormat,
              ...(values.bodyFormat === "text/plain"
                ? { raw: values.requestRaw }
                : {}),
              schema: requestSchema,
              example: requestExample,
              fields: cleanParams(values.bodyFields),
            },
      responses: values.responses.map((response) => ({
        statusCode: Number(response.statusCode),
        description: response.description,
        body: parseJson(response.body),
        schema: parseJson(response.schema),
      })),
      tags: [...new Set(values.tags.map((tag) => tag.trim()).filter(Boolean))],
      version: values.version.trim().toLowerCase(),
      isDeprecated: values.isDeprecated,
    };
    const validation = endpointInputSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Check your fields");
      return;
    }
    save.mutate(validation.data, {
      onSuccess: () => {
        allowLeave.current = true;
        form.reset(values);
      },
    });
  }

  if (!stashes.some((stash) => stash.id === fixedStashId)) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        This stash is unavailable. Return to the project and open an existing
        stash to create an endpoint.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-7 lg:grid-cols-[155px_minmax(0,1fr)] lg:gap-10">
      <SectionNav
        sections={[
          "Route",
          "Access",
          "Description",
          "Headers",
          "Query parameters",
          "Path parameters",
          "Body fields",
          "Request body",
          "Responses",
        ]}
      />
      <form
        ref={formElement}
        noValidate
        className="flex min-w-0 max-w-full flex-col gap-5 pb-20"
        onSubmit={form.handleSubmit(submit, () => {
          toast.error("Could not save. Check the highlighted fields.");
          requestAnimationFrame(() => {
            const invalid = formElement.current?.querySelector<HTMLElement>(
              '[aria-invalid="true"], [data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] button',
            );
            invalid?.scrollIntoView({ block: "center", behavior: "instant" });
            invalid?.focus({ preventScroll: true });
          });
        })}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            role={draft.error ? "alert" : "status"}
            className={cn(
              "text-xs",
              draft.error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {draft.status}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={draft.loading}
            onClick={() => {
              if (
                window.confirm("Discard this saved draft and reset the form?")
              )
                void draft
                  .discard(
                    toFormValues(
                      endpoint ?? duplicateFrom,
                      fixedStashId,
                      projectBaseUrl,
                    ),
                  )
                  .catch(() =>
                    toast.error(
                      "Could not discard the draft. Please try again.",
                    ),
                  );
            }}
          >
            Discard draft
          </Button>
        </div>
        {draft.hasRecoveredDraft && (
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="w-full text-xs text-muted-foreground">
              Saving is paused until you choose which draft to keep.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "Replace your current edits with the saved draft?",
                  )
                )
                  draft.restore();
              }}
            >
              Restore saved draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={draft.keepCurrent}
            >
              Keep current edits
            </Button>
          </div>
        )}
        <fieldset
          disabled={!hydrated}
          className="m-0 flex w-full min-w-0 max-w-full flex-col gap-5 border-0 p-0 min-inline-0 disabled:opacity-70 [&>section+section]:mt-8"
        >
          {!endpoint && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Start with a request you already use.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportOpen(true)}
              >
                <TerminalSquare className="size-4" />
                Import cURL
              </Button>
            </div>
          )}
          <CurlImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onImport={importRequest}
          />
          <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add path parameter</DialogTitle>
                <DialogDescription>
                  The parameter will be added to your route and marked required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="path-parameter-name">Parameter name</Label>
                <Input
                  id="path-parameter-name"
                  value={pathParameterName}
                  placeholder="userId"
                  onChange={(event) => setPathParameterName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Use a unique name containing letters, numbers, or underscores,
                  starting with a letter or underscore.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPathDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(pathParameterName) ||
                    pathParameterNames(path).includes(pathParameterName)
                  }
                  onClick={() => {
                    form.setValue(
                      "path",
                      `${path.replace(/\/$/, "")}/{${pathParameterName}}`,
                      { shouldDirty: true, shouldValidate: true },
                    );
                    setPathDialogOpen(false);
                  }}
                >
                  Add parameter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {duplicateFrom && (
            <p className="text-sm text-muted-foreground">
              Duplicating {duplicateFrom.name}. Choose a unique name and route
              before saving.
            </p>
          )}
          {dirty && (
            <p
              role="status"
              className="text-xs text-emerald-700 dark:text-emerald-400/90"
            >
              Unsaved changes · save before leaving this page.
            </p>
          )}
          <div
            className={cn(
              "flex min-w-0 max-w-full items-center gap-3 overflow-hidden px-4 py-3",
              sectionSurfaceClass,
            )}
          >
            <MethodBadge method={method} className="h-6 min-w-16" />
            <span
              className={cn(
                "max-w-20 shrink-0 truncate px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground",
                insetSurfaceClass,
              )}
            >
              {form.watch("version").trim() || "v1"}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm">
              {path.trim() || "/"}
            </span>
            <span className="hidden min-w-0 max-w-48 truncate text-sm text-muted-foreground sm:block">
              {name.trim() || "Untitled endpoint"}
            </span>
          </div>

          <FormSection
            icon={RouteIcon}
            title="Route"
            description="Define the endpoint name, method, and route."
          >
            <FieldGroup>
              {(stashes.find((stash) => stash.id === fixedStashId)?.groups
                .length ?? 0) > 0 && (
                <Field>
                  <FieldLabel htmlFor="endpoint-group">
                    API group{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Select
                    value={form.watch("groupId")}
                    onValueChange={(value) =>
                      form.setValue("groupId", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger id="endpoint-group" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ungrouped">
                          Ungrouped APIs
                        </SelectItem>
                        {stashes
                          .find((stash) => stash.id === fixedStashId)
                          ?.groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field
                data-invalid={
                  Boolean(form.formState.errors.baseUrl) || undefined
                }
              >
                <FieldLabel htmlFor="endpoint-base-url">Base URL</FieldLabel>
                <Input
                  id="endpoint-base-url"
                  placeholder="https://api.example.com"
                  aria-invalid={Boolean(form.formState.errors.baseUrl)}
                  {...form.register("baseUrl")}
                  value={form.watch("baseUrl")}
                />
                <FieldError errors={[form.formState.errors.baseUrl]} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.name) || undefined
                  }
                >
                  <FieldLabel htmlFor="endpoint-name" className="gap-1.5">
                    <FileTextIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Name
                  </FieldLabel>
                  <Input
                    id="endpoint-name"
                    placeholder="Logout"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.method) || undefined
                  }
                >
                  <FieldLabel className="gap-1.5">
                    <Code2Icon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Method
                  </FieldLabel>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      form.setValue(
                        "method",
                        value as EndpointFormValues["method"],
                        { shouldDirty: true },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {HTTP_METHODS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.path) || undefined
                  }
                >
                  <FieldLabel htmlFor="endpoint-path" className="gap-1.5">
                    <MapPinIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Path
                  </FieldLabel>
                  <Input
                    id="endpoint-path"
                    className={cn(
                      "font-mono font-medium",
                      methodTextClass[method],
                    )}
                    placeholder="/auth/logout"
                    aria-invalid={Boolean(form.formState.errors.path)}
                    {...form.register("path")}
                  />
                  <FieldError errors={[form.formState.errors.path]} />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Enter the resource path. The selected version is included
                    once in the generated request URL.
                  </p>
                </Field>
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.version) || undefined
                  }
                >
                  <FieldLabel htmlFor="endpoint-version" className="gap-1.5">
                    <BracesIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Version
                  </FieldLabel>
                  <Input
                    id="endpoint-version"
                    className="font-mono"
                    placeholder="v1"
                    aria-invalid={Boolean(form.formState.errors.version)}
                    {...form.register("version")}
                  />
                  <FieldError errors={[form.formState.errors.version]} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <Field>
                  <FieldLabel
                    id="endpoint-tags-label"
                    htmlFor="endpoint-tags"
                    className="gap-1.5"
                  >
                    <TagIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Tags
                  </FieldLabel>
                  <Controller
                    name="tags"
                    control={form.control}
                    render={({ field }) => (
                      <EndpointTagsField
                        id="endpoint-tags"
                        value={field.value}
                        onChange={(tags) =>
                          field.onChange(tags, { shouldDirty: true })
                        }
                        onBlur={field.onBlur}
                        aria-invalid={Boolean(form.formState.errors.tags)}
                      />
                    )}
                  />
                  <FieldError errors={[form.formState.errors.tags]} />
                  <p className="text-xs text-muted-foreground">
                    Press Enter to add. Up to 5 tags.
                  </p>
                </Field>
                <Field orientation="horizontal" className="h-8">
                  <Switch
                    id="deprecated"
                    checked={form.watch("isDeprecated")}
                    onCheckedChange={(checked) =>
                      form.setValue("isDeprecated", checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <FieldLabel htmlFor="deprecated" className="gap-1.5">
                    <TriangleAlertIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    Deprecated
                  </FieldLabel>
                </Field>
              </div>
            </FieldGroup>
          </FormSection>

          <FormSection
            icon={VariableIcon}
            title="Access"
            description="Uses the authentication scheme configured in project settings."
          >
            <Field>
              <FieldLabel htmlFor="endpoint-access" className="gap-1.5">
                <EyeIcon
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                Endpoint access
              </FieldLabel>
              <Select
                value={form.watch("access")}
                onValueChange={(value) =>
                  form.setValue(
                    "access",
                    value as EndpointFormValues["access"],
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger id="endpoint-access" className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="authenticated">Authenticated</SelectItem>
                    <SelectItem value="admin_only">Admin-only</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FormSection>
          <FormSection
            icon={FileTextIcon}
            title="Description"
            description="Markdown is supported. Preview it before you save."
          >
            <Tabs defaultValue="write" className="gap-3">
              <TabsList className="h-9 w-fit shrink-0 self-start bg-muted/60 p-1 dark:bg-white/5">
                <TabsTrigger value="write" className="flex-none gap-1.5 px-3">
                  <PencilLineIcon className="size-3.5" aria-hidden />
                  Write
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-none gap-1.5 px-3">
                  <EyeIcon className="size-3.5" aria-hidden />
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <div className={cn("p-1", insetSurfaceClass)}>
                  <Textarea
                    rows={8}
                    placeholder="What this endpoint does, who should call it, and any caveats."
                    className="min-h-40 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                    {...form.register("description")}
                  />
                </div>
              </TabsContent>
              <TabsContent
                value="preview"
                className={cn("min-h-40 p-4", insetSurfaceClass)}
              >
                {description.trim() ? (
                  <MarkdownView content={description} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing to preview yet.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </FormSection>

          <ParamList
            icon={ListTreeIcon}
            title="Headers"
            hint="Authorization, content type, and other request headers."
            fields={headers.fields}
            append={() => headers.append(emptyParam)}
            remove={headers.remove}
            register={form.register}
            name="headers"
            watch={form.watch}
            setValue={form.setValue}
          />
          <ParamList
            icon={SearchIcon}
            title="Query parameters"
            hint="Values passed after the ? in the URL."
            fields={queryParams.fields}
            append={() => queryParams.append(emptyParam)}
            remove={queryParams.remove}
            register={form.register}
            name="queryParams"
            watch={form.watch}
            setValue={form.setValue}
          />
          <ParamList
            icon={VariableIcon}
            title="Path parameters"
            hint="Use {id} or :id in the route. Matching required fields are added automatically."
            fields={pathParams.fields}
            append={() => {
              setPathParameterName("");
              setPathDialogOpen(true);
            }}
            remove={(index) => {
              const key = form.getValues(`pathParams.${index}.key`);
              form.setValue(
                "path",
                path
                  .replace(
                    new RegExp(`\\{${key}\\}|:${key}(?![A-Za-z0-9_])`, "g"),
                    "",
                  )
                  .replace(/\/+/g, "/") || "/",
                { shouldDirty: true },
              );
            }}
            register={form.register}
            name="pathParams"
            watch={form.watch}
            setValue={form.setValue}
          />

          <ParamList
            icon={BracesIcon}
            title="Body fields"
            hint="Document fields, their types, and constraints. Use JSON schema below for nested or advanced schemas."
            fields={bodyFields.fields}
            append={() => bodyFields.append(emptyParam)}
            remove={bodyFields.remove}
            register={form.register}
            name="bodyFields"
            watch={form.watch}
            setValue={form.setValue}
          />
          <FormSection
            icon={BracesIcon}
            title="Request body"
            description="Choose a request format and document a sample payload."
          >
            <Field>
              <FieldLabel>Body format</FieldLabel>
              <Select
                value={form.watch("bodyFormat")}
                onValueChange={(value) => {
                  form.setValue(
                    "bodyFormat",
                    value as EndpointFormValues["bodyFormat"],
                    { shouldDirty: true },
                  );
                  const index = form
                    .getValues("headers")
                    .findIndex(
                      (header) => header.key.toLowerCase() === "content-type",
                    );
                  if (index >= 0) {
                    if (value === "multipart/form-data") headers.remove(index);
                    else
                      form.setValue(`headers.${index}.value`, value, {
                        shouldDirty: true,
                      });
                  }
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-72"
                  aria-label="Body format"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="application/json">JSON</SelectItem>
                    <SelectItem value="application/x-www-form-urlencoded">
                      URL-encoded form
                    </SelectItem>
                    <SelectItem value="multipart/form-data">
                      Multipart form
                    </SelectItem>
                    <SelectItem value="text/plain">Plain text</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {form.watch("bodyFormat") === "text/plain" ? (
              <Field>
                <FieldLabel htmlFor="request-raw">Raw body</FieldLabel>
                <Textarea
                  id="request-raw"
                  rows={8}
                  className="font-mono text-xs"
                  {...form.register("requestRaw")}
                />
                <FieldError errors={[form.formState.errors.requestRaw]} />
              </Field>
            ) : (
              <>
                {form.watch("bodyFormat") !== "application/json" && (
                  <p className="text-xs text-muted-foreground">
                    In Example, use a JSON object of form field names and
                    values. Arrays send repeated fields.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Field
                    data-invalid={
                      Boolean(form.formState.errors.requestSchema) || undefined
                    }
                  >
                    <FieldLabel htmlFor="request-schema" className="gap-1.5">
                      <BracesIcon
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      JSON schema
                    </FieldLabel>
                    <Textarea
                      id="request-schema"
                      rows={JSON_EDITOR_ROWS}
                      placeholder={JSON_SCHEMA_PLACEHOLDER}
                      className={jsonEditorTextareaClass}
                      {...form.register("requestSchema")}
                    />
                    <FieldError
                      errors={[form.formState.errors.requestSchema]}
                    />
                  </Field>
                  <Field
                    data-invalid={
                      Boolean(form.formState.errors.requestExample) || undefined
                    }
                  >
                    <FieldLabel htmlFor="request-example" className="gap-1.5">
                      <Code2Icon
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      Example
                    </FieldLabel>
                    <Textarea
                      id="request-example"
                      rows={JSON_EDITOR_ROWS}
                      placeholder={JSON_EXAMPLE_PLACEHOLDER}
                      className={jsonEditorTextareaClass}
                      {...form.register("requestExample")}
                    />
                    <FieldError
                      errors={[form.formState.errors.requestExample]}
                    />
                  </Field>
                </div>
              </>
            )}
          </FormSection>

          <FormSection
            icon={InboxIcon}
            title="Responses"
            description="Document each status this route can return."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  nextResponseStatus(form.watch("responses"), method) ===
                  undefined
                }
                onClick={() =>
                  responses.append({
                    statusCode:
                      nextResponseStatus(form.getValues("responses"), method) ??
                      200,
                    description: "",
                    body: "",
                    schema: "",
                  })
                }
              >
                <PlusIcon data-icon="inline-start" />
                Add response
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              {responses.fields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    "flex flex-col gap-3",
                    index > 0 && "border-t border-border pt-3",
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-end">
                    <ResponseStatusField
                      id={`status-${field.id}`}
                      value={form.watch(`responses.${index}.statusCode`)}
                      usedCodes={form
                        .watch("responses")
                        .filter((_, responseIndex) => responseIndex !== index)
                        .map((response) => response.statusCode)}
                      error={
                        form.formState.errors.responses?.[index]?.statusCode
                      }
                      onChange={(statusCode) => {
                        form.setValue(
                          `responses.${index}.statusCode`,
                          statusCode,
                          { shouldDirty: true },
                        );
                        void form.trigger("responses");
                      }}
                    />
                    <Field>
                      <FieldLabel
                        htmlFor={`response-desc-${field.id}`}
                        className="gap-1.5"
                      >
                        <AlignLeftIcon
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        Description
                      </FieldLabel>
                      <Input
                        id={`response-desc-${field.id}`}
                        placeholder="Success"
                        {...form.register(`responses.${index}.description`)}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove response"
                      onClick={() => responses.remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <Field
                      data-invalid={
                        Boolean(
                          form.formState.errors.responses?.[index]?.body,
                        ) || undefined
                      }
                    >
                      <FieldLabel
                        htmlFor={`response-body-${field.id}`}
                        className="gap-1.5"
                      >
                        <Code2Icon
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        Example body
                      </FieldLabel>
                      <Textarea
                        id={`response-body-${field.id}`}
                        rows={JSON_EDITOR_ROWS}
                        placeholder={JSON_RESPONSE_BODY_PLACEHOLDER}
                        className={jsonEditorTextareaClass}
                        {...form.register(`responses.${index}.body`)}
                      />
                      <FieldError
                        errors={[
                          form.formState.errors.responses?.[index]?.body,
                        ]}
                      />
                    </Field>
                    <Field
                      data-invalid={
                        Boolean(
                          form.formState.errors.responses?.[index]?.schema,
                        ) || undefined
                      }
                    >
                      <FieldLabel
                        htmlFor={`response-schema-${field.id}`}
                        className="gap-1.5"
                      >
                        <BracesIcon
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        Schema
                      </FieldLabel>
                      <Textarea
                        id={`response-schema-${field.id}`}
                        rows={JSON_EDITOR_ROWS}
                        placeholder={JSON_SCHEMA_PLACEHOLDER}
                        className={jsonEditorTextareaClass}
                        {...form.register(`responses.${index}.schema`)}
                      />
                      <FieldError
                        errors={[
                          form.formState.errors.responses?.[index]?.schema,
                        ]}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <div
            className={cn(
              "sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border/60 p-3 shadow-lg",
              "bg-background/72 ring-1 ring-inset ring-white/20 dark:bg-card/45 dark:ring-white/10",
              "supports-backdrop-filter:backdrop-blur-xs supports-backdrop-filter:backdrop-saturate-150",
            )}
          >
            {endpoint && (
              <DeleteEndpointButton
                projectId={projectId}
                endpoint={endpoint}
                disabled={save.isPending}
                className="mr-auto"
                onDeleted={() => {
                  allowLeave.current = true;
                  form.reset(form.getValues());
                }}
              />
            )}
            {(draft.loading || draft.hasRecoveredDraft) && (
              <p
                id="endpoint-save-hint"
                role="status"
                className="mr-auto text-xs text-muted-foreground"
              >
                {draft.hasRecoveredDraft
                  ? "Choose Restore saved draft or Keep current edits above to enable Save."
                  : "Save will be available when the saved-draft check finishes."}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Discard unsaved endpoint changes?")
                ) {
                  allowLeave.current = true;
                  router.back();
                }
              }}
            >
              <XIcon data-icon="inline-start" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending || draft.loading || draft.hasRecoveredDraft
              }
              aria-describedby={
                draft.loading || draft.hasRecoveredDraft
                  ? "endpoint-save-hint"
                  : undefined
              }
            >
              {save.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {endpoint ? "Save changes" : "Save endpoint"}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={sectionId(title)}
      className={cn(
        "scroll-mt-24 flex flex-col gap-5",
        sectionSurfaceClass,
        "endpoint-editor-section",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              aria-hidden
            >
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ParamList({
  icon,
  title,
  hint,
  fields,
  append,
  remove,
  register,
  name,
  watch,
  setValue,
}: {
  icon?: LucideIcon;
  title: string;
  hint: string;
  fields: { id: string }[];
  append: () => void;
  remove: (index: number) => void;
  register: ReturnType<typeof useForm<EndpointFormValues>>["register"];
  name: ParamSectionName;
  watch: ReturnType<typeof useForm<EndpointFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<EndpointFormValues>>["setValue"];
}) {
  const copy = PARAM_COPY[name];
  return (
    <FormSection
      icon={icon}
      title={title}
      description={hint}
      action={
        <Button type="button" variant="outline" size="sm" onClick={append}>
          <PlusIcon data-icon="inline-start" />
          {copy.add}
        </Button>
      }
    >
      {fields.length === 0 ? (
        <p
          className={cn(
            "border-dashed px-3 py-4 text-sm text-muted-foreground dark:border-white/5 dark:bg-black/15",
            insetSurfaceClass,
          )}
        >
          {copy.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <ParamRow
              key={field.id}
              name={name}
              index={index}
              register={register}
              watch={watch}
              setValue={setValue}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}

function ParamRow({
  name,
  index,
  register,
  watch,
  setValue,
  onRemove,
}: {
  name: ParamSectionName;
  index: number;
  register: ReturnType<typeof useForm<EndpointFormValues>>["register"];
  watch: ReturnType<typeof useForm<EndpointFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<EndpointFormValues>>["setValue"];
  onRemove: () => void;
}) {
  const copy = PARAM_COPY[name];
  const isPath = name === "pathParams";
  const required = watch(`${name}.${index}.required`);

  return (
    <div
      className={cn(
        "group grid min-w-0 gap-4 rounded-md border border-border bg-background/60 p-4 transition-colors focus-within:border-primary/50 hover:border-primary/30 dark:bg-black/15",
        insetSurfaceClass,
      )}
    >
      <div
        className={cn(
          "grid min-w-0 items-end gap-3",
          copy.showType && "sm:grid-cols-[minmax(0,1fr)_9rem]",
        )}
      >
        <ParamLabel icon={copy.nameIcon} label={copy.nameLabel}>
          <Input
            aria-label={copy.nameLabel}
            readOnly={isPath}
            placeholder={copy.namePlaceholder}
            className="font-mono text-sm"
            {...register(`${name}.${index}.key`)}
          />
        </ParamLabel>
        {copy.showType ? (
          <ParamLabel icon={TypeIcon} label="Type">
            <Select
              value={watch(`${name}.${index}.type`)}
              onValueChange={(value) =>
                setValue(
                  `${name}.${index}.type`,
                  value as (typeof FIELD_TYPES)[number],
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger
                id={`${name}-${index}-type`}
                aria-label="Type"
                className="w-full font-mono"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {copy.types.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </ParamLabel>
        ) : (
          <input type="hidden" {...register(`${name}.${index}.type`)} />
        )}
      </div>

      <ParamLabel icon={copy.valueIcon} label={copy.valueLabel}>
        <Input
          aria-label={copy.valueLabel}
          placeholder={copy.valuePlaceholder}
          className={name === "headers" ? "font-mono text-sm" : undefined}
          {...register(`${name}.${index}.value`)}
        />
      </ParamLabel>

      <div className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <ParamLabel icon={AlignLeftIcon} label="Description">
          <Input
            aria-label="Description"
            placeholder={copy.descriptionPlaceholder}
            {...register(`${name}.${index}.description`)}
          />
        </ParamLabel>
        <div className="flex h-9 items-center justify-between gap-3 sm:justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
            <Switch
              disabled={isPath}
              checked={required}
              onCheckedChange={(checked) =>
                setValue(`${name}.${index}.required`, checked, {
                  shouldDirty: true,
                })
              }
              aria-label="Required"
            />
            Required
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ParamLabel({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  );
}

function fieldToForm(field: ParamField) {
  return {
    ...emptyParam,
    ...field,
    type: field.type ?? "string",
    enumValues: field.enum ?? [],
    default: field.default ?? "",
    format: field.format ?? "",
    min: field.min === undefined ? "" : String(field.min),
    max: field.max === undefined ? "" : String(field.max),
  };
}
