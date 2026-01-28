'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const teamId = params?.teamId as string | undefined;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar teamId={teamId} />
        <main className="ml-64 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
