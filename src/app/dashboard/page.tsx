"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import ManualTicketModal from '@/components/ManualTicketModal';
import Navbar from '@/components/Navbar';

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('Activos');
  const [filterLevel, setFilterLevel] = useState('Todos');
  
  // Estados para los inputs de búsqueda locales
  const [searchRadicado, setSearchRadicado] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [agentFilter, setAgentFilter] = useState('Todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Estados aplicados que disparan la visualización
  const [appliedFilters, setAppliedFilters] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchTickets();
    fetchAgentes();
  }, [statusFilter, filterLevel]);

  const handleSearch = () => {
    setAppliedFilters({
      radicado: searchRadicado,
      client: searchClient,
      agent: agentFilter,
      dateStart,
      dateEnd
    });
  };

  const handleClear = () => {
    setSearchRadicado('');
    setSearchClient('');
    setAgentFilter('Todos');
    setDateStart('');
    setDateEnd('');
    setAppliedFilters(null);
    setStatusFilter('Activos');
  };

  async function fetchAgentes() {
    const { data } = await supabase.from('agentes').select('id_agente, nombre_completo');
    if (data) setAgentes(data);
  }

  async function fetchTickets() {
    let query = supabase
      .from('casos')
      .select(`
        id_caso,
        numero_radicado,
        titulo,
        status,
        nivel_actual,
        fecha_creacion,
        fecha_cierre,
        contact_name,
        contact_email,
        contact_phone,
        clientes (nombre, apellidos, nit_cedula, correo),
        agentes!casos_id_creador_fkey (nombre_completo)
      `)
      .order('fecha_creacion', { ascending: false });

    if (statusFilter === 'Activos') {
      query = query.in('status', ['Escalado', 'Pendiente', 'Desarrollo']);
    } else if (statusFilter !== 'Todos') {
      query = query.eq('status', statusFilter);
    }
    if (filterLevel !== 'Todos') {
      query = query.eq('nivel_actual', filterLevel);
    }

    const { data, error } = await query;
    if (error) console.error('Error fetching tickets:', error);
    if (data) {
      console.log('Tickets fetched:', data.length, 'Status:', statusFilter);
      setTickets(data);
    }
  }

  const filteredTickets = tickets.filter(t => {
    // Si no hay filtros aplicados, mostrar todo lo que trajo el query inicial (Activos por defecto)
    if (!appliedFilters) return true;

    const { radicado, client, agent, dateStart: dS, dateEnd: dE } = appliedFilters;

    const matchRadicado = !radicado || t.numero_radicado?.toLowerCase().includes(radicado.toLowerCase());
    
    const clientName = t.contact_name || (t.clientes ? `${t.clientes.nombre} ${t.clientes.apellidos}` : '');
    const clientDoc = t.clientes?.nit_cedula || '';
    const clientEmail = t.contact_email || t.clientes?.correo || '';
    const clientInfo = `${clientName} ${clientDoc} ${clientEmail}`.toLowerCase();
    
    const matchClient = !client || clientInfo.includes(client.toLowerCase());
    const matchAgent = agent === 'Todos' || t.agentes?.nombre_completo === agent;
    
    // Filtro por fecha (usar fecha local del ticket)
    const ticketDate = new Date(t.fecha_creacion).toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const matchDateStart = !dS || ticketDate >= dS;
    const matchDateEnd = !dE || ticketDate <= dE;

    return matchRadicado && matchClient && matchAgent && matchDateStart && matchDateEnd;
  });

  const exportToCSV = () => {
    const headers = ["Radicado", "Título", "Cliente/Contacto", "Nivel", "Estado", "Fecha Creación", "Fecha Cierre"];
    const rows = filteredTickets.map(t => [
      t.numero_radicado,
      t.titulo,
      t.contact_name || `${t.clientes?.nombre} ${t.clientes?.apellidos}`,
      t.nivel_actual,
      t.status,
      new Date(t.fecha_creacion).toLocaleDateString(),
      t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleDateString() : 'Pendiente'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tickets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8 pb-10">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Tickets Activos</h1>
            <p className="text-slate-500">Gestiona los reportes de los clientes de Finance App</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-3">
              <button 
                onClick={exportToCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 text-sm"
              >
                📥 Exportar Excel
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 text-sm"
              >
                + Nuevo Ticket
              </button>
            </div>
            <div className="flex gap-2">
              <select 
                className="px-4 py-2 border rounded-xl bg-white text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Activos">Ver Activos (Esc/Pte/Des)</option>
                <option>Escalado</option>
                <option>Pendiente</option>
                <option>Desarrollo</option>
                <option>Resuelto</option>
                <option>Todos</option>
              </select>
              <select 
                className="px-4 py-2 border rounded-xl bg-white text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
              >
                <option>Todos Niveles</option>
                <option>L1</option>
                <option>L2</option>
                <option>L3</option>
              </select>
            </div>
          </div>
        </header>

        {/* Filtros Avanzados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Buscar Radicado</label>
            <input 
              className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Ej: CASO-1001"
              value={searchRadicado}
              onChange={(e) => setSearchRadicado(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Buscar Cliente</label>
            <input 
              className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Nombre, email o NIT"
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Agente Asignado</label>
            <select 
              className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 appearance-none bg-white"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="Todos">Todos los Agentes</option>
              {agentes.map(a => (
                <option key={a.id_agente} value={a.nombre_completo}>{a.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rango de Fechas</label>
            <div className="flex gap-2">
              <input 
                type="date"
                className="w-full px-2 py-2 border rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-indigo-100"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
              <input 
                type="date"
                className="w-full px-2 py-2 border rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-indigo-100"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 pt-2 border-t border-slate-50 mt-2">
            <button 
              onClick={handleClear}
              className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition"
            >
              Limpiar Búsqueda
            </button>
            <button 
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition shadow-lg shadow-indigo-100"
            >
              🔍 Buscar Ahora
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Radicado / Título</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4">Nivel / Estado</th>
                <th className="px-6 py-4">Fecha Creación</th>
                <th className="px-6 py-4">Fecha Cierre</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-600">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id_caso} className="hover:bg-slate-50 transition border-b border-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-mono text-indigo-600 font-black text-[10px] uppercase tracking-tighter">{ticket.numero_radicado}</div>
                    <div className="text-sm font-bold text-slate-800 truncate max-w-[180px] mt-0.5">{ticket.titulo || '---'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-800 leading-none">
                      {ticket.clientes ? `${ticket.clientes.nombre} ${ticket.clientes.apellidos}` : 'Desconocido'}
                    </div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                      {ticket.clientes?.nit_cedula || 'Sin Documento'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-indigo-600">
                      {ticket.contact_name || '---'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-600">
                      {ticket.agentes?.nombre_completo || 'Sistema'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        ticket.nivel_actual === 'L3' ? 'bg-red-50 text-red-600' : 
                        ticket.nivel_actual === 'L2' ? 'bg-amber-50 text-amber-600' : 
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        {ticket.nivel_actual}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                        ticket.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 
                        ticket.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 
                        ticket.status === 'Desarrollo' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {new Date(ticket.fecha_creacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold">
                    {ticket.fecha_cierre ? (
                      <span className="text-emerald-600">
                        {new Date(ticket.fecha_cierre).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic font-medium">Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link 
                      href={`/ticket/${ticket.id_caso}`}
                      className="inline-block bg-slate-800 hover:bg-black text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition shadow-md"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs">No hay tickets que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManualTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTickets} 
      />
    </div>
  );
}
