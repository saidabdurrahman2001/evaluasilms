/* global window, document */

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

const COL = {
  NO: 0,
  OPEN_ID: 1,
  MODULE: 2,
  DATE: 3,
  TIME: 4,
  NARASUMBER: 5,
  ISO: 6,
  ACTION: 7,
};

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

function formatTime(r) {
  const start = String(r.start_time || '').trim();
  const end = String(r.end_time || '').trim();
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return '—';
}

function formatNarasumber(r) {
  return String(r.narasumber || '').trim() || '—';
}

function sortByNo(a, b) {
  return Number(a.no) - Number(b.no);
}

function matchesQuery(row, q) {
  if (!q) return true;
  const hay = [
    row.no,
    row.open_id,
    row.module_name,
    row.date_raw,
    row.day_name,
    row.month,
    row.year,
    row.start_time,
    row.end_time,
    row.narasumber,
    row.asal_narsum,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function parseFlexibleDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (slashMatch) {
    const dd = String(slashMatch[1]).padStart(2, '0');
    const mm = String(slashMatch[2]).padStart(2, '0');
    return `${slashMatch[3]}-${mm}-${dd}`;
  }

  return '';
}

function rowMatchesFilters(row, { day, month, isoDate, query }) {
  if (day && String(row.day_name || '').toUpperCase() !== day) return false;
  if (month && String(row.month || '').toUpperCase() !== month) return false;
  if (isoDate && toISODate(row) !== isoDate) return false;
  if (!query) return true;

  if (matchesQuery(row, query)) return true;

  const parsedIso = parseFlexibleDate(query);
  return Boolean(parsedIso && toISODate(row) === parsedIso);
}

function mobileRenderList(data, filters) {
  const list = document.getElementById('mobileList');
  const shownEl = document.getElementById('mobileShown');
  const totalEl = document.getElementById('mobileTotal');
  if (!list || !shownEl || !totalEl) return;

  const q = String(filters.query || '').trim().toLowerCase();
  const filtered = data
    .filter(r => rowMatchesFilters(r, { ...filters, query: q }))
    .slice()
    .sort(sortByNo);

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
    const narasumber = formatNarasumber(r);

    card.innerHTML = `
      <div class="mobile-meta">
        <div class="mobile-id">No. ${escapeHtml(r.no)} · Open ID: ${escapeHtml(r.open_id)}</div>
        <div><span class="badge badge-soft">${escapeHtml(datePretty)}</span></div>
      </div>
      <p class="mobile-title mt-2">${escapeHtml(r.module_name)}</p>
      <div class="subtle" style="font-size: 12px;">
        <div>${escapeHtml(formatTime(r))}</div>
        <div class="mt-1">${narasumber === '—' ? '—' : `Narasumber: ${escapeHtml(narasumber)}`}</div>
      </div>
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
  const data = (window.LMS_SCHEDULE_DATA || []).slice().sort(sortByNo);
  const countEl = document.getElementById('rowCount');
  countEl.textContent = `${data.length.toLocaleString()} sesi`;

  const daySelect = document.getElementById('filterDay');
  const monthSelect = document.getElementById('filterMonth');
  const dateInput = document.getElementById('filterDate');
  const mobileSearch = document.getElementById('mobileSearch');

  const isoDates = data.map(toISODate).filter(Boolean).sort();
  if (dateInput && isoDates.length) {
    dateInput.min = isoDates[0];
    dateInput.max = isoDates[isoDates.length - 1];
  }

  const presentDays = new Set(data.map(r => String(r.day_name || '').toUpperCase()).filter(Boolean));
  DAY_ORDER.filter(d => presentDays.has(d)).forEach(v => buildOption(daySelect, v, v));

  const presentMonths = new Set(data.map(r => String(r.month || '').toUpperCase()).filter(Boolean));
  MONTH_ORDER.filter(m => presentMonths.has(m)).forEach(v => buildOption(monthSelect, v, v));

  const tbody = document.querySelector('#scheduleTable tbody');
  tbody.innerHTML = '';

  const rowByIndex = data.map(r => {
    const datePretty = r.date_raw || [r.day_name, r.day, r.month, r.year].filter(Boolean).join(' ');
    const iso = toISODate(r);
    const narasumber = formatNarasumber(r);
    return { row: r, datePretty, iso, narasumber };
  });

  for (const { row: r, datePretty, iso, narasumber } of rowByIndex) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="text-monospace text-muted">${r.no}</td>
      <td class="text-monospace">${r.open_id}</td>
      <td>${escapeHtml(r.module_name)}</td>
      <td><span class="badge badge-soft">${escapeHtml(datePretty)}</span></td>
      <td class="text-nowrap">${escapeHtml(formatTime(r))}</td>
      <td>${narasumber === '—' ? '<span class="subtle">—</span>' : escapeHtml(narasumber)}</td>
      <td class="d-none">${escapeHtml(iso)}</td>
      <td class="text-end">
        <a class="btn btn-sm btn-outline-primary link-btn" href="${escapeAttr(r.link)}" target="_blank" rel="noopener noreferrer">
          Buka evaluasi
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  }

  const filterState = {
    day: '',
    month: '',
    isoDate: '',
    query: '',
  };

  // eslint-disable-next-line no-undef
  DataTable.ext.search.push((settings, _data, dataIndex) => {
    if (settings.nTable.id !== 'scheduleTable') return true;
    const { row } = rowByIndex[dataIndex];
    if (!row) return true;
    return rowMatchesFilters(row, filterState);
  });

  // eslint-disable-next-line no-undef
  const table = new DataTable('#scheduleTable', {
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    ordering: false,
    autoWidth: false,
    columnDefs: [{ targets: [COL.ISO], visible: false }],
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
    initComplete() {
      const api = this.api();
      const $input = $(api.table().container()).find('.dataTables_filter input');
      $input.off('input.DT');
      $input.on('input', applyFilters);
    },
  });

  function readFilters() {
    const desktopSearchInput = document.querySelector('#scheduleTable_wrapper .dataTables_filter input');
    const query = (desktopSearchInput?.value || mobileSearch?.value || '').trim().toLowerCase();
    filterState.query = query;
    return {
      day: daySelect.value,
      month: monthSelect.value,
      isoDate: dateInput?.value || '',
      query,
    };
  }

  function applyFilters() {
    filterState.day = daySelect.value;
    filterState.month = monthSelect.value;
    filterState.isoDate = dateInput?.value || '';
    readFilters();
    table.search('', false);
    table.columns().search('');
    table.draw();
    mobileRenderList(data, filterState);
  }

  daySelect.addEventListener('change', applyFilters);
  monthSelect.addEventListener('change', applyFilters);
  dateInput?.addEventListener('change', applyFilters);
  dateInput?.addEventListener('input', applyFilters);
  mobileSearch?.addEventListener('input', applyFilters);

  document.getElementById('btnReset').addEventListener('click', () => {
    daySelect.value = '';
    monthSelect.value = '';
    if (dateInput) dateInput.value = '';
    if (mobileSearch) mobileSearch.value = '';
    const desktopSearchInput = document.querySelector('#scheduleTable_wrapper .dataTables_filter input');
    if (desktopSearchInput) desktopSearchInput.value = '';
    filterState.day = '';
    filterState.month = '';
    filterState.isoDate = '';
    filterState.query = '';
    table.search('', false);
    table.columns().search('');
    table.draw();
    mobileRenderList(data, filterState);
  });

  mobileRenderList(data, filterState);

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
