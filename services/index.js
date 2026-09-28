import { http, unwrap } from "@/lib/axios";

const clean = (params) => Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== "" && v !== undefined && v !== null));
const get = (url, params) => unwrap(http.get(url, { params: clean(params) }));
const post = (url, body, config) => unwrap(http.post(url, body, config));
const patch = (url, body) => unwrap(http.patch(url, body));
const put = (url, body) => unwrap(http.put(url, body));
const del = (url) => unwrap(http.delete(url));

/** REST resource helper: list/get/create/update/remove. */
const resource = (base) => ({
  list: (params) => get(base, params),
  get: (id) => get(`${base}/${id}`),
  create: (body) => post(base, body),
  update: (id, body) => patch(`${base}/${id}`, body),
  remove: (id) => del(`${base}/${id}`),
});

export const authService = {
  login: (body) => post("/auth/login", body),
  logout: () => post("/auth/logout"),
  me: () => get("/auth/me"),
  forgotPassword: (body) => post("/auth/forgot-password", body),
  resetPassword: (body) => post("/auth/reset-password", body),
  changePassword: (body) => post("/auth/change-password", body),
  sessions: () => get("/auth/sessions"),
  revokeSession: (id) => del(`/auth/sessions/${id}`),
};

export const companyService = {
  ...resource("/companies"),
  stats: () => get("/companies/stats"),
  // Permanent. The API refuses unless the exact company name is repeated.
  remove: (id, confirmName) => unwrap(http.delete(`/companies/${id}`, { data: { confirmName } })),
  setStatus: (id, status) => patch(`/companies/${id}/status`, { status }),
  createAdmin: (id, body) => post(`/companies/${id}/admins`, body),
  mine: () => get("/companies/me"),
  updateMine: (body) => patch("/companies/me", body),
};

export const employeeService = { ...resource("/employees"), designations: () => get("/employees/designations") };
export const departmentService = resource("/departments");
export const shiftService = resource("/shifts");
export const holidayService = resource("/holidays");
export const leaveTypeService = resource("/leave-types");

export const policyService = {
  get: () => get("/attendance-policies"),
  update: (body) => put("/attendance-policies", body),
  departments: () => get("/attendance-policies/departments"),
  department: (id) => get(`/attendance-policies/departments/${id}`),
  updateDepartment: (id, body) => put(`/attendance-policies/departments/${id}`, body),
  resetDepartment: (id) => del(`/attendance-policies/departments/${id}`),
};

export const attendanceService = {
  scan: (embedding, location) => post("/attendance/scan", { embedding, ...(location && { location }) }),
  scanConfig: () => get("/attendance/scan-config"),
  list: (params) => get("/attendance", params),
  manual: (body) => post("/attendance/manual", body),
  voidEvent: (id, reason) => post(`/attendance/events/${id}/void`, { reason }),
};

export const faceService = {
  registerFor: (employeeId, embedding) => post(`/face/employees/${employeeId}/register`, { embedding }),
  deactivate: (employeeId) => del(`/face/employees/${employeeId}`),
};

export const deviceService = resource("/devices");

export const leaveService = {
  create: (body) => post("/leaves", body),
  list: (params) => get("/leaves", params),
  balance: (employeeId) => get("/leaves/balance", { employeeId }),
  cancel: (id) => post(`/leaves/${id}/cancel`),
  approve: (id, note) => post(`/leaves/${id}/approve`, { ...(note && { note }) }),
  reject: (id, note) => post(`/leaves/${id}/reject`, { ...(note && { note }) }),
};

/** The signed-in employee's own data. */
export const meService = {
  profile: () => get("/me"),
  attendance: (params) => get("/me/attendance", params),
  leaves: (params) => get("/me/leaves", params),
  leaveBalance: () => get("/me/leave-balance"),
  leaveTypes: () => get("/me/leave-types"),
  leaveApprovers: () => get("/me/leave-approvers"),
  leaveOptions: () => get("/me/leave-options"),
  applyLeave: (body) => post("/me/leaves", body),
  withdrawLeave: (id) => post(`/me/leaves/${id}/withdraw`),
  approvals: (params) => get("/me/approvals", params),
  approve: (id, note) => post(`/me/approvals/${id}/approve`, { ...(note && { note }) }),
  reject: (id, note) => post(`/me/approvals/${id}/reject`, { ...(note && { note }) }),
};

export const reportService = {
  get: (type, params) => get(`/reports/${type}`, params),
  csv: async (type, params) => (await http.get(`/reports/${type}`, { params: clean({ ...params, format: "csv" }), responseType: "blob" })).data,
};

export const dashboardService = { company: () => get("/dashboard/company"), menuCounts: () => get("/dashboard/menu-counts") };
export const notificationService = {
  list: (params) => get("/notifications", params),
  read: (id) => post(`/notifications/${id}/read`),
  readAll: () => post("/notifications/read-all"),
};
export const auditService = { list: (params) => get("/audit-logs", params) };
