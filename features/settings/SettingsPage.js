"use client";
import { useEffect } from "react";
import { LocateFixed } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services";
import { settingsSchema } from "@/schemas";
import { useZodForm, applyServerError } from "@/hooks/useZodForm";
import { Button, Card, FormError, Input, PageHeader, QueryBoundary, Select } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { BrandingFields } from "@/components/brand/BrandingFields";
import { DEFAULT_BRAND } from "@/lib/theme";

export const timezoneOptions = () => (Intl.supportedValuesOf?.("timeZone") ?? ["UTC", "Asia/Kolkata"]).map((z) => ({ value: z, label: z }));

export function SettingsPage() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const q = useQuery({ queryKey: ["company", "mine"], queryFn: companyService.mine });
  const form = useZodForm(settingsSchema, { name: "", timezone: "", currency: "INR", latitude: "", longitude: "", logo: null, primaryColor: DEFAULT_BRAND });
  const { register, formState: { errors } } = form;

  useEffect(() => {
    const c = q.data?.data;
    if (c) form.reset({ name: c.name, timezone: c.timezone, currency: c.currency, logo: c.logo ?? null, primaryColor: c.theme?.primaryColor ?? DEFAULT_BRAND, latitude: c.settings?.geofence?.latitude ?? "", longitude: c.settings?.geofence?.longitude ?? "" });
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: ({ latitude, longitude, logo, primaryColor, ...rest }) => companyService.updateMine({ ...rest, logo: logo ?? null, theme: { primaryColor }, ...(latitude !== "" && longitude !== "" && latitude != null && { settings: { geofence: { latitude: Number(latitude), longitude: Number(longitude) } } }) }),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["company"] }); setUser({ ...user, company: { ...user.company, name: r.data.name, timezone: r.data.timezone, currency: r.data.currency, logo: r.data.logo ?? null, theme: r.data.theme } }); },
    onError: (e) => applyServerError(form, e),
  });

  const useMyLocation = () => navigator.geolocation?.getCurrentPosition(
    (p) => { form.setValue("latitude", Number(p.coords.latitude.toFixed(6)), { shouldDirty: true }); form.setValue("longitude", Number(p.coords.longitude.toFixed(6)), { shouldDirty: true }); },
    () => toast.error("Couldn't read your location. Allow location access or enter coordinates manually."),
    { enableHighAccuracy: true, timeout: 10000 }
  );

  return (
    <>
      <PageHeader title="Company settings" />
      <QueryBoundary query={q}>
        {() => (
          <form method="post" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6">
            <FormError message={errors.root?.server?.message} />
            <Card title="Company">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Company name" required error={errors.name?.message} {...register("name")} />
                <Select label="Timezone" required options={timezoneOptions()} error={errors.timezone?.message} hint="All attendance dates and times are evaluated in this timezone." {...register("timezone")} />
                <Input label="Currency (ISO code)" maxLength={3} error={errors.currency?.message} {...register("currency")} />
              </div>
            </Card>
            <Card title="Branding">
              <p className="mb-4 text-sm text-muted">Your logo and colour appear across your dashboard, your attendance devices and the scanner screen.</p>
              <BrandingFields form={form} companyName={form.watch("name")} />
            </Card>
            <Card title="Office location" action={<Button size="sm" variant="secondary" icon={LocateFixed} onClick={useMyLocation}>Use my location</Button>}>
              <p className="mb-4 text-sm text-muted">Used when geofencing is enabled in the attendance policy. The server measures each employee&apos;s distance from this point.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Latitude" type="number" step="any" error={errors.latitude?.message} {...register("latitude")} />
                <Input label="Longitude" type="number" step="any" error={errors.longitude?.message} {...register("longitude")} />
              </div>
            </Card>
            <div className="flex justify-end"><Button type="submit" size="lg" loading={save.isPending}>Save settings</Button></div>
          </form>
        )}
      </QueryBoundary>
    </>
  );
}
