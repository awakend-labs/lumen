"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { EndpointFormValues } from "./endpoint-form";
import { ParameterTable, parameterRowClass } from "./parameter-table";

export type ParamSectionName =
  | "headers"
  | "queryParams"
  | "pathParams"
  | "bodyFields";

const QUERY_AND_PATH_TYPES = ["string", "integer", "number", "boolean"] as const;

const PARAM_COPY: Record<
  ParamSectionName,
  {
    nameLabel: string;
    namePlaceholder: string;
    valueLabel: string;
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
    namePlaceholder: "Authorization",
    valueLabel: "Value",
    valuePlaceholder: "Bearer token",
    descriptionPlaceholder: "What this header is for",
    empty: "No headers yet.",
    add: "Add header",
    showType: false,
    types: ["string"],
  },
  queryParams: {
    nameLabel: "Parameter",
    namePlaceholder: "page",
    valueLabel: "Example",
    valuePlaceholder: "1",
    descriptionPlaceholder: "How this query value is used",
    empty: "No query parameters yet.",
    add: "Add parameter",
    showType: true,
    types: QUERY_AND_PATH_TYPES,
  },
  pathParams: {
    nameLabel: "Parameter",
    namePlaceholder: "id",
    valueLabel: "Example",
    valuePlaceholder: "42",
    descriptionPlaceholder: "What this path segment represents",
    empty: "No path parameters yet. Add {id} to the route, or add a parameter.",
    add: "Add parameter",
    showType: true,
    types: QUERY_AND_PATH_TYPES,
  },
  bodyFields: {
    nameLabel: "Field",
    namePlaceholder: "email",
    valueLabel: "Example",
    valuePlaceholder: "user@example.com",
    descriptionPlaceholder: "What this field represents",
    empty: "No body fields yet.",
    add: "Add field",
    showType: true,
    types: FIELD_TYPES,
  },
};

const cellInputClass =
  "h-11 rounded-sm border-0 bg-transparent px-3 text-sm shadow-none placeholder:text-muted-foreground/65 focus-visible:bg-primary/[0.08] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:bg-transparent dark:focus-visible:bg-primary/[0.06]";

const cellSelectClass =
  "h-11 data-[size=default]:h-11 w-full rounded-sm border-0 bg-transparent px-3 shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:bg-transparent dark:hover:bg-primary/[0.04]";

function stopFormSubmit(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault();
}

export function ParamTable({
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
  Section,
}: {
  icon?: LucideIcon;
  title: string;
  hint: string;
  fields: { id: string }[];
  append: () => void;
  remove: (index: number) => void;
  register: UseFormReturn<EndpointFormValues>["register"];
  name: ParamSectionName;
  watch: UseFormReturn<EndpointFormValues>["watch"];
  setValue: UseFormReturn<EndpointFormValues>["setValue"];
  Section: (props: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    children: ReactNode;
  }) => React.ReactNode;
}) {
  const copy = PARAM_COPY[name];
  const columnCount = copy.showType ? 6 : 5;

  return (
    <Section icon={icon} title={title} description={hint}>
      <ParameterTable label={`${title} editor`} caption={`${title}. Edit values directly in each cell.`}
        columns={[
          { label: copy.nameLabel, width: "w-[22%]" },
          ...(copy.showType ? [{ label: "Type", width: "w-28" }] : []),
          { label: copy.valueLabel, width: "w-[24%]" },
          { label: "Description" },
          { label: "Required", width: "w-24", centered: true },
          { label: "Remove", width: "w-11", hiddenLabel: true },
        ]}
        footer={<>
        <button
          type="button"
          onClick={append}
          className="flex min-h-10 items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[color-mix(in_srgb,var(--primary)_40%,var(--muted-foreground))] transition-colors hover:bg-primary/10 hover:text-[color-mix(in_srgb,var(--primary)_55%,var(--foreground))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50 dark:text-[color-mix(in_srgb,var(--primary)_46%,var(--muted-foreground))] dark:hover:bg-primary/[0.08] dark:hover:text-[color-mix(in_srgb,var(--primary)_62%,var(--foreground))]"
        >
          <PlusIcon className="size-3.5" aria-hidden />
          {copy.add}
        </button>
        <span className="pr-3 text-[11px] text-muted-foreground dark:text-muted-foreground">{fields.length} {fields.length === 1 ? "row" : "rows"}</span>
</>}>
              {fields.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="bg-primary/[0.025] px-3 py-6 text-sm text-muted-foreground dark:bg-transparent dark:text-muted-foreground"
                  >
                    {copy.empty}
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => (
                  <ParamTableRow
                    key={field.id}
                    name={name}
                    index={index}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    onRemove={() => remove(index)}
                  />
                ))
              )}

      </ParameterTable>
    </Section>
  );
}

function ParamTableRow({
  name,
  index,
  register,
  watch,
  setValue,
  onRemove,
}: {
  name: ParamSectionName;
  index: number;
  register: UseFormReturn<EndpointFormValues>["register"];
  watch: UseFormReturn<EndpointFormValues>["watch"];
  setValue: UseFormReturn<EndpointFormValues>["setValue"];
  onRemove: () => void;
}) {
  const copy = PARAM_COPY[name];
  const isPath = name === "pathParams";
  const required = watch(`${name}.${index}.required`);
  return (
    <tr className={parameterRowClass(index)}>
      <td className="p-0 align-middle focus-within:bg-white dark:focus-within:bg-primary/[0.04]">
        <Input
          aria-label={`${copy.nameLabel}, row ${index + 1}`}
          readOnly={isPath}
          placeholder={copy.namePlaceholder}
          className={cn(
            cellInputClass,
            "font-mono",
            isPath && "text-foreground/80 dark:text-primary/85",
          )}
          onKeyDown={stopFormSubmit}
          {...register(`${name}.${index}.key`)}
        />
        {copy.showType ? null : (
          <input type="hidden" {...register(`${name}.${index}.type`)} />
        )}
      </td>
      {copy.showType ? (
        <td className="border-l border-primary/10 p-0 align-middle dark:border-primary/10">
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
              aria-label={`Type, row ${index + 1}`}
              className={cn(cellSelectClass, "font-mono text-xs")}
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
        </td>
      ) : null}
      <td className="border-l border-primary/10 p-0 align-middle focus-within:bg-white dark:border-primary/10 dark:focus-within:bg-primary/[0.04]">
        <Input
          aria-label={`${copy.valueLabel}, row ${index + 1}`}
          placeholder={copy.valuePlaceholder}
          className={cn(
            cellInputClass,
            name === "headers" && "font-mono",
          )}
          onKeyDown={stopFormSubmit}
          {...register(`${name}.${index}.value`)}
        />
      </td>
      <td className="border-l border-primary/10 p-0 align-middle focus-within:bg-white dark:border-primary/10 dark:focus-within:bg-primary/[0.04]">
        <Input
          aria-label={`Description, row ${index + 1}`}
          placeholder={copy.descriptionPlaceholder}
          className={cellInputClass}
          onKeyDown={stopFormSubmit}
          {...register(`${name}.${index}.description`)}
        />
      </td>
      <td className="border-l border-primary/10 px-2 text-center align-middle dark:border-primary/10">
        <input
          type="checkbox"
          disabled={isPath}
          checked={required}
          onChange={(event) =>
            setValue(`${name}.${index}.required`, event.target.checked, {
              shouldDirty: true,
            })
          }
          aria-label={`Required, row ${index + 1}`}
          className="size-4 cursor-pointer rounded-sm accent-[var(--ring)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60 dark:accent-primary"
        />
      </td>
      <td className="border-l border-primary/10 px-0.5 text-center align-middle dark:border-primary/10">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove row ${index + 1}`}
          className="text-muted-foreground/70 hover:bg-primary/10 hover:text-destructive dark:text-muted-foreground/70 dark:hover:bg-primary/[0.08]"
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </td>
    </tr>
  );
}
