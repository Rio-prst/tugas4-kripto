import Link from 'next/link';

export function Sidebar() {
  const navItems = [
    { name: 'Caesar Cipher', href: '/caesar' },
    { name: 'Vigenère Cipher', href: '/vigenere' },
    { name: 'LFSR Stream Cipher', href: '/lfsr' },
    { name: 'RSA (Public Key)', href: '/rsa' },
    { name: 'Super Encryption', href: '/super-encryption' },
  ];

  return (
    <div className="w-64 h-screen border-r bg-muted/20 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <h2 className="text-lg font-bold">KryptoLearn</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-4">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Cryptography Visualization Project
        </p>
      </div>
    </div>
  );
}
