import type { FeeItem } from "@/lib/mockData";

export function TreatmentBreakdown({ invoice }: { invoice: FeeItem }) {
  return (
    <div className="responsive-table-frame invoice-table-frame border border-[#E4E9F0] rounded-2xl overflow-hidden">
      <table aria-label="Treatment breakdown" role="table" className="responsive-table w-full text-left text-xs">
        <thead role="rowgroup" className="bg-[#EDF7FA] text-[#00738E] font-semibold font-mono text-[11px]">
          <tr role="row">
            <th role="columnheader" scope="col" className="p-2.5">Treatment / Procedure</th>
            <th role="columnheader" scope="col" className="p-2.5 text-center">Tooth</th>
            <th role="columnheader" scope="col" className="p-2.5 text-right">Gross</th>
            <th role="columnheader" scope="col" className="p-2.5 text-right">Discount</th>
            <th role="columnheader" scope="col" className="p-2.5 text-right">Net Amount</th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="divide-y divide-[#E4E9F0] text-[#111C3A]">
          <tr role="row">
            <td role="cell" className="p-2.5 font-medium">
              <span className="responsive-table-label" aria-hidden="true">Treatment / Procedure</span>
              {invoice.procedureName}
              {invoice.notes && <span className="block text-[10px] text-[#64748B] italic">{invoice.notes}</span>}
            </td>
            <td role="cell" className="p-2.5 text-center font-mono text-[#0089A8] font-bold">
              <span className="responsive-table-label" aria-hidden="true">Tooth</span>
              {invoice.tooth || "Arch"}
            </td>
            <td role="cell" className="p-2.5 text-right font-mono text-[#64748B]">
              <span className="responsive-table-label" aria-hidden="true">Gross</span>
              ₹{invoice.amount.toLocaleString()}
            </td>
            <td role="cell" className="p-2.5 text-right font-mono text-emerald-700">
              <span className="responsive-table-label" aria-hidden="true">Discount</span>
              ₹{invoice.discount.toLocaleString()}
            </td>
            <td role="cell" className="p-2.5 text-right font-mono font-bold text-[#111C3A]">
              <span className="responsive-table-label" aria-hidden="true">Net amount</span>
              ₹{invoice.netAmount.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
