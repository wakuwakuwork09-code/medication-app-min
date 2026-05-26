import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-brand-500">
        <Loader2 className="size-8 animate-spin" />
        <span className="text-sm text-gray-500">読み込み中...</span>
      </div>
    </div>
  );
}
