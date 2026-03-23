"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b px-8 py-4 mb-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black text-indigo-600 tracking-tighter">FINANCE HELP</span>
          <div className="flex gap-4">
            <Link 
              href="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                pathname === '/dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Tickets
            </Link>
            <Link 
              href="/dashboard/clientes"
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                pathname === '/dashboard/clientes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Clientes
            </Link>
          </div>
        </div>
        <div className="text-sm font-medium text-slate-400">
          Agente Panel
        </div>
      </div>
    </nav>
  );
}
