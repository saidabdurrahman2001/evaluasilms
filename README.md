# LMS Schedule (Static)

Website statis untuk menampilkan `lms_schedule.xlsx` dalam bentuk tabel yang bisa dicari (search), filter, plus tombol **Buka evaluasi** per baris. Urutan mengikuti kolom **No** dari Excel, dengan **waktu** dan **narasumber** dari halaman Rundown BI LMS.

## Cara pakai (lokal)

1. Generate `data.js` dari Excel + HTML Rundown BI LMS:

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

Kalau `lms_schedule.xlsx` atau file simpanan halaman BI LMS (`*BI LMS.html`) berubah, jalankan lagi:

```bash
python build_web_data.py
```

