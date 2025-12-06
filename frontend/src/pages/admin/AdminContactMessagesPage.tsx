import { useEffect, useState } from "react";
import api from "../../lib/api.ts";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export const AdminContactMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<ContactMessage[]>([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get("/contact/admin");
      setMessages(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <main className="relative mx-auto max-w-6xl px-4 pt-20 pb-14">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-60" />

      {/* Wrapper */}
      <div className="relative rounded-3xl bg-white/70 backdrop-blur-xl border border-emerald-100/70 shadow-lg shadow-emerald-100/40 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Contact Form Submissions
        </h1>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              flex-1 rounded-xl border border-emerald-100 bg-white/80 
              px-4 py-2 text-sm shadow-sm shadow-emerald-50
              focus:outline-none focus:ring-2 focus:ring-emerald-400
            "
          />
        </div>

        {/* Table wrapper */}
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white/60 backdrop-blur-xl shadow-sm shadow-emerald-100">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/70 border-b border-emerald-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Message</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500 animate-pulse"
                  >
                    Loading messages…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No messages found.
                  </td>
                </tr>
              ) : (
                filtered.map((msg) => (
                  <tr
                    key={msg.id}
                    className="border-b border-emerald-100/50 hover:bg-emerald-50/40 transition"
                  >
                    <td className="px-4 py-3 text-slate-800 font-medium">{msg.name}</td>
                    <td className="px-4 py-3 text-emerald-700">{msg.email}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <div className="line-clamp-2">{msg.message}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(msg.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default AdminContactMessagesPage;
