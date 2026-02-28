import type { ReactNode } from "react";
import RoleShellLayout from "./RoleShellLayout";

type Props = {
  children: ReactNode;
};

export default function WorkerLayout({ children }: Props) {
  const navItems = [
    { to: "/worker/dashboard", label: "Dashboard" },
    { to: "/worker/reports/available", label: "Available Reports" },
    { to: "/worker/reports/my", label: "My Assigned" },
    { to: "/worker/route-map", label: "Route Map" },
    { to: "/worker/segregation", label: "Segregation Logs" },
  ];

  return (
    <RoleShellLayout
      roleName="Waste Worker"
      subtitle="Claim jobs, verify actions, and close reports with proof-backed workflows."
      navItems={navItems}
    >
      {children}
    </RoleShellLayout>
  );
}
