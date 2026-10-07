import { useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  disabled?: boolean;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", destructive, requireReason, reasonLabel = "Reason", onConfirm, children }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setReason(""); setErr(""); } }}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {requireReason && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{reasonLabel}</label>
            <Textarea value={reason} maxLength={300} onChange={(e) => { setReason(e.target.value); setErr(""); }} />
            {err && <p className="text-xs text-brand">{err}</p>}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? buttonVariants({ variant: "brand" }) : undefined}
            onClick={(e) => {
              if (requireReason && reason.trim().length < 3) { e.preventDefault(); setErr("Please enter a reason (at least 3 characters)."); return; }
              onConfirm(reason.trim());
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
