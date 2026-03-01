import { NavLink } from "react-router-dom";
import { WORKER_NAV_ITEMS } from "../../lib/workerNav";

type Props = {
  mobile?: boolean;
  onNavigate?: () => void;
};

function cls(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

export default function WorkerSidebar({ mobile = false, onNavigate }: Props) {
  return (
    <aside
      className={cls(
        "surface-card-strong p-5",
        mobile ? "h-full overflow-y-auto rounded-none" : "hidden w-72 shrink-0 sm:block sm:sticky sm:top-24 sm:self-start"
      )}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">WASTE WORKER</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        Claim city reports, manage routes, and submit quality-verified segregation logs.
      </p>

      <nav className="mt-5 space-y-1.5">
        {WORKER_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            onClick={onNavigate}
            className={({ isActive }) =>
              cls(
                "flex items-center rounded-2xl px-4 py-3 text-[1.05rem] font-semibold transition",
                isActive
                  ? "bg-slate-900 text-white shadow-[0_8px_22px_rgba(15,23,42,0.28)]"
                  : "text-slate-700 hover:bg-white/75 hover:text-slate-900"
              )
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
