/** Admin "Share App" dialog: copyable install link, WhatsApp share and QR code. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setUrl(`${window.location.origin}/install`);
      setCopied(false);
    }
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy the link. Please copy it manually.");
    }
  };

  const whatsapp = () => {
    const text = encodeURIComponent(`Install the Inspector Tracking System app: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" />Share Inspector Tracking System</DialogTitle>
          <DialogDescription>Share this link or QR code with inspectors to install the app on their mobile or desktop devices.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={url} readOnly onChange={() => {}} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Install link" />
            <Button variant="outline" size="sm" className="shrink-0" onClick={copy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-success" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-lg bg-white p-2 shadow-sm"><QRCodeSVG value={url} size={116} marginSize={1} aria-label="QR code for the install link" /></div>
            <div className="max-w-[190px] text-center sm:text-left">
              <p className="flex items-center justify-center gap-1.5 text-sm font-medium sm:justify-start"><QrCode className="h-4 w-4 text-primary" />Scan to install</p>
              <p className="mt-1 text-xs text-muted-foreground">Inspectors can scan this QR code with their phone camera to open the install page directly.</p>
            </div>
          </div>

          <Button onClick={whatsapp} className="w-full bg-[#25D366] text-white hover:bg-[#1eb957]">
            <MessageCircle className="mr-2 h-4 w-4" />Share via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
