import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-sm text-muted-foreground">No description yet.</p>;
  }

  return (
    <div className="markdown text-sm leading-6 text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
