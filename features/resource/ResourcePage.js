"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { Button, Card, DataTable, Dropdown, Modal, ConfirmDialog, PageHeader, Input } from "@/components/ui";
import { ResourceForm } from "@/components/forms/ResourceForm";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { PAGE_SIZE } from "@/constants";

/**
 * Config-driven list + create/edit/delete page (RHF + Zod + TanStack Query).
 * cfg: { title, description, singular, queryKey, service, columns, schema, fields, defaults, toForm?, toPayload?,
 *        perms:{create,update,delete}, searchable?, extraQueries?: () => ({ fields patch }) }
 */
export function ResourcePage({ cfg, fields: fieldsOverride, extraItems, onSaved }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(undefined);
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [deleting, setDeleting] = useState(null);
  const debounced = useDebounce(search);
  const can = (k) => !cfg.perms?.[k] || hasPermission(user, cfg.perms[k]);
  const fields = fieldsOverride ?? cfg.fields;

  const params = { page, limit: PAGE_SIZE, search: debounced || undefined, ...(sort ?? {}) };
  const list = useQuery({ queryKey: [cfg.queryKey, params], queryFn: () => cfg.service.list(params), placeholderData: keepPreviousData });

  const form = useZodForm(cfg.schema, cfg.defaults);
  const invalidate = () => qc.invalidateQueries({ queryKey: [cfg.queryKey] });

  const save = useMutation({
    mutationFn: (values) => {
      const payload = cfg.toPayload ? cfg.toPayload(values, editing === "new") : values;
      return editing === "new" ? cfg.service.create(payload) : cfg.service.update(editing._id, payload);
    },
    onSuccess: (res) => { toast.success(res.message); const wasNew = editing === "new"; setEditing(null); invalidate(); onSaved?.(res, wasNew); },
    onError: (err) => applyServerError(form, err),
  });
  const remove = useMutation({
    mutationFn: (row) => cfg.service.remove(row._id),
    onSuccess: (res) => { toast.success(res.message); setDeleting(null); invalidate(); },
    onError: (err) => { toast.error(getErrorMessage(err)); setDeleting(null); },
  });

  const openEditor = (row) => {
    form.reset(row === "new" ? cfg.defaults : cfg.toForm ? cfg.toForm(row) : { ...cfg.defaults, ...row });
    setEditing(row);
  };

  const columns = [
    ...cfg.columns,
    (can("update") || can("delete")) && {
      key: "actions", header: <span className="sr-only">Actions</span>, className: "w-12 text-right md:sticky md:right-0 md:bg-white md:shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.12)]",
      render: (row) => (
        <Dropdown label={`Actions for ${row.name ?? row.employeeCode ?? "row"}`} trigger={<MoreHorizontal className="m-2 size-5" aria-hidden />} items={[
          ...(extraItems?.(row) ?? []),
          can("update") && { label: "Edit", icon: Pencil, onClick: () => openEditor(row) },
          can("delete") && { label: "Delete", icon: Trash2, danger: true, onClick: () => setDeleting(row) },
        ]} />
      ),
    },
  ].filter(Boolean);

  const onSort = (key) => setSort((s) => ({ sortBy: key, sortOrder: s?.sortBy === key && s.sortOrder === "asc" ? "desc" : "asc" }));

  return (
    <>
      <PageHeader title={cfg.title} description={cfg.description}
        actions={can("create") && <Button icon={Plus} onClick={() => openEditor("new")}>Add {cfg.singular}</Button>} />
      <Card padded={false}>
        {cfg.searchable !== false && (
          <div className="border-b border-line p-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input aria-label={`Search ${cfg.title}`} placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
        )}
        <DataTable columns={columns} rows={list.data?.data} isLoading={list.isLoading} isError={list.isError} onRetry={list.refetch}
          pagination={list.data?.pagination} onPage={setPage} sort={sort} onSort={onSort}
          emptyTitle={debounced ? "No matches" : `No ${cfg.title.toLowerCase()} yet`}
          emptyDescription={debounced ? "Try a different search." : `Add your first ${cfg.singular.toLowerCase()} to get started.`}
          emptyAction={!debounced && can("create") && <Button size="sm" icon={Plus} onClick={() => openEditor("new")}>Add {cfg.singular}</Button>} />
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? `Add ${cfg.singular}` : `Edit ${cfg.singular}`} size={cfg.modalSize ?? "md"}>
        <ResourceForm form={form} fields={fields} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} onCancel={() => setEditing(null)} submitLabel={editing === "new" ? "Create" : "Save changes"} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.isPending} onConfirm={() => remove.mutate(deleting)}
        title={`Delete ${cfg.singular.toLowerCase()}?`} message={cfg.deleteMessage?.(deleting) ?? `"${deleting?.name ?? deleting?.employeeCode ?? ""}" will be removed. This can't be undone from the app.`} confirmLabel="Delete" />
    </>
  );
}
