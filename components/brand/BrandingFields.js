"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { buildBrandPalette, DEFAULT_BRAND } from "@/lib/theme";
import { fileToLogoDataUri } from "@/lib/image";
import { CompanyLogo } from "./CompanyLogo";

const PRESETS = ["#4f46e5", "#0f766e", "#be123c", "#c2410c", "#1d4ed8", "#7e22ce", "#15803d", "#334155"];

/**
 * Logo upload + theme colour with a live preview. Controlled through react-hook-form: it reads/writes the
 * `logo` (data-URI | "" | null) and `primaryColor` (#rrggbb) fields of the surrounding form.
 */
export function BrandingFields({ form, companyName = "Your company" }) {
  const fileRef = useRef(null);
  const [error, setError] = useState(null);
  const logo = form.watch("logo");
  const color = form.watch("primaryColor") || DEFAULT_BRAND;
  const palette = buildBrandPalette(color);
  const colorError = form.formState.errors.primaryColor?.message;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setError(null);
      form.setValue("logo", await fileToLogoDataUri(file), { shouldDirty: true });
    } catch (err) { setError(err.userMessage ?? "Couldn't use that image."); }
  }

  return (
    <div className="space-y-4 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-4">
        <CompanyLogo company={{ name: companyName, logo }} size="size-16" className="border border-line" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={ImagePlus} onClick={() => fileRef.current?.click()}>{logo ? "Change logo" : "Upload logo"}</Button>
            {logo && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => form.setValue("logo", null, { shouldDirty: true })}>Remove</Button>}
          </div>
          <p className="text-xs text-muted">PNG, JPEG or WebP. It&apos;s resized in your browser; nothing is sent until you save.</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="Logo file" onChange={onFile} />
        </div>
      </div>
      <FormError message={error} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Theme colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button key={c} type="button" aria-label={`Use colour ${c}`} aria-pressed={color.toLowerCase() === c}
              onClick={() => form.setValue("primaryColor", c, { shouldDirty: true, shouldValidate: true })}
              className="size-10 rounded-full border-2 border-white ring-1 ring-slate-300 aria-pressed:ring-2 aria-pressed:ring-ink sm:size-8" style={{ background: c }} />
          ))}
          <label className="ml-1 flex items-center gap-2 text-sm">
            <span className="sr-only">Pick a custom colour</span>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_BRAND} onChange={(e) => form.setValue("primaryColor", e.target.value, { shouldDirty: true, shouldValidate: true })} className="h-10 w-12 cursor-pointer rounded border border-line bg-white p-0.5 sm:h-8 sm:w-10" />
            <input aria-label="Hex colour" value={color} maxLength={7} spellCheck={false} onChange={(e) => form.setValue("primaryColor", e.target.value, { shouldDirty: true, shouldValidate: true })}
              className="h-10 w-28 rounded border border-line px-2 font-mono text-base sm:h-8 sm:w-24 sm:text-sm" />
          </label>
        </div>
        {colorError && <p role="alert" className="mt-1 text-xs text-red-600">{colorError}</p>}
      </fieldset>

      <div aria-label="Preview" className="rounded-lg border border-line p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ background: palette[600] }}>Button</span>
          <span className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: palette[50], color: palette[700] }}>Active menu item</span>
          <span className="h-3 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${palette[600]}, ${palette[800]})` }} />
        </div>
      </div>
    </div>
  );
}
