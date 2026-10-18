export type PrintCell = string | number | null | undefined;

const escapeHtml = (value: PrintCell) =>
  String(value ?? "-").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );

/** Print every filtered row, not only the current pagination page. */
export function printAdminTable(options: {
  title: string;
  headers: string[];
  rows: PrintCell[][];
  subtitle?: string;
}) {
  const popup = window.open("", "_blank");
  if (!popup) {
    window.alert("Please allow pop-ups for this site to print the table.");
    return;
  }
  const { title, headers, rows, subtitle } = options;
  const date = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date());
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${escapeHtml(title)} - TerraDues</title>
  <style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 12px Arial, sans-serif; color: #17212b; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: end; border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 18px; }
  .brandline { display:flex; align-items:center; gap:10px; margin-bottom:5px; }
  .td-logo { width:39px; height:39px; border-radius:12px; background:#059669; color:white; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900; letter-spacing:-.5px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .brandname { font-weight:900; color:#064e3b; font-size:14px; letter-spacing:.5px; }
  h1 { margin: 4px 0; font-size: 22px; }
  .brand { font-size: 11px; letter-spacing: 2px; color: #047857; font-weight: 700; }
  .meta { font-size: 11px; color: #475569; text-align: right; }
  .subtitle { margin: 0 0 12px; color: #475569; }
  table { border-collapse: collapse; width: 100%; table-layout: auto; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 9px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #e8f5ef; font-weight: 700; }
  tr:nth-child(even) td { background: #f8fafc; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .footer { margin-top: 12px; font-size: 10px; color: #64748b; }
  @media screen { body { padding: 24px; } }
  </style></head><body>
  <div class="top"><div><div class="brandline"><span class="td-logo">TD</span><span class="brandname">TERRA DUES</span></div><div class="brand">ADMIN REPORT</div><h1>${escapeHtml(title)}</h1></div>
  <div class="meta">Printed: ${escapeHtml(date)}<div>${rows.length} record(s)</div></div></div>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((row) => `<tr>${headers.map((_, i) => `<td>${escapeHtml(row[i])}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <p class="footer">Generated from TerraDues admin records. Verify records before official use.</p>
  <script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
  </body></html>`;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
