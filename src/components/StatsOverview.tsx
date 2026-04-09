"use client";
import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  List
} from 'lucide-react';

interface StatsOverviewProps {
  tickets: any[];
}

export default function StatsOverview({ tickets }: StatsOverviewProps) {
  const total = tickets.length;
  const pending = tickets.filter(t => t.status === 'Pendiente').length;
  const escalated = tickets.filter(t => t.status === 'Escalado').length;
  const resolved = tickets.filter(t => t.status === 'Resuelto').length;

  const stats = [
    { 
      label: 'Total Tickets', 
      value: total, 
      icon: List, 
      color: 'text-slate-600', 
      bgColor: 'bg-slate-50',
      border: 'border-slate-100'
    },
    { 
      label: 'Pendientes', 
      value: pending, 
      icon: Clock, 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50',
      border: 'border-amber-100'
    },
    { 
      label: 'Escalados', 
      value: escalated, 
      icon: AlertCircle, 
      color: 'text-rose-600', 
      bgColor: 'bg-rose-50',
      border: 'border-rose-100'
    },
    { 
      label: 'Resueltos', 
      value: resolved, 
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      {stats.map((stat) => (
        <div 
          key={stat.label} 
          className={`bg-white p-5 rounded-3xl border ${stat.border} shadow-sm transition hover:shadow-md group`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2.5 rounded-2xl ${stat.bgColor} ${stat.color} transition-colors`}>
              <stat.icon size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoy</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
