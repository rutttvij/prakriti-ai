import type { ContactMessageStatus } from "../../../lib/types";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  status: "" | ContactMessageStatus;
  onStatusChange: (value: "" | ContactMessageStatus) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
};

const STATUS_OPTIONS: Array<{ label: string; value: "" | ContactMessageStatus }> = [
  { label: "All statuses", value: "" },
  { label: "New", value: "new" },
  { label: "In Progress", value: "in_progress" },
  { label: "Replied", value: "replied" },
  { label: "Closed", value: "closed" },
  { label: "Spam", value: "spam" },
];

export default function ContactMessagesFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  unreadOnly,
  onUnreadOnlyChange,
}: Props) {
  return (
    <section className="surface-card-strong rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="ui-input"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name / email / subject / message"
        />

        <select
          className="ui-input"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as "" | ContactMessageStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-3 rounded-xl border border-emerald-100/70 bg-white/60 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => onUnreadOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
          />
          Unread only
        </label>
      </div>
    </section>
  );
}
