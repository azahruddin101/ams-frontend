"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditService } from "@/services";
import { Badge, Card, DataTable, PageHeader } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/utils";
import { PAGE_SIZE } from "@/constants";

export function AuditPage() {
  const [page, setPage] = useState(1);
  const params = { page, limit: PAGE_SIZE };
  const q = useQuery({ queryKey: ["audit", params], queryFn: () => auditService.list(params), placeholderData: keepPreviousData });
  const columns = [
    { key: "t", header: "When", render: (r) => `${formatDate(r.timestamp)} ${formatTime(r.timestamp)}` },
    { key: "a", header: "Action", render: (r) => <Badge tone="blue">{r.action}</Badge> },
    { key: "e", header: "Entity", render: (r) => r.entityType },
    { key: "ip", header: "IP", render: (r) => r.ipAddress ?? "—" },
  ];
  return (
    <>
      <PageHeader title="Audit log" description="Sensitive actions across your company." />
      <Card padded={false}><DataTable columns={columns} rows={q.data?.data} isLoading={q.isLoading} isError={q.isError} onRetry={q.refetch} pagination={q.data?.pagination} onPage={setPage} emptyTitle="No audit events yet" /></Card>
    </>
  );
}
