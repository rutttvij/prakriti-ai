import { motion } from "framer-motion";

import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../ui/Table";
import { impactOutcomes, ledgerPreview } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function ImpactVision() {
  return (
    <section id="about-impact" className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="surface-card-strong p-6 sm:p-8">
          <Badge>Impact Vision</Badge>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Operational trust with measurable climate outcomes.</h2>

          <div className="mt-5 space-y-3">
            {impactOutcomes.map((item) => (
              <Card key={item.title} className="p-4">
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="text-xl font-bold text-slate-900">PCC Ledger Preview</h3>
          <p className="mt-1 text-sm text-slate-600">Illustrative record of verification-linked climate value flow.</p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100/70 bg-white/85">
            <Table>
              <TableHead>
                <TableRow className="border-b border-emerald-100/70">
                  <TableHeaderCell>Entry</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Weight</TableHeaderCell>
                  <TableHeaderCell>Carbon</TableHeaderCell>
                  <TableHeaderCell>PCC</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerPreview.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold text-slate-800">{row.id}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.verifiedWeight}</TableCell>
                    <TableCell>{row.carbonSaved}</TableCell>
                    <TableCell className="font-semibold text-emerald-700">{row.pcc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
