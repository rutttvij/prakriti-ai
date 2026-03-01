import { useEffect, useState } from "react";

import { Dialog } from "../../ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  loading?: boolean;
  onConfirm: (reason?: string) => Promise<void> | void;
};

export default function RevokeDialog({ open, onClose, title = "Revoke PCC", loading, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">This will create a debit transaction and mark this log as revoked.</p>
        <textarea
          className="ui-input min-h-24"
          placeholder="Optional reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" onClick={handleConfirm} disabled={loading}>
            {loading ? "Revoking..." : "Confirm Revoke"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
