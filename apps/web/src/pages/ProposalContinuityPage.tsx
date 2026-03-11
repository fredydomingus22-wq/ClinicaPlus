import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Badge, 
  Card
} from '@clinicaplus/ui';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Search,
  Bell,
  ChevronRight,
  Hexagon,
  LogOut,
  User,
  Activity
} from 'lucide-react';

const mockData = [
  { id: '1', paciente: 'Domingos Kiluanji', especialidade: 'Cardiologia', hora: '14:30', status: 'CONFIRMADO' },
  { id: '2', paciente: 'Teresa Bento', especialidade: 'Clínica Geral', hora: '15:15', status: 'PENDENTE' },
  { id: '3', paciente: 'Zola Matamba', especialidade: 'Pediatria', hora: '16:00', status: 'CONFIRMADO' },
];

export default function ProposalContinuityPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="continuum-theme min-h-screen bg-app font-body flex overflow-hidden">
      
      {/* SIDEBAR: Simple Immersive Panel (Login Concept) */}
      <aside className={`relative h-screen transition-all duration-500 ease-in-out flex flex-col ${collapsed ? 'w-[80px]' : 'w-[320px]'} border-r border-slate-200 shadow-2xl z-20 bg-continuum-dark`}>
        
        <div className="relative z-10 flex flex-col h-full text-white p-6">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3 mb-12 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <Hexagon size={24} className="text-continuum-accent stroke-[1.5]" />
            </div>
            {!collapsed && <span className="text-lg font-bold tracking-tight">ClinicaPlus</span>}
          </div>

          {/* Navigation with High Contrast */}
          <nav className="flex-1 space-y-1">
            {[
              { icon: LayoutDashboard, label: 'Dashboard' },
              { icon: Users, label: 'Pacientes' },
              { icon: Calendar, label: 'Agenda' },
              { icon: FileText, label: 'Receitas' },
              { icon: Settings, label: 'Configurações' },
            ].map((item) => (
              <div 
                key={item.label} 
                className="group flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${item.label === 'Dashboard' ? 'text-continuum-accent' : 'text-white/60 group-hover:text-white'}`} />
                {!collapsed && (
                  <span className={`font-medium tracking-tight text-sm ${item.label === 'Dashboard' ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>

          {/* User Profile (The "Persona") */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 p-2 bg-white/5 backdrop-blur-lg border border-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="h-10 w-10 rounded-xl bg-continuum-accent/20 flex items-center justify-center text-continuum-accent font-bold">DR</div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold truncate">Dr. Ricardo</p>
                  <p className="text-[10px] text-white/40 truncate italic">Administrador</p>
                </div>
              )}
              {!collapsed && <LogOut className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />}
            </div>
          </div>
        </div>

        {/* Collapse Toggle Control */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:scale-110 transition-transform z-30 flex items-center justify-center"
        >
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* MAIN CONTENT: The "Engineering" Panel (Inherited from Login Right Side) */}
      <main className="flex-1 flex flex-col min-w-0 bg-app relative animate-in fade-in duration-1000">
        
        {/* HEADER: Professional & Precise */}
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200 flex items-center px-10 justify-between sticky top-0 z-10">
          <div className="flex items-center gap-6 w-full max-w-xl">
             <div className="relative group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-continuum-teal transition-colors" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por Paciente ou ID..." 
                  className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-continuum-teal/20 transition-all font-medium"
                />
             </div>
          </div>
          <div className="flex items-center gap-6">
             <Button variant="ghost" className="relative h-10 w-10 p-0 rounded-xl hover:bg-slate-100">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-continuum-accent rounded-full border-2 border-white" />
             </Button>
             <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-slate-900/20">A</div>
          </div>
        </header>

        {/* WORKSPACE */}
        <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Bem-vindo <span className="text-continuum-teal font-light italic">de volta.</span>
              </h1>
              <p className="text-slate-500 font-medium">Aqui está o resumo da sua actividade clínica de hoje.</p>
            </div>
            <div className="flex gap-3">
               <Button className="bg-slate-900 text-white rounded-2xl h-12 px-8 font-semibold hover:bg-continuum-dark transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                  Agendar Consulta
               </Button>
            </div>
          </div>

          {/* STATS: Precise & Clean */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Hoje', value: '18', icon: Calendar, color: 'emerald' },
              { label: 'Aguardando', value: '5', icon: Activity, color: 'amber' },
              { label: 'Novos', value: '12', icon: User, color: 'blue' },
              { label: 'Total Mês', value: '240', icon: LayoutDashboard, color: 'slate' },
            ].map((stat, i) => (
              <Card key={i} className="p-6 border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer rounded-[24px]">
                 <div className="flex items-start justify-between mb-4">
                   <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-continuum-teal transition-colors">
                      <stat.icon className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                 </div>
                 <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
              </Card>
            ))}
          </div>

          {/* CONTENT SECTION */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Lista de Espera</h2>
              <Button variant="ghost" className="text-continuum-teal font-bold hover:bg-continuum-teal/5">Ver agenda completa</Button>
            </div>
            
            <div className="bg-white border border-slate-100 overflow-hidden rounded-[24px] shadow-sm">
              <Table
                columns={[
                  { 
                    header: 'PACIENTE', 
                    accessor: (row) => (
                      <div className="flex items-center gap-3 py-3">
                         <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">
                           {row.paciente.charAt(0)}
                         </div>
                         <span className="font-bold text-slate-900">{row.paciente}</span>
                      </div>
                    )
                  },
                  { header: 'ESPECIALIDADE', accessor: 'especialidade', className: 'text-slate-500 font-medium' },
                  { header: 'HORA', accessor: 'hora', className: 'font-mono font-bold text-continuum-teal' },
                  { 
                    header: 'ESTADO', 
                    accessor: (row) => (
                      <Badge variant="outline" className={`rounded-lg border-slate-200 text-[10px] font-bold uppercase transition-all ${row.status === 'CONFIRMADO' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                        {row.status}
                      </Badge>
                    ) 
                  },
                  {
                    header: '',
                    accessor: () => <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />,
                    className: 'text-right'
                  }
                ]}
                data={mockData}
                keyExtractor={(row) => row.id}
              />
            </div>
          </div>

          {/* FOOTER: Minimal & Contextual */}
          <footer className="pt-20 pb-10 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
             <p className="flex items-center gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-continuum-accent" />
               Aesthetic Continuity Proposal (Login Concept)
             </p>
             <p>© 2026 CLINICAPLUS / ANGOLA</p>
          </footer>

        </div>
      </main>
    </div>
  );
}
