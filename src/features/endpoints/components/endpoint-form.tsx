"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { pathParameterNames, validEndpointPath } from "@/lib/endpoint-path";
import { endpointInputSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BracesIcon,
  Code2Icon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  InboxIcon,
  ListTreeIcon,
  MapPinIcon,
  PencilLineIcon,
  PlusIcon,
  RouteIcon,
  SaveIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
  VariableIcon,
  XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { MarkdownView } from "@/components/markdown-view";
import { MethodBadge } from "@/components/method-badge";
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

const sectionSurfaceClass =
  "rounded-xl border border-border/40 bg-muted/25 p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

const insetSurfaceClass =
  "rounded-lg border border-border/30 bg-background/70 dark:border-white/5 dark:bg-black/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

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
  enumText: z.string(),
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
  statusCode: z.number().int().min(100).max(599),
  description: z.string(),
  body: jsonText,
  schema: jsonText,
});

const endpointFormSchema = z.object({
  access: z.enum(ACCESS_LEVELS),
  bodyFields: z.array(paramFormSchema),
  stashId: z.string().min(1, "Choose a stash"),
  name: z.string().trim().min(1, "Name is required").max(120),
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
  responses: z.array(responseFormSchema),
  tags: z.string(),
  version: z
    .string()
    .trim()
    .min(1, "Version is required")
    .max(12)
    .regex(/^v\d+$/i, "Use a version like v1 or v2"),
  isDeprecated: z.boolean(),
});

type EndpointFormValues = z.infer<typeof endpointFormSchema>;

const emptyParam = {
  type: "string" as const,
  enumText: "",
  default: "",
  format: "",
  min: "",
  max: "",
  key: "",
  value: "",
  required: false,
  description: "",
};

function pretty(value: unknown) {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function toFormValues(
  endpoint: EndpointRecord | undefined,
  stashId: string,
): EndpointFormValues {
  return {
    access: endpoint?.access ?? "public",
    bodyFields: (endpoint?.requestBody?.fields ?? []).map(fieldToForm),
    stashId: endpoint?.stashId ?? stashId,
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
      endpoint && endpoint.responses.length > 0
        ? endpoint.responses.map((response) => ({
            statusCode: response.statusCode,
            description: response.description,
            body: pretty(response.body),
            schema: pretty(response.schema),
          }))
        : [{ statusCode: 200, description: "Success", body: "", schema: "" }],
    tags: endpoint?.tags.join(", ") ?? "",
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
      enum: param.enumText.trim()
        ? param.enumText.split(",").map((item) => item.trim())
        : undefined,
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
}: {
  projectId: string;
  stashes: StashRecord[];
  endpoint?: EndpointRecord;
  initialStashId?: string;
  duplicateFrom?: EndpointRecord;
}) {
  const router = useRouter();
  const save = useSaveEndpoint(projectId, endpoint?.id);
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
      initialStashId ?? stashes[0]?.id ?? "",
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
  const description = form.watch("description");
  const method = form.watch("method");
  const path = form.watch("path");
  const name = form.watch("name");

  const allowLeave = useRef(false);
  const dirty = form.formState.isDirty || Boolean(duplicateFrom);
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
          "Leave this page? Your unsaved endpoint changes will be lost.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
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
    const requestSchema = parseJson(values.requestSchema);
    const requestExample = parseJson(values.requestExample);
    const payload: EndpointInput = {
      access: values.access,
      stashId: values.stashId,
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
        !values.bodyFields.length
          ? null
          : {
              schema: requestSchema,
              example: requestExample,
              fields: cleanParams(values.bodyFields),
            },
      responses: values.responses.map((response) => ({
        statusCode: response.statusCode,
        description: response.description,
        body: parseJson(response.body),
        schema: parseJson(response.schema),
      })),
      tags: [
        ...new Set(
          values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
      version: values.version.trim().toLowerCase(),
      isDeprecated: values.isDeprecated,
    };
    const validation = endpointInputSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Check your fields");
      return;
    }
    save.mutate(validation.data, {
      onSuccess: (saved) => {
        allowLeave.current = true;
        form.reset(values);
        router.push(`/projects/${projectId}/endpoints/${saved.id}`);
      },
    });
  }

  return (
    <form
      className="flex min-w-0 max-w-full flex-col gap-5 pb-20"
      onSubmit={form.handleSubmit(submit)}
    >
      {duplicateFrom && (
        <p className="text-sm text-muted-foreground">
          Duplicating {duplicateFrom.name}. Choose a unique name and route
          before saving.
        </p>
      )}
      {dirty && (
        <p role="status" className="text-xs text-amber-600 dark:text-amber-300">
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
        description="Name the endpoint and place it in a stash."
      >
        <FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              data-invalid={Boolean(form.formState.errors.name) || undefined}
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
              data-invalid={Boolean(form.formState.errors.stashId) || undefined}
            >
              <FieldLabel className="gap-1.5">
                <FolderIcon
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                Stash
              </FieldLabel>
              <Select
                value={form.watch("stashId")}
                onValueChange={(value) =>
                  form.setValue("stashId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={Boolean(form.formState.errors.stashId)}
                >
                  <SelectValue placeholder="Choose a stash" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {stashes.map((stash) => (
                      <SelectItem key={stash.id} value={stash.id}>
                        {stash.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.stashId]} />
            </Field>
            <Field
              data-invalid={Boolean(form.formState.errors.method) || undefined}
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
              data-invalid={Boolean(form.formState.errors.path) || undefined}
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
                className="font-mono"
                placeholder="/api/v1/auth/logout"
                aria-invalid={Boolean(form.formState.errors.path)}
                {...form.register("path")}
              />
              <FieldError errors={[form.formState.errors.path]} />
            </Field>
            <Field
              data-invalid={Boolean(form.formState.errors.version) || undefined}
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
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field>
              <FieldLabel htmlFor="endpoint-tags" className="gap-1.5">
                <TagIcon
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                Tags
              </FieldLabel>
              <Input
                id="endpoint-tags"
                placeholder="users, public"
                {...form.register("tags")}
              />
            </Field>
            <Field orientation="horizontal" className="h-8">
              <Switch
                id="deprecated"
                checked={form.watch("isDeprecated")}
                onCheckedChange={(checked) =>
                  form.setValue("isDeprecated", checked, { shouldDirty: true })
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
        <label className="grid gap-2 text-sm">
          Endpoint access
          <select
            className="h-9 rounded-md border bg-background px-3"
            {...form.register("access")}
          >
            <option value="public">Public</option>
            <option value="authenticated">Authenticated</option>
            <option value="admin_only">Admin-only</option>
          </select>
        </label>
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
        append={() => pathParams.append(emptyParam)}
        remove={pathParams.remove}
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
        description="Optional JSON schema and a sample payload."
      >
        <div className="grid gap-4 md:grid-cols-2">
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
              rows={8}
              placeholder="{ }"
              className={cn("font-mono text-xs", insetSurfaceClass)}
              {...form.register("requestSchema")}
            />
            <FieldError errors={[form.formState.errors.requestSchema]} />
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
              rows={8}
              placeholder="{ }"
              className={cn("font-mono text-xs", insetSurfaceClass)}
              {...form.register("requestExample")}
            />
            <FieldError errors={[form.formState.errors.requestExample]} />
          </Field>
        </div>
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
            onClick={() =>
              responses.append({
                statusCode: 200,
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
              className={cn("flex flex-col gap-3 p-4", insetSurfaceClass)}
            >
              <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-end">
                <Field>
                  <FieldLabel htmlFor={`status-${field.id}`}>Status</FieldLabel>
                  <Input
                    id={`status-${field.id}`}
                    type="number"
                    className="font-mono"
                    value={form.watch(`responses.${index}.statusCode`)}
                    onChange={(event) =>
                      form.setValue(
                        `responses.${index}.statusCode`,
                        Number(event.target.value),
                        { shouldValidate: true },
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`response-desc-${field.id}`}>
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
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.responses?.[index]?.body) ||
                    undefined
                  }
                >
                  <FieldLabel>Example body</FieldLabel>
                  <Textarea
                    rows={6}
                    className={cn("font-mono text-xs", insetSurfaceClass)}
                    {...form.register(`responses.${index}.body`)}
                  />
                  <FieldError
                    errors={[form.formState.errors.responses?.[index]?.body]}
                  />
                </Field>
                <Field
                  data-invalid={
                    Boolean(form.formState.errors.responses?.[index]?.schema) ||
                    undefined
                  }
                >
                  <FieldLabel>Schema</FieldLabel>
                  <Textarea
                    rows={6}
                    className={cn("font-mono text-xs", insetSurfaceClass)}
                    {...form.register(`responses.${index}.schema`)}
                  />
                  <FieldError
                    errors={[form.formState.errors.responses?.[index]?.schema]}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <div
        className={cn(
          "sticky bottom-4 z-20 flex items-center justify-end gap-2 p-3 shadow-lg backdrop-blur-md",
          sectionSurfaceClass,
          "bg-background/90 dark:bg-white/[0.04]",
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!dirty || window.confirm("Discard unsaved endpoint changes?")) {
              allowLeave.current = true;
              router.back();
            }
          }}
        >
          <XIcon data-icon="inline-start" />
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          {endpoint ? "Save changes" : "Save endpoint"}
        </Button>
      </div>
    </form>
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
    <section className={cn("flex flex-col gap-4", sectionSurfaceClass)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15"
              aria-hidden
            >
              <Icon className="size-4" />
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold">{title}</h2>
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
  name: "headers" | "queryParams" | "pathParams" | "bodyFields";
  watch: ReturnType<typeof useForm<EndpointFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<EndpointFormValues>>["setValue"];
}) {
  return (
    <FormSection
      icon={icon}
      title={title}
      description={hint}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={name === "pathParams"}
          onClick={append}
        >
          <PlusIcon data-icon="inline-start" />
          Add
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
          None yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                "grid min-w-0 gap-2 p-3 md:grid-cols-3 md:items-center",
                insetSurfaceClass,
              )}
            >
              <Input
                aria-label="Field name"
                readOnly={name === "pathParams"}
                placeholder="Key"
                className="font-mono text-xs"
                {...register(`${name}.${index}.key`)}
              />
              <label className="grid gap-1 text-xs">
                Type
                <select
                  className="h-8 rounded-md border bg-background px-2"
                  {...register(`${name}.${index}.type`)}
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                aria-label="Example value"
                placeholder="Value"
                {...register(`${name}.${index}.value`)}
              />
              <Input
                placeholder="Description"
                {...register(`${name}.${index}.description`)}
              />
              <Input
                aria-label="Enum values"
                placeholder="Enum (comma separated)"
                {...register(`${name}.${index}.enumText`)}
              />
              <Input
                aria-label="Default value"
                placeholder="Default"
                {...register(`${name}.${index}.default`)}
              />
              <Input
                aria-label="Format"
                placeholder="Format (email, uuid…)"
                {...register(`${name}.${index}.format`)}
              />
              <Input
                aria-label="Minimum"
                type="number"
                step="any"
                placeholder="Min (value / length / items)"
                {...register(`${name}.${index}.min`)}
              />
              <Input
                aria-label="Maximum"
                type="number"
                step="any"
                placeholder="Max (value / length / items)"
                {...register(`${name}.${index}.max`)}
              />
              <Field orientation="horizontal" className="justify-end">
                <Switch
                  disabled={name === "pathParams"}
                  checked={watch(`${name}.${index}.required`)}
                  onCheckedChange={(checked) =>
                    setValue(`${name}.${index}.required`, checked, {
                      shouldDirty: true,
                    })
                  }
                  aria-label="Required"
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove"
                disabled={name === "pathParams"}
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function fieldToForm(field: ParamField) {
  return {
    ...emptyParam,
    ...field,
    type: field.type ?? "string",
    enumText: field.enum?.join(", ") ?? "",
    default: field.default ?? "",
    format: field.format ?? "",
    min: field.min === undefined ? "" : String(field.min),
    max: field.max === undefined ? "" : String(field.max),
  };
}
