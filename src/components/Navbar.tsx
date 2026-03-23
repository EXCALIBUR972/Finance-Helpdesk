"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, User, LayoutDashboard, Users } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [agente, setAgente] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('agentes')
          .select('nombre_completo')
          .eq('id_agente', user.id)
          .single();
        if (data) setAgente(data);
      }
    }
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b px-8 py-3 mb-8 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">F</span>
            </div>
            <span className="text-lg font-black text-slate-800 tracking-tighter">FINANCE HELP</span>
          </div>
          
          <div className="flex gap-2">
            <Link 
              href="/dashboard"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                pathname === '/dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard size={14} />
              Tickets
            </Link>
            <Link 
              href="/dashboard/clientes"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                pathname === '/dashboard/clientes' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Users size={14} />
              Clientes
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {agente && (
            <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <User size={12} />
              </div>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
                {agente.nombre_completo}
              </span>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors group"
          >
            <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
