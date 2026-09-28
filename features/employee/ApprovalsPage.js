"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { meService } from "@/services";
import { Button, Card, DataTable, PageHeader, Select, StatusBadge } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { LEAVE_STATUS_META, PAGE_SIZE } from "@/constants";
import { formatDate, fullName, formatLeaveDates } from "@/lib/utils";
import { DecideLeaveDialog } from "./DecideLeaveDialog";

/** Leave requests other employees addressed to the signed-in employee. */
export function ApprovalsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState(null);
  const params = { status, page, limit: PAGE_SIZE };
  const list = useQuery({ queryKey: ["me", "approvals", params], queryFn: () => meService.approvals(params), placeholderData: keepPreviousData });
  const decide = useMutation({
    mutationFn: ({ row, approve, note }) => (approve ? meService.approve(row._id, note) : meService.reject(row._id, note)),
    onSuccess: (r) => { toast.success(r.message); setDeciding(null); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e) => { toast.error(getErrorMessage(e)); setDeciding(null); },
  });

  const columns = [
    { key: "emp", header: "Employee", render: (r) => <div><div className="font-medium">{fullName(r.employeeId)}</div><div className="text-xs text-muted">{r.employeeId?.employeeCode}</div></div> },
    { key: "type", header: "Type", render: (r) => `${r.leaveTypeId?.name ?? ""}${r.leaveTypeId?.isPaid === false ? " (unpaid)" : ""}` },
    { key: "dates", header: "Dates", render: (r) => <span className="block max-w-72 whitespace-normal">{formatLeaveDates(r)}</span> },
    { key: "days", header: "Days", render: (r) => r.days },
    { key: "reports", header: "Reports to", render: (r) => (r.reportingToId ? <div><div>{fullName(r.reportingToId)}</div><div className="text-xs text-muted">{r.reportingToId.departmentId?.name}</div></div> : "—") },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-64 truncate" title={r.reason}>{r.reason || "—"}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge meta={LEAVE_STATUS_META} value={r.status} /> },
    { key: "actions", header: <span className="sr-only">Actions</span>, render: (r) => r.status === "PENDING" && (
      <span className="flex justify-end gap-2"><Button size="sm" variant="success" onClick={() => setDeciding({ row: r, approve: true })}>Approve</Button><Button size="sm" variant="secondary" onClick={() => setDeciding({ row: r, approve: false })}>Reject</Button></span>
    ) },
  ];
  return (
    <>
      <PageHeader title="Leave approvals" description="Requests that employees sent to you. Approved leave is marked in their attendance straight away." />
      <Card padded={false}>
        <div className="max-w-xs border-b border-line p-4">
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All" options={Object.entries(LEAVE_STATUS_META).map(([value, m]) => ({ value, label: m.label }))} />
        </div>
        <DataTable columns={columns} rows={list.data?.data} isLoading={list.isLoading} isError={list.isError} onRetry={list.refetch} pagination={list.data?.pagination} onPage={setPage}
          emptyTitle={status === "PENDING" ? "Nothing waiting for you" : "No requests"} emptyDescription="Requests appear here when an employee chooses you as the approver." />
      </Card>
      <DecideLeaveDialog deciding={deciding} onClose={() => setDeciding(null)} loading={decide.isPending} onConfirm={(note) => decide.mutate({ ...deciding, note })} />
    </>
  );
}
