import { departmentService } from "@/services";
import { departmentSchema } from "@/schemas";
import { Badge } from "@/components/ui";

export const departmentsConfig = {
  title: "Departments", singular: "Department", description: "Organise employees into teams, and decide what each team's employees are trusted to do.", queryKey: "departments",
  service: departmentService, schema: departmentSchema, defaults: { name: "", code: "", description: "", canApproveLeave: false, canAddEmployees: false },
  perms: { create: "department.manage", update: "department.manage", delete: "department.manage" },
  toForm: (r) => ({ name: r.name, code: r.code, description: r.description ?? "", canApproveLeave: Boolean(r.canApproveLeave), canAddEmployees: Boolean(r.canAddEmployees), _id: r._id }),
  toPayload: ({ _id, description, ...v }) => ({ ...v, ...(description && { description }) }),
  columns: [
    { key: "name", header: "Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", sortable: true, render: (r) => <Badge>{r.code}</Badge> },
    { key: "description", header: "Description", render: (r) => r.description || "—" },
    { key: "authority", header: "Its employees can", render: (r) => (
      <span className="flex flex-wrap gap-1.5">
        {r.canApproveLeave && <Badge tone="blue">Approve leave</Badge>}
        {r.canAddEmployees && <Badge tone="purple">Add employees</Badge>}
        {!r.canApproveLeave && !r.canAddEmployees && "—"}
      </span>
    ) },
  ],
  fields: [
    { name: "name", label: "Name", required: true }, { name: "code", label: "Code", required: true, hint: "Short unique code, e.g. ENG" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "canApproveLeave", label: "Can this department approve leave?", type: "checkbox", hint: "Employees of this department can be chosen as the approver when someone applies for leave, and approve or reject those requests." },
    { name: "canAddEmployees", label: "Can this department add employees?", type: "checkbox", hint: "Employees of this department can add and edit employees and register their faces. They cannot delete employees or reset passwords." },
  ],
};
