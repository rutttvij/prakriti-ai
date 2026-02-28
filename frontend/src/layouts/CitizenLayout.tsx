import type { ReactNode } from "react";
import RoleShellLayout from "./RoleShellLayout";

type Props = {
  children: ReactNode;
};

export default function CitizenLayout({ children }: Props) {
  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/citizen/household", label: "Home & Household" },
    { to: "/insights", label: "My Waste Insights" },
    { to: "/training", label: "Training" },
    { to: "/waste/report", label: "Report Waste" },
    { to: "/waste/my-reports", label: "My Reports" },
  ];

  return (
    <RoleShellLayout
      roleName="Citizen"
      subtitle="Navigate your daily actions, report events, and monitor climate contribution."
      navItems={navItems}
    >
      {children}
    </RoleShellLayout>
  );
}
