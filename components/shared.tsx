import { RecordStatus, statusMeta } from "@/lib/constants";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm " + className
      }
    >
      {children}
    </div>
  );
}

export function EmptyState({
  message = "データがありません",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
        m.cls
      }
    >
      {m.label}
    </span>
  );
}
