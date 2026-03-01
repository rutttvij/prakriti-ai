import { useEffect, useMemo, useState } from "react";

import api from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

type TabKey = "partners" | "testimonials" | "case-studies" | "faqs" | "config";

export default function ContentManagementPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>("partners");
  const [rows, setRows] = useState<any[]>([]);
  const [jsonValue, setJsonValue] = useState("{}");

  const endpoint = useMemo(() => (tab === "config" ? "/admin/content/config" : `/admin/content/${tab}`), [tab]);

  const load = async () => {
    try {
      if (tab === "config") {
        setRows([]);
        return;
      }
      const res = await api.get(endpoint);
      const key = tab.replace("-", "_");
      setRows((res.data?.data?.[key] || res.data?.data?.[tab] || []) as any[]);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load content.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const createBasic = async () => {
    try {
      if (tab === "partners") {
        await api.post(endpoint, { name: "New Partner", logo_url: "https://example.com/logo.svg", href: "", order: rows.length, active: true });
      } else if (tab === "testimonials") {
        await api.post(endpoint, { name: "New Testimonial", title: "", org: "", quote: "Add quote", avatar_url: "", order: rows.length, active: true });
      } else if (tab === "case-studies") {
        await api.post(endpoint, { title: "New Case Study", org: "Organization", metric_1: "", metric_2: "", summary: "Add summary", href: "", order: rows.length, active: true });
      } else if (tab === "faqs") {
        await api.post(endpoint, { question: "New Question", answer: "Add answer", order: rows.length, active: true });
      }
      push("success", "Entry created.");
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to create entry.");
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      push("success", "Entry deleted.");
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to delete entry.");
    }
  };

  const saveConfig = async () => {
    try {
      const parsed = JSON.parse(jsonValue);
      await api.put("/admin/content/config", { key: "org_type_copy", value_json: parsed });
      push("success", "Config saved.");
    } catch {
      push("error", "Invalid JSON for config.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {(["partners", "testimonials", "case-studies", "faqs", "config"] as TabKey[]).map((key) => (
            <button
              key={key}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-slate-900 text-white" : "bg-white/70 text-slate-700"}`}
              onClick={() => setTab(key)}
            >
              {key === "case-studies" ? "Case Studies" : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        {tab === "config" ? (
          <>
            <p className="text-sm text-slate-700">Update public config JSON (saved under key: `org_type_copy`).</p>
            <textarea className="ui-input mt-3 min-h-[240px] font-mono text-xs" value={jsonValue} onChange={(e) => setJsonValue(e.target.value)} />
            <button className="btn-primary mt-3" onClick={saveConfig}>Save Config</button>
          </>
        ) : (
          <>
            <button className="btn-primary mb-3" onClick={createBasic}>Add {tab}</button>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-2 py-2 text-left">ID</th>
                    <th className="px-2 py-2 text-left">Title</th>
                    <th className="px-2 py-2 text-left">Active</th>
                    <th className="px-2 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-emerald-100/70">
                      <td className="px-2 py-2">{row.id}</td>
                      <td className="px-2 py-2">{row.name || row.title || row.question || row.org || "-"}</td>
                      <td className="px-2 py-2">{row.active ? "yes" : "no"}</td>
                      <td className="px-2 py-2">
                        <button className="btn-secondary px-3 py-1 text-xs" onClick={() => remove(row.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-5 text-center text-slate-500">No entries found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
