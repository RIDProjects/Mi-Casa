/**
 * Progressive enhancement for every <table> inside <main>:
 *  - copies each header label onto its cells (data-label) so rows can render as stacked cards on phones,
 *  - flags numeric columns (data-num) so amounts align right with tabular figures on every screen.
 * Tables can opt out with the `data-plain` attribute (e.g. checkbox matrices).
 */
const NUMERIC = /^[+\-–−]?\s*(?:[A-Z]{1,3}\$|[$€£¥])?\s*[+\-–−]?\s*\d[\d.,\s]*\s*(?:%|[A-Z]{3}|\/mes|\/día|m|k|M)?$/;

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

const PHONE_MAX = 639;

/**
 * Phones: stack rows as cards only when the table would not fit its container (otherwise a compact
 * 4-column table is clearer than a long list of cards). Wider screens never use the stacked layout,
 * so the class is harmless there and we skip measuring.
 */
function applyStacking(table: HTMLTableElement) {
  if (window.innerWidth > PHONE_MAX) { table.classList.add('dt-stack'); delete table.dataset.dtSig; return; }
  const container = table.parentElement;
  if (!container || container.clientWidth === 0) return; // hidden (e.g. inactive tab): keep current state
  // Measuring forces layout: only redo it when the viewport or the table content changed.
  const signature = `${window.innerWidth}:${table.rows.length}:${table.textContent?.length ?? 0}`;
  if (table.dataset.dtSig === signature) return;
  table.dataset.dtSig = signature;
  table.classList.remove('dt-stack');
  const fits = table.scrollWidth <= container.clientWidth + 1;
  if (!fits) table.classList.add('dt-stack');
}

function enhanceTable(table: HTMLTableElement) {
  if (table.hasAttribute('data-plain')) return;

  const headRow = table.tHead?.rows[0];
  if (!headRow) return;
  const headers = Array.from(headRow.cells);
  const columns = headers.length;
  if (columns === 0 || headers.some(h => h.colSpan > 1)) return;

  const bodyRows = Array.from(table.tBodies).flatMap(b => Array.from(b.rows))
    .concat(table.tFoot ? Array.from(table.tFoot.rows) : []);
  const dataRows = bodyRows.filter(r => r.cells.length === columns);
  if (dataRows.length === 0) return;

  applyStacking(table);

  headers.forEach((h, i) => {
    const raw = text(h);
    // Action columns carry icon buttons only: a label ("Acc.", "Acciones") adds noise on stacked cards.
    const label = /^acc(?:iones|\.)?$/i.test(raw) ? '' : raw;
    const cells = dataRows.map(r => r.cells[i]).filter(c => text(c) !== '');
    const numeric = cells.length > 0 && cells.filter(c => NUMERIC.test(text(c))).length / cells.length >= 0.7;

    if (numeric) h.setAttribute('data-num', ''); else h.removeAttribute('data-num');
    dataRows.forEach(r => {
      const cell = r.cells[i];
      if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
      if (numeric && text(cell) !== '') { if (!cell.hasAttribute('data-num')) cell.setAttribute('data-num', ''); }
      else if (cell.hasAttribute('data-num')) cell.removeAttribute('data-num');
    });
  });

  // Rows that span the whole table (empty states, section dividers) must not stack like data rows.
  bodyRows.filter(r => r.cells.length !== columns).forEach(r =>
    r.setAttribute('data-span', r.cells.length === 1 ? 'empty' : 'total'));
}

export function enhanceTables(root: ParentNode = document) {
  root.querySelectorAll<HTMLTableElement>('main table').forEach(enhanceTable);
}
