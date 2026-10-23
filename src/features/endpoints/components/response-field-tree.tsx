import { BracesIcon, KeyRoundIcon } from "lucide-react";
import { responseContractFields } from "@/lib/response-contract";
import { cn } from "@/lib/utils";

function fieldLabel(path: string) {
  if (path === "$") return "Response body";
  const segment = path.split(".").pop();
  return segment ?? path;
}

function fieldDepth(path: string) {
  if (path === "$") return 0;
  return Math.max(0, path.split(".").length - 1);
}

export function ResponseFieldTree({ schema }: { schema: unknown }) {
  const rows = responseContractFields(schema);
  const visible =
    rows.length > 1 && rows[0].type === "object" ? rows.slice(1) : rows;
  return (
    <div className="lumen-response-fields min-w-0 overflow-hidden rounded-md border border-border/70">
      <div className="border-b border-border/70 bg-muted/25 px-3 py-2.5">
        <h4 className="text-xs font-semibold">Response fields</h4>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Required means always present. Null is a separate allowed value.
        </p>
      </div>
      <div className="max-h-80 overflow-auto [scrollbar-width:thin]">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">
            Response field types, required fields, and nullable values
          </caption>
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-24" />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Presence</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((field, index) => {
              const depth = fieldDepth(field.path);
              const label = fieldLabel(field.path);
              const isObject = field.type === "object";
              return (
                <tr
                  key={`${field.path}-${index}`}
                  className="group/row border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <th
                    scope="row"
                    className={cn(
                      "px-3 py-2 align-middle font-normal",
                      field.description ? "align-top" : undefined,
                    )}
                  >
                    <div
                      className="flex min-w-0 items-start gap-2"
                      style={{ paddingLeft: `${depth * 14}px` }}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm",
                          isObject
                            ? "bg-muted text-muted-foreground"
                            : "text-muted-foreground dark:text-muted-foreground/70",
                        )}
                        aria-hidden
                      >
                        {isObject ? (
                          <BracesIcon className="size-3" />
                        ) : (
                          <KeyRoundIcon className="size-3" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <code
                          title={field.path === "$" ? "Response body" : field.path}
                          className="font-mono text-[13px] font-medium leading-5 tracking-tight text-foreground"
                        >
                          {label}
                        </code>
                        {field.description ? (
                          <p className="mt-0.5 max-w-xs font-sans text-[11px] leading-relaxed text-muted-foreground">
                            {field.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </th>
                  <td
                    className={cn(
                      "px-2 py-2 align-middle font-mono text-[11px] leading-5 text-muted-foreground",
                      field.description ? "align-top" : undefined,
                    )}
                  >
                    {field.type}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right align-middle text-[10px] font-medium leading-5 tracking-wide",
                      field.description ? "align-top" : undefined,
                      field.required
                        ? "text-stash-green"
                        : "text-muted-foreground",
                    )}
                  >
                    {field.required ? "required" : "optional"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
