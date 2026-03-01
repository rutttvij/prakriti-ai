import { useEffect, useMemo, useState } from "react";
import {
  completeCitizenTrainingModule,
  fetchBulkTrainingModules,
  fetchMyTrainingProgress,
} from "../../lib/api";
import type { CitizenTrainingModule, TrainingProgressItem } from "../../lib/types";

const BULK_LESSON_PROGRESS_KEY = "bulk_training_lesson_progress_v1";

type LessonProgressMap = Record<string, number[]>;

function readLessonProgress(): LessonProgressMap {
  try {
    const raw = window.localStorage.getItem(BULK_LESSON_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LessonProgressMap;
  } catch {
    return {};
  }
}

function saveLessonProgress(progress: LessonProgressMap) {
  window.localStorage.setItem(BULK_LESSON_PROGRESS_KEY, JSON.stringify(progress));
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BulkTrainingPage() {
  const [modules, setModules] = useState<CitizenTrainingModule[]>([]);
  const [progressItems, setProgressItems] = useState<TrainingProgressItem[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>(() => readLessonProgress());

  const [loading, setLoading] = useState(true);
  const [busyModuleId, setBusyModuleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, myProgress] = await Promise.all([fetchBulkTrainingModules(), fetchMyTrainingProgress()]);
      setModules(mods);
      setProgressItems(myProgress);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load bulk training data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const bulkModuleIdSet = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);

  const completedModuleSet = useMemo(() => {
    const set = new Set<number>();
    for (const item of progressItems) {
      if (item.completed && bulkModuleIdSet.has(item.module_id)) {
        set.add(item.module_id);
      }
    }
    return set;
  }, [progressItems, bulkModuleIdSet]);

  const completedCount = completedModuleSet.size;
  const totalModules = modules.length;
  const progressPercent = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;

  const moduleDoneCount = (moduleId: number) => {
    const ids = lessonProgress[String(moduleId)] || [];
    return new Set(ids).size;
  };

  const markLessonDone = (moduleId: number, lessonId: number) => {
    const key = String(moduleId);
    const existing = new Set(lessonProgress[key] || []);
    existing.add(lessonId);
    const next: LessonProgressMap = {
      ...lessonProgress,
      [key]: Array.from(existing),
    };
    setLessonProgress(next);
    saveLessonProgress(next);
    return existing;
  };

  const completeModule = async (moduleId: number) => {
    setBusyModuleId(moduleId);
    try {
      await completeCitizenTrainingModule(moduleId);
      setOk("Module marked complete.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to mark module complete.");
    } finally {
      setBusyModuleId(null);
    }
  };

  const openLesson = async (module: CitizenTrainingModule, lessonId: number, content: string) => {
    setError(null);
    setOk(null);

    const url = (content || "").trim();
    if (!isHttpUrl(url)) {
      setError("This lesson does not have a valid URL.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");

    const doneIds = markLessonDone(module.id, lessonId);
    const allLessons = module.lessons || [];
    const allDone = allLessons.length > 0 && allLessons.every((l) => doneIds.has(l.id));

    if (allDone && !completedModuleSet.has(module.id) && busyModuleId !== module.id) {
      await completeModule(module.id);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Training</h1>
        <p className="mt-1 text-sm text-slate-600">Open each lesson in a module. Module completes when all lessons are completed.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Modules Completed</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${completedCount} / ${totalModules}`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Progress</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${progressPercent.toFixed(0)}%`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Published Modules</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : totalModules}</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {ok && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

      <div className="surface-card-strong p-5">
        <h2 className="text-xl font-bold text-slate-900">Learning Modules</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading modules...</p>
        ) : modules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No bulk modules published yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {modules.map((m) => {
              const lessons = m.lessons || [];
              const doneCount = moduleDoneCount(m.id);
              const done = completedModuleSet.has(m.id);

              return (
                <div key={m.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        {lessons.length} lessons · {Math.min(doneCount, lessons.length)}/{lessons.length} completed
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        done
                          ? "bg-emerald-100 text-emerald-800"
                          : busyModuleId === m.id
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {done ? "Completed" : busyModuleId === m.id ? "Saving..." : "Pending"}
                    </span>
                  </div>

                  {lessons.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No lessons available in this module.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {lessons.map((lesson) => {
                        const lessonDone = (lessonProgress[String(m.id)] || []).includes(lesson.id);
                        return (
                          <div key={lesson.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/40 bg-white/40 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{lesson.title}</p>
                              <p className="text-xs text-slate-500 capitalize">{lesson.lesson_type}</p>
                            </div>
                            <button
                              className="btn-secondary px-3 py-1 text-xs"
                              onClick={() => openLesson(m, lesson.id, lesson.content)}
                            >
                              {lessonDone ? "Open Again" : "Open Lesson"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
