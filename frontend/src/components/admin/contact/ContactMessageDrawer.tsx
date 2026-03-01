import { useEffect, useState } from "react";

import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import type { AdminContactMessage, ContactMessageStatus } from "../../../lib/types";
import { statusBadgeClass, statusLabel } from "./ContactMessagesTable";

type Props = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  converting: boolean;
  item: AdminContactMessage | null;
  onClose: () => void;
  onSave: (payload: { status: ContactMessageStatus; is_read: boolean; admin_notes: string }) => Promise<void>;
  onConvert: () => Promise<void>;
};

const STATUS_OPTIONS: ContactMessageStatus[] = ["new", "in_progress", "replied", "closed", "spam"];

export default function ContactMessageDrawer({
  open,
  loading,
  saving,
  converting,
  item,
  onClose,
  onSave,
  onConvert,
}: Props) {
  const [status, setStatus] = useState<ContactMessageStatus>("new");
  const [isRead, setIsRead] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    setStatus(item.status);
    setIsRead(item.is_read);
    setNotes(item.admin_notes || "");
  }, [item]);

  if (!open) return null;

  const converted = Boolean(item?.converted_demo_request_id);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/40" onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-xl p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="surface-card-strong h-full overflow-y-auto rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Message details</h3>
            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={onClose}>
              Close
            </Button>
          </div>

          {loading || !item ? (
            <div className="py-8 text-sm text-slate-500">Loading details...</div>
          ) : (
            <>
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-900">{item.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span> <span className="font-medium text-emerald-700">{item.email}</span>
                </div>
                <div>
                  <span className="text-slate-500">Received:</span>{" "}
                  <span className="font-medium text-slate-900">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Subject:</span>{" "}
                  <span className="font-medium text-slate-900">{item.subject || "(No subject)"}</span>
                </div>
                <div className="rounded-xl border border-emerald-100/70 bg-white/60 p-3 text-slate-700">{item.message}</div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</label>
                <div className="flex items-center gap-2">
                  <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value as ContactMessageStatus)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {statusLabel(option)}
                      </option>
                    ))}
                  </select>
                  <Badge className={statusBadgeClass(status)}>{statusLabel(status)}</Badge>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isRead}
                    onChange={(e) => setIsRead(e.target.checked)}
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Mark as read
                </label>

                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Internal notes</label>
                <textarea
                  className="ui-input min-h-[150px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes for your team"
                />

                <Button
                  className="w-full"
                  disabled={saving}
                  onClick={() => onSave({ status, is_read: isRead, admin_notes: notes })}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={converting || converted}
                  onClick={onConvert}
                >
                  {converted
                    ? `Converted (Demo #${item.converted_demo_request_id})`
                    : converting
                    ? "Converting..."
                    : "Convert to Demo Request"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
