"use client";

import { HashIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResponseStatusField({ id, value, usedCodes, onChange, error }: {
  id: string;
  value: number | "";
  usedCodes: (number | "")[];
  onChange: (value: number | "") => void;
  error?: { message?: string };
}) {
  const duplicate = value !== "" && usedCodes.includes(value) ? value : null;
  const message = duplicate !== null
    ? `Status ${duplicate} is already used by another response. Choose a different code.`
    : error?.message;
  const errorId = `${id}-error`;

  return <><Field data-invalid={Boolean(message) || undefined}>
    <FieldLabel htmlFor={id} className="gap-1.5">
      <HashIcon className="size-3.5 text-muted-foreground" aria-hidden />
      Status
    </FieldLabel>
    <Input id={id} type="number" min={100} max={599}
      className="font-mono tabular-nums" value={value}
      aria-invalid={Boolean(message)} aria-describedby={message ? errorId : undefined}
      onChange={event => onChange(event.target.value === "" ? "" : Number(event.target.value))} />
  </Field>
    <FieldError id={errorId} className="order-last col-span-full" errors={[{ message }]} />
  </>;
}
