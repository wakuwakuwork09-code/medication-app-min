"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Calendar } from "@/components/ui/calendar";
import { TIMINGS } from "@/lib/constants";
import {
  fetchPatients,
  fetchRecords,
  expandDoses,
  type PatientRow,
  type RecordRow,
} from "@/lib/supabase/queries";

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function SchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 4, 26));
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // カレンダーは locale 依存の日付属性でハイドレーション不一致になるためマウント後に描画
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dateLabel = date ? fmt(date) : "未選択";

  useEffect(() => {
    if (!date) return;
    let active = true;
    setLoading(true);
    setError(null);
    const d = fmt(date);
    Promise.all([fetchPatients(), fetchRecords(d, d)])
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
  }, [date]);

  const doses = useMemo(
    () => (date ? expandDoses(patients, records, fmt(date)) : []),
    [patients, records, date]
  );

  // 利用者名でグルーピング
  const names = useMemo(
    () => Array.from(new Set(doses.map((d) => d.patientName))),
    [doses]
  );

  return (
    <div>
      <PageHeader
        title="利用者別 服薬スケジュール一覧"
        description={`${dateLabel} の服薬予定`}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Panel className="w-full lg:w-auto lg:shrink-0">
          {mounted ? (
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="mx-auto"
            />
          ) : (
            <div className="mx-auto h-[300px] w-[252px]" />
          )}
        </Panel>

        <div className="flex w-full flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
          {!loading && names.length === 0 && <EmptyState />}
          {!loading &&
            names.map((name) => {
              const entries = doses.filter((e) => e.patientName === name);
              return (
                <Panel key={name}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900">
                      {name}
                    </p>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                      {entries.length} 件
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TIMINGS.map((t) => {
                      const items = entries.filter((e) => e.timing === t.key);
                      if (items.length === 0) return null;
                      return (
                        <div
                          key={t.key}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">
                              {t.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {t.time}
                            </span>
                          </div>
                          <ul className="flex flex-col gap-2">
                            {items.map((e) => (
                              <li
                                key={e.key}
                                className="flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-gray-800">
                                    {e.drugName}
                                  </p>
                                  <p className="truncate text-xs text-gray-500">
                                    {e.dosage}
                                  </p>
                                </div>
                                <StatusBadge status={e.status} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              );
            })}
        </div>
      </div>
    </div>
  );
}
