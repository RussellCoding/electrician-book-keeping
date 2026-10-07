import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface Props {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Extra fields shown between the description and the buttons. */
  children?: ReactNode;
  /** Runs on confirm. The dialog stays open until it settles and closes only on success. */
  onConfirm: () => Promise<void>;
  /** Toast prefix when onConfirm throws, e.g. "Couldn't complete the job". */
  errorMessage: string;
}

/** Asks before doing something that matters, then runs it. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, children, onConfirm, errorMessage }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      // Keep the dialog open so the user can retry.
      toast.error(`${errorMessage}: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={busy}>Cancel</AlertDialogCancel>
          <Button className="h-11" onClick={confirm} disabled={busy}>
            {busy ? "Saving…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
