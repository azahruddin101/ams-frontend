import { cn } from "@/lib/utils";

/** The company's logo, or a brand-coloured monogram tile when it has none. */
export function CompanyLogo({ company, className, size = "size-10" }) {
  if (company?.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- data-URI / remote logo of arbitrary size: next/image adds nothing here
    return <img src={company.logo} alt={`${company.name ?? "Company"} logo`} className={cn("shrink-0 rounded-xl bg-white object-contain", size, className)} />;
  }
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-brand-600 text-lg font-semibold text-white", size, className)}>
      {(company?.name ?? "?").trim()[0]?.toUpperCase()}
    </span>
  );
}
