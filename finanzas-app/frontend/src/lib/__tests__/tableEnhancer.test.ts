import { enhanceTables } from '../tableEnhancer';

function mount(html: string) {
  document.body.innerHTML = `<main>${html}</main>`;
  enhanceTables(document);
  return document.querySelector('table') as HTMLTableElement;
}

const BASE = `
  <table>
    <thead><tr><th>Persona</th><th>Monto</th><th>Nota</th><th>Acc.</th></tr></thead>
    <tbody>
      <tr><td>Ana</td><td>$184.900</td><td>cuota</td><td><button>x</button></td></tr>
      <tr><td>Beto</td><td>-$2.364.000</td><td>-</td><td><button>x</button></td></tr>
      <tr><td colspan="4">Sin datos</td></tr>
    </tbody>
    <tfoot><tr><td>Total</td><td>$2.548.900</td></tr></tfoot>
  </table>`;

describe('enhanceTables', () => {
  it('copies header labels onto cells and hides the label of action columns', () => {
    const table = mount(BASE);
    const cells = table.tBodies[0].rows[0].cells;
    expect(table.classList.contains('dt-stack')).toBe(true);
    expect(cells[0].getAttribute('data-label')).toBe('Persona');
    expect(cells[1].getAttribute('data-label')).toBe('Monto');
    expect(cells[3].getAttribute('data-label')).toBe('');
  });

  it('flags numeric columns on both header and cells, and leaves text columns alone', () => {
    const table = mount(BASE);
    const head = table.tHead!.rows[0].cells;
    const row = table.tBodies[0].rows[1].cells;
    expect(head[1].hasAttribute('data-num')).toBe(true);
    expect(row[1].hasAttribute('data-num')).toBe(true);
    expect(head[0].hasAttribute('data-num')).toBe(false);
    expect(row[2].hasAttribute('data-num')).toBe(false);
  });

  it('marks rows with fewer cells as empty-state or total rows', () => {
    const table = mount(BASE);
    expect(table.tBodies[0].rows[2].getAttribute('data-span')).toBe('empty');
    expect(table.tFoot!.rows[0].getAttribute('data-span')).toBe('total');
  });

  it('skips tables that opt out with data-plain or have grouped headers', () => {
    const plain = mount(BASE.replace('<table>', '<table data-plain>'));
    expect(plain.classList.contains('dt-stack')).toBe(false);
    const grouped = mount(`<table><thead><tr><th colspan="2">Grupo</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`);
    expect(grouped.classList.contains('dt-stack')).toBe(false);
  });

  it('is idempotent', () => {
    const table = mount(BASE);
    const before = table.outerHTML;
    enhanceTables(document);
    expect(table.outerHTML).toBe(before);
  });
});
