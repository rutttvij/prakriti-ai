import api from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useState } from "react";

async function downloadCsv(path: string, params: Record<string, string | undefined>, filename: string) {
  const res = await api.get<string>(path, { params, responseType: "text" });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { push } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params = { date_from: dateFrom || undefined, date_to: dateTo || undefined };

  const run = async (path: string, file: string) => {
    try {
      await downloadCsv(path, params, file);
      push("success", `${file} downloaded.`);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to export report.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Export Center</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input type="datetime-local" className="ui-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="datetime-local" className="ui-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button className="btn-primary" onClick={() => run("/admin/reports/demo-requests.csv", "demo-requests.csv")}>Export demo requests CSV</button>
          <button className="btn-primary" onClick={() => run("/admin/reports/contact-messages.csv", "contact-messages.csv")}>Export contact messages CSV</button>
          <button className="btn-primary" onClick={() => run("/admin/reports/pcc-transactions.csv", "pcc-transactions.csv")}>Export PCC transactions CSV</button>
          <button className="btn-primary" onClick={() => run("/admin/reports/users.csv", "users.csv")}>Export users CSV</button>
        </div>
      </section>
    </div>
  );
}
