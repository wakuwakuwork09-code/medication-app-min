export type Timing = "morning" | "noon" | "evening" | "bedtime";
export type RecordStatus = "taken" | "refused" | "missed" | "pending";

export const TIMINGS: { key: Timing; label: string; time: string }[] = [
  { key: "morning", label: "朝", time: "8:00" },
  { key: "noon", label: "昼", time: "12:00" },
  { key: "evening", label: "夕", time: "18:00" },
  { key: "bedtime", label: "就寝前", time: "21:00" },
];

export const timingLabel = (t: Timing) =>
  TIMINGS.find((x) => x.key === t)?.label ?? t;

export const statusMeta: Record<
  RecordStatus,
  { label: string; cls: string }
> = {
  taken: { label: "服薬済", cls: "bg-green-100 text-green-700" },
  refused: { label: "拒否", cls: "bg-amber-100 text-amber-700" },
  missed: { label: "飲み忘れ", cls: "bg-red-100 text-red-700" },
  pending: { label: "未確認", cls: "bg-gray-100 text-gray-600" },
};
