import { useEffect, useMemo, useState } from "react";

import {
  convertAdminContactMessageToDemo,
  fetchAdminContactMessage,
  fetchAdminContactMessages,
  updateAdminContactMessage,
} from "../../lib/api";
import type {
  AdminContactMessage,
  AdminContactMessageListItem,
  ContactMessageStatus,
} from "../../lib/types";
import { useToast } from "../../components/ui/Toast";
import ContactMessageDrawer from "../../components/admin/contact/ContactMessageDrawer";
import ContactMessagesFilters from "../../components/admin/contact/ContactMessagesFilters";
import ContactMessagesTable from "../../components/admin/contact/ContactMessagesTable";

const PAGE_SIZE = 50;

export const AdminContactMessagesPage: React.FC = () => {
  const { push } = useToast();

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | ContactMessageStatus>("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminContactMessageListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminContactMessage | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminContactMessages({
        q: query || undefined,
        status: status || undefined,
        unread_only: unreadOnly || undefined,
        page: 1,
        page_size: PAGE_SIZE,
      });
      setRows(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, unreadOnly]);

  const openDetails = async (id: number) => {
    setSelectedId(id);
    setDetailsLoading(true);
    try {
      const res = await fetchAdminContactMessage(id);
      setSelected(res);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load message details.");
      setSelectedId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const mergeRow = (next: AdminContactMessage) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === next.id
          ? {
              ...row,
              status: next.status,
              is_read: next.is_read,
              message_preview: next.message.slice(0, 140) + (next.message.length > 140 ? "..." : ""),
            }
          : row
      )
    );
  };

  const handleSave = async (payload: { status: ContactMessageStatus; is_read: boolean; admin_notes: string }) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateAdminContactMessage(selected.id, payload);
      setSelected(updated);
      mergeRow(updated);
      push("success", "Message updated.");
      if (unreadOnly && updated.is_read) {
        setRows((prev) => prev.filter((row) => row.id !== updated.id));
      }
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to update message.");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!selected) return;
    setConverting(true);
    try {
      const res = await convertAdminContactMessageToDemo(selected.id);
      setSelected(res.contact_message);
      mergeRow(res.contact_message);
      push("success", `Converted to demo request #${res.demo_request_id}.`);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to convert to demo request.");
    } finally {
      setConverting(false);
    }
  };

  const unreadCount = useMemo(() => rows.filter((row) => !row.is_read).length, [rows]);
  const newCount = useMemo(() => rows.filter((row) => row.status === "new").length, [rows]);

  return (
    <div className="relative space-y-5">
      <header className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Super Admin · Contact
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]" style={{ color: "#dffaf0" }}>
          Contact messages inbox
        </h1>
        <p className="mt-1 text-sm text-emerald-100">
          Triage incoming messages with read state, status workflow, notes, and demo conversion.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-[0.72rem]">
          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200/45 bg-emerald-50/70 px-3 py-1 text-slate-700">
            Total: <span className="font-semibold">{total}</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-amber-200/55 bg-amber-50/70 px-3 py-1 text-slate-700">
            Unread: <span className="font-semibold">{unreadCount}</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-sky-200/55 bg-sky-50/70 px-3 py-1 text-slate-700">
            New: <span className="font-semibold">{newCount}</span>
          </div>
        </div>
      </header>

      <ContactMessagesFilters
        search={queryInput}
        onSearchChange={setQueryInput}
        status={status}
        onStatusChange={setStatus}
        unreadOnly={unreadOnly}
        onUnreadOnlyChange={setUnreadOnly}
      />

      <ContactMessagesTable rows={rows} loading={loading} onOpen={openDetails} />

      <ContactMessageDrawer
        open={selectedId !== null}
        loading={detailsLoading}
        saving={saving}
        converting={converting}
        item={selected}
        onClose={() => {
          setSelectedId(null);
          setSelected(null);
        }}
        onSave={handleSave}
        onConvert={handleConvert}
      />
    </div>
  );
};

export default AdminContactMessagesPage;
