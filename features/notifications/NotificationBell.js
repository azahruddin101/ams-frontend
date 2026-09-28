"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { Drawer, IconButton, Button, LoadingState, EmptyState } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => notificationService.list({ limit: 30 }), refetchInterval: 60_000 });
  const readAll = useMutation({ mutationFn: notificationService.readAll, onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const readOne = useMutation({ mutationFn: notificationService.read, onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const unread = q.data?.unreadCount ?? 0;

  return (
    <>
      <div className="relative">
        <IconButton label={unread ? `Notifications, ${unread} unread` : "Notifications"} icon={Bell} onClick={() => setOpen(true)} />
        {unread > 0 && <span aria-hidden className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Notifications">
        <div className="mb-3 flex justify-end"><Button size="sm" variant="secondary" disabled={!unread} loading={readAll.isPending} onClick={() => readAll.mutate()}>Mark all read</Button></div>
        {q.isLoading ? <LoadingState /> : q.data?.data?.length ? (
          <ul className="divide-y divide-line">
            {q.data.data.map((n) => (
              <li key={n._id} className="py-3">
                <button type="button" className="w-full text-left" onClick={() => !n.readAt && readOne.mutate(n._id)}>
                  <p className={n.readAt ? "text-sm text-muted" : "text-sm font-semibold"}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt)} {formatTime(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="You're all caught up" icon={Bell} />}
      </Drawer>
    </>
  );
}
