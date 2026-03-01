import type { ReactNode } from "react";
import WorkerShell from "../components/worker/WorkerShell";

type Props = {
  children: ReactNode;
};

export default function WorkerLayout({ children }: Props) {
  return <WorkerShell>{children}</WorkerShell>;
}
