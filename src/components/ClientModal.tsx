"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ClientModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  clientData 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: () => void, 
  clientData?: any 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    correo: '',
    telefono_wsp: '',
    nit_cedula: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (clientData) {
      setFormData({
        nombre: clientData.nombre || '',
        empresa: clientData.empresa || '',
        correo: clientData.correo || '',
        telefono_wsp: clientData.telefono_wsp || '',
        nit_cedula: clientData.nit_cedula || '',
      });
    } else {
      setFormData({
        nombre: '',
        empresa: '',
        correo: '',
        telefono_wsp: '',
        nit_cedula: '',
      });
    }
  }, [clientData, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (clientData) {
        // Editar
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id_cliente', clientData.id_cliente);
        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('clientes')
          .insert([formData]);
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error guardando cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold">{clientData ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="text-indigo-200 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre / Razón Social</label>
              <input required className="w-full px-4 py-2 border rounded-xl" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIT / Cédula</label>
              <input required className="w-full px-4 py-2 border rounded-xl" value={formData.nit_cedula} onChange={e => setFormData({...formData, nit_cedula: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa</label>
              <input className="w-full px-4 py-2 border rounded-xl" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
              <input required type="email" className="w-full px-4 py-2 border rounded-xl" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular (WhatsApp)</label>
              <input required className="w-full px-4 py-2 border rounded-xl" value={formData.telefono_wsp} onChange={e => setFormData({...formData, telefono_wsp: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-xl font-bold text-slate-600">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
