// src/layouts/RoleAwareLayout.tsx
import { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import CitizenLayout from "./CitizenLayout";
import BulkLayout from "./BulkLayout";
import WorkerLayout from "./WorkerLayout";
import AdminLayout from "./AdminLayout";

type Props = {
  children: ReactNode;
};

export default function RoleAwareLayout({ children }: Props) {
  const { user } = useAuth() as {
    user?: { role?: string | null };
  };

  const role = user?.role ?? "CITIZEN";

  switch (role) {
    case "CITIZEN":
      return <CitizenLayout>{children}</CitizenLayout>;

    case "BULK_GENERATOR":
      return <BulkLayout>{children}</BulkLayout>;

    case "WASTE_WORKER":
      return <WorkerLayout>{children}</WorkerLayout>;

    case "SUPER_ADMIN":
      // If a super admin hits citizen routes, still give them the admin shell
      return <AdminLayout>{children}</AdminLayout>;

    default:
      // Fallback: treat unknown roles as citizens
      return <CitizenLayout>{children}</CitizenLayout>;
  }
}
