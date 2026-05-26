import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-5xl p-4 pb-24 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
