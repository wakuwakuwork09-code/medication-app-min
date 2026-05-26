"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PageHeader, EmptyState } from "@/components/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { RecordStatus, TIMINGS, Timing, timingLabel } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import {
  fetchPatients,
  fetchRecords,
  expandDoses,
  upsertRecord,
  logAction,
  type PatientRow,
  type RecordRow,
} from "@/lib/supabase/queries";

const TODAY = "2026-05-26";

export default function CheckPage() {
  const [timing, setTiming] = useState<Timing>("morning");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchPatients(), fetchRecords(TODAY, TODAY)])
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
  }, []);

  const entries = useMemo(
    () =>
      expandDoses(patients, records, TODAY).filter((e) => e.timing === timing),
    [patients, records, timing]
  );

  const set = async (
    patientId: string,
    next: Exclude<RecordStatus, "pending">
  ) => {
    setError(null);
    // 楽観更新
    setRecords((prev) => {
      const others = prev.filter(
        (r) => !(r.patient_id === patientId && r.timing === timing)
      );
      return [
        ...others,
        {
          id: `tmp-${patientId}-${timing}`,
          patient_id: patientId,
          schedule_date: TODAY,
          timing,
          status: next,
          note: null,
        },
      ];
    });
    try {
      await upsertRecord(patientId, TODAY, timing, next);
      const { data: u } = await supabase.auth.getUser();
      const statusLabel = next === "taken" ? "服薬済" : "拒否";
      await logAction(
        u.user?.email ?? "unknown",
        "medication_checked",
        patientId,
        `${timingLabel(timing)}・${statusLabel}`
      );
    } catch (e) {
      setError((e as Error).message ?? "保存に失敗しました");
    }
  };

  return (
    <div>
      <PageHeader
        title="服薬チェック"
        description="タイミングを選び、利用者ごとに服薬を記録します"
      />

      <div className="mb-4 grid grid-cols-4 gap-2">
        {TIMINGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTiming(t.key)}
            className={[
              "rounded-lg border px-2 py-2 text-sm transition-colors",
              timing === t.key
                ? "border-brand-500 bg-brand-500 font-semibold text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {!loading && entries.length === 0 && (
          <EmptyState message="この時間帯の服薬予定はありません" />
        )}
        {!loading &&
          entries.map((e) => {
            const checked = e.status === "taken";
            return (
              <Panel key={e.key}>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        set(e.patientId, v ? "taken" : "refused")
                      }
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-gray-900">
                        {e.patientName}
                      </span>
                      <span className="block truncate text-sm text-gray-600">
                        {e.drugName}・{e.dosage}
                      </span>
                    </span>
                  </label>
                  <button
                    onClick={() => set(e.patientId, "refused")}
                    className={[
                      "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                      e.status === "refused"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    拒否
                  </button>
                </div>
              </Panel>
            );
          })}
      </div>
    </div>
  );
}
