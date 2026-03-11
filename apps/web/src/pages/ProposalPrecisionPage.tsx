import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Badge, 
  Card,
  StatusBadge
} from '@clinicaplus/ui';
import { EstadoAgendamento } from '@clinicaplus/types';
import { 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  MoreVertical
} from 'lucide-react';

const mockAppointments = [
  { id: '1', paciente: 'Bernardo Silva', especialidade: 'Neurocirurgia', hora: '08:00', status: 'CONFIRMADO' },
  { id: '2', paciente: 'Ana Paula Santos', especialidade: 'Dermatologia', hora: '08:30', status: 'CONFIRMADO' },
  { id: '3', paciente: 'Engrácia Coimbra', especialidade: 'Ginecologia', hora: '09:00', status: 'EM_PROGRESSO' },
];

export default function ProposalPrecisionPage() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="precision-theme min-h-screen bg-app font-body flex p-4 gap-4">
      
      {/* SIDEBAR: SaaS Floating Panel */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-lg flex flex-col p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-primary-950">Precision</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { icon: Home, label: 'Overview' },
            { icon: Users, label: 'Pacientes' },
            { icon: Calendar, label: 'Consultas' },
            { icon: FileText, label: 'Documentos' },
            { icon: Settings, label: 'Definições' },
          ].map((item) => (
            <div 
              key={item.label} 
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                activeTab === item.label 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30' 
                : 'hover:bg-primary-100/50 text-slate-600'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
          ))}
        </nav>

        <Card className="mt-6 bg-primary-50 border-none p-4 rounded-2xl text-primary-900 border-white/40">
           <p className="text-xs opacity-60 font-bold mb-1">Dica do Dia</p>
           <p className="text-[11px] leading-relaxed">Podes usar atalhos de teclado para agendar mais rápido.</p>
        </Card>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm flex items-center px-8 justify-between">
          <div className="flex items-center gap-4 bg-slate-100/50 px-5 py-2.5 rounded-2xl w-96 border border-slate-200/50">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisa rápida..." 
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-3">
             <Button variant="ghost" className="rounded-full h-12 w-12 p-0 hover:bg-slate-100">
               <Plus className="w-6 h-6 text-primary-600" />
             </Button>
             <div className="h-10 w-10 rounded-2xl bg-slate-200 border-2 border-white shadow-sm" />
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 bg-white/50 rounded-[32px] border border-white/50 shadow-sm p-10 overflow-auto space-y-10 custom-scrollbar">
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-display font-bold text-slate-900">Bom dia, Dr. Roberto</h1>
              <p className="text-slate-500 font-medium tracking-tight">Tens 8 consultas agendadas para hoje.</p>
            </div>
            <Button className="bg-primary-600 text-white rounded-2xl px-8 h-12 font-bold shadow-lg shadow-primary-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Novo Atendimento
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card className="p-8 rounded-[24px] border-none bg-primary-600 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10 space-y-6">
                 <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                   <Clock className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-4xl font-display font-bold">14.2m</h3>
                    <p className="opacity-80 font-medium">Espera média</p>
                 </div>
               </div>
               <ArrowUpRight className="absolute top-8 right-8 w-12 h-12 opacity-10 group-hover:opacity-30 transition-opacity" />
            </Card>
            
            <Card className="p-8 rounded-[24px] border-none bg-white shadow-sm flex flex-col justify-between items-start">
               <div className="flex justify-between w-full">
                 <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                   <Users className="w-6 h-6 text-slate-600" />
                 </div>
                 <Badge variant="success" className="h-fit rounded-lg bg-green-50 text-green-600 text-[10px] font-bold">+15%</Badge>
               </div>
               <div className="mt-6">
                  <h3 className="text-4xl font-display font-bold text-slate-900">128</h3>
                  <p className="text-slate-400 font-medium">Novos Pacientes</p>
               </div>
            </Card>

            <Card className="p-8 rounded-[24px] border-none bg-white shadow-sm flex flex-col justify-between items-start">
                <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div className="mt-6">
                   <h3 className="text-4xl font-display font-bold text-slate-900">920k</h3>
                   <p className="text-slate-400 font-medium">Facturamento Kz</p>
                </div>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-slate-950">Próximos Agendamentos</h2>
              <Button variant="ghost" className="text-primary-600 font-bold hover:bg-primary-50">Ver todos</Button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <Table
                columns={[
                  { 
                    header: 'PACIENTE', 
                    accessor: (row) => (
                      <div className="flex items-center gap-3 py-2">
                         <div className="h-9 w-9 rounded-xl bg-slate-100 border border-white shadow-sm" />
                         <span className="font-bold text-slate-900">{row.paciente}</span>
                      </div>
                    )
                  },
                  { header: 'ESPECIALIDADE', accessor: 'especialidade', className: 'text-slate-500 font-medium' },
                  { header: 'HORA', accessor: 'hora', className: 'font-bold text-primary-600' },
                  { 
                    header: 'STATUS', 
                    accessor: (row) => (
                      <StatusBadge 
                        estado={row.status as EstadoAgendamento} 
                        className="rounded-xl border-none h-8 px-4 font-bold text-[11px]" 
                      />
                    ) 
                  },
                  {
                    header: '',
                    accessor: () => <Button variant="ghost" size="sm" className="rounded-xl hover:bg-slate-100"><MoreVertical className="w-4 h-4" /></Button>,
                    className: 'text-right'
                  }
                ]}
                data={mockAppointments}
                keyExtractor={(row) => row.id}
                className="bg-transparent"
              />
            </div>
          </div>

          <footer className="pt-12 flex justify-between items-center text-slate-400 text-xs font-semibold">
             <div className="flex gap-4">
                <span>© 2026 CLINICAPLUS</span>
                <span>•</span>
                <span>PROPOSTA PRECISION / SKILL: TAILWIND-DESIGN-SYSTEM</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>API ONLINE</span>
             </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
