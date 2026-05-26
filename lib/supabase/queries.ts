import { supabase } from "./client";
import type { Timing, RecordStatus } from "@/lib/constants";

// patients テーブル = 登録された処方（1行 = ある利用者の1薬・複数タイミング）
export type PatientRow = {
  id: string;
  patient_name: string;
  drug_name: string;
  dosage: string;
  timings: Timing[];
  note: string | null;
  end_date: string | null;
  created_at: string;
};

// prescriptions テーブル = 服薬状態の記録
export type RecordRow = {
  id: string;
  patient_id: string;
  schedule_date: string;
  timing: Timing;
  status: Exclude<RecordStatus, "pending">;
  note: string | null;
};

export async function fetchPatients(): Promise<PatientRow[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("patient_name", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PatientRow[];
}

export async function fetchRecords(
  startDate: string,
  endDate: string
): Promise<RecordRow[]> {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, patient_id, schedule_date, timing, status, note")
    .gte("schedule_date", startDate)
    .lte("schedule_date", endDate);
  if (error) throw error;
  return (data ?? []) as RecordRow[];
}

// 服薬状態を登録/更新（同じ処方×日×タイミングは1件）
export async function upsertRecord(
  patientId: string,
  scheduleDate: string,
  timing: Timing,
  status: Exclude<RecordStatus, "pending">
): Promise<void> {
  const { error } = await supabase
    .from("prescriptions")
    .upsert(
      {
        patient_id: patientId,
        schedule_date: scheduleDate,
        timing,
        status,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "patient_id,schedule_date,timing" }
    );
  if (error) throw error;
}

// 操作ログ（誰が処方登録 / 服薬チェックをしたか）
export async function logAction(
  staffName: string,
  action: "prescription_created" | "medication_checked",
  patientId: string | null,
  detail: string | null
): Promise<void> {
  // created_by は auth.uid() の既定値で自動設定
  await supabase
    .from("administration_logs")
    .insert({ staff_name: staffName, action, patient_id: patientId, detail });
}

// 展開した1回分の服薬予定
export type DoseEntry = {
  key: string; // patientId-timing
  patientId: string;
  patientName: string;
  drugName: string;
  dosage: string;
  timing: Timing;
  status: RecordStatus; // 記録が無ければ "pending"
};

// timestamptz(UTC) を施設ローカル(JST)の YYYY-MM-DD に変換
export function jstDate(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// patients を タイミング単位に展開し、records と突き合わせて状態を付与
export function expandDoses(
  patients: PatientRow[],
  records: RecordRow[],
  scheduleDate: string
): DoseEntry[] {
  const recMap = new Map<string, RecordRow["status"]>();
  for (const r of records) {
    if (r.schedule_date === scheduleDate) {
      recMap.set(`${r.patient_id}-${r.timing}`, r.status);
    }
  }
  return patients
    // 有効期間: 登録日(開始) 〜 終了予定日(空なら継続中)
    .filter(
      (p) =>
        scheduleDate >= jstDate(p.created_at) &&
        (!p.end_date || scheduleDate <= p.end_date)
    )
    .flatMap((p) =>
      p.timings.map((timing) => {
        const k = `${p.id}-${timing}`;
        return {
          key: k,
          patientId: p.id,
          patientName: p.patient_name,
          drugName: p.drug_name,
          dosage: p.dosage,
          timing,
          status: recMap.get(k) ?? ("pending" as RecordStatus),
        };
      })
    );
}
