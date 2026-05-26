"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Pill,
  CircleCheck,
  Bell,
  ChartColumn,
  Hospital,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/schedule", label: "服薬スケジュール", icon: CalendarDays },
  { href: "/prescriptions/new", label: "処方登録", icon: Pill },
  { href: "/check", label: "服薬チェック", icon: CircleCheck },
  { href: "/alerts", label: "アラート", icon: Bell },
  { href: "/reports", label: "服薬率レポート", icon: ChartColumn },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex w-16 shrink-0 flex-col bg-brand-400 text-white sm:w-56">
      <div className="flex h-16 items-center justify-center gap-2 border-b border-brand-300 px-2 sm:justify-start sm:px-5">
        <Hospital className="size-6 shrink-0" />
        <span className="hidden text-base font-bold leading-tight sm:block">
          服薬チェック
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2 sm:p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors sm:px-3",
                "justify-center sm:justify-start",
                active
                  ? "bg-white font-semibold text-brand-600 shadow-sm"
                  : "text-white/90 hover:bg-brand-300",
              ].join(" ")}
              title={item.label}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="hidden truncate sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-brand-300 p-2 sm:p-3">
        <p className="mb-2 hidden truncate text-xs text-white/80 sm:block">
          {email ?? "未ログイン"}
        </p>
        <button
          onClick={handleLogout}
          title="ログアウト"
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-white/90 transition-colors hover:bg-brand-300 sm:justify-start sm:px-3"
        >
          <LogOut className="size-5 shrink-0" />
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </aside>
  );
}
