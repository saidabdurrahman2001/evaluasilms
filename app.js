/* global window, document */

function uniqSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MONTH_ORDER = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];
const MONTH_TO_NUM = Object.fromEntries(MONTH_ORDER.map((m, i) => [m, i + 1]));

function buildOption(select, value, label) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label ?? value;
  select.appendChild(opt);
}

function toISODate(r) {
  const y = String(r.year || '').trim();
  const m = MONTH_TO_NUM[String(r.month || '').trim().toUpperCase()];
  const d = parseInt(String(r.day || '').trim(), 10);
  if (!y || !m || Number.isNaN(d)) return '';
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function render() {
  const data = window.LMS_SCHEDULE_DATA || [];
  const countEl = document.getElementById('rowCount');
  countEl.textContent = `${data.length.toLocaleString()} sesi`;

  const daySelect = document.getElementById('filterDay');
  const monthSelect = document.getElementById('filterMonth');

  // Order days Monday..Sunday
  const presentDays = new Set(data.map(r => String(r.day_name || '').toUpperCase()).filter(Boolean));
  DAY_ORDER.filter(d => presentDays.has(d)).forEach(v => buildOption(daySelect, v, v));

  // Order months Jan..Dec
  const presentMonths = new Set(data.map(r => String(r.month || '').toUpperCase()).filter(Boolean));
  MONTH_ORDER.filter(m => presentMonths.has(m)).forEach(v => buildOption(monthSelect, v, v));

  const tbody = document.querySelector('#scheduleTable tbody');
  tbody.innerHTML = '';

  for (const r of data) {
    const tr = document.createElement('tr');

    const datePretty = r.date_raw || [r.day_name, r.day, r.month, r.year].filter(Boolean).join(' ');

    tr.innerHTML = `
      <td class="text-monospace">${r.open_id}</td>
      <td>${escapeHtml(r.module_name)}</td>
      <td><span class="badge badge-soft">${escapeHtml(datePretty)}</span></td>
      <td class="text-end">
        <a class="btn btn-sm btn-outline-primary link-btn" href="${escapeAttr(r.link)}" target="_blank" rel="noopener noreferrer">
          Buka evaluasi
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  }

  // eslint-disable-next-line no-undef
  const table = new DataTable('#scheduleTable', {
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    order: [[2, 'asc'], [1, 'asc']],
    autoWidth: false,
    dom:
      "<'row align-items-center g-3'<'col-md-6'l><'col-md-6'f>>" +
      "<'row mt-3'<'col-12'tr>>" +
      "<'row mt-3 align-items-center'<'col-md-6'i><'col-md-6'p>>",
    language: {
      search: 'Cari:',
      lengthMenu: 'Tampilkan _MENU_',
      info: 'Menampilkan _START_–_END_ dari _TOTAL_',
      infoEmpty: 'Tidak ada data',
      zeroRecords: 'Tidak ada hasil',
      paginate: { previous: 'Sebelumnya', next: 'Berikutnya' },
    },
  });

  function applyFilters() {
    const day = daySelect.value;
    const month = monthSelect.value;

    // Filter date column (index 2) by contains for day/month text.
    const dateNeedles = [day, month].filter(Boolean).join(' ');
    table.column(2).search(dateNeedles);
    table.draw();
  }

  daySelect.addEventListener('change', applyFilters);
  monthSelect.addEventListener('change', applyFilters);

  document.getElementById('btnReset').addEventListener('click', () => {
    daySelect.value = '';
    monthSelect.value = '';
    table.search('');
    table.columns().search('');
    table.draw();
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('`', '&#096;');
}

document.addEventListener('DOMContentLoaded', render);

