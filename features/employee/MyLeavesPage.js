"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { meService } from "@/services";
import { Button, Card, ConfirmDialog, DataTable, PageHeader, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { LEAVE_STATUS_META, PAGE_SIZE } from "@/constants";
import { formatDate, fullName, formatLeaveDates } from "@/lib/utils";
import { ApplyLeaveModal } from "./ApplyLeaveModal";

export function MyLeavesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [applying, setApplying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(null);
  const params = { status, page, limit: PAGE_SIZE };
  const list = useQuery({ queryKey: ["me", "leaves", params], queryFn: () => meService.leaves(params), placeholderData: keepPreviousData });
  const balance = useQuery({ queryKey: ["me", "leave-balance"], queryFn: meService.leaveBalance });
  const withdraw = useMutation({
    mutationFn: meService.withdrawLeave,
    onSuccess: (r) => { toast.success(r.message); setWithdrawing(null); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e) => { toast.error(getErrorMessage(e)); setWithdrawing(null); },
  });

  const columns = [
    { key: "type", header: "Type", render: (r) => <span className="font-medium">{r.leaveTypeId?.name}</span> },
    { key: "dates", header: "Dates", render: (r) => <span className="block max-w-72 whitespace-normal">{formatLeaveDates(r)}</span> },
    { key: "days", header: "Days", render: (r) => r.days },
    { key: "approver", header: "Sent to", render: (r) => (r.approverId ? fullName(r.approverId) : "Company") },
    { key: "reports", header: "Reports to", render: (r) => (r.reportingToId ? fullName(r.reportingToId) : "—") },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-56 truncate" title={r.reason}>{r.reason || "—"}</span> },
    { key: "status", header: "Status", render: (r) => <div><StatusBadge meta={LEAVE_STATUS_META} value={r.status} />{r.decisionNote && <div className="mt-1 max-w-56 truncate text-xs text-muted" title={r.decisionNote}>{r.decisionNote}</div>}</div> },
    { key: "actions", header: <span className="sr-only">Actions</span>, render: (r) => r.status === "PENDING" && <Button size="sm" variant="ghost" onClick={() => setWithdrawing(r)}>Withdraw</Button> },
  ];

  return (
    <>
      <PageHeader title="My leave" description="Apply for leave and follow your requests. Leave counts once it is approved." actions={<Button icon={Plus} onClick={() => setApplying(true)}>Apply for leave</Button>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(balance.data?.data ?? []).map((b) => (
          <div key={b.leaveTypeId} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="truncate text-sm text-muted">{b.name}{!b.isPaid && " · unpaid"}</p>
            <p className="text-2xl font-semibold tabular-nums">{b.remaining}<span className="text-sm font-normal text-muted"> of {b.quota} left</span></p>
            <p className="text-xs text-muted">{b.used} used{b.pending ? ` · ${b.pending} waiting for approval` : ""}</p>
          </div>
        ))}
      </div>
      <Card padded={false}>
        <div className="max-w-xs border-b border-line p-4">
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={Object.entries(LEAVE_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
        </div>
        <DataTable columns={columns} rows={list.data?.data} isLoading={list.isLoading} isError={list.isError} onRetry={list.refetch} pagination={list.data?.pagination} onPage={setPage}
          emptyTitle="No leave yet" emptyDescription="Use “Apply for leave” to send your first request." />
      </Card>
      <ApplyLeaveModal open={applying} onClose={() => setApplying(false)} />
      <ConfirmDialog open={Boolean(withdrawing)} onClose={() => setWithdrawing(null)} loading={withdraw.isPending} onConfirm={() => withdraw.mutate(withdrawing._id)}
        title="Withdraw this request?" message="It will not be sent for approval any more, and the days go back to your balance." confirmLabel="Withdraw" />
    </>
  );
}
