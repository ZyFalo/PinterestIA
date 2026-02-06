import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/layout/AuthGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar />
        <main className="ml-[220px] min-h-screen">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
