import { useEffect, useMemo, useState } from "react";
import {
  createAdminTrainingModule,
  createTrainingLesson,
  deleteAdminTrainingModule,
  deleteTrainingLesson,
  fetchAdminTrainingModule,
  fetchAdminTrainingModules,
  reorderTrainingLessons,
  updateAdminTrainingModule,
  updateTrainingLesson,
} from "../../lib/api";
import type {
  TrainingAudience,
  TrainingDifficulty,
  TrainingLesson,
  TrainingLessonType,
  TrainingModuleAdmin,
  TrainingModulePayload,
} from "../../lib/types";

const AUDIENCE_TABS: { label: string; value: TrainingAudience }[] = [
  { label: "Citizen", value: "citizen" },
  { label: "Bulk Generator", value: "bulk_generator" },
];

const EMPTY_FORM: TrainingModulePayload = {
  audience: "citizen",
  title: "",
  summary: "",
  difficulty: "beginner",
  est_minutes: 10,
  cover_image_url: "",
  is_published: false,
};

export const AdminTrainingPage: React.FC = () => {
  const [audience, setAudience] = useState<TrainingAudience>("citizen");
  const [publishedFilter, setPublishedFilter] = useState<string>("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<TrainingModuleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingModuleAdmin | null>(null);
  const [form, setForm] = useState<TrainingModulePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailModule, setDetailModule] = useState<TrainingModuleAdmin | null>(null);
  const [lessonForm, setLessonForm] = useState<{ lesson_type: TrainingLessonType; title: string; content: string }>({
    lesson_type: "article",
    title: "",
    content: "",
  });

  const publishedBool = useMemo(() => {
    if (publishedFilter === "") return undefined;
    return publishedFilter === "true";
  }, [publishedFilter]);

  async function loadModules() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminTrainingModules({
        audience,
        published: publishedBool,
        q: q || undefined,
        page: 1,
        page_size: 50,
      });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load training modules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, publishedBool]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, audience });
    setModalOpen(true);
  };

  const openEdit = async (row: TrainingModuleAdmin) => {
    setEditing(row);
    setForm({
      audience: row.audience,
      title: row.title,
      summary: row.summary || "",
      difficulty: row.difficulty,
      est_minutes: row.est_minutes,
      cover_image_url: row.cover_image_url || "",
      is_published: row.is_published,
    });
    setModalOpen(true);
  };

  const saveModule = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateAdminTrainingModule(editing.id, form);
      } else {
        await createAdminTrainingModule(form);
      }
      setModalOpen(false);
      await loadModules();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to save module.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (row: TrainingModuleAdmin) => {
    try {
      await updateAdminTrainingModule(row.id, { is_published: !row.is_published });
      await loadModules();
      if (detailModule?.id === row.id) {
        const fresh = await fetchAdminTrainingModule(row.id);
        setDetailModule(fresh);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update publish status.");
    }
  };

  const removeModule = async (row: TrainingModuleAdmin) => {
    if (!window.confirm(`Delete module \"${row.title}\"?`)) return;
    try {
      await deleteAdminTrainingModule(row.id);
      if (detailModule?.id === row.id) setDetailModule(null);
      await loadModules();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to delete module.");
    }
  };

  const openDetail = async (row: TrainingModuleAdmin) => {
    try {
      const fresh = await fetchAdminTrainingModule(row.id);
      setDetailModule(fresh);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load module detail.");
    }
  };

  const addLesson = async () => {
    if (!detailModule) return;
    const rawTitle = lessonForm.title.trim();
    const rawContent = lessonForm.content.trim();
    if (!rawContent) {
      setError("Lesson content is required.");
      return;
    }

    let resolvedTitle = rawTitle;
    if (!resolvedTitle) {
      if (lessonForm.lesson_type === "link") {
        try {
          const parsed = new URL(rawContent);
          resolvedTitle = parsed.hostname || "Reference link";
        } catch {
          resolvedTitle = "Reference link";
        }
      } else {
        setError("Lesson title is required.");
        return;
      }
    }

    try {
      await createTrainingLesson(detailModule.id, {
        lesson_type: lessonForm.lesson_type,
        title: resolvedTitle,
        content: rawContent,
      });
      setLessonForm({ lesson_type: "article", title: "", content: "" });
      setError(null);
      setDetailModule(await fetchAdminTrainingModule(detailModule.id));
      await loadModules();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create lesson.");
    }
  };

  const patchLesson = async (lesson: TrainingLesson, patch: Partial<TrainingLesson>) => {
    if (!detailModule) return;
    try {
      await updateTrainingLesson(lesson.id, patch);
      setDetailModule(await fetchAdminTrainingModule(detailModule.id));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update lesson.");
    }
  };

  const removeLesson = async (lesson: TrainingLesson) => {
    if (!detailModule) return;
    if (!window.confirm(`Delete lesson \"${lesson.title}\"?`)) return;
    try {
      await deleteTrainingLesson(lesson.id);
      setDetailModule(await fetchAdminTrainingModule(detailModule.id));
      await loadModules();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to delete lesson.");
    }
  };

  const moveLesson = async (lessonId: number, direction: "up" | "down") => {
    if (!detailModule?.lessons) return;
    const ids = detailModule.lessons.map((l) => l.id);
    const idx = ids.findIndex((x) => x === lessonId);
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];

    try {
      await reorderTrainingLessons(detailModule.id, ids);
      setDetailModule(await fetchAdminTrainingModule(detailModule.id));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to reorder lessons.");
    }
  };

  return (
    <div className="relative space-y-5">
      <header className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Super Admin · Training
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]" style={{ color: "#dffaf0" }}>
          Training modules CMS
        </h1>
        <p className="mt-1 text-sm text-emerald-100">Create and publish audience-specific learning modules and lessons.</p>
      </header>

      <section className="surface-card-strong rounded-[1.6rem] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setAudience(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                audience === tab.value ? "bg-slate-900 text-white" : "border border-emerald-200/45 bg-emerald-50/70 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search modules..."
              className="ui-input h-9 w-56"
            />
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className="ui-input h-9 w-40"
            >
              <option value="">All publish states</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
            <button className="btn-secondary h-9 px-4" onClick={loadModules}>Apply</button>
            <button className="btn-primary h-9 px-4" onClick={openCreate}>Create module</button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}

      <section className="surface-card-strong rounded-[1.8rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-white/30 border-b border-emerald-100">
              <tr className="text-[0.7rem] text-slate-600">
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Minutes</th>
                <th className="px-4 py-3 text-left">Lessons</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading modules...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No modules found.</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-emerald-100/60 bg-white/40 hover:bg-emerald-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.title}</p>
                      <p className="text-[0.7rem] text-slate-500 line-clamp-1">{row.summary || "No summary"}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{row.difficulty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.est_minutes}</td>
                    <td className="px-4 py-3 text-slate-700">{row.lessons_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${row.is_published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {row.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-secondary px-3 py-1 text-xs" onClick={() => openDetail(row)}>Lessons</button>
                        <button className="btn-secondary px-3 py-1 text-xs" onClick={() => openEdit(row)}>Edit</button>
                        <button className="btn-secondary px-3 py-1 text-xs" onClick={() => togglePublish(row)}>
                          {row.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700" onClick={() => removeModule(row)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4">
          <div className="surface-card-strong w-full max-w-xl rounded-3xl p-5">
            <h3 className="text-lg font-semibold text-slate-900">{editing ? "Edit module" : "Create module"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Title</label>
                <input className="ui-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Summary</label>
                <textarea className="ui-input min-h-[90px]" value={form.summary || ""} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Audience</label>
                <select className="ui-input" value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as TrainingAudience }))}>
                  <option value="citizen">Citizen</option>
                  <option value="bulk_generator">Bulk Generator</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Difficulty</label>
                <select className="ui-input" value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as TrainingDifficulty }))}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Est. minutes</label>
                <input type="number" className="ui-input" value={form.est_minutes} onChange={(e) => setForm((p) => ({ ...p, est_minutes: Number(e.target.value || 1) }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Cover image URL</label>
                <input className="ui-input" value={form.cover_image_url || ""} onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))} />
              </div>
              <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} />
                Published
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary px-4" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary px-4" onClick={saveModule} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {detailModule && (
        <section className="surface-card-strong rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Lessons · {detailModule.title}</h3>
            <button className="btn-secondary px-3 py-1 text-xs" onClick={() => setDetailModule(null)}>Close</button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
            <select className="ui-input" value={lessonForm.lesson_type} onChange={(e) => setLessonForm((p) => ({ ...p, lesson_type: e.target.value as TrainingLessonType }))}>
              <option value="article">article</option>
              <option value="video">video</option>
              <option value="pdf">pdf</option>
              <option value="quiz">quiz</option>
              <option value="link">link</option>
            </select>
            <input
              className="ui-input"
              placeholder={lessonForm.lesson_type === "link" ? "Lesson title (optional for link)" : "Lesson title"}
              value={lessonForm.title}
              onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
            />
            <input
              className="ui-input"
              placeholder={lessonForm.lesson_type === "link" ? "https://example.com/resource" : "URL or content"}
              value={lessonForm.content}
              onChange={(e) => setLessonForm((p) => ({ ...p, content: e.target.value }))}
            />
            <button className="btn-primary px-4" onClick={addLesson}>Add</button>
          </div>

          <div className="mt-4 space-y-2">
            {(detailModule.lessons || []).map((lesson, idx) => (
              <div key={lesson.id} className="surface-card-strong rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">#{idx + 1}</span>
                  <input className="ui-input h-9" value={lesson.title} onChange={(e) => patchLesson(lesson, { title: e.target.value })} />
                  <select className="ui-input h-9 w-32" value={lesson.lesson_type} onChange={(e) => patchLesson(lesson, { lesson_type: e.target.value as TrainingLessonType })}>
                    <option value="article">article</option>
                    <option value="video">video</option>
                    <option value="pdf">pdf</option>
                    <option value="quiz">quiz</option>
                    <option value="link">link</option>
                  </select>
                  <button className="btn-secondary px-3 py-1 text-xs" onClick={() => moveLesson(lesson.id, "up")}>↑</button>
                  <button className="btn-secondary px-3 py-1 text-xs" onClick={() => moveLesson(lesson.id, "down")}>↓</button>
                  <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700" onClick={() => removeLesson(lesson)}>Delete</button>
                </div>
                <textarea className="ui-input mt-2 min-h-[72px]" value={lesson.content} onChange={(e) => patchLesson(lesson, { content: e.target.value })} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminTrainingPage;
