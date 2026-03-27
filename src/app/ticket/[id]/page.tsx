"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { sendCierreEmail } from '@/app/actions/emails';
import Navbar from '@/components/Navbar';
import { Paperclip, X, File as FileIcon, Image as ImageIcon, Download } from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [interacciones, setInteracciones] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<'Agente' | 'Nota'>('Agente');
  const [nextStatus, setNextStatus] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [allAgentes, setAllAgentes] = useState<any[]>([]);
  const [selectedAgenteId, setSelectedAgenteId] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    const { data: ticketData } = await supabase
      .from('casos')
      .select('*, clientes(*)')
      .eq('id_caso', id)
      .single();
    
    const { data: interactionData } = await supabase
      .from('interacciones')
      .select('*, agentes!id_agente(nombre_completo)')
      .eq('id_caso', id)
      .order('fecha_hora', { ascending: true });

    if (ticketData) {
      setTicket(ticketData);
      if (!nextStatus) setNextStatus(ticketData.status);
      if (!selectedAgenteId) setSelectedAgenteId(ticketData.id_agente_asignado || '');
    }
    if (interactionData) setInteracciones(interactionData);

    // Cargar lista de agentes
    const { data: agentesData } = await supabase
      .from('agentes')
      .select('id_agente, nombre_completo')
      .eq('activo', true)
      .order('nombre_completo');
    
    if (agentesData) {
      // Filtrar agentes duplicados por nombre
      const uniqueAgentes = Array.from(
        new Map(agentesData.map(ag => [ag.nombre_completo, ag])).values()
      );
      setAllAgentes(uniqueAgentes);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    
    // Si hay mensaje o archivo, procesar
    if (mensaje.trim() || archivo) {
      setSubiendo(true);
      const { data: { user } } = await supabase.auth.getUser();
      let fileUrl = null;

      if (archivo) {
        // Validar tamaño (5GB)
        if (archivo.size > 5 * 1024 * 1024 * 1024) {
          alert('El archivo es demasiado grande (máximo 5GB)');
          setSubiendo(false);
          return;
        }

        const fileExt = archivo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('attachments')
          .upload(filePath, archivo);

        if (uploadError) {
          console.error('Error subiendo archivo:', uploadError);
          alert('Error al subir el archivo');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from('interacciones')
        .insert([{
          id_caso: id,
          id_agente: user?.id,
          tipo_mensaje: tipo,
          mensaje: mensaje,
          archivo_url: fileUrl
        }]);

      if (!error) {
        setMensaje('');
        setArchivo(null);
      }
      setSubiendo(false);
    }

    // Si el estado cambió, actualizarlo
    if (nextStatus && (nextStatus !== ticket.status || (nextStatus === 'Escalado' && selectedAgenteId !== ticket.id_agente_asignado))) {
      await updateStatus(nextStatus, undefined, selectedAgenteId);
    } else if (mensaje.trim() || archivo) {
      fetchData();
    }
  }

  async function updateStatus(status: string, nivel?: string, agenteId?: string) {
    const updates: any = { status };
    if (nivel) updates.nivel_actual = nivel;
    if (agenteId) updates.id_agente_asignado = agenteId;
    if (status === 'Resuelto') updates.fecha_cierre = new Date().toISOString();

    const { error } = await supabase
      .from('casos')
      .update(updates)
      .eq('id_caso', id);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      let logMensaje = `Estatus cambiado a: **${status}**`;
      if (nivel) logMensaje = `Nivel cambiado a: **${nivel}** (Estatus: ${status})`;
      
      if (status === 'Escalado' && agenteId) {
        const ag = allAgentes.find(a => a.id_agente === agenteId);
        if (ag) logMensaje += ` (Asignado a: **${ag.nombre_completo}**)`;
      }

      await supabase.from('interacciones').insert([{
        id_caso: id,
        id_agente: user?.id,
        tipo_mensaje: 'Sistema',
        mensaje: logMensaje
      }]);

      if (status === 'Resuelto' && (ticket?.contact_email || ticket?.clientes?.correo)) {
        const email = ticket.contact_email || ticket.clientes.correo;
        const nombre = ticket.contact_name || ticket.clientes.nombre;
        await sendCierreEmail(email, nombre, ticket.numero_radicado);
      }
      fetchData();
    }
  }

  if (!ticket) return <div className="p-8 text-center text-slate-500">Cargando detalles del ticket...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      {/* Header */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-14 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 transition">← Volver</button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{ticket.numero_radicado}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{ticket.titulo || 'Sin Título'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            ticket.status === 'Resuelto' ? 'bg-green-100 text-green-700' : 
            ticket.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 
            ticket.status === 'Desarrollo' ? 'bg-indigo-100 text-indigo-700' :
            'bg-red-100 text-red-700'
          }`}>
            {ticket.status}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          {/* Scrollable Messages Area */}
          <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-3xl mb-8 max-w-4xl mx-auto">
              <h3 className="text-sm font-black text-indigo-900 mb-2 uppercase tracking-wide text-center">Descripción del Problema</h3>
              <p className="text-slate-700 leading-relaxed text-sm text-center">{ticket.descripcion || 'No se proporcionó una descripción detallada.'}</p>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto w-full mb-10">
              {interacciones.map((inter) => (
                <div key={inter.id_interaccion}>
                  {inter.tipo_mensaje === 'Sistema' ? (
                    <div className="flex justify-center my-4">
                      <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span dangerouslySetInnerHTML={{ __html: inter.mensaje }}></span>
                          <span className="opacity-60">• {new Date(inter.fecha_hora).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {inter.agentes?.nombre_completo && (
                            <span className="text-indigo-500 ml-1">[{inter.agentes.nombre_completo}]</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex ${inter.tipo_mensaje === 'Cliente' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm ${
                        inter.tipo_mensaje === 'Cliente' ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' : 
                        inter.tipo_mensaje === 'Nota' ? 'bg-amber-50 border border-amber-200 text-amber-900 border-dashed rounded-2xl' :
                        'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{inter.mensaje}</p>
                        
                        {/* Adjuntos */}
                        {inter.archivo_url && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            {inter.archivo_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <a href={inter.archivo_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/20 hover:opacity-90 transition">
                                <img src={inter.archivo_url} alt="Adjunto" className="max-h-60 w-full object-cover" />
                              </a>
                            ) : (
                              <a 
                                href={inter.archivo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`flex items-center gap-2 p-3 rounded-xl border transition ${
                                  inter.tipo_mensaje === 'Agente' 
                                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                                  : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <FileIcon size={16} />
                                <span className="text-xs font-bold truncate flex-1">Ver Archivo Adjunto</span>
                                <Download size={14} />
                              </a>
                            )}
                          </div>
                        )}

                        <div className={`flex items-center gap-2 mt-3 text-[9px] font-bold uppercase tracking-widest ${
                          inter.tipo_mensaje === 'Agente' ? 'text-indigo-200' : 'text-slate-400'
                        }`}>
                          <span>{new Date(inter.fecha_hora).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span>{inter.tipo_mensaje}</span>
                          {inter.agentes?.nombre_completo && (
                            <>
                              <span>•</span>
                              <span className={inter.tipo_mensaje === 'Agente' ? 'text-white' : 'text-indigo-600'}>
                                {inter.agentes.nombre_completo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </main>

          {/* Fixed Input Form at bottom of message area */}
          <footer className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto w-full">
              <div className="flex gap-2 mb-3">
                <button 
                  type="button"
                  onClick={() => setTipo('Agente')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${tipo === 'Agente' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  Respuesta Pública
                </button>
                <button 
                  type="button"
                  onClick={() => setTipo('Nota')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${tipo === 'Nota' ? 'bg-amber-400 text-white shadow-lg shadow-amber-200 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  Nota Interna
                </button>
                <div className="ml-auto flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Final:</label>
                  <select 
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm transition-colors border ${
                      nextStatus === 'Resuelto' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                      nextStatus === 'Pendiente' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                      nextStatus === 'Desarrollo' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                      'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                  >
                    <option value="Escalado">Escalado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              {nextStatus === 'Escalado' && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl mb-4 max-w-4xl mx-auto shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest pl-2">Asignar a Agente:</label>
                  <select 
                    className="flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border border-indigo-200 bg-white text-indigo-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={selectedAgenteId}
                    onChange={(e) => setSelectedAgenteId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Agente --</option>
                    {allAgentes.length > 0 ? (
                      allAgentes.map(ag => (
                        <option key={ag.id_agente} value={ag.id_agente}>{ag.nombre_completo}</option>
                      ))
                    ) : (
                      <option disabled>No hay agentes activos</option>
                    )}
                  </select>
                </div>
              )}

              <div className="flex gap-4 items-end relative">
                <div className="flex flex-col flex-1 gap-2">
                  {archivo && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg w-fit">
                      <ImageIcon size={12} className="text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-700 truncate max-w-[200px]">{archivo.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setArchivo(null)}
                        className="text-indigo-400 hover:text-indigo-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      className="flex-1 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 focus:outline-none resize-none text-sm text-slate-900 transition-all font-medium"
                      placeholder={tipo === 'Agente' ? 'Escribe una respuesta para el cliente...' : 'Escribe una nota interna...'}
                      rows={2}
                    />
                    <div className="flex flex-col gap-2">
                      <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                      />
                      <label 
                        htmlFor="file-upload"
                        className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors shadow-sm"
                        title="Adjuntar archivo"
                      >
                        <Paperclip size={18} />
                      </label>
                    </div>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={subiendo || (!mensaje.trim() && !archivo && nextStatus === ticket.status && selectedAgenteId === ticket.id_agente_asignado)}
                  className={`h-12 px-8 rounded-2xl font-black uppercase text-xs transition-all shadow-xl flex items-center gap-2 ${
                    subiendo 
                    ? 'bg-slate-200 text-slate-400 cursor-wait'
                    : (mensaje.trim() || archivo || nextStatus !== ticket.status || (nextStatus === 'Escalado' && selectedAgenteId !== ticket.id_agente_asignado))
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:-translate-y-0.5' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  {subiendo ? (
                    'Subiendo...'
                  ) : (nextStatus !== ticket.status || (nextStatus === 'Escalado' && selectedAgenteId !== ticket.id_agente_asignado)) && !mensaje.trim() && !archivo ? (
                    (nextStatus === 'Escalado' && selectedAgenteId !== ticket.id_agente_asignado) ? 'Reasignar Agente' : 'Actualizar Estado'
                  ) : (
                    'Enviar y Actualizar'
                  )}
                </button>
              </div>
            </form>
          </footer>
        </div>

        {/* Sidebar Info */}
        <aside className="w-80 bg-white border-l p-8 overflow-y-auto hidden lg:block">
          <div className="space-y-8">
            <section>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Reportado Por</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Nombre</label>
                  <p className="text-slate-800 font-bold text-sm">{ticket.contact_name || ticket.clientes?.nombre || 'Desconocido'}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Correo Directo</label>
                  <p className="text-indigo-600 font-medium text-xs truncate">{ticket.contact_email || ticket.clientes?.correo || 'No registrado'}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Celular / WhatsApp</label>
                  <p className="text-slate-800 font-mono font-bold text-xs">+{ticket.contact_phone || ticket.clientes?.telefono_wsp || '---'}</p>
                </div>
              </div>
            </section>

            <hr className="border-slate-50" />

            <section>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Clasificación</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Nivel Actual</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                    value={ticket.nivel_actual}
                    onChange={(e) => updateStatus(ticket.status, e.target.value)}
                  >
                    <option value="L1">Nivel 1 (L1)</option>
                    <option value="L2">Nivel 2 (L2)</option>
                    <option value="L3">Nivel 3 (L3)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Fecha de Creación</label>
                  <p className="text-slate-500 text-[10px] font-bold">
                    {new Date(ticket.fecha_creacion).toLocaleString()}
                  </p>
                </div>
              </div>
            </section>

            {ticket.status === 'Resuelto' && (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Resolución</label>
                <p className="text-[10px] text-emerald-800 font-bold">
                  Completado el {new Date(ticket.fecha_cierre).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
