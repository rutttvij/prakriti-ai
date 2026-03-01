export type WorkerNavItem = {
  label: string;
  route: string;
  order: number;
};

export const WORKER_NAV_ITEMS: WorkerNavItem[] = [
  { label: "Dashboard", route: "/worker/dashboard", order: 1 },
  { label: "Available Reports", route: "/worker/reports/available", order: 2 },
  { label: "My Assigned", route: "/worker/reports/my", order: 3 },
  { label: "Route Map", route: "/worker/route-map", order: 4 },
  { label: "Segregation Logs", route: "/worker/segregation", order: 5 },
];
