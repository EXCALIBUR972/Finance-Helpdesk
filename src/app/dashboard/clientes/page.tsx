"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/Navbar';
import ClientModal from '@/components/ClientModal';
import { Edit2, Plus, UserSquare2 } from 'lucide-react';

export default function ClientDashboard() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    if (data) setClientes(data);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Directorio de Clientes</h1>
            <p className="text-slate-500 text-sm">Administra la información de contacto y NIT de tus clientes</p>
          </div>
          <button 
            onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} /> Nuevo Cliente
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div key={cliente.id_cliente} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserSquare2 size={24} />
                </div>
                <button 
                  onClick={() => { setEditingClient(cliente); setIsModalOpen(true); }}
                  className="p-2 text-slate-300 hover:text-indigo-600 transition"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{cliente.nombre}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mb-4">{cliente.empresa || 'Independiente'}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">NIT:</span>
                  <span className="font-medium">{cliente.nit_cedula || '---'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Correo:</span>
                  <span className="font-medium truncate ml-4">{cliente.correo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="font-medium font-mono text-xs">{cliente.telefono_wsp}</span>
                </div>
              </div>
            </div>
          ))}
          {clientes.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed">
              No hay clientes registrados aún.
            </div>
          )}
        </div>
      </div>

      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchClientes}
        clientData={editingClient}
      />
    </div>
  );
}
