import type { ReactNode } from "react";
import { useState } from "react";

import { Navbar } from "../Navbar";
import { Button } from "../ui/Button";
import WorkerSidebar from "./WorkerSidebar";

type Props = {
  children: ReactNode;
};

export default function WorkerShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden landing-aurora">
      <Navbar />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(8,22,30,0.36)_0%,rgba(17,56,61,0.16)_45%,rgba(30,100,85,0.10)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl gap-6 px-4 pb-14 pt-7 sm:pt-8">
        <WorkerSidebar />

        <section className="role-shell-content min-w-0 flex-1 pb-2">
          <div className="mb-3 flex justify-end sm:hidden">
            <Button variant="secondary" onClick={() => setMobileOpen(true)}>
              Menu
            </Button>
          </div>
          {children}
        </section>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/45 sm:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[88%] max-w-sm" onClick={(e) => e.stopPropagation()}>
            <WorkerSidebar mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
