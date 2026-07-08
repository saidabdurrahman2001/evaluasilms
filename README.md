# LMS Schedule (Static)

Website statis untuk menampilkan `lms_schedule.csv` dalam bentuk tabel yang bisa dicari (search), sort, dan filter, plus tombol **Buka evaluasi** per baris.

## Cara pakai (lokal)

1. Generate `data.js` dari CSV:

```bash
python build_web_data.py
```

2. Jalankan web server sederhana:

```bash
python -m http.server 5173
```

3. Buka di browser:

- `http://localhost:5173`

## Update data

Kalau `lms_schedule.csv` berubah, jalankan lagi:

```bash
python build_web_data.py
```

