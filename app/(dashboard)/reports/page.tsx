"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PageHeader, EmptyState } from "@/components/shared";
import {
  fetchPatients,
  fetchRecords,
  jstDate,
  type PatientRow,
  type RecordRow,
} from "@/lib/supabase/queries";

type Row = {
  name: string;
  planned: number;
  taken: number;
  missed: number;
  refused: number;
};

const daysBetween = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
};

// 集計期間 [start, end] のうち、有効期間 [startDate, endDate] と重なる日数
const activeDays = (
  start: string,
  end: string,
  startDate: string,
  endDate: string | null
) => {
  const effectiveStart = startDate > start ? startDate : start;
  const effectiveEnd = endDate && endDate < end ? endDate : end;
  return daysBetween(effectiveStart, effectiveEnd);
};

export default function ReportsPage() {
  const [start, setStart] = useState("2026-05-20");
  const [end, setEnd] = useState("2026-05-26");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchPatients(), fetchRecords(start, end)])
      .then(([p, r]) => {
        if (!active) return;
        setPatients(p);
        setRecords(r);
      })
      .catch((e) => active && setError(e.message ?? "読み込みに失敗しました"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [start, end]);

  const rows = useMemo<Row[]>(() => {
    const idToName = new Map(patients.map((p) => [p.id, p.patient_name]));
    const byName = new Map<string, Row>();

    // 予定数 = 利用者ごと (各処方のタイミング数 × 有効日数)
    // 終了予定日を過ぎた分は予定に含めない
    for (const p of patients) {
      const cur =
        byName.get(p.patient_name) ??
        { name: p.patient_name, planned: 0, taken: 0, missed: 0, refused: 0 };
      cur.planned +=
        p.timings.length *
        activeDays(start, end, jstDate(p.created_at), p.end_date);
      byName.set(p.patient_name, cur);
    }
    // 実績
    for (const r of records) {
      const name = idToName.get(r.patient_id);
      if (!name) continue;
      const cur = byName.get(name);
      if (!cur) continue;
      if (r.status === "taken") cur.taken += 1;
      else if (r.status === "missed") cur.missed += 1;
      else if (r.status === "refused") cur.refused += 1;
    }
    return Array.from(byName.values());
  }, [patients, records, start, end]);

  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalTaken = rows.reduce((s, r) => s + r.taken, 0);
  const overall =
    totalPlanned > 0 ? Math.round((totalTaken / totalPlanned) * 100) : 0;


  return (
    <div>
      <PageHeader
        title="服薬率・利用者別レポート"
        description={`${start} 〜 ${end}`}
      />

      <Panel className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">開始日</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">終了日</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </Panel>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
      {!loading && rows.length === 0 && <EmptyState />}

      {!loading && rows.length > 0 && (
        <>
          <Panel className="mb-4 border-brand-200 bg-brand-50">
            <p className="text-xs text-brand-600">全体の服薬率</p>
            <p className="text-3xl font-bold text-brand-700">{overall}%</p>
            <p className="mt-1 text-xs text-brand-600/80">
              服薬済 {totalTaken} / 予定 {totalPlanned} 件
            </p>
          </Panel>

          <div className="flex flex-col gap-3">
            {rows.map((r) => {
              const rate =
                r.planned > 0 ? Math.round((r.taken / r.planned) * 100) : 0;
              return (
                <Panel key={r.name}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-gray-900">
                      {r.name}
                    </span>
                    <span className="shrink-0 text-lg font-bold text-brand-600">
                      {rate}%
                    </span>
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>予定 {r.planned}</span>
                    <span className="text-green-600">服薬済 {r.taken}</span>
                    <span className="text-red-600">飲み忘れ {r.missed}</span>
                    <span className="text-amber-600">拒否 {r.refused}</span>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
