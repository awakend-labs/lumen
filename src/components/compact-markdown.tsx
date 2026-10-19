import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function CompactMarkdown({ content, className }: { content: string; className?: string }) {
  return <div className={cn("text-sm leading-6 text-muted-foreground [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p+p]:mt-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} allowedElements={["p", "ul", "ol", "li", "strong", "em", "code", "br"]} unwrapDisallowed>{content}</ReactMarkdown>
  </div>;
}
