"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const actions: {
  label: string;
  icon: LucideIcon;
  before: string;
  after: string;
  placeholder: string;
}[] = [
  { label: "Heading", icon: Heading2Icon, before: "## ", after: "", placeholder: "Heading" },
  { label: "Bold", icon: BoldIcon, before: "**", after: "**", placeholder: "bold" },
  { label: "Italic", icon: ItalicIcon, before: "*", after: "*", placeholder: "italic" },
  { label: "Code", icon: CodeIcon, before: "`", after: "`", placeholder: "code" },
  { label: "Link", icon: LinkIcon, before: "[", after: "](url)", placeholder: "link text" },
  { label: "List", icon: ListIcon, before: "- ", after: "", placeholder: "list item" },
];

export function MarkdownWriteField({
  registration,
  value,
  onValue,
  className,
}: {
  registration: UseFormRegisterReturn;
  value: string;
  onValue: (value: string) => void;
  className?: string;
}) {
  const field = useRef<HTMLTextAreaElement | null>(null);

  function apply(
    before: string,
    after: string,
    placeholder: string,
  ) {
    const textarea = field.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const inner = selected || placeholder;
    const next =
      textarea.value.slice(0, start) + before + inner + after + textarea.value.slice(end);
    onValue(next);
    const from = start + before.length;
    const to = from + inner.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selected ? to + after.length : from, selected ? to + after.length : to);
    });
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-0.5 border-b border-border/80 px-1.5 py-1">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.label}
            aria-label={action.label}
            className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(action.before, action.after, action.placeholder)}
          >
            <action.icon className="size-3.5" aria-hidden />
          </button>
        ))}
      </div>
      <Textarea
        rows={8}
        placeholder="What this endpoint does, who should call it, and any caveats."
        className="min-h-40 resize-y border-0 bg-transparent font-mono text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
        {...registration}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        ref={(node) => {
          field.current = node;
          registration.ref(node);
        }}
      />
    </div>
  );
}
