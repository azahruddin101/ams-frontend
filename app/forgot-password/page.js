"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services";
import { forgotSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { AuthCard } from "@/features/auth/AuthCard";
import { Button, Input, FormError } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useZodForm(forgotSchema, { email: "" });
  const m = useMutation({ mutationFn: authService.forgotPassword, onSuccess: () => setSent(true), onError: (e) => applyServerError(form, e) });
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you instructions if the account exists." footer={<Link href="/login" className="font-medium text-brand-700 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">If an account exists for that email, reset instructions are on their way.</p>
      ) : (
        <form method="post" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
          <FormError message={form.formState.errors.root?.server?.message} />
          <Input label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register("email")} />
          <Button type="submit" className="w-full" loading={m.isPending}>Send reset link</Button>
        </form>
      )}
    </AuthCard>
  );
}
