'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Radar, BarChart2, Bot, Star } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/radar', label: 'Opportunity Radar', icon: Radar },
  { href: '/charts', label: 'Chart Intelligence', icon: BarChart2 },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#0E0F14] shrink-0">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 p-1.5 rounded-lg"><Bot size={20} className="text-white" /></div>
        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">NIVESHAI</span>
      </div>
      <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 font-mono">NSE • Live</div>
    </nav>
  );
}
