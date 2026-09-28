"use client";
import { Controller } from "react-hook-form";
import { Input, Select, Textarea, Checkbox, Combobox, DurationInput } from "@/components/ui";

/** Renders one config-driven field bound to react-hook-form. */
export function FieldRenderer({ field, form }) {
  if (field.type === "custom") return field.render({ form });
  const { register, formState: { errors } } = form;
  const error = errors[field.name]?.message;
  if (field.type === "duration") {
    return <Controller name={field.name} control={form.control} render={({ field: f }) => <DurationInput label={field.label} hint={field.hint} error={error} required={field.required} disabled={field.disabled} name={f.name} value={f.value} onChange={f.onChange} onBlur={f.onBlur} />} />;
  }
  if (field.type === "combobox") {
    return <Controller name={field.name} control={form.control} render={({ field: f }) => <Combobox label={field.label} hint={field.hint} error={error} required={field.required} disabled={field.disabled} placeholder={field.placeholder} maxLength={field.maxLength} addLabel={field.addLabel} options={field.options ?? []} name={f.name} value={f.value} onChange={f.onChange} onBlur={f.onBlur} />} />;
  }
  const common = { label: field.label, hint: field.hint, error, required: field.required, disabled: field.disabled, ...register(field.name) };
  switch (field.type) {
    case "select": return <Select {...common} options={field.options ?? []} placeholder={field.placeholder ?? "Select…"} />;
    case "textarea": return <Textarea {...common} />;
    case "checkbox": return <Checkbox {...common} />;
    default: return <Input {...common} type={field.type ?? "text"} step={field.step} inputMode={field.type === "number" ? "decimal" : undefined} autoComplete={field.autoComplete ?? "off"} />;
  }
}
