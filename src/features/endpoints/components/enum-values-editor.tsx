"use client";
import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EnumValuesEditor({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => { const next = value.trim(); if (next && !values.includes(next) && values.length < 100) { onChange([...values, next]); setValue(""); } };
  return <div className="grid gap-2 rounded-md border border-border p-2">
    <span className="text-xs text-muted-foreground">Allowed values</span>
    {values.length > 0 && <ul className="flex flex-wrap gap-1">{values.map((item, index) => <li key={`${index}-${item}`} className="flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
      <span className="break-all">{item}</span><button type="button" aria-label={`Remove allowed value ${item}`} onClick={() => onChange(values.filter((_, i) => i !== index))} className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-background"><XIcon className="size-3" /></button>
    </li>)}</ul>}
    <div className="flex gap-1"><Input aria-label="New allowed value" value={value} maxLength={500} placeholder="Add a value" onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} className="h-8 min-w-0" />
      <Button type="button" variant="outline" size="icon-sm" aria-label="Add allowed value" disabled={!value.trim() || values.includes(value.trim()) || values.length >= 100} onClick={add}><PlusIcon /></Button></div>
  </div>;
}
