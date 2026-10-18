"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { HTTP_METHODS, type EndpointRecord, type StashRecord } from "@/lib/types";
import type { EndpointInput } from "@/lib/validators";

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
  stashId: z.string().min(1, "Choose a stash"),
  name: z.string().trim().min(1, "Name is required").max(120),
  method: z.enum(HTTP_METHODS),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .refine((path) => path.startsWith("/"), "Path must start with /"),
  description: z.string().max(20000),
  headers: z.array(paramFormSchema),
  queryParams: z.array(paramFormSchema),
  pathParams: z.array(paramFormSchema),
  requestSchema: jsonText,
  requestExample: jsonText,
  responses: z.array(responseFormSchema),
  tags: z.string(),
  isDeprecated: z.boolean(),
});

type EndpointFormValues = z.infer<typeof endpointFormSchema>;

const emptyParam = { key: "", value: "", required: false, description: "" };

function pretty(value: unknown) {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function toFormValues(
  endpoint: EndpointRecord | undefined,
  stashId: string,
): EndpointFormValues {
  return {
    stashId: endpoint?.stashId ?? stashId,
    name: endpoint?.name ?? "",
    method: endpoint?.method ?? "GET",
    path: endpoint?.path ?? "/",
    description: endpoint?.description ?? "",
    headers: endpoint?.headers ?? [],
    queryParams: endpoint?.queryParams ?? [],
    pathParams: endpoint?.pathParams ?? [],
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
}: {
  projectId: string;
  stashes: StashRecord[];
  endpoint?: EndpointRecord;
  initialStashId?: string;
}) {
  const router = useRouter();
  const save = useSaveEndpoint(projectId, endpoint?.id);
  const form = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: toFormValues(endpoint, initialStashId ?? stashes[0]?.id ?? ""),
  });
  const headers = useFieldArray({ control: form.control, name: "headers" });
  const queryParams = useFieldArray({ control: form.control, name: "queryParams" });
  const pathParams = useFieldArray({ control: form.control, name: "pathParams" });
  const responses = useFieldArray({ control: form.control, name: "responses" });
  const description = form.watch("description");

  function submit(values: EndpointFormValues) {
    const requestSchema = parseJson(values.requestSchema);
    const requestExample = parseJson(values.requestExample);
    const payload: EndpointInput = {
      stashId: values.stashId,
      name: values.name.trim(),
      method: values.method,
      path: values.path.trim(),
      description: values.description,
      headers: cleanParams(values.headers),
      queryParams: cleanParams(values.queryParams),
      pathParams: cleanParams(values.pathParams),
      requestBody:
        requestSchema === undefined && requestExample === undefined
          ? null
          : { schema: requestSchema, example: requestExample },
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
      isDeprecated: values.isDeprecated,
    };
    save.mutate(payload, {
      onSuccess: (saved) => {
        router.push(`/projects/${projectId}/endpoints/${saved.id}`);
      },
    });
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(submit)}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.name) || undefined}>
            <FieldLabel htmlFor="endpoint-name">Name</FieldLabel>
            <Input id="endpoint-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.stashId) || undefined}>
            <FieldLabel>Stash</FieldLabel>
            <Select
              value={form.watch("stashId")}
              onValueChange={(value) => form.setValue("stashId", value, { shouldValidate: true })}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(form.formState.errors.stashId)}>
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
          <Field data-invalid={Boolean(form.formState.errors.method) || undefined}>
            <FieldLabel>Method</FieldLabel>
            <Select
              value={form.watch("method")}
              onValueChange={(value) =>
                form.setValue("method", value as EndpointFormValues["method"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.path) || undefined}>
            <FieldLabel htmlFor="endpoint-path">Path</FieldLabel>
            <Input
              id="endpoint-path"
              className="font-mono"
              aria-invalid={Boolean(form.formState.errors.path)}
              {...form.register("path")}
            />
            <FieldError errors={[form.formState.errors.path]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="endpoint-tags">Tags</FieldLabel>
          <Input id="endpoint-tags" placeholder="users, public" {...form.register("tags")} />
        </Field>
        <Field orientation="horizontal">
          <Switch
            id="deprecated"
            checked={form.watch("isDeprecated")}
            onCheckedChange={(checked) => form.setValue("isDeprecated", checked)}
          />
          <FieldLabel htmlFor="deprecated">Mark as deprecated</FieldLabel>
        </Field>
      </FieldGroup>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Description</h2>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea rows={8} placeholder="Supports Markdown" {...form.register("description")} />
          </TabsContent>
          <TabsContent value="preview" className="rounded-lg border p-4">
            <MarkdownView content={description} />
          </TabsContent>
        </Tabs>
      </section>

      <ParamList title="Headers" fields={headers.fields} append={() => headers.append(emptyParam)} remove={headers.remove} register={form.register} name="headers" watch={form.watch} setValue={form.setValue} />
      <ParamList title="Query parameters" fields={queryParams.fields} append={() => queryParams.append(emptyParam)} remove={queryParams.remove} register={form.register} name="queryParams" watch={form.watch} setValue={form.setValue} />
      <ParamList title="Path parameters" fields={pathParams.fields} append={() => pathParams.append(emptyParam)} remove={pathParams.remove} register={form.register} name="pathParams" watch={form.watch} setValue={form.setValue} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Request body</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.requestSchema) || undefined}>
            <FieldLabel htmlFor="request-schema">JSON schema</FieldLabel>
            <Textarea id="request-schema" rows={8} className="font-mono text-xs" {...form.register("requestSchema")} />
            <FieldError errors={[form.formState.errors.requestSchema]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.requestExample) || undefined}>
            <FieldLabel htmlFor="request-example">Example</FieldLabel>
            <Textarea id="request-example" rows={8} className="font-mono text-xs" {...form.register("requestExample")} />
            <FieldError errors={[form.formState.errors.requestExample]} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Responses</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              responses.append({ statusCode: 200, description: "", body: "", schema: "" })
            }
          >
            <PlusIcon data-icon="inline-start" />
            Add response
          </Button>
        </div>
        {responses.fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="grid gap-3 md:grid-cols-[120px_1fr_auto]">
              <Field>
                <FieldLabel htmlFor={`status-${field.id}`}>Status</FieldLabel>
                <Input
                  id={`status-${field.id}`}
                  type="number"
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
                <FieldLabel htmlFor={`response-desc-${field.id}`}>Description</FieldLabel>
                <Input id={`response-desc-${field.id}`} {...form.register(`responses.${index}.description`)} />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label="Remove response"
                onClick={() => responses.remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.responses?.[index]?.body) || undefined}>
                <FieldLabel>Example body</FieldLabel>
                <Textarea rows={6} className="font-mono text-xs" {...form.register(`responses.${index}.body`)} />
                <FieldError errors={[form.formState.errors.responses?.[index]?.body]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.responses?.[index]?.schema) || undefined}>
                <FieldLabel>Schema</FieldLabel>
                <Textarea rows={6} className="font-mono text-xs" {...form.register(`responses.${index}.schema`)} />
                <FieldError errors={[form.formState.errors.responses?.[index]?.schema]} />
              </Field>
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save endpoint
        </Button>
      </div>
    </form>
  );
}

function ParamList({
  title,
  fields,
  append,
  remove,
  register,
  name,
  watch,
  setValue,
}: {
  title: string;
  fields: { id: string }[];
  append: () => void;
  remove: (index: number) => void;
  register: ReturnType<typeof useForm<EndpointFormValues>>["register"];
  name: "headers" | "queryParams" | "pathParams";
  watch: ReturnType<typeof useForm<EndpointFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<EndpointFormValues>>["setValue"];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={append}>
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1.4fr_auto_auto]">
              <Input placeholder="Key" {...register(`${name}.${index}.key`)} />
              <Input placeholder="Value" {...register(`${name}.${index}.value`)} />
              <Input placeholder="Description" {...register(`${name}.${index}.description`)} />
              <Field orientation="horizontal" className="justify-end">
                <Switch
                  checked={watch(`${name}.${index}.required`)}
                  onCheckedChange={(checked) => setValue(`${name}.${index}.required`, checked)}
                  aria-label="Required"
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </Field>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(index)}>
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
