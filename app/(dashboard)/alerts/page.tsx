"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel, PageHeader } from "@/components/shared";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, BellRing } from "lucide-react";
import { timingLabel } from "@/lib/constants";
import {
  fetchPatients,
  fetchRecords,
  expandDoses,
  type PatientRow,
  type RecordRow,
} from "@/lib/supabase/queries";

const TODAY = "2026-05-26";

export default function AlertsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
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

  const alerts = useMemo(
    () =>
      expandDoses(patients, records, TODAY).filter(
        (e) => e.status === "missed" || e.status === "pending"
      ),
    [patients, records]
  );
  const missed = alerts.filter((e) => e.status === "missed").length;
  const pending = alerts.filter((e) => e.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="飲み忘れ・未確認アラート"
        description="予定時刻を過ぎても未記録／飲み忘れの服薬"
        action={
          <Link
            href="/check"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            チェック画面へ
          </Link>
        }
      />

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle />
          <AlertTitle>飲み忘れ {missed} 件</AlertTitle>
          <AlertDescription>至急、配薬状況を確認してください。</AlertDescription>
        </Alert>
        <Alert className="border-amber-200 bg-amber-50">
          <BellRing className="text-amber-600" />
          <AlertTitle className="text-amber-800">未確認 {pending} 件</AlertTitle>
          <AlertDescription className="text-amber-700/80">
            服薬チェックが未記録です。
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex flex-col gap-2">
        {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {!loading &&
          alerts.map((e) => (
            <Panel key={e.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {e.patientName}
                </p>
                <p className="truncate text-sm text-gray-600">
                  {timingLabel(e.timing)}・{e.drugName}・{e.dosage}
                </p>
              </div>
              <span
                className={
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                  (e.status === "missed"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600")
                }
              >
                {e.status === "missed" ? "飲み忘れ" : "未確認"}
              </span>
            </Panel>
          ))}
        {!loading && alerts.length === 0 && (
          <Panel>
            <p className="text-sm text-gray-500">アラートはありません。</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
