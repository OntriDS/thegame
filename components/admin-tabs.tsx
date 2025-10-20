'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_SECTIONS } from '@/lib/constants/sections';

export default function AdminTabs() {
  const path = usePathname();
  
  return (
    <div className="border-b bg-background">
      <nav className="flex overflow-x-auto px-6 justify-center">
        {ADMIN_SECTIONS.map(({ slug, label }) => {
          const isActive = path.startsWith(`/admin/${slug}`);
          
          return (
            <Link
              key={slug}
              href={`/admin/${slug}`}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${isActive 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 