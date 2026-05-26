"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PageHeader, EmptyState } from "@/components/shared";
import { TIMINGS, Timing, timingLabel } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import {
  fetchPatients,
  logAction,
  type PatientRow,
} from "@/lib/supabase/queries";

export default function NewPrescriptionPage() {
  const [patientName, setPatientName] = useState("");
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [timings, setTimings] = useState<Timing[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [list, setList] = useState<PatientRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setListLoading(true);
    fetchPatients()
      .then(setList)
      .catch((e) => setListError(e.message ?? "一覧の取得に失敗しました"))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (p: PatientRow) => {
    if (
      !window.confirm(
        `「${p.patient_name}／${p.drug_name}」の処方を削除しますか？`
      )
    ) {
      return;
    }
    setListError(null);
    setDeletingId(p.id);
    const { error: delError } = await supabase
      .from("patients")
      .delete()
      .eq("id", p.id);
    setDeletingId(null);
    if (delError) {
      setListError(`削除に失敗しました: ${delError.message}`);
      return;
    }
    setList((prev) => prev.filter((x) => x.id !== p.id));
  };

  const toggle = (t: Timing) =>
    setTimings((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!patientName.trim() || !drugName.trim() || !dosage.trim()) {
      setError("服用者・薬名・用量は必須です。");
      return;
    }
    if (timings.length === 0) {
      setError("服用タイミングを1つ以上選択してください。");
      return;
    }

    setSaving(true);
    const { data: inserted, error: insertError } = await supabase
      .from("patients")
      .insert({
        patient_name: patientName.trim(),
        drug_name: drugName.trim(),
        dosage: dosage.trim(),
        timings,
        end_date: endDate || null,
        note: note.trim() || null,
      })
      .select("id")
      .single();

    if (!insertError) {
      const { data: u } = await supabase.auth.getUser();
      await logAction(
        u.user?.email ?? "unknown",
        "prescription_created",
        inserted?.id ?? null,
        `${drugName.trim()}（${patientName.trim()}）`
      );
    }
    setSaving(false);

    if (insertError) {
      setError(`登録に失敗しました: ${insertError.message}`);
      return;
    }

    setSaved(true);
    setPatientName("");
    setDrugName("");
    setDosage("");
    setEndDate("");
    setNote("");
    setTimings([]);
    loadList();
  };

  return (
    <div>
      <PageHeader
        title="処方登録フォーム"
        description="薬名・用量・服用タイミングを登録します"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Panel className="w-full lg:max-w-xl lg:shrink-0">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <Field label="服用者">
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="例: 佐藤 花子"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="薬名">
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="例: アムロジピン"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="用量">
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="例: 5mg 1錠"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="服用タイミング（複数選択可）">
            <div className="grid grid-cols-2 gap-2">
              {TIMINGS.map((t) => {
                const on = timings.includes(t.key);
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => toggle(t.key)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      on
                        ? "border-brand-500 bg-brand-50 font-semibold text-brand-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="服薬終了予定日（任意・空なら継続中）">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="備考">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="服用上の注意など"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="mt-1 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "登録中..." : "登録する"}
          </button>

          {saved && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              処方を登録しました。
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      </Panel>

      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            処方一覧
          </h2>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
            {list.length} 件
          </span>
        </div>

        {listError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </p>
        )}
        {listLoading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {!listLoading && list.length === 0 && (
          <EmptyState message="登録された処方はありません" />
        )}
        {!listLoading &&
          list.map((p) => (
            <Panel key={p.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {p.patient_name}
                </p>
                <p className="truncate text-sm text-gray-700">
                  {p.drug_name}・{p.dosage}
                </p>
                <p className="truncate text-xs text-gray-500">
                  服薬終了予定: {p.end_date ?? "継続中"}
                </p>
                {p.note && (
                  <p className="truncate text-xs text-gray-500">{p.note}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-1">
                  {p.timings.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {timingLabel(t)}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === p.id ? "削除中..." : "削除"}
                </button>
              </div>
            </Panel>
          ))}
      </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
