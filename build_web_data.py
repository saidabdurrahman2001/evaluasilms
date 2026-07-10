#!/usr/bin/env python3
"""Generate data.js from lms_schedule.xlsx + BI LMS Rundown HTML."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "lms_schedule.xlsx"
OUT = ROOT / "data.js"

SESSION_RE = re.compile(
    r'"jkr_id":(\d+),'
    r'"jkr_topik":"((?:\\.|[^"\\])*)"'
    r'[^}]*"start_time":"([^"]*)"'
    r'[^}]*"end_time":"([^"]*)"'
    r'[^}]*"narasumber":([^,}]+)'
    r'[^}]*"asal_narsum":([^,}]+)'
    r'[^}]*"evaluasi_progress":(\d+)'
    r'[^}]*"evaluasi_total":(\d+)'
    r'[^}]*"narsum_total":(\d+)',
)


def find_rundown_html() -> Path:
    matches = sorted(ROOT.glob("*BI LMS.html"))
    if not matches:
        raise FileNotFoundError("Tidak menemukan file simpanan halaman BI LMS (*.html).")
    return matches[0]


def unescape_js_string(value: str) -> str:
    return (
        value.replace("\\\"", '"')
        .replace("\\\\", "\\")
        .replace("\\n", "\n")
        .replace("\\r", "\r")
        .replace("\\t", "\t")
    )


def parse_js_value(raw: str) -> str | None:
    raw = raw.strip()
    if raw == "null":
        return None
    if raw.startswith('"') and raw.endswith('"'):
        return unescape_js_string(raw[1:-1]).strip() or None
    return raw or None


def load_lms_sessions(html_path: Path) -> dict[int, dict]:
    text = html_path.read_text(encoding="utf-8", errors="ignore")
    sessions: dict[int, dict] = {}
    for match in SESSION_RE.finditer(text):
        jkr_id = int(match.group(1))
        sessions[jkr_id] = {
            "start_time": match.group(3) or None,
            "end_time": match.group(4) or None,
            "narasumber": parse_js_value(match.group(5)),
            "asal_narsum": parse_js_value(match.group(6)),
            "evaluasi_progress": int(match.group(7)),
            "evaluasi_total": int(match.group(8)),
            "narsum_total": int(match.group(9)),
        }
    return sessions


def clean_text(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text or None


def build_rows() -> list[dict]:
    df = pd.read_excel(XLSX, sheet_name="lms_schedule")
    html_path = find_rundown_html()
    lms = load_lms_sessions(html_path)

    rows: list[dict] = []
    for _, row in df.iterrows():
        open_id = int(row["open_id"])
        extra = lms.get(open_id, {})
        link = clean_text(row.get("Link Modul")) or (
            f"https://www.bi.go.id/learning/Pelaksanaan/PelaksanaanKelas/Pelaksanaan/{open_id}"
        )

        rows.append(
            {
                "no": int(row["No"]),
                "open_id": open_id,
                "jkrn_id": int(row["JKRN ID"]),
                "module_name": clean_text(row["module_name"]) or "",
                "day_name": clean_text(row["day_name"]) or "",
                "day": int(row["day"]) if pd.notna(row["day"]) else None,
                "month": clean_text(row["month"]) or "",
                "year": int(row["year"]) if pd.notna(row["year"]) else None,
                "date_raw": clean_text(row["date_raw"]) or "",
                "link": link,
                "start_time": extra.get("start_time"),
                "end_time": extra.get("end_time"),
                "narasumber": extra.get("narasumber"),
                "asal_narsum": extra.get("asal_narsum"),
                "evaluasi_progress": extra.get("evaluasi_progress", 0),
                "evaluasi_total": extra.get("evaluasi_total", 0),
                "narsum_total": extra.get("narsum_total", 0),
            }
        )

    rows.sort(key=lambda r: r["no"])
    return rows


def main() -> None:
    rows = build_rows()
    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    OUT.write_text(f"window.LMS_SCHEDULE_DATA = {payload};\n", encoding="utf-8")

    with_nars = sum(1 for r in rows if r["narasumber"])
    with_time = sum(1 for r in rows if r["start_time"] and r["end_time"])
    print(f"Wrote {len(rows)} rows to {OUT.name}")
    print(f"Narasumber tersedia: {with_nars}/{len(rows)}")
    print(f"Waktu tersedia: {with_time}/{len(rows)}")


if __name__ == "__main__":
    main()
