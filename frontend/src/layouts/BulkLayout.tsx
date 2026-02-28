import type { ReactNode } from "react";
import RoleShellLayout from "./RoleShellLayout";

type Props = {
  children: ReactNode;
};

export default function BulkLayout({ children }: Props) {
  const navItems = [
    { to: "/bulk/dashboard", label: "Dashboard", end: true },
    { to: "/bulk/waste-log", label: "Log Waste" },
    { to: "/bulk/pickups", label: "Pickup Requests" },
    { to: "/bulk/training", label: "Training" },
    { to: "/bulk/insights", label: "Impact Insights" },
  ];

  return (
    <RoleShellLayout
      roleName="Bulk Generator"
      subtitle="Manage high-volume segregation, operational logs, and climate impact reporting."
      navItems={navItems}
    >
      {children}
    </RoleShellLayout>
  );
}
