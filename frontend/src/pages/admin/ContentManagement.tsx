import { useEffect, useMemo, useState } from "react";

import {
  createAdminContentItem,
  deleteAdminContentItem,
  fetchAdminContentConfig,
  fetchAdminContentItems,
  upsertAdminContentConfig,
  updateAdminContentItem,
} from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import type { CaseStudy, ContentTabType, FAQItem, Partner, Testimonial } from "../../lib/types";
import ContentItemDialog from "../../components/admin/content/ContentItemDialog";

type TabKey = ContentTabType | "config";
type ContentRow = Partner | Testimonial | CaseStudy | FAQItem;

const TAB_LIST: TabKey[] = ["partners", "testimonials", "case-studies", "faqs", "config"];

function tabLabel(key: TabKey) {
  if (key === "case-studies") return "Case Studies";
  if (key === "faqs") return "FAQs";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function addLabel(key: ContentTabType) {
  if (key === "partners") return "Add partners";
  if (key === "testimonials") return "Add testimonials";
  if (key === "case-studies") return "Add case studies";
  return "Add FAQs";
}

function rowTitle(tab: ContentTabType, row: ContentRow) {
  if (tab === "partners") return (row as Partner).name;
  if (tab === "testimonials") return (row as Testimonial).name;
  if (tab === "case-studies") return (row as CaseStudy).title;
  return (row as FAQItem).question;
}

export default function ContentManagementPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("partners");

  const [contentRows, setContentRows] = useState<Record<ContentTabType, ContentRow[]>>({
    partners: [],
    testimonials: [],
    "case-studies": [],
    faqs: [],
  });
  const [loading, setLoading] = useState(false);

  const [jsonValue, setJsonValue] = useState("{}");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogType, setDialogType] = useState<ContentTabType>("partners");
  const [selectedItem, setSelectedItem] = useState<ContentRow | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTab = async (tab: ContentTabType) => {
    setLoading(true);
    try {
      const rows = await fetchAdminContentItems(tab);
      setContentRows((prev) => ({ ...prev, [tab]: rows }));
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "config") {
      (async () => {
        const cfg = await fetchAdminContentConfig();
        setJsonValue(JSON.stringify(cfg, null, 2));
      })();
      return;
    }
    void loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentRows = useMemo(() => {
    if (activeTab === "config") return [] as ContentRow[];
    return contentRows[activeTab] || [];
  }, [activeTab, contentRows]);

  const openCreate = (tab: ContentTabType) => {
    setDialogType(tab);
    setDialogMode("create");
    setSelectedItem(null);
    setDialogOpen(true);
  };

  const openEdit = (tab: ContentTabType, row: ContentRow) => {
    setDialogType(tab);
    setDialogMode("edit");
    setSelectedItem(row);
    setDialogOpen(true);
  };

  const submitDialog = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (dialogMode === "create") {
        await createAdminContentItem(dialogType, payload as any);
        push("success", "Entry created.");
      } else {
        await updateAdminContentItem(dialogType, Number((selectedItem as any)?.id), payload as any);
        push("success", "Entry updated.");
      }
      setDialogOpen(false);
      setSelectedItem(null);
      await loadTab(dialogType);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tab: ContentTabType, id: number) => {
    try {
      await deleteAdminContentItem(tab, id);
      push("success", "Entry deleted.");
      await loadTab(tab);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to delete entry.");
    }
  };

  const saveConfig = async () => {
    try {
      const parsed = JSON.parse(jsonValue);
      await upsertAdminContentConfig("org_type_copy", parsed);
      push("success", "Config saved.");
    } catch {
      push("error", "Invalid JSON for config.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {TAB_LIST.map((key) => (
            <button
              key={key}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === key ? "bg-slate-900 text-white" : "bg-white/70 text-slate-700"}`}
              onClick={() => setActiveTab(key)}
            >
              {tabLabel(key)}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        {activeTab === "config" ? (
          <>
            <p className="text-sm text-slate-700">Update config JSON.</p>
            <textarea className="ui-input mt-3 min-h-[240px] font-mono text-xs" value={jsonValue} onChange={(e) => setJsonValue(e.target.value)} />
            <button className="btn-primary mt-3" onClick={saveConfig}>Save Config</button>
          </>
        ) : (
          <>
            <button className="btn-primary mb-3" onClick={() => openCreate(activeTab)}>{addLabel(activeTab)}</button>
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
                  {currentRows.map((row) => (
                    <tr key={(row as any).id} className="border-b border-emerald-100/70">
                      <td className="px-2 py-2">{(row as any).id}</td>
                      <td className="px-2 py-2">{rowTitle(activeTab, row)}</td>
                      <td className="px-2 py-2">{(row as any).active ? "yes" : "no"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button className="btn-secondary px-3 py-1 text-xs" onClick={() => openEdit(activeTab, row)}>Edit</button>
                          <button className="btn-secondary px-3 py-1 text-xs text-red-700" onClick={() => remove(activeTab, Number((row as any).id))}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && currentRows.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-5 text-center text-slate-500">No entries found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ContentItemDialog
        open={dialogOpen}
        mode={dialogMode}
        type={dialogType}
        initialValues={selectedItem}
        loading={saving}
        onClose={() => {
          if (saving) return;
          setDialogOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={submitDialog}
      />
    </div>
  );
}
