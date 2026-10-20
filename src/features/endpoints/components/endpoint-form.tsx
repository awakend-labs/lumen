"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { stringifyJson } from "@/lib/json-source";
import { pathParameterNames, validEndpointPath } from "@/lib/endpoint-path";
import { baseUrlSchema, endpointInputSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BracesIcon,
  CheckIcon,
  CloudIcon,
  Code2Icon,
  EyeIcon,
  FileTextIcon,
  InboxIcon,
  ListTreeIcon,
  MapPinIcon,
  PencilLineIcon,
  RefreshCwIcon,
  RouteIcon,
  SaveIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
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
import {
  EndpointVersionBadge,
  MethodBadge,
  methodTextClass,
} from "@/components/method-badge";
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
  type ProjectAuth,
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
import { responseSuccessCode } from "@/lib/response-contract";
import { ResponsesEditor } from "./responses-editor";
import { DeleteEndpointButton } from "./delete-endpoint-button";
import { JsonEditor } from "./json-editor";
import { useBodyFieldJson } from "../use-body-field-json";
import { ParamTable, type ParamSectionName } from "./param-table";

const sectionSurfaceClass = "lumen-section";

const insetSurfaceClass = "lumen-inset";

const JSON_SCHEMA_PLACEHOLDER = '{ "type": "object" }';
const JSON_EXAMPLE_PLACEHOLDER = '{ "id": "example" }';

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

const responseFormSchema = z
  .object({
    isSuccess: z.boolean().optional(),
    useSharedError: z.boolean().optional(),
    schemaMode: z.enum(["generated", "custom"]).optional(),
    statusCode: z
      .union([z.number().int().min(100).max(599), z.literal("")])
      .refine((value): boolean => value !== "", "Enter a status code."),
    description: z.string(),
    body: z.string(),
    schema: z.string(),
  })
  .superRefine((response, ctx) => {
    if (response.useSharedError) return;
    for (const key of ["body", "schema"] as const) {
      if (!jsonText.safeParse(response[key]).success)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Enter valid JSON",
        });
    }
  });

const endpointFormSchema = z.object({
  expectedUpdatedAt: z.iso.datetime().optional(),
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
      "Use a path beginning with /, without spaces, # or ?. Parameters must use {id} or :id.",
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

export type EndpointFormValues = z.infer<typeof endpointFormSchema>;

function normalizeTagsForForm(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((tag) => tag.trim())
      .filter(Boolean);
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
    z.object({
      ...responseFormSchema.shape,
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

function pretty(value: unknown, source?: string) {
  return stringifyJson(value, source);
}

function toFormValues(
  endpoint: Partial<EndpointRecord> | undefined,
  stashId: string,
  projectBaseUrl = "",
  projectAuth?: ProjectAuth,
): EndpointFormValues {
  return {
    expectedUpdatedAt: endpoint?.updatedAt,
    baseUrl: endpoint?.baseUrl ?? projectBaseUrl,
    bodyFormat: (endpoint?.requestBody?.contentType ??
      "application/json") as EndpointFormValues["bodyFormat"],
    requestRaw: endpoint?.requestBody?.raw ?? "",
    access:
      endpoint?.access ??
      (projectAuth && projectAuth.scheme !== "none"
        ? "authenticated"
        : "public"),
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
    requestSchema: pretty(
      endpoint?.requestBody?.schema,
      endpoint?.requestBody?.schemaSource,
    ),
    requestExample: pretty(
      endpoint?.requestBody?.example,
      endpoint?.requestBody?.exampleSource,
    ),
    responses:
      endpoint?.responses && endpoint.responses.length > 0
        ? endpoint.responses.map((response) => ({
            statusCode: response.statusCode,
            isSuccess:
              response.statusCode ===
              responseSuccessCode(
                endpoint.responses ?? [],
                endpoint.method ?? "GET",
              ),
            useSharedError: response.useSharedError ?? false,
            schemaMode:
              response.schemaMode ??
              (response.schema !== undefined ? "custom" : "generated"),
            description: response.description,
            body: pretty(response.body, response.bodySource),
            schema: pretty(response.schema, response.schemaSource),
          }))
        : [
            {
              statusCode: endpoint?.method === "POST" ? 201 : 200,
              isSuccess: true,
              useSharedError: false,
              schemaMode: "generated",
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
  projectAuth,
  importCurl = false,
}: {
  projectId: string;
  stashes: StashRecord[];
  endpoint?: EndpointRecord;
  initialStashId?: string;
  duplicateFrom?: EndpointRecord;
  projectBaseUrl?: string;
  projectAuth?: ProjectAuth;
  importCurl?: boolean;
}) {
  const router = useRouter();
  const formElement = useRef<HTMLFormElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [importOpen, setImportOpen] = useState(importCurl);
  const [imported, setImported] = useState(false);
  const [duplicatePending, setDuplicatePending] = useState(
    Boolean(duplicateFrom),
  );
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [pathParameterName, setPathParameterName] = useState("");
  const [saveConflict, setSaveConflict] = useState<string | null>(null);
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
      projectAuth,
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
  const bodyJson = useBodyFieldJson(
    form,
    draft.loading || draft.hasRecoveredDraft,
  );
  const method = form.watch("method");
  const path = form.watch("path");
  const name = form.watch("name");
  const endpointPreviewName = name.trim() || "Untitled endpoint";
  const endpointNameUntitled = !name.trim();
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
  const { isCurrentSaved } = draft;
  const dirty = form.formState.isDirty || duplicatePending || imported;
  function importRequest(draft: CurlDraft) {
    form.reset({
      ...toFormValues(draft, form.getValues("stashId")),
      expectedUpdatedAt: form.getValues("expectedUpdatedAt"),
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
      if (!allowLeave.current && !isCurrentSaved()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (
        anchor &&
        !allowLeave.current &&
        !isCurrentSaved() &&
        !anchor.getAttribute("href")?.startsWith("#") &&
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
        isCurrentSaved() ||
        window.confirm(
          "Sign out? Changes that have not finished autosaving may be lost.",
        ),
    );
    return () => {
      removeSignOutGuard();
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, isCurrentSaved]);
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
      expectedUpdatedAt: endpoint ? values.expectedUpdatedAt : undefined,
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
              schemaSource: values.requestSchema.trim() || undefined,
              example: requestExample,
              exampleSource: values.requestExample.trim() || undefined,
              fields: cleanParams(values.bodyFields),
            },
      responses: values.responses.map((response) => ({
        statusCode: Number(response.statusCode),
        isSuccess: response.isSuccess,
        useSharedError: response.useSharedError,
        schemaMode: response.schemaMode,
        description: response.description,
        ...(!response.useSharedError
          ? {
              body: parseJson(response.body),
              bodySource: response.body.trim() || undefined,
              schema: parseJson(response.schema),
              schemaSource: response.schema.trim() || undefined,
            }
          : {}),
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
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          /changed since|saved version is missing|moved to another stash/.test(
            error.message,
          )
        ) {
          setSaveConflict(error.message);
        }
      },
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
        {saveConflict && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-md border border-primary/40 bg-primary/10 p-4"
          >
            <p className="text-sm">
              {saveConflict} Your current edits are still in this form.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => {
                if (
                  window.confirm(
                    "Reload the latest endpoint? This replaces your current form and saved draft.",
                  )
                ) {
                  allowLeave.current = true;
                  void draft
                    .clear()
                    .then(() => window.location.reload())
                    .catch(() => {
                      allowLeave.current = false;
                      toast.error(
                        "Could not reload. Your edits are still in this form. Please try again.",
                      );
                    });
                }
              }}
            >
              Reload latest version
            </Button>
          </div>
        )}
        <EndpointDraftBar
          draft={draft}
          onDiscard={() => {
            if (
              window.confirm("Discard this saved draft and reset the form?")
            ) {
              void draft
                .discard(
                  toFormValues(
                    endpoint ?? duplicateFrom,
                    fixedStashId,
                    projectBaseUrl,
                    projectAuth,
                  ),
                )
                .then(() => {
                  setImported(false);
                  setDuplicatePending(false);
                })
                .catch(() =>
                  toast.error("Could not discard the draft. Please try again."),
                );
            }
          }}
        />
        {draft.hasRecoveredDraft && (
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="w-full text-xs text-muted-foreground">
              Saving is paused until you choose which draft to keep.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!draft.canRestore}
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
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <TerminalSquare data-icon="inline-start" />
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
          {dirty && !isCurrentSaved() && (
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
            <EndpointVersionBadge version={form.watch("version")} />
            <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">
              {path.trim() || "/"}
            </span>
            <span
              className="hidden min-w-0 max-w-48 shrink-0 items-center border-l border-border/70 pl-3 sm:inline-flex md:max-w-xs"
              title={endpointPreviewName}
            >
              <span
                className={cn(
                  "truncate text-sm leading-snug",
                  endpointNameUntitled
                    ? "italic text-muted-foreground"
                    : "font-semibold tracking-[-0.01em] text-foreground",
                )}
              >
                {endpointPreviewName}
              </span>
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
                <div
                  className={cn(
                    "flex flex-col gap-3 rounded-sm border border-border p-3 sm:flex-row sm:items-center sm:justify-between",
                    bodyJson.hasCustomJson
                      ? "bg-primary/5 dark:bg-primary/[0.07]"
                      : "bg-muted/30 dark:bg-muted/20",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70",
                        bodyJson.hasCustomJson
                          ? "bg-primary/10 text-primary dark:bg-primary/15"
                          : "bg-background/80 text-muted-foreground dark:bg-background/40",
                      )}
                      aria-hidden
                    >
                      {bodyJson.hasCustomJson ? (
                        <PencilLineIcon className="size-4" />
                      ) : (
                        <BracesIcon className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold tracking-[-0.01em] text-foreground">
                        {bodyJson.hasCustomJson
                          ? "Custom schema and example"
                          : "Linked to body fields"}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {bodyJson.hasCustomJson
                          ? "Your JSON stays as-is when body fields change. Regenerate to rebuild from fields."
                          : "Schema and example update from body fields. Edit either JSON block to customize."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full shrink-0 bg-background/80 sm:w-auto"
                    disabled={
                      draft.loading ||
                      draft.hasRecoveredDraft ||
                      !form
                        .watch("bodyFields")
                        .some((field) => field.key.trim())
                    }
                    onClick={() => {
                      if (
                        bodyJson.hasCustomJson &&
                        !window.confirm(
                          "Replace the request schema and example with JSON generated from body fields?",
                        )
                      ) {
                        return;
                      }
                      bodyJson.regenerate();
                    }}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    Regenerate from fields
                  </Button>
                </div>
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
                    <Controller
                      control={form.control}
                      name={"requestSchema"}
                      render={({ field: editorField, fieldState }) => (
                        <JsonEditor
                          {...editorField}
                          id="request-schema"
                          label="JSON schema"
                          onChange={(value) => {
                            bodyJson.trackEdit("requestSchema", value);
                            editorField.onChange(value);
                          }}
                          placeholder={JSON_SCHEMA_PLACEHOLDER}
                          invalid={Boolean(fieldState.error)}
                          disabled={!hydrated}
                        />
                      )}
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
                    <Controller
                      control={form.control}
                      name={"requestExample"}
                      render={({ field: editorField, fieldState }) => (
                        <JsonEditor
                          {...editorField}
                          id="request-example"
                          label="Request example"
                          onChange={(value) => {
                            bodyJson.trackEdit("requestExample", value);
                            editorField.onChange(value);
                          }}
                          placeholder={JSON_EXAMPLE_PLACEHOLDER}
                          invalid={Boolean(fieldState.error)}
                          disabled={!hydrated}
                        />
                      )}
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
            description="What callers receive, from the happy path to the errors they should handle."
          >
            <ResponsesEditor
              projectId={projectId}
              form={form}
              rows={responses}
              disabled={!hydrated}
              paused={draft.loading || draft.hasRecoveredDraft}
            />
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
                  isCurrentSaved() ||
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

type EndpointDraftBarProps = {
  draft: {
    status: string;
    loading: boolean;
    error: boolean;
  };
  onDiscard: () => void;
};

function endpointDraftStatusMeta(
  status: string,
  { error, loading }: { error: boolean; loading: boolean },
) {
  if (loading) {
    return {
      tone: "idle" as const,
      title: "Checking for drafts",
      detail: status,
      busy: true,
    };
  }
  if (error) {
    return {
      tone: "error" as const,
      title: "Autosave unavailable",
      detail: status,
      busy: false,
    };
  }
  if (status === "Saving draft…" || status === "Saving current edits…") {
    return {
      tone: "active" as const,
      title: status === "Saving draft…" ? "Saving draft" : "Resuming autosave",
      detail: "Your latest changes are being stored.",
      busy: true,
    };
  }
  if (
    status === "Draft saved" ||
    status === "Draft restored" ||
    status === "Draft discarded"
  ) {
    return {
      tone: "success" as const,
      title: status,
      detail: null,
      busy: false,
    };
  }
  if (status === "Drafts save automatically") {
    return {
      tone: "idle" as const,
      title: "Autosave",
      detail: "Changes are saved as you edit.",
      busy: false,
    };
  }
  if (
    status.startsWith("A saved draft") ||
    status.startsWith("Draft changed in another tab")
  ) {
    return {
      tone: "warn" as const,
      title: status.startsWith("Draft changed in another tab")
        ? "Draft changed in another tab"
        : "Saved draft found",
      detail: status,
      busy: false,
    };
  }
  return {
    tone: "idle" as const,
    title: status,
    detail: null,
    busy: false,
  };
}

function EndpointDraftBar({ draft, onDiscard }: EndpointDraftBarProps) {
  const meta = endpointDraftStatusMeta(draft.status, draft);
  const toneSurface = {
    idle: "bg-muted/30 dark:bg-muted/20",
    active: "bg-primary/5 dark:bg-primary/[0.07]",
    success: "bg-muted/30 dark:bg-muted/20",
    warn: "bg-primary/5 dark:bg-primary/[0.07]",
    error: "border-destructive/30 bg-destructive/5",
  }[meta.tone];
  const toneIcon = {
    idle: "bg-background/80 text-muted-foreground dark:bg-background/40",
    active: "bg-primary/10 text-primary dark:bg-primary/15",
    success: "bg-primary/10 text-primary dark:bg-primary/15",
    warn: "bg-primary/10 text-primary dark:bg-primary/15",
    error: "bg-destructive/10 text-destructive",
  }[meta.tone];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-sm border border-border p-3 sm:flex-row sm:items-center sm:justify-between",
        toneSurface,
      )}
    >
      <div
        className="flex min-w-0 items-start gap-3"
        role={draft.error ? "alert" : "status"}
        aria-live="polite"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70",
            toneIcon,
          )}
          aria-hidden
        >
          {meta.busy ? (
            <Spinner className="size-4" />
          ) : meta.tone === "error" ? (
            <TriangleAlertIcon className="size-4" />
          ) : meta.tone === "success" ? (
            <CheckIcon className="size-4" />
          ) : (
            <CloudIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p
            className={cn(
              "text-xs font-semibold tracking-[-0.01em]",
              draft.error ? "text-destructive" : "text-foreground",
            )}
          >
            {meta.title}
          </p>
          {meta.detail ? (
            <p
              className={cn(
                "text-xs leading-relaxed",
                draft.error ? "text-destructive/90" : "text-muted-foreground",
              )}
            >
              {meta.detail}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full shrink-0 bg-background/80 sm:w-auto"
        disabled={draft.loading}
        onClick={onDiscard}
      >
        <Trash2Icon data-icon="inline-start" />
        Discard draft
      </Button>
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
  return (
    <ParamTable
      icon={icon}
      title={title}
      hint={hint}
      fields={fields}
      append={append}
      remove={remove}
      register={register}
      name={name}
      watch={watch}
      setValue={setValue}
      Section={FormSection}
    />
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
