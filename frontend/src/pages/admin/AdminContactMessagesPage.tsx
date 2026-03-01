// src/pages/admin/AdminContactMessagesPage.tsx

import { useEffect, useState } from "react";
import api from "../../lib/api";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export const AdminContactMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filtered, setFiltered] = useState<ContactMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get<ContactMessage[]>("/contact/admin");
        setMessages(res.data || []);
        setFiltered(res.data || []);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Live filtering
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(
      messages.filter(
        (m) =>
          m.name.toLowerCase().includes(s) ||
          m.email.toLowerCase().includes(s) ||
          m.message.toLowerCase().includes(s)
      )
    );
  }, [search, messages]);

  const total = messages.length;
  const inView = filtered.length;

  return (
    <div className="relative">
      <div className="relative space-y-5">
        {/* Header */}
        <header
          className="
            rounded-3xl border border-white/20 bg-slate-950/26 p-5
            shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl
            flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between
          "
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Super Admin · Contact
            </div>
            <h1
              className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]"
              style={{ color: "#dffaf0" }}
            >
              Contact messages
            </h1>
            <p className="mt-1 text-sm text-emerald-100">
              View and search incoming queries from the public contact form and
              direct the right team to respond.
            </p>
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem]">
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200/45 bg-emerald-50/70 px-3 py-1 shadow-sm shadow-emerald-900/10 backdrop-blur-sm text-slate-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Total: <span className="font-semibold">{total}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200/45 bg-emerald-50/70 px-3 py-1 shadow-sm shadow-emerald-900/10 backdrop-blur-sm text-slate-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
              In view: <span className="font-semibold">{inView}</span>
            </div>
          </div>
        </header>

        {/* Search / filters card */}
        <section className="surface-card-strong rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Filter &amp; search
              </h2>
              <p className="text-[0.7rem] text-slate-600">
                Search by name, email or message content.
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages…"
                  className="
                    w-full rounded-full border border-emerald-100/80
                    bg-white/80 pl-8 pr-3 py-2 text-xs
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[0.7rem] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Table card */}
        <section className="surface-card-strong overflow-hidden rounded-[1.8rem]">
          <div className="border-b border-emerald-100/70 bg-white/30 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">
              {inView} message{inView === 1 ? "" : "s"} in view
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-white/30 border-b border-emerald-100">
                <tr className="text-[0.7rem] text-slate-600">
                  <th className="px-4 py-3 text-left sm:px-5">Name</th>
                  <th className="px-4 py-3 text-left sm:px-5">Email</th>
                  <th className="px-4 py-3 text-left sm:px-5">Message</th>
                  <th className="px-4 py-3 text-left sm:px-5">Received</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-slate-500 animate-pulse sm:px-5"
                    >
                      Loading messages…
                    </td>
                  </tr>
                ) : inView === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-slate-500 sm:px-5"
                    >
                      No messages found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((msg) => (
                    <tr
                      key={msg.id}
                      className="border-b border-emerald-100/60 bg-white/40 hover:bg-emerald-50/50 transition"
                    >
                      <td className="px-4 py-3 text-slate-900 font-medium sm:px-5">
                        {msg.name}
                        <div className="text-[0.65rem] text-slate-500">
                          No.{msg.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-emerald-700 sm:px-5">
                        {msg.email}
                      </td>
                      <td className="px-4 py-3 text-slate-700 sm:px-5 sm:max-w-md">
                        <div className="line-clamp-2">{msg.message}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[0.7rem] sm:px-5 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminContactMessagesPage;
