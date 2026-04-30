'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  CheckSquare,
  Monitor,
  Package,
  FileText,
  TrendingUp,
  GitBranch,
  BarChart2,
  Upload,
  Settings,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Decisions', href: '/decisions', icon: CheckSquare },
  { label: 'Assets', href: '/assets', icon: Monitor },
  { label: 'Software', href: '/software', icon: Package },
  { label: 'Contracts', href: '/contracts', icon: FileText },
  { label: 'Budget Roadmap', href: '/budget', icon: TrendingUp },
  { label: 'Scenarios', href: '/scenarios', icon: GitBranch },
  { label: 'Reports', href: '/reports', icon: BarChart2 },
  { label: 'Imports', href: '/imports', icon: Upload },
  { label: 'Settings', href: '/settings/users', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-lg font-semibold tracking-tight text-white">LifecycleIQ</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors',
              pathname.startsWith(href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
