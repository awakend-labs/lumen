import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ParameterColumn = { label: string; width?: string; centered?: boolean; hiddenLabel?: boolean };

export function ParameterTable({ label, caption, columns, children, footer }: {
  label: string;
  caption?: string;
  columns: ParameterColumn[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return <div className="min-w-0 overflow-hidden rounded-md border border-primary/20 bg-white dark:border-primary/15 dark:bg-card">
    <div className="relative overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[44rem] table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">{caption ?? label}</caption>
        <colgroup>{columns.map(column => <col key={column.label} className={column.width} />)}</colgroup>
        <thead><tr className="bg-primary/[0.08] text-left text-[11px] font-semibold tracking-[0.06em] text-accent-foreground uppercase dark:bg-primary/[0.08] dark:text-primary/85 [&>th]:border-r [&>th]:border-primary/15 [&>th:last-child]:border-r-0 dark:[&>th]:border-primary/10">
          {columns.map(column => <th key={column.label} scope="col" className={cn("px-3 py-2 font-semibold", column.centered && "text-center", column.hiddenLabel && "px-1")}>
            {column.hiddenLabel ? <span className="sr-only">{column.label}</span> : column.label}
          </th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {footer && <div className="flex items-center justify-between border-t border-primary/20 bg-primary/[0.04] dark:border-primary/15 dark:bg-primary/[0.04]">{footer}</div>}
  </div>;
}

export function parameterRowClass(index: number) {
  return cn("group border-t border-primary/10 dark:border-primary/10",
    index % 2 === 1 ? "bg-primary/[0.04] dark:bg-primary/[0.025]" : "bg-white dark:bg-transparent");
}
