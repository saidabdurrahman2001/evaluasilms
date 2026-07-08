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

function matchesQuery(row, q) {
  if (!q) return true;
  const hay = `${row.open_id} ${row.module_name} ${row.date_raw} ${row.day_name} ${row.month} ${row.year}`.toLowerCase();
  return hay.includes(q);
}

function mobileRenderList(data, day, month, query) {
  const list = document.getElementById('mobileList');
  const shownEl = document.getElementById('mobileShown');
  const totalEl = document.getElementById('mobileTotal');
  if (!list || !shownEl || !totalEl) return;

  const q = String(query || '').trim().toLowerCase();
  const filtered = data
    .filter(r => (day ? String(r.day_name || '').toUpperCase() === day : true))
    .filter(r => (month ? String(r.month || '').toUpperCase() === month : true))
    .filter(r => matchesQuery(r, q))
    .slice()
    .sort((a, b) => {
      const da = toISODate(a);
      const db = toISODate(b);
      if (da !== db) return da.localeCompare(db);
      return String(a.module_name || '').localeCompare(String(b.module_name || ''));
    });

  totalEl.textContent = String(data.length);
  shownEl.textContent = String(filtered.length);

  list.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'subtle';
    empty.style.fontSize = '13px';
    empty.textContent = 'Tidak ada hasil.';
    list.appendChild(empty);
    return;
  }

  for (const r of filtered) {
    const card = document.createElement('div');
    card.className = 'mobile-card';

    const datePretty = r.date_raw || [r.day_name, r.day, r.month, r.year].filter(Boolean).join(' ');

    card.innerHTML = `
      <div class="mobile-meta">
        <div class="mobile-id">Open ID: ${escapeHtml(r.open_id)}</div>
        <div><span class="badge badge-soft">${escapeHtml(datePretty)}</span></div>
      </div>
      <p class="mobile-title mt-2">${escapeHtml(r.module_name)}</p>
      <div class="mobile-actions">
        <a class="btn btn-outline-primary btn-mobile" href="${escapeAttr(r.link)}" target="_blank" rel="noopener noreferrer">
          Buka evaluasi
        </a>
      </div>
    `;

    list.appendChild(card);
  }
}

function render() {
  const data = window.LMS_SCHEDULE_DATA || [];
  const countEl = document.getElementById('rowCount');
  countEl.textContent = `${data.length.toLocaleString()} sesi`;

  const daySelect = document.getElementById('filterDay');
  const monthSelect = document.getElementById('filterMonth');
  const mobileSearch = document.getElementById('mobileSearch');

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
    const iso = toISODate(r);

    tr.innerHTML = `
      <td class="text-monospace">${r.open_id}</td>
      <td>${escapeHtml(r.module_name)}</td>
      <td><span class="badge badge-soft">${escapeHtml(datePretty)}</span></td>
      <td class="d-none">${escapeHtml(iso)}</td>
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
    // Default: tanggal paling baru dulu (pakai kolom ISO tersembunyi)
    order: [[3, 'desc'], [1, 'asc']],
    autoWidth: false,
    columnDefs: [{ targets: [3], visible: false, searchable: false }],
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

    mobileRenderList(data, day, month, mobileSearch?.value || '');
  }

  daySelect.addEventListener('change', applyFilters);
  monthSelect.addEventListener('change', applyFilters);
  mobileSearch?.addEventListener('input', applyFilters);

  document.getElementById('btnReset').addEventListener('click', () => {
    daySelect.value = '';
    monthSelect.value = '';
    if (mobileSearch) mobileSearch.value = '';
    table.search('');
    table.columns().search('');
    table.draw();
    mobileRenderList(data, '', '', '');
  });

  // Initial mobile render
  mobileRenderList(data, daySelect.value, monthSelect.value, mobileSearch?.value || '');
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

