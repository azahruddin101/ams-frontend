"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { loginSchema } from "@/schemas";
import { useLogin } from "@/features/auth/useAuth";
import { AuthCard } from "@/features/auth/AuthCard";
import { Button, Input, FormError } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLE_HOME } from "@/constants";
import { useSessionBootstrap } from "@/features/auth/useAuth";
import { IosInstallHelp, useInstall } from "@/features/pwa/InstallApp";
import { Download } from "lucide-react";

function LoginForm() {
  const form = useZodForm(loginSchema, { email: "", password: "" });
  const login = useLogin();
  const status = useSessionBootstrap();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { canInstall, install, help, closeHelp } = useInstall();
  const { register, formState: { errors } } = form;

  useEffect(() => { if (status === "authenticated") router.replace(ROLE_HOME[user.role]); }, [status, user, router]);

  return (
    <AuthCard title="Sign in" subtitle="For companies, employees, attendance devices and platform admins." footer={<div className="flex flex-col items-center gap-1"><Link href="/forgot-password" className="tap font-medium text-brand-700 hover:underline">Forgot your password?</Link>{canInstall && <button type="button" onClick={install} className="tap gap-1.5 font-medium text-brand-700 hover:underline"><Download className="size-4" aria-hidden />Install the app</button>}</div>}>
      <form method="post" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => login.mutate(v, { onError: (e) => applyServerError(form, e) }))}>
        <FormError message={errors.root?.server?.message} />
        <Input label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" className="w-full" size="lg" loading={login.isPending}>Sign in</Button>
      </form>
      <IosInstallHelp open={help} onClose={closeHelp} />
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
