"use client";

import { useState } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResponseStatusField({ id, value, usedCodes, onChange, error }: {
  id: string;
  value: number;
  usedCodes: number[];
  onChange: (value: number) => void;
  error?: { message?: string };
}) {
  const [rejectedCode, setRejectedCode] = useState<number | null>(null);
  const duplicate = usedCodes.includes(value) ? value
    : rejectedCode !== null && usedCodes.includes(rejectedCode) ? rejectedCode : null;
  const message = duplicate !== null
    ? `Status ${duplicate} is already used by another response. Choose a different code.`
    : error?.message;
  const errorId = `${id}-error`;

  return <Field data-invalid={Boolean(message) || undefined}>
    <FieldLabel htmlFor={id}>Status</FieldLabel>
    <Input id={id} type="number" min={100} max={599}
      className="bg-background font-mono dark:bg-background" value={value}
      aria-invalid={Boolean(message)} aria-describedby={message ? errorId : undefined}
      onChange={event => {
        const next = Number(event.target.value);
        if (Number.isInteger(next) && next >= 100 && next <= 599 && usedCodes.includes(next)) {
          setRejectedCode(next);
          return;
        }
        setRejectedCode(null);
        onChange(next);
      }} />
    <FieldError id={errorId} errors={[{ message }]} />
  </Field>;
}
