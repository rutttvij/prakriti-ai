import { useEffect, useState } from "react";
import api from "../../lib/api";

interface TrainingModule {
  id: number;
  title: string;
  description?: string | null;
  content_type: string;
  content_url?: string | null;
  order_index: number;
}

interface TrainingProgress {
  id: number;
  module_id: number;
  user_id: number;
  completed: boolean;
  score?: number | null;
  completed_at?: string | null;
}

export default function TrainingPage() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [modulesRes, progressRes] = await Promise.all([
          api.get<TrainingModule[]>("/training/modules"),
          api.get<TrainingProgress[]>("/training/progress/me"),
        ]);

        setModules(modulesRes.data);

        const doneIds = progressRes.data
          .filter((p) => p.completed)
          .map((p) => p.module_id);

        setCompletedIds(doneIds);
      } catch (err) {
        console.error(err);
        setError("Failed to load training modules.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleComplete(module: TrainingModule) {
    setError(null);
    setSubmittingId(module.id);

    try {
      await api.post(`/training/${module.id}/complete`, { score: 100 });

      // Optimistic update: mark this module as completed locally
      setCompletedIds((prev) =>
        prev.includes(module.id) ? prev : [...prev, module.id],
      );
      // badges + carbon + PCC are handled in the backend
    } catch (err) {
      console.error(err);
      setError("Could not mark module as completed.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return <div className="text-slate-600">Loading training modules...</div>;
  }

  const total = modules.length;
  const completed = completedIds.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-emerald-800">
          Green Training
        </h1>
        <p className="text-sm text-slate-600">
          Complete mandatory training to unlock badges, CO₂ savings, and
          Prakriti Carbon Credits.
        </p>

        {total > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Progress: {completed}/{total} modules ({percent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {modules.length === 0 && (
        <p className="text-sm text-slate-500">
          No training modules published yet.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => {
          const isCompleted = completedIds.includes(m.id);

          return (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3"
            >
              <div>
                <h2 className="text-base font-semibold text-emerald-800">
                  {m.title}
                </h2>
                {m.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {m.description}
                  </p>
                )}
              </div>

              {m.content_url && (
                <a
                  href={m.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 underline underline-offset-4"
                >
                  Open training material
                </a>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Type: {m.content_type}
                </span>

                {isCompleted ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-700">
                    Completed ✅
                  </span>
                ) : (
                  <button
                    onClick={() => handleComplete(m)}
                    disabled={submittingId === m.id}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {submittingId === m.id
                      ? "Marking..."
                      : "Mark as completed"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
