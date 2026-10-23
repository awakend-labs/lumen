"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentType } from "react";
import { BracesIcon, WrapTextIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { formatJson } from "@/lib/format-json";
import { cn } from "@/lib/utils";

export type JsonEditorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
};

export const JsonEditor = forwardRef<{ focus: () => void }, JsonEditorProps>(function JsonEditor(props, ref) {
  const { id, label, value, onChange, onBlur, placeholder, invalid, disabled } = props;
  const root = useRef<HTMLDivElement>(null);
  const [Editor, setEditor] = useState<ComponentType<JsonEditorProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formatError, setFormatError] = useState("");
  useEffect(() => {
    let active = true;
    import("./json-code-editor").then(module => { if (active) setEditor(() => module.default); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, []);
  useImperativeHandle(ref, () => ({ focus: () => root.current?.querySelector<HTMLElement>('[role="textbox"], textarea')?.focus() }), []);

  function format() {
    if (disabled) return;
    try { onChange(formatJson(value)); setFormatError(""); }
    catch { setFormatError("Fix the JSON syntax before formatting. Your text has been kept."); }
  }

  return <div ref={root} className="lumen-json-editor min-w-0"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(); }}
    onKeyDownCapture={event => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault(); event.stopPropagation(); format();
      }
    }}>
    <div className={cn("min-w-0 overflow-hidden rounded-md border border-input bg-background transition-colors focus-within:border-[var(--field-focus)]", invalid && "border-destructive")}>
      <div className="flex h-9 items-center justify-between gap-3 border-b border-border bg-muted/40 px-3">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-muted-foreground"><BracesIcon className="size-3" aria-hidden />JSON</span>
        <button type="button" disabled={disabled || !value.trim()} onClick={format}
          aria-label={`Format ${label}`} title="Format JSON (Ctrl/⌘ + Shift + F)"
          className="inline-flex min-h-7 items-center gap-1.5 rounded-sm px-2 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40">
          <WrapTextIcon className="size-3.5" aria-hidden />Format
        </button>
      </div>
      {Editor ? <Editor {...props} onBlur={undefined} onChange={next => { setFormatError(""); onChange(next); }} />
        : <Textarea id={id} aria-label={label} aria-invalid={invalid || undefined} disabled={disabled}
            value={value} placeholder={placeholder} onChange={event => { setFormatError(""); onChange(event.target.value); }}
            className="field-sizing-fixed h-[200px] min-h-[200px] resize-none rounded-sm border-0 bg-transparent font-mono text-xs leading-5 shadow-none dark:bg-transparent" />}
    </div>
    {formatError && <p role="alert" className="mt-1.5 text-xs text-destructive">{formatError}</p>}
    {loadFailed && <p role="status" className="mt-1.5 text-xs text-muted-foreground">Code editor unavailable. You can still edit and format JSON here.</p>}
  </div>;
});
