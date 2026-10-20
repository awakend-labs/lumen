"use client";

import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { JsonEditorProps } from "./json-editor";

const appearance = EditorView.theme({
  "&": { backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "12px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.75", overflow: "auto" },
  ".cm-content": { padding: "10px 0", minHeight: "200px", caretColor: "var(--foreground)" },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": { backgroundColor: "var(--muted)", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" },
  ".cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary) 3%, transparent)" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  ".cm-tooltip": { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: "4px" },
});
const highlighting = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--foreground)" },
  { tag: tags.string, color: "var(--method-post)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--method-get)" },
  { tag: tags.punctuation, color: "var(--muted-foreground)" },
]));
const jsonLint = jsonParseLinter();

export default function JsonCodeEditor({ id, label, value, onChange, placeholder, invalid, disabled }: JsonEditorProps) {
  const extensions = useMemo(() => [json(), indentUnit.of("  "), appearance, highlighting,
    linter(view => view.state.doc.toString().trim() ? jsonLint(view) : [], { delay: 400 }),
    EditorView.contentAttributes.of({ id, "aria-label": label, "aria-multiline": "true", "aria-invalid": String(Boolean(invalid)) }),
  ], [id, label, invalid]);
  return <CodeMirror value={value} onChange={onChange} placeholder={placeholder}
    theme="none" height="200px" minHeight="200px" maxHeight="200px" extensions={extensions}
    editable={!disabled} readOnly={disabled} indentWithTab={false}
    basicSetup={{ tabSize: 2, drawSelection: false, highlightSelectionMatches: false, searchKeymap: false }}
    className="min-w-0 text-left" />;
}
