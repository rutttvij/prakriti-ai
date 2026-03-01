import { Badge } from "../../ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../ui/Table";
import type { AdminContactMessageListItem, ContactMessageStatus } from "../../../lib/types";

type Props = {
  rows: AdminContactMessageListItem[];
  loading: boolean;
  onOpen: (id: number) => void;
};

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  replied: "Replied",
  closed: "Closed",
  spam: "Spam",
};

const STATUS_BADGE_CLASS: Record<ContactMessageStatus, string> = {
  new: "border-sky-300/80 bg-sky-100/70 text-sky-800",
  in_progress: "border-amber-300/80 bg-amber-100/70 text-amber-800",
  replied: "border-emerald-300/80 bg-emerald-100/70 text-emerald-800",
  closed: "border-slate-300/80 bg-slate-100/70 text-slate-700",
  spam: "border-rose-300/80 bg-rose-100/70 text-rose-700",
};

export function statusLabel(status: ContactMessageStatus) {
  return STATUS_LABELS[status];
}

export function statusBadgeClass(status: ContactMessageStatus) {
  return STATUS_BADGE_CLASS[status];
}

export default function ContactMessagesTable({ rows, loading, onOpen }: Props) {
  return (
    <section className="surface-card-strong overflow-hidden rounded-[1.8rem]">
      <div className="overflow-x-auto">
        <Table className="min-w-full text-xs sm:text-sm">
          <TableHead className="border-b border-emerald-100/70">
            <TableRow className="border-b-0">
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Subject / Preview</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Received</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                  Loading messages...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onOpen(row.id)}
                  className={`cursor-pointer transition hover:bg-emerald-50/60 ${
                    row.is_read ? "bg-white/45" : "bg-emerald-50/75"
                  }`}
                >
                  <TableCell className={row.is_read ? "" : "font-semibold text-slate-900"}>
                    {row.name}
                    <div className="text-[0.65rem] text-slate-500">#{row.id}</div>
                  </TableCell>
                  <TableCell className={row.is_read ? "text-emerald-700" : "font-medium text-emerald-700"}>
                    {row.email}
                  </TableCell>
                  <TableCell className="max-w-md text-slate-700">
                    <p className="line-clamp-1 text-[0.73rem] font-semibold text-slate-800">{row.subject || "(No subject)"}</p>
                    <p className="line-clamp-2 text-[0.78rem] text-slate-600">{row.message_preview}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-[0.75rem] text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
