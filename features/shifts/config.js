import { shiftService } from "@/services";
import { shiftSchema } from "@/schemas";
import { Badge } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export const shiftsConfig = {
  title: "Shifts", singular: "Shift", description: "Working schedules. Overnight shifts (e.g. 21:00 → 06:00) are supported.", queryKey: "shifts",
  service: shiftService, schema: shiftSchema,
  defaults: { name: "", startTime: "09:00", endTime: "18:00", breakDuration: 60, gracePeriod: 10, requiredWorkingMinutes: 480, allowOvertime: true },
  perms: { create: "shift.create", update: "shift.update", delete: "shift.delete" },
  toPayload: (v) => ({ ...v, overtimeAfterMinutes: v.allowOvertime ? v.requiredWorkingMinutes : undefined }),
  columns: [
    { key: "name", header: "Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "startTime", header: "Time", sortable: true, render: (r) => <>{r.startTime} → {r.endTime} {r.endTime <= r.startTime && <Badge tone="purple">Overnight</Badge>}</> },
    { key: "gracePeriod", header: "Grace", render: (r) => formatDuration(r.gracePeriod) },
    { key: "requiredWorkingMinutes", header: "Required", render: (r) => formatDuration(r.requiredWorkingMinutes) },
    { key: "allowOvertime", header: "Overtime", render: (r) => (r.allowOvertime ? <Badge tone="green">Allowed</Badge> : <Badge>Off</Badge>) },
  ],
  fields: [
    { name: "name", label: "Shift name", required: true, full: true },
    { name: "startTime", label: "Start", type: "time", required: true }, { name: "endTime", label: "End", type: "time", required: true, hint: "Earlier than start = overnight" },
    { name: "breakDuration", label: "Break", type: "duration" }, { name: "gracePeriod", label: "Grace period", type: "duration" },
    { name: "requiredWorkingMinutes", label: "Required working time", type: "duration", required: true }, { name: "allowOvertime", label: "Allow overtime", type: "checkbox" },
  ],
};
