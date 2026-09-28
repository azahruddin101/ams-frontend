"use client";
import { Button, FormError } from "@/components/ui";
import { FieldRenderer } from "./FieldRenderer";

export function ResourceForm({ form, fields, onSubmit, submitting, submitLabel = "Save", onCancel }) {
  const rootError = form.formState.errors.root?.server?.message;
  return (
    <form method="post" onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={rootError} />
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.filter((f) => !f.hidden?.(form.watch())).map((f) => (
          <div key={f.name} className={f.full || f.type === "textarea" || f.type === "checkbox" || f.type === "custom" ? "sm:col-span-2" : undefined}>
            <FieldRenderer field={f} form={form} />
          </div>
        ))}
      </div>
      {/* Sticky on phones: the submit button is always in reach, no scrolling to the bottom of a long form */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-2 flex justify-end gap-2 border-t border-line bg-white/95 px-5 py-3 backdrop-blur max-sm:[&>*]:flex-1">
        {onCancel && <Button variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
