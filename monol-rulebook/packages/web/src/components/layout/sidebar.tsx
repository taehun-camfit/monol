'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Users,
  BarChart3,
  GitPullRequest,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  teamId?: string;
}

export function Sidebar({ teamId }: SidebarProps) {
  const pathname = usePathname();

  const mainNavItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
    },
    {
      href: '/marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
    },
  ];

  const teamNavItems = teamId
    ? [
        {
          href: `/teams/${teamId}`,
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          href: `/teams/${teamId}/rules`,
          label: 'Rules',
          icon: BookOpen,
        },
        {
          href: `/teams/${teamId}/proposals`,
          label: 'Proposals',
          icon: GitPullRequest,
        },
        {
          href: `/teams/${teamId}/members`,
          label: 'Members',
          icon: Users,
        },
        {
          href: `/teams/${teamId}/analytics`,
          label: 'Analytics',
          icon: BarChart3,
        },
        {
          href: `/teams/${teamId}/settings`,
          label: 'Settings',
          icon: Settings,
        },
      ]
    : [];

  return (
    <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col gap-2 p-4">
        {/* Main Navigation */}
        <nav className="flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Team Navigation */}
        {teamId && (
          <>
            <div className="my-2 border-t" />
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Team
            </div>
            <nav className="flex flex-col gap-1">
              {teamNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== `/teams/${teamId}` &&
                    pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </aside>
  );
}
