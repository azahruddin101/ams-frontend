"use client";
import { useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { formatDate, fullName, formatLeaveDates } from "@/lib/utils";

/** Approve / reject confirmation with an optional note for the employee. `deciding` = { row, approve } | null */
export function DecideLeaveDialog({ deciding, onClose, onConfirm, loading }) {
  const [note, setNote] = useState("");
  const row = deciding?.row;
  const close = () => { setNote(""); onClose(); };
  return (
    <Modal open={Boolean(deciding)} onClose={close} title={deciding?.approve ? "Approve this leave?" : "Reject this leave?"} size="sm">
      {row && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{fullName(row.employeeId)}</span> · {row.leaveTypeId?.name} · {formatLeaveDates(row)} ({row.days} day{row.days === 1 ? "" : "s"})
          </p>
          <p className="text-sm text-muted">{deciding.approve ? "Those days will be marked “On leave” in attendance and taken from the balance." : "Nothing changes in attendance, and the days go back to the balance."}</p>
          <Textarea label="Note for the employee (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={loading}>Cancel</Button>
            <Button variant={deciding.approve ? "success" : "danger"} loading={loading} onClick={() => { onConfirm(note.trim() || undefined); setNote(""); }}>{deciding.approve ? "Approve" : "Reject"}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
