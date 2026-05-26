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

const navItems: {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { href: "/schedule", label: "服薬スケジュール", shortLabel: "予定", icon: CalendarDays },
  { href: "/prescriptions/new", label: "処方登録", shortLabel: "処方", icon: Pill },
  { href: "/check", label: "服薬チェック", shortLabel: "チェック", icon: CircleCheck },
  { href: "/alerts", label: "アラート", shortLabel: "アラート", icon: Bell },
  { href: "/reports", label: "服薬率レポート", shortLabel: "レポート", icon: ChartColumn },
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* PC・タブレット: 左サイドバー */}
      <aside className="hidden w-56 shrink-0 flex-col bg-brand-400 text-white sm:flex">
        <div className="flex h-16 items-center gap-2 border-b border-brand-300 px-5">
          <Hospital className="size-6 shrink-0" />
          <span className="text-base font-bold leading-tight">
            服薬チェック
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-white font-semibold text-brand-600 shadow-sm"
                  : "text-white/90 hover:bg-brand-300",
              ].join(" ")}
              title={item.label}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-brand-300 p-3">
          <p className="mb-2 truncate text-xs text-white/80">
            {email ?? "未ログイン"}
          </p>
          <button
            onClick={handleLogout}
            title="ログアウト"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-brand-300"
          >
            <LogOut className="size-5 shrink-0" />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* スマホ: 下部ボトムバー */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-brand-300 bg-brand-400 text-white sm:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] leading-tight transition-colors",
              isActive(item.href)
                ? "bg-white font-semibold text-brand-600"
                : "text-white/90 active:bg-brand-300",
            ].join(" ")}
            title={item.label}
          >
            <item.icon className="size-5 shrink-0" />
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          title="ログアウト"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] leading-tight text-white/90 transition-colors active:bg-brand-300"
        >
          <LogOut className="size-5 shrink-0" />
          <span>ログアウト</span>
        </button>
      </nav>
    </>
  );
}
