"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

export const useZodForm = (schema, defaultValues, options) => useForm({ resolver: zodResolver(schema), defaultValues, ...options });

/** Maps an API error onto the form: field-level where possible, otherwise a root message. */
export function applyServerError(form, error) {
  const fields = getFieldErrors(error);
  const known = Object.keys(fields).filter((f) => f in form.getValues());
  known.forEach((f) => form.setError(f, { type: "server", message: fields[f] }));
  if (!known.length) form.setError("root.server", { type: "server", message: getErrorMessage(error) });
}
