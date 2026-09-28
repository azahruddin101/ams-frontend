"use client";
import { useCallback, useState } from "react";
import { PauseCircle, PlayCircle, ScanFace } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeService, departmentService, shiftService, faceService } from "@/services";
import { employeeSchema } from "@/schemas";
import { Badge, Button, ConfirmDialog, Modal, StatusBadge } from "@/components/ui";
import { toast } from "@/stores/uiStore";
import { getErrorMessage } from "@/lib/errors";
import { FaceCapture } from "@/features/face/FaceCapture";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { ResourcePage } from "@/features/resource/ResourcePage";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatMoney, fullName } from "@/lib/utils";

const STATUS = { ACTIVE: { label: "Active", tone: "green" }, INACTIVE: { label: "Suspended", tone: "amber" }, TERMINATED: { label: "Terminated", tone: "red" } };
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

const config = {
  title: "Employees", singular: "Employee", description: "Register each employee's face here; they scan it at your attendance device.", queryKey: "employees", modalSize: "lg",
  service: employeeService, schema: employeeSchema,
  defaults: { employeeCode: "", firstName: "", lastName: "", email: "", phone: "", dateOfJoining: "", departmentId: "", shiftId: "", designation: "", employmentType: "FULL_TIME", monthlySalary: "", password: "" },
  perms: { create: "employee.create", update: "employee.update", delete: "employee.delete" },
  deleteMessage: (r) => `${fullName(r)} will be removed from your employee list and their face template deleted, so they can no longer scan. Their past attendance stays in reports. If they might come back, choose Suspend instead.`,
  toForm: (r) => ({
    ...r, dateOfJoining: r.dateOfJoining?.slice(0, 10) ?? "", departmentId: r.departmentId?._id ?? "", shiftId: r.shiftId?._id ?? "",
    phone: r.phone ?? "", designation: r.designation ?? "", monthlySalary: r.monthlySalary ?? "", password: "",
  }),
  toPayload: (v) => {
    const payload = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== "" && x !== undefined));
    // never send server-managed fields back
    for (const k of ["_id", "companyId", "userId", "createdAt", "updatedAt", "deletedAt", "deletedBy", "__v", "faceRegistered", "hasLogin"]) delete payload[k];
    return payload;
  },
  columns: [
    { key: "employeeCode", header: "Code", sortable: true, render: (r) => <Badge>{r.employeeCode}</Badge> },
    { key: "firstName", header: "Name", sortable: true, render: (r) => <div><div className="font-medium">{fullName(r)}</div><div className="text-xs text-muted">{r.email}</div></div> },
    { key: "department", header: "Department", render: (r) => r.departmentId?.name ?? "—" },
    { key: "shift", header: "Shift", render: (r) => r.shiftId?.name ?? "—" },
    { key: "designation", header: "Designation", render: (r) => r.designation ?? "—" },
    { key: "monthlySalary", header: "Salary / month", render: (r) => formatMoney(r.monthlySalary, useAuthStore.getState().user?.company?.currency) },
    { key: "dateOfJoining", header: "Joined", sortable: true, render: (r) => formatDate(r.dateOfJoining) },
    { key: "login", header: "Login", render: (r) => (r.hasLogin ? <Badge tone="green">Can sign in</Badge> : <Badge>None</Badge>) },
    { key: "face", header: "Face", render: (r) => (r.faceRegistered ? <Badge tone="green">Registered</Badge> : <Badge tone="amber">Not registered</Badge>) },
    { key: "status", header: "Status", render: (r) => <StatusBadge meta={STATUS} value={r.status} /> },
  ],
};

export function EmployeesPage() {
  const qc = useQueryClient();
  const [faceFor, setFaceFor] = useState(null); // { _id, firstName, lastName, isNew }
  const openCamera = useAttendanceStore((s) => s.open);
  const resetCamera = useAttendanceStore((s) => s.reset);
  const [statusChange, setStatusChange] = useState(null); // { row, to: "INACTIVE" | "ACTIVE" }
  const changeStatus = useMutation({
    mutationFn: ({ row, to }) => employeeService.update(row._id, { status: to }),
    onSuccess: (res, { row, to }) => {
      toast.success(to === "INACTIVE" ? `${fullName(row)} suspended` : `${fullName(row)} reactivated`);
      setStatusChange(null);
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (to === "ACTIVE") startFace(row); // suspending deleted their face template: re-register it right away
    },
    onError: (e) => { toast.error(getErrorMessage(e)); setStatusChange(null); },
  });
  const startFace = (emp, isNew = false) => { openCamera("REGISTER"); setFaceFor({ ...emp, isNew }); };
  const closeFace = useCallback(() => { setFaceFor(null); resetCamera(); qc.invalidateQueries({ queryKey: ["employees"] }); }, [qc, resetCamera]);
  const onCapture = useCallback((embedding) => faceService.registerFor(faceFor._id, embedding), [faceFor]);
  const depts = useQuery({ queryKey: ["departments", "options"], queryFn: () => departmentService.list({ limit: 100 }) });
  const shifts = useQuery({ queryKey: ["shifts", "options"], queryFn: () => shiftService.list({ limit: 100 }) });
  const designations = useQuery({ queryKey: ["employees", "designations"], queryFn: employeeService.designations });
  const opts = (q) => (q.data?.data ?? []).map((d) => ({ value: d._id, label: d.name }));
  const currency = useAuthStore((s) => s.user?.company?.currency) ?? "";
  const isEmployee = useAuthStore((s) => s.user?.role) === "EMPLOYEE"; // an employee with the authority to add employees

  const fields = [
    { name: "employeeCode", label: "Employee code", required: true }, { name: "email", label: "Work email", type: "email", required: true },
    { name: "firstName", label: "First name", required: true }, { name: "lastName", label: "Last name", required: true },
    { name: "phone", label: "Phone", type: "tel" }, { name: "dateOfJoining", label: "Date of joining", type: "date", required: true },
    { name: "departmentId", label: "Department", type: "select", options: opts(depts), placeholder: "None", hint: "Decides which attendance and salary rules apply" },
    { name: "shiftId", label: "Shift", type: "select", options: opts(shifts), placeholder: "Company default" },
    { name: "designation", label: "Designation", type: "combobox", maxLength: 80, options: designations.data?.data ?? [], placeholder: "Choose or type a designation", addLabel: "Use new designation",
      hint: "Pick one you've used before, or type a new one — it will be offered next time" },
    { name: "employmentType", label: "Employment type", type: "select", options: EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t.replace("_", " ").toLowerCase() })), placeholder: undefined },
    { name: "monthlySalary", label: `Monthly salary${currency && ` (${currency})`}`, type: "number", step: "any", required: true, hint: "Before deductions. Used for the salary report." },
    // Only the company resets an existing employee's password.
    { name: "password", label: "Login password", type: "password", autoComplete: "new-password", hidden: (v) => isEmployee && Boolean(v._id),
      hint: "Optional. Lets the employee sign in with their work email to see their dashboard and apply for leave. When editing, fill this only to set a new password." },
  ];
  return (
    <>
      <ResourcePage cfg={config} fields={fields} onSaved={(res, wasNew) => wasNew && startFace(res.data, true)}
        extraItems={(row) => [
          row.status === "ACTIVE" && { label: row.faceRegistered ? "Re-register face" : "Register face", icon: ScanFace, onClick: () => startFace(row) },
          row.status === "ACTIVE" && { label: "Suspend", icon: PauseCircle, onClick: () => setStatusChange({ row, to: "INACTIVE" }) },
          row.status === "INACTIVE" && { label: "Reactivate", icon: PlayCircle, onClick: () => setStatusChange({ row, to: "ACTIVE" }) },
        ].filter(Boolean)} />
      <ConfirmDialog open={Boolean(statusChange)} onClose={() => setStatusChange(null)} loading={changeStatus.isPending} onConfirm={() => changeStatus.mutate(statusChange)}
        tone={statusChange?.to === "INACTIVE" ? "danger" : "success"} confirmLabel={statusChange?.to === "INACTIVE" ? "Suspend" : "Reactivate"}
        title={statusChange?.to === "INACTIVE" ? `Suspend ${fullName(statusChange?.row)}?` : `Reactivate ${fullName(statusChange?.row)}?`}
        message={statusChange?.to === "INACTIVE"
          ? "They can no longer scan in or out, and their face template is deleted. Their attendance history is kept, and they are left out of daily absence marking. You can reactivate them later."
          : "They'll be able to scan again. Their face was deleted when they were suspended, so you'll be asked to register it again now."} />
      <Modal open={Boolean(faceFor)} onClose={closeFace} title={`Register face — ${fullName(faceFor)}`} size="sm">
        {faceFor && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Ask {faceFor.firstName} to look straight at the camera in good lighting. Only a numeric template is stored, never the photo.</p>
            <FaceCapture onCapture={onCapture} onDone={closeFace} verifyingLabel="Saving face…" successLabel="Face registered" />
            {faceFor.isNew && <div className="flex justify-center"><Button variant="ghost" onClick={closeFace}>Skip for now</Button></div>}
          </div>
        )}
      </Modal>
    </>
  );
}
