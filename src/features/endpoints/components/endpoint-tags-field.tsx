"use client";

import { useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 40;

function normalizeTag(raw: string) {
  return raw.trim().replace(/,+$/, "").trim();
}

export function EndpointTagsField({
  id,
  value,
  onChange,
  onBlur,
  "aria-invalid": ariaInvalid,
  disabled,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return false;
    if (tag.length > MAX_TAG_LENGTH) {
      toast.error(`Tags must be ${MAX_TAG_LENGTH} characters or fewer`);
      return false;
    }
    if (value.includes(tag)) {
      setDraft("");
      return true;
    }
    if (value.length >= MAX_TAGS) {
      toast.error(`You can add up to ${MAX_TAGS} tags`);
      return false;
    }
    onChange([...value, tag]);
    setDraft("");
    return true;
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function commitDraft() {
    if (draft.trim()) addTag(draft);
    onBlur?.();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.includes(",")) return;
    event.preventDefault();
    for (const part of text.split(",")) {
      if (!addTag(part)) break;
    }
  }

  const atLimit = value.length >= MAX_TAGS;

  return (
    <div
      role="group"
      aria-labelledby={id ? `${id}-label` : undefined}
      className={cn(
        "flex min-h-8 w-full cursor-text flex-wrap items-center gap-1.5 rounded-sm border border-input bg-transparent px-2 py-1.5 transition-colors",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        ariaInvalid &&
          "border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="h-6 gap-0.5 border border-primary/30 bg-primary/10 pr-1 pl-2 font-normal text-primary dark:border-primary/25 dark:bg-primary/15"
        >
          <span className="font-mono text-[11px] text-primary/70" aria-hidden>
            #
          </span>
          <span className="max-w-[12rem] truncate">{tag}</span>
          <button
            type="button"
            className="rounded-sm p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
            aria-label={`Remove tag ${tag}`}
            onClick={() => removeTag(tag)}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        disabled={disabled || atLimit}
        placeholder={
          atLimit
            ? "Tag limit reached"
            : value.length === 0
              ? "Type a tag and press Enter"
              : "Add another…"
        }
        className="min-w-[10ch] flex-1 border-0 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
        onPaste={onPaste}
        aria-invalid={ariaInvalid}
      />
    </div>
  );
}
