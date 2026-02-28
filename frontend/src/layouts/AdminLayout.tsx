import type { ReactNode } from "react";
import RoleShellLayout from "./RoleShellLayout";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const navItems = [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/users", label: "Users & Approvals" },
    { to: "/admin/pcc", label: "PCC Tokens" },
    { to: "/admin/contact", label: "Contact Messages" },
  ];

  return (
    <RoleShellLayout
      roleName="Super Admin"
      subtitle="City control, approvals, and measurable climate impact across the Prakriti network."
      navItems={navItems}
    >
      {children}
    </RoleShellLayout>
  );
}
