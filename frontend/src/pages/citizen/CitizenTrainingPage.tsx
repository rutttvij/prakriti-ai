import { useEffect, useMemo, useState } from "react";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import {
  completeCitizenTrainingModule,
  fetchCitizenTrainingModules,
  fetchCitizenTrainingSummary,
} from "../../lib/api";
import type { CitizenTrainingModule, CitizenTrainingSummary } from "../../lib/types";

const EMPTY_SUMMARY: CitizenTrainingSummary = {
  total_modules_published: 0,
  completed_count: 0,
  completed_module_ids: [],
  progress_percent: 0,
  badges_count: 0,
  next_module: null,
  badges: [],
};

const LESSON_PROGRESS_KEY = "citizen_training_lesson_progress_v1";

type LessonProgressMap = Record<string, number[]>;

function readLessonProgress(): LessonProgressMap {
  try {
    const raw = window.localStorage.getItem(LESSON_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LessonProgressMap;
  } catch {
    return {};
  }
}

function saveLessonProgress(progress: LessonProgressMap) {
  window.localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(progress));
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CitizenTrainingPage() {
  const [modules, setModules] = useState<CitizenTrainingModule[]>([]);
  const [summary, setSummary] = useState<CitizenTrainingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>(() => readLessonProgress());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, sum] = await Promise.all([fetchCitizenTrainingModules(), fetchCitizenTrainingSummary()]);
      setModules(mods);
      setSummary(sum);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load training data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const completedSet = useMemo(() => {
    return new Set<number>(summary.completed_module_ids || []);
  }, [summary.completed_module_ids]);

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
    setBusyId(moduleId);
    try {
      await completeCitizenTrainingModule(moduleId);
      setOk("Module marked complete.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to mark module complete.");
    } finally {
      setBusyId(null);
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

    if (allDone && !completedSet.has(module.id) && busyId !== module.id) {
      await completeModule(module.id);
    }
  };

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · TRAINING"
        title="Training"
        subtitle="Open each lesson link inside a module. Module completes automatically after all lessons are done."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Published Modules</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.total_modules_published}</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.completed_count}</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Progress</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.progress_percent.toFixed(0)}%</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Badges</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.badges_count}</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {ok && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

      <div className="surface-card-strong rounded-3xl p-5">
        <h3 className="text-xl font-semibold text-slate-900">Modules</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading modules...</p>
        ) : modules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No training modules published yet.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {modules.map((m) => {
              const lessons = m.lessons || [];
              const doneCount = moduleDoneCount(m.id);
              const done = completedSet.has(m.id);

              return (
                <div key={m.id} className="rounded-2xl border border-white/50 bg-white/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{m.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {lessons.length} lessons · {Math.min(doneCount, lessons.length)}/{lessons.length} completed
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {done ? "Completed" : busyId === m.id ? "Saving..." : "Pending"}
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

      <div className="surface-card-strong rounded-3xl p-5">
        <h3 className="text-xl font-semibold text-slate-900">Badges</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.badges.length === 0 ? (
            <span className="text-sm text-slate-500">No badges yet.</span>
          ) : (
            summary.badges.map((b) => (
              <span key={b.id} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                {b.title}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
