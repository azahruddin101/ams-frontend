import { z } from "zod";

const req = (label) => z.string().trim().min(1, `${label} is required`);
const optionalText = z.string().trim().optional().or(z.literal(""));
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");
const hm = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} hr`);
/** A duration held in minutes, entered as hours + minutes. */
const duration = (label, { min = 0, max = 1440 } = {}) =>
  z.coerce.number({ message: `Enter ${label.toLowerCase()}` }).int("Use whole minutes").min(min, `${label} must be at least ${hm(min)}`).max(max, `${label} can't be more than ${hm(max)}`);
/** A share of one day's salary. Entered as a percentage; held as a fraction of a day (0.5 = 50%), which is what the API stores. */
const dayShare = (label) => z.coerce.number({ message: `Enter ${label.toLowerCase()} as a percentage` }).min(0, `${label} can't be negative`).max(5, `${label} can't be more than 500%`);
const num = (label, { min = 0, max } = {}) =>
  z.coerce.number({ message: `${label} must be a number` }).min(min, `${label} must be at least ${min}`).refine((v) => max === undefined || v <= max, `${label} must be at most ${max}`);

export const password = z.string().min(10, "At least 10 characters").regex(/[a-z]/, "Add a lowercase letter").regex(/[A-Z]/, "Add an uppercase letter").regex(/\d/, "Add a number");
const email = z.string().trim().min(1, "Email is required").email("Enter a valid email");

export const loginSchema = z.object({ email, password: req("Password") });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: req("Reset token"), newPassword: password });
export const changePasswordSchema = z
  .object({ currentPassword: req("Current password"), newPassword: password, confirm: req("Confirm password") })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const departmentSchema = z.object({ name: z.string().trim().min(2, "At least 2 characters"), code: req("Code").max(20), description: optionalText, canApproveLeave: z.boolean(), canAddEmployees: z.boolean() });
export const shiftSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters"), startTime: hhmm, endTime: hhmm,
  breakDuration: duration("Break", { max: 480 }), gracePeriod: duration("Grace period", { max: 240 }),
  requiredWorkingMinutes: duration("Required working time", { min: 1 }), allowOvertime: z.boolean(),
}).refine((s) => s.startTime !== s.endTime, { message: "Start and end can't be equal", path: ["endTime"] });
export const holidaySchema = z.object({ name: z.string().trim().min(2, "At least 2 characters"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), description: optionalText, recurring: z.boolean() });
export const leaveTypeSchema = z.object({ name: z.string().trim().min(2), code: req("Code").max(10), annualQuota: num("Quota", { max: 366 }), isPaid: z.boolean() });

export const employeeSchema = z
  .object({
    employeeCode: req("Employee code").max(30), firstName: z.string().trim().min(2, "At least 2 characters"), lastName: req("Last name"), email,
    phone: optionalText, dateOfJoining: z.string().min(1, "Joining date is required"), departmentId: optionalText, shiftId: optionalText,
    designation: optionalText, employmentType: z.string().min(1),
    password: z.union([z.literal(""), password]).optional(), // optional: creates (or resets) the employee's login
    monthlySalary: z.union([z.number(), z.string().trim().min(1, "Salary is required")]).pipe(z.coerce.number({ message: "Salary must be a number" }).min(0, "Salary can't be negative")),
  });

export const leaveRequestSchema = z
  .object({ employeeId: req("Employee"), leaveTypeId: req("Leave type"), fromDate: req("From date"), toDate: req("To date"), isHalfDay: z.boolean(), reason: optionalText })
  .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, { message: "End date must be on/after start", path: ["toDate"] })
  .refine((v) => !v.isHalfDay || v.fromDate === v.toDate, { message: "Half day must be a single day", path: ["toDate"] });

/** An employee applying for their own leave. `approverId` is required by the server whenever there is someone to choose. */
export const applyLeaveSchema = z
  .object({ leaveTypeId: req("Leave type"), approverId: optionalText, reportingToId: optionalText, dates: z.array(z.string()).min(1, "Pick at least one day").max(62, "Too many days in one request"), isHalfDay: z.boolean(), reason: optionalText })
  .refine((v) => !v.isHalfDay || v.dates.length === 1, { message: "Half day must be a single day", path: ["dates"] });

export const companySchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters"), legalName: optionalText, email, phone: optionalText,
  timezone: req("Timezone"), currency: z.string().length(3, "3-letter code"),
});
const primaryColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour");
const logo = z.string().nullable().optional();
export const brandingSchema = z.object({ logo, primaryColor });
export const createCompanySchema = companySchema.extend({
  logo, primaryColor,
  adminName: z.string().trim().min(2, "Admin name is required"), adminEmail: email, adminPassword: password,
});
export const companyAdminSchema = z.object({ name: z.string().trim().min(2), email, password });

export const settingsSchema = z.object({
  name: z.string().trim().min(2), timezone: req("Timezone"), currency: z.string().length(3, "3-letter code"), logo, primaryColor,
  latitude: z.union([z.literal(""), num("Latitude", { min: -90, max: 90 })]).optional(),
  longitude: z.union([z.literal(""), num("Longitude", { min: -180, max: 180 })]).optional(),
});

const ruleFields = {
  timingMode: z.enum(["FIXED", "FLEXIBLE", "NO_TIME_BOUND"]), expectedCheckInTime: hhmm, expectedCheckOutTime: hhmm,
  gracePeriod: duration("Grace period", { max: 240 }), lateAfterMinutes: duration("Late after", { max: 600 }),
  halfDayAfterMinutes: duration("Half-day after"), absentAfterMinutes: duration("Absent after"),
  minimumWorkingMinutes: duration("Minimum working time"), halfDayWorkingMinutes: duration("Full-day working time"),
  earlyCheckoutThreshold: duration("Early checkout", { max: 600 }), overtimeEnabled: z.boolean(), overtimeAfterMinutes: duration("Overtime after"),
  multipleCheckInAllowed: z.boolean(), multipleCheckOutAllowed: z.boolean(),
  lateCountEnabled: z.boolean(), lateCountThreshold: num("Late days", { min: 1, max: 31 }).int("Use a whole number"), lateCountPeriod: z.enum(["WEEK", "MONTH"]), lateCountPenalty: z.enum(["HALF_DAY", "ABSENT"]),
  lateStreakEnabled: z.boolean(), lateStreakThreshold: num("Days in a row", { min: 2, max: 31 }).int("Use a whole number"), lateStreakPenalty: z.enum(["HALF_DAY", "ABSENT"]),
  latePenaltyRepeat: z.enum(["NTH_ONWARDS", "EVERY_NTH"]),
  salaryDeductionEnabled: z.boolean(), salaryDayBasis: z.enum(["CALENDAR_DAYS", "WORKING_DAYS", "FIXED_DAYS"]), salaryFixedDays: num("Days", { min: 1, max: 31 }).int("Use a whole number"),
  absentDeduction: dayShare("Absent deduction"), halfDayDeduction: dayShare("Half-day deduction"), lateDeduction: dayShare("Late deduction"), unpaidLeaveDeduction: z.boolean(),
};
const timesDiffer = [(p) => p.expectedCheckInTime !== p.expectedCheckOutTime, { message: "Start and end can't be equal", path: ["expectedCheckOutTime"] }];
/** Company default rules (includes the company-wide geofence). */
export const policySchema = z.object({ ...ruleFields, geofenceEnabled: z.boolean(), geofenceRadius: num("Radius", { min: 10, max: 50000 }) }).refine(...timesDiffer);
/** A department's own rules. */
export const departmentPolicySchema = z.object(ruleFields).refine(...timesDiffer);

export const rejectSchema = z.object({ note: optionalText });

export const deviceSchema = z.object({ name: z.string().trim().min(2, "At least 2 characters").max(80), email, password });
export const deviceEditSchema = z.object({ name: z.string().trim().min(2, "At least 2 characters").max(80) });
export const deviceResetSchema = z.object({ password });
