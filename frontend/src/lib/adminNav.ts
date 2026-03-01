export type AdminNavItem = {
  label: string;
  route: string;
  icon: string;
  order: number;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", route: "/app/admin/dashboard", icon: "DB", order: 1 },
  { label: "Users & Approvals", route: "/app/admin/users-approvals", icon: "UA", order: 2 },
  { label: "Zones & Coverage", route: "/app/admin/zones", icon: "ZN", order: 3 },
  { label: "Workforce", route: "/app/admin/workforce", icon: "WF", order: 4 },
  { label: "PCC Tokens", route: "/app/admin/pcc-tokens", icon: "PC", order: 5 },
  { label: "Training Modules", route: "/app/admin/training", icon: "TR", order: 6 },
  { label: "Demo Requests", route: "/app/admin/demo-requests", icon: "DR", order: 7 },
  { label: "Contact Messages", route: "/app/admin/contact-messages", icon: "CM", order: 8 },
  { label: "Content Management", route: "/app/admin/content", icon: "CT", order: 9 },
  { label: "Reports", route: "/app/admin/reports", icon: "RP", order: 10 },
  { label: "Audit Logs", route: "/app/admin/audit-logs", icon: "AL", order: 11 },
  { label: "Platform Settings", route: "/app/admin/platform-settings", icon: "PS", order: 12 },
];
