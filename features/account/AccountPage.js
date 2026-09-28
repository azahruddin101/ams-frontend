"use client";
import { LogOut } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services";
import { changePasswordSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/features/auth/useAuth";
import { Badge, Button, Card, FormError, IconButton, Input, LoadingState, PageHeader } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatTime } from "@/lib/utils";

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const logout = useLogout();
  const form = useZodForm(changePasswordSchema, { currentPassword: "", newPassword: "", confirm: "" });
  const { register, formState: { errors } } = form;
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: authService.sessions });
  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => authService.changePassword({ currentPassword, newPassword }),
    onSuccess: (r) => { toast.success(r.message); logout.mutate(); },
    onError: (e) => applyServerError(form, e),
  });
  const revoke = useMutation({ mutationFn: authService.revokeSession, onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }), onError: (e) => toast.error(getErrorMessage(e)) });

  return (
    <>
      <PageHeader title="Account" description={user?.email} actions={<Button variant="secondary" icon={LogOut} onClick={() => logout.mutate()}>Sign out</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Change password">
          <form method="post" noValidate onSubmit={form.handleSubmit((v) => change.mutate(v))} className="space-y-4">
            <FormError message={errors.root?.server?.message} />
            <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} />
            <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register("newPassword")} />
            <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
            <Button type="submit" loading={change.isPending}>Update password</Button>
            <p className="text-xs text-muted">You&apos;ll be signed out of every device after changing your password.</p>
          </form>
        </Card>
        <Card title="Active sessions">
          {sessions.isLoading ? <LoadingState className="py-6" /> : (
            <ul className="divide-y divide-line">
              {sessions.data?.data.map((s, i) => (
                <li key={s._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0"><p className="truncate font-medium">{s.userAgent?.split(")")[0]?.replace("Mozilla/5.0 (", "") ?? "Unknown device"}</p><p className="text-xs text-muted">{formatDate(s.createdAt)} {formatTime(s.createdAt)} · {s.ipAddress}</p></div>
                  {i === 0 ? <Badge tone="green">Latest</Badge> : <IconButton label="Revoke session" icon={LogOut} onClick={() => revoke.mutate(s._id)} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
