'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { name: 'Caesar Cipher', href: '/caesar' },
  { name: 'Vigenère Cipher', href: '/vigenere' },
  { name: 'LFSR Stream Cipher', href: '/lfsr' },
  { name: 'AES (Block Cipher)', href: '/aes' },
  { name: 'RSA (Public Key)', href: '/rsa' },
  { name: 'Super Encryption', href: '/super-encryption' },
];

export function Sidebar() {
  const pathname = usePathname();

  // The panel is "open" only while the route it was opened on is still the
  // current one. Deriving it this way means the panel closes itself on
  // navigation, including browser back/forward, without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  return (
    <>
      {/* Small screens get a disclosure instead of a permanent column, because a
          fixed 16rem column leaves no room for the cipher itself. A disclosure
          is used rather than a modal drawer so focus never has to be trapped. */}
      <div
        className="lg:hidden flex items-center gap-2 h-14 px-4 border-b bg-background"
        data-print-hidden
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpenedAt(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="primary-navigation"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span>
        </Button>
        <span className="text-lg font-bold">KryptoLearn</span>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </div>

      <div
        className={[
          'border-r bg-muted/20',
          'lg:flex lg:w-64 lg:h-screen lg:shrink-0 lg:flex-col',
          open ? 'flex flex-col' : 'hidden',
        ].join(' ')}
      >
        <div className="hidden lg:flex h-16 items-center justify-between px-6 border-b">
          <h2 className="text-lg font-bold">KryptoLearn</h2>
          <ThemeToggle />
        </div>
        <nav
          id="primary-navigation"
          aria-label="Ciphers"
          className="flex-1 overflow-y-auto py-4"
        >
          <ul className="space-y-1 px-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'block px-4 py-2 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive ? 'bg-accent text-accent-foreground' : '',
                    ].join(' ')}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Cryptography Visualization Project
          </p>
        </div>
      </div>
    </>
  );
}
