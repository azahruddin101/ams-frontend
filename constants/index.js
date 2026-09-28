export const ROLES = Object.freeze({ SUPER_ADMIN: "SUPER_ADMIN", COMPANY: "COMPANY", ATTENDANCE_DEVICE: "ATTENDANCE_DEVICE", EMPLOYEE: "EMPLOYEE" });

export const ROLE_HOME = Object.freeze({
  SUPER_ADMIN: "/super-admin",
  COMPANY: "/company",
  ATTENDANCE_DEVICE: "/device",
  EMPLOYEE: "/employee",
});

/** Which route prefixes each role may enter (UI convenience only — the API is the authority). The scanner is open to
 *  company users too, so a single phone can register faces AND scan. */
export const ROLE_PREFIXES = Object.freeze({
  SUPER_ADMIN: ["/super-admin"],
  COMPANY: ["/company", "/device"],
  ATTENDANCE_DEVICE: ["/device"],
  EMPLOYEE: ["/employee"],
});

export const SESSION_HINT_COOKIE = "ams_role";
export const PAGE_SIZE = 20;

export const ATTENDANCE_STATUS_META = Object.freeze({
  PRESENT: { label: "Present", tone: "green" },
  LATE: { label: "Late", tone: "amber" },
  HALF_DAY: { label: "Half day", tone: "amber" },
  ABSENT: { label: "Absent", tone: "red" },
  ON_LEAVE: { label: "On leave", tone: "blue" },
  HOLIDAY: { label: "Holiday", tone: "purple" },
  WEEK_OFF: { label: "Week off", tone: "gray" },
  INCOMPLETE: { label: "Incomplete", tone: "red" },
});

export const LEAVE_STATUS_META = Object.freeze({
  PENDING: { label: "Pending", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "gray" },
});

export const COMPANY_STATUS_META = Object.freeze({
  ACTIVE: { label: "Active", tone: "green" },
  TRIAL: { label: "Trial", tone: "blue" },
  SUSPENDED: { label: "Suspended", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "gray" },
});

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PENALTY_REASON_LABEL = Object.freeze({
  LATE_COUNT: "Late too many times",
  LATE_STREAK: "Late on consecutive days",
});

export const TIMING_MODE_LABEL = Object.freeze({ FIXED: "Fixed in / out time", FLEXIBLE: "Flexible hours", NO_TIME_BOUND: "No time bound" });
