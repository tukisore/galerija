import AdminGate from "./AdminGate";
import AdminNav from "./AdminNav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminGate>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-border bg-surface p-4 md:w-52 md:border-b-0 md:border-r">
          <div className="mb-3 px-2 text-base font-semibold">Admin</div>
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-5">{children}</div>
        </main>
      </div>
    </AdminGate>
  );
}
