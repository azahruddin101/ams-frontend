"use client";
import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "./Button";

/** Native <dialog>: focus trap, Esc-to-close and aria-modal come from the platform. */
function DialogShell({ open, onClose, title, children, panelClass, wrapperClass, animation }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()} className={cn("m-0 h-full w-full bg-transparent", wrapperClass)}>
      {open && (
        <div className={cn("overscroll-contain bg-white shadow-xl", panelClass, animation)}>
          {/* Sticky header: the close button never scrolls out of reach on a long form. */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white/95 px-5 py-3 backdrop-blur sm:py-4">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <IconButton label="Close" icon={X} onClick={onClose} className="-mr-2" />
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Centred card on ≥sm; full-width bottom sheet with a drag-handle affordance on phones. */
export function Modal({ open, onClose, title, children, size = "md" }) {
  const sizes = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };
  return (
    <DialogShell open={open} onClose={onClose} title={title}
      wrapperClass="open:flex items-end sm:open:grid sm:place-items-center sm:p-4"
      panelClass={cn("max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[90dvh] sm:rounded-2xl sm:pb-0", sizes[size])} animation="animate-modal">
      <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
      <div className="p-5">{children}</div>
    </DialogShell>
  );
}

export function Drawer({ open, onClose, title, children }) {
  return (
    <DialogShell open={open} onClose={onClose} title={title} wrapperClass="open:flex justify-end"
      panelClass="h-dvh w-full max-w-full overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:max-w-lg" animation="animate-drawer">
      <div className="p-5">{children}</div>
    </DialogShell>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", message, confirmLabel = "Confirm", loading, tone = "danger" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
