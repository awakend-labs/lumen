"use client";

import { HashIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESPONSE_STATUS_CODES } from "@/lib/response-status";

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

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Field data-invalid={Boolean(message) || undefined}>
        <FieldLabel htmlFor={id} className="gap-1.5">
          <HashIcon className="size-3.5 text-muted-foreground" aria-hidden />
          Status
        </FieldLabel>
        <Select value={String(value)} onValueChange={next => onChange(Number(next))}>
          <SelectTrigger
            id={id}
            className="w-full text-xs tabular-nums"
            aria-invalid={Boolean(message)}
            aria-describedby={message ? errorId : undefined}
          >
            <SelectValue placeholder="Code">{value === "" ? undefined : value}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 w-80">
            {value !== "" && !RESPONSE_STATUS_CODES.some(([code]) => code === value) && (
              <SelectItem value={String(value)}>{value} · Existing code</SelectItem>
            )}
            {RESPONSE_STATUS_CODES.map(([code, label]) => (
              <SelectItem key={code} value={String(code)} disabled={usedCodes.includes(code)}>
                <span className="font-mono tabular-nums">{code}</span>
                <span>{label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <FieldError id={errorId} errors={[{ message }]} />
    </div>
  );
}
