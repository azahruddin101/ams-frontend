import { holidayService } from "@/services";
import { holidaySchema } from "@/schemas";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const holidaysConfig = {
  title: "Holidays", singular: "Holiday", description: "Company holidays are excluded from absence and leave counts.", queryKey: "holidays",
  service: holidayService, schema: holidaySchema, defaults: { name: "", date: "", description: "", recurring: false },
  perms: { create: "holiday.manage", update: "holiday.manage", delete: "holiday.manage" },
  columns: [
    { key: "date", header: "Date", sortable: true, render: (r) => formatDate(r.date) },
    { key: "name", header: "Holiday", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "recurring", header: "Repeats yearly", render: (r) => (r.recurring ? <Badge tone="blue">Yearly</Badge> : "—") },
  ],
  fields: [
    { name: "name", label: "Name", required: true }, { name: "date", label: "Date", type: "date", required: true },
    { name: "description", label: "Description", type: "textarea" }, { name: "recurring", label: "Repeats every year", type: "checkbox" },
  ],
};
