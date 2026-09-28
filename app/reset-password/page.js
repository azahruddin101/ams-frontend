"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services";
import { resetSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { AuthCard } from "@/features/auth/AuthCard";
import { Button, Input, FormError } from "@/components/ui";
import { toast } from "@/stores/uiStore";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const form = useZodForm(resetSchema, { token, newPassword: "" });
  const { register, formState: { errors } } = form;
  const m = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: (r) => { toast.success(r.message); router.replace("/login"); },
    onError: (e) => applyServerError(form, e),
  });
  return (
    <AuthCard title="Choose a new password" subtitle="At least 10 characters with upper, lower case and a number." footer={<Link href="/login" className="font-medium text-brand-700 hover:underline">Back to sign in</Link>}>
      <form method="post" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
        <FormError message={errors.root?.server?.message} />
        {!token && <Input label="Reset token" error={errors.token?.message} {...register("token")} />}
        <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register("newPassword")} />
        <Button type="submit" className="w-full" loading={m.isPending}>Reset password</Button>
      </form>
    </AuthCard>
  );
}
export default function ResetPasswordPage() { return <Suspense><ResetForm /></Suspense>; }
