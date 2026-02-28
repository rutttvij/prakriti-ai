import type { OrgTypeCopy } from "../../lib/types";

export type RoleKey = "city" | "campus" | "society" | "corporate";

const roleOrder: RoleKey[] = ["city", "campus", "society", "corporate"];

export function RolePills({
  selected,
  onChange,
  config,
}: {
  selected: RoleKey;
  onChange: (value: RoleKey) => void;
  config: OrgTypeCopy;
}) {
  const keys = roleOrder.filter((k) => config[k]);

  return (
    <div className="flex flex-wrap gap-2">
      {(keys.length ? keys : roleOrder).map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
            selected === role
              ? "border-emerald-700 bg-slate-900 text-white shadow-[0_6px_18px_rgba(15,23,42,0.26)]"
              : "border-emerald-200/80 bg-white/70 text-emerald-800 hover:bg-white"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
