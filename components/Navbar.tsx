'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/doctors', label: 'Doctors' },
    { href: '/schedule', label: 'Schedule' },
  ];

  const handleLogout = () => {
    // no auth to clear — just redirect
    router.push('/');
  };

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10"
      style={{ backgroundColor: '#003943' }}
    >
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/doctor" className="flex items-center gap-3 text-white">
          {/* If you saved a local logo file, uncomment and set correct path, e.g. /logo.png */}
          {/* <img src="/logo.png" alt="Clinibooth" className="h-7 w-auto" /> */}
          <span className="text-xl font-semibold">Admin Clinibooth</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium text-white hover:bg-white/10',
                  active ? 'bg-white/15' : 'bg-transparent',
                ].join(' ')}
              >
                {l.label}
              </Link>
            );
          })}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="ml-2 border-white/60 hover:bg-white hover:text-[#008000]"
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}