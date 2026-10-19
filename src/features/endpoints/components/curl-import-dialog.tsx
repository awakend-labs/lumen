"use client";

import { useState } from "react";
import { TerminalSquare } from "lucide-react";
import { parseCurl, type CurlDraft } from "@/lib/curl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CurlImportDialog({ open, onOpenChange, onImport }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (draft: CurlDraft) => void;
}) {
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setCommand(""); setError(""); } }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TerminalSquare className="size-4" />Import from cURL</DialogTitle>
          <DialogDescription>Paste one request to fill the endpoint form, then review and save it. Existing form values will be replaced.</DialogDescription>
        </DialogHeader>
        <form className="grid min-w-0 gap-4" onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          try { onImport(parseCurl(command)); setCommand(""); setError(""); onOpenChange(false); }
          catch (error) { setError(error instanceof Error ? error.message : "Could not import this command."); }
        }}>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="curl-command">cURL command</Label>
            <Textarea id="curl-command" autoFocus rows={8} maxLength={50000} spellCheck={false}
              className="max-h-[45vh] min-h-48 overflow-auto font-mono text-xs" value={command}
              placeholder={`curl 'https://api.example.com/users' \\\n  --header 'Accept: application/json'`}
              onChange={(event) => { setCommand(event.target.value); setError(""); }}
              aria-invalid={Boolean(error)} aria-describedby={error ? "curl-import-error" : "curl-import-note"} />
            {error && <p id="curl-import-error" role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <p id="curl-import-note" className="text-xs leading-5 text-muted-foreground">The command is never run. Authentication headers, cookies, and token query parameters are replaced with placeholders. File uploads and shell scripts are not supported.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setCommand(""); setError(""); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={!command.trim()}>Import request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
