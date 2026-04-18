import { BottomNav } from "@/components/nav/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-24">{children}</div>
      <BottomNav />
    </>
  );
}
