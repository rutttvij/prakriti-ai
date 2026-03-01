import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { ADMIN_NAV_ITEMS } from "../../lib/adminNav";
import { Button } from "../ui/Button";

type Props = {
  onOpenMobileMenu: () => void;
};

export default function AdminTopbar({ onOpenMobileMenu }: Props) {
  const location = useLocation();

  const title = useMemo(() => {
    const match = ADMIN_NAV_ITEMS.find((item) => item.route === location.pathname);
    return match?.label || "City Dashboard";
  }, [location.pathname]);

  return (
    <div className="mb-5 rounded-3xl border border-white/20 bg-slate-950/26 px-4 py-4 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Super Admin · City Control
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]" style={{ color: "#dffaf0" }}>
            {title}
          </h1>
          <p className="mt-1 text-sm text-emerald-100">Operations visibility, approvals, and measurable climate impact across Prakriti.AI.</p>
        </div>
        <Button variant="secondary" className="sm:hidden" onClick={onOpenMobileMenu}>
          Menu
        </Button>
      </div>
    </div>
  );
}
