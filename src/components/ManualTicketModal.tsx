"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendAperturaEmail } from '@/app/actions/emails';

export default function ManualTicketModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    id_cliente: '',
    nivel_actual: 'L1',
    status: 'No resuelto',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) fetchClientes();
  }, [isOpen]);

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id_cliente, nombre, apellidos, telefono_wsp, correo, nit_cedula');
    if (data) setClientes(data);
  }

  const filteredClientes = clientes.filter(c => {
    const searchLow = clientSearch.toLowerCase();
    const fullName = `${c.nombre} ${c.apellidos}`.toLowerCase();
    const nit = (c.nit_cedula || '').toLowerCase();
    return fullName.includes(searchLow) || nit.includes(searchLow);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.id_cliente) {
      alert('Por favor selecciona un cliente válido de la lista.');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generar radicado
      const { count } = await supabase.from('casos').select('id_caso', { count: 'exact', head: true });
      const numeroRadicado = `CASO-${(count || 0) + 1001}`;

      const { error } = await supabase.from('casos').insert([{
        ...formData,
        numero_radicado: numeroRadicado,
        id_creador: user?.id,
      }]);

      if (error) throw error;

      // Registrar evento de creación en la historia
      await supabase.from('interacciones').insert([{
        id_caso: (await supabase.from('casos').select('id_caso').eq('numero_radicado', numeroRadicado).single()).data?.id_caso,
        id_agente: user?.id,
        tipo_mensaje: 'Sistema',
        mensaje: `Ticket **creado manualmente** por agente.`
      }]);
      
      // Enviar Email de Apertura
      const currentEmail = formData.contact_email || (clientes.find(c => c.id_cliente === formData.id_cliente)?.correo);
      const currentName = formData.contact_name || (clientes.find(c => c.id_cliente === formData.id_cliente)?.nombre);
      
      if (currentEmail) {
        await sendAperturaEmail(currentEmail, currentName || 'Cliente', numeroRadicado, formData.titulo);
      }

      onSuccess();
      onClose();
      setFormData({ 
        titulo: '', descripcion: '', id_cliente: '', nivel_actual: 'L1',
        status: 'No resuelto',
        contact_name: '', contact_email: '', contact_phone: ''
      });
    } catch (error: any) {
      alert('Error creando ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold">Crear Nuevo Ticket Manual</h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título del Ticket</label>
              <input 
                required
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej: Problema con acceso a cuenta"
                value={formData.titulo}
                onChange={e => setFormData({...formData, titulo: e.target.value})}
              />
            </div>

            <div className="col-span-2 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Cliente Asociado <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  required
                  autoComplete="off"
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                  placeholder="Buscar por nombre o NIT..."
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) setFormData({...formData, id_cliente: ''});
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {formData.id_cliente && (
                  <div className="absolute right-3 top-2.5 text-emerald-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {showDropdown && clientSearch && !formData.id_cliente && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredClientes.length > 0 ? (
                    filteredClientes.map(c => (
                      <button
                        key={c.id_cliente}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 transition"
                        onClick={() => {
                          setFormData({
                            ...formData, 
                            id_cliente: c.id_cliente,
                            contact_name: `${c.nombre} ${c.apellidos}`,
                            contact_email: c.correo,
                            contact_phone: c.telefono_wsp
                          });
                          setClientSearch(`${c.nombre} ${c.apellidos}`);
                          setShowDropdown(false);
                        }}
                      >
                        <div className="text-sm font-bold text-slate-800">{c.nombre} {c.apellidos}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {c.nit_cedula || '---'} | Tel: {c.telefono_wsp}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">No se encontraron clientes</div>
                  )}
                </div>
              )}
              {!formData.id_cliente && (
                <p className="text-[10px] text-rose-400 mt-1 font-medium italic">* Debes seleccionar un cliente de la lista</p>
              )}
            </div>

            <hr className="col-span-2 border-slate-100 my-2" />
            <p className="col-span-2 text-[10px] font-bold text-indigo-400 uppercase">Información de Contacto Directo</p>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
              <input 
                className="w-full px-4 py-2 border rounded-xl"
                value={formData.contact_name}
                onChange={e => setFormData({...formData, contact_name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo</label>
              <input 
                type="email"
                className="w-full px-4 py-2 border rounded-xl"
                value={formData.contact_email}
                onChange={e => setFormData({...formData, contact_email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular</label>
              <input 
                className="w-full px-4 py-2 border rounded-xl"
                value={formData.contact_phone}
                onChange={e => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nivel Inicial</label>
              <select 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.nivel_actual}
                onChange={e => setFormData({...formData, nivel_actual: e.target.value})}
              >
                <option value="L1">Nivel 1 (Básico)</option>
                <option value="L2">Nivel 2 (Técnico)</option>
                <option value="L3">Nivel 3 (Crítico)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Creación (Auto)</label>
              <input 
                disabled
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-400 font-medium cursor-not-allowed"
                value={new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado Inicial</label>
              <select 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="No resuelto">No resuelto</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Resuelto">Resuelto</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción / Detalles</label>
              <textarea 
                required
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                placeholder="Escribe aquí los detalles del problema reportado..."
                value={formData.descripcion}
                onChange={e => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
