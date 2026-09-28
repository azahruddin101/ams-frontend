"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, Plus, Power, ScanFace, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceService } from "@/services";
import { deviceSchema, deviceResetSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { Badge, Button, Card, ConfirmDialog, DataTable, Modal, PageHeader } from "@/components/ui";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatTime } from "@/lib/utils";

export function DevicesPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const q = useQuery({ queryKey: ["devices"], queryFn: () => deviceService.list({ limit: 50 }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["devices"] });

  const addForm = useZodForm(deviceSchema, { name: "", email: "", password: "" });
  const resetForm = useZodForm(deviceResetSchema, { password: "" });

  const create = useMutation({ mutationFn: deviceService.create, onSuccess: (r) => { toast.success(r.message); setAdding(false); addForm.reset(); refresh(); }, onError: (e) => applyServerError(addForm, e) });
  const toggle = useMutation({ mutationFn: (d) => deviceService.update(d._id, { isActive: !d.isActive }), onSuccess: (r) => { toast.success(r.message); refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const reset = useMutation({ mutationFn: (v) => deviceService.update(resetting._id, v), onSuccess: () => { toast.success("Password changed. The device was signed out."); setResetting(null); resetForm.reset(); refresh(); }, onError: (e) => applyServerError(resetForm, e) });
  const remove = useMutation({ mutationFn: (d) => deviceService.remove(d._id), onSuccess: (r) => { toast.success(r.message); setRemoving(null); refresh(); }, onError: (e) => { toast.error(getErrorMessage(e)); setRemoving(null); } });

  const columns = [
    { key: "name", header: "Device", render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.email}</div></div> },
    { key: "isActive", header: "Status", render: (r) => (r.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Disabled</Badge>) },
    { key: "lastLoginAt", header: "Last sign-in", render: (r) => (r.lastLoginAt ? `${formatDate(r.lastLoginAt)} ${formatTime(r.lastLoginAt)}` : "Never") },
    { key: "actions", header: <span className="sr-only">Actions</span>, render: (r) => (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Power} loading={toggle.isPending && toggle.variables?._id === r._id} onClick={() => toggle.mutate(r)}>{r.isActive ? "Disable" : "Enable"}</Button>
        <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setResetting(r)}>New password</Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(r)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Attendance devices" description="A device is a login that can only scan faces and mark attendance. Sign in with it on the phone or tablet employees will use."
        actions={<><Link href="/device" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-slate-50"><ScanFace className="size-4" aria-hidden />Scan on this device</Link><Button icon={Plus} onClick={() => setAdding(true)}>Add device</Button></>} />
      <Card padded={false}>
        <DataTable columns={columns} rows={q.data?.data} isLoading={q.isLoading} isError={q.isError} onRetry={q.refetch}
          emptyTitle="No attendance devices yet" emptyDescription="Add one, then sign in with its email and password on the shared phone or tablet. You can also scan directly from this account." />
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add attendance device" size="sm">
        <ResourceForm form={addForm} onSubmit={(v) => create.mutate(v)} submitting={create.isPending} onCancel={() => setAdding(false)} submitLabel="Create device" fields={[
          { name: "name", label: "Device name", required: true, full: true, hint: "e.g. Front desk tablet" },
          { name: "email", label: "Sign-in email", type: "email", required: true, full: true, hint: "Only used to sign this device in" },
          { name: "password", label: "Password", type: "password", required: true, full: true, autoComplete: "new-password", hint: "Min 10 chars, upper + lower + a number" },
        ]} />
      </Modal>
      <Modal open={Boolean(resetting)} onClose={() => setResetting(null)} title={`New password — ${resetting?.name}`} size="sm">
        <ResourceForm form={resetForm} onSubmit={(v) => reset.mutate(v)} submitting={reset.isPending} onCancel={() => setResetting(null)} submitLabel="Change password" fields={[
          { name: "password", label: "New password", type: "password", required: true, full: true, autoComplete: "new-password" },
        ]} />
      </Modal>
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} loading={remove.isPending} onConfirm={() => remove.mutate(removing)}
        title="Delete this device?" message={`“${removing?.name}” will be signed out and can't be used again.`} confirmLabel="Delete" />
    </>
  );
}
