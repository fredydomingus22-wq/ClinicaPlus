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
  Printer,
  ChevronRight,
  Menu,
  ShieldCheck
} from 'lucide-react';

const mockAppointments = [
  { id: '1029', paciente: 'Agostinho Neto', especialidade: 'Cardiologia', hora: '08:00', status: 'CONFIRMADO' },
  { id: '1030', paciente: 'Manuel da Costa', especialidade: 'Clínica Geral', hora: '08:30', status: 'CONFIRMADO' },
  { id: '1031', paciente: 'Maria Antónia', especialidade: 'Pediatria', hora: '09:00', status: 'PENDENTE' },
  { id: '1032', paciente: 'João Baptista', especialidade: 'Ortopedia', hora: '10:00', status: 'EM_PROGRESSO' },
];

export default function ProposalIndustrialPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="industrial-theme min-h-screen bg-app font-body flex text-[13px] leading-tight selection:bg-industrial-accent selection:text-white">
      
      {/* SIDEBAR: Industrial Utility */}
      <aside className={`border-r border-industrial-border bg-white flex flex-col transition-all duration-200 ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}>
        <div className="h-14 border-b border-industrial-border flex items-center px-4 justify-between">
          {!collapsed && <div className="font-display font-bold tracking-tighter text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-industrial-accent" />
            CLINICAPLUS
          </div>}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0">
            <Menu className="w-4 h-4" />
          </Button>
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: Users, label: 'Pacientes' },
            { icon: Calendar, label: 'Agenda' },
            { icon: FileText, label: 'Receitas' },
            { icon: Settings, label: 'Configurações' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#f5f5f5] text-industrial-text/60 hover:text-industrial-text group">
              <item.icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-industrial-accent" />
              {!collapsed && <span className="font-medium tracking-tight whitespace-nowrap">{item.label}</span>}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-industrial-border">
          {!collapsed ? (
            <div className="bg-[#f9f9f9] border border-industrial-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-industrial-text/40 uppercase tracking-widest">Servidor</span>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <p className="text-[11px] font-mono">v4.0.2-prod</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col bg-[#fafafa]">
        
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-industrial-border flex items-center px-8 justify-between">
          <div className="flex items-center gap-4 w-1/2">
            <Search className="w-4 h-4 text-industrial-text/30" />
            <input 
              type="text" 
              placeholder="Pesquisar por ID, BI ou Nome..." 
              className="bg-transparent border-none outline-none w-full font-mono placeholder:text-industrial-text/20"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
               <Bell className="w-4 h-4" />
               <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-industrial-accent rounded-full" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-industrial-accent text-white flex items-center justify-center font-bold">DR</div>
          </div>
        </header>

        {/* CONTENT PAGE */}
        <div className="p-10 space-y-10 max-w-6xl mx-auto w-full">
          
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-industrial-accent font-bold uppercase tracking-[0.2em]">Visão Geral</p>
              <h1 className="text-3xl font-display font-bold tracking-tight">Agenda de Hoje</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 gap-2 border-industrial-border hover:bg-[#f5f5f5] transition-colors">
                <Printer className="w-4 h-4" /> Imprimir Lista
              </Button>
              <Button className="h-9 bg-industrial-text text-white hover:bg-black transition-colors">
                Novo Agendamento
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Consultas', value: '24', trend: '+12%' },
              { label: 'Expectativa', value: '480.000 Kz', trend: '+5%' },
              { label: 'Cancelados', value: '2', trend: '-20%' },
              { label: 'Novos', value: '5', trend: '+10%' },
            ].map(stat => (
              <Card key={stat.label} className="bg-white border-industrial-border p-5 space-y-3">
                <p className="text-[10px] font-bold text-industrial-text/40 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-mono font-bold">{stat.value}</h3>
                  <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                    {stat.trend}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-white border border-industrial-border p-1">
            <Table
              columns={[
                { header: 'ID', accessor: 'id', className: 'font-mono text-industrial-text/40' },
                { header: 'PACIENTE', accessor: 'paciente', className: 'font-bold' },
                { header: 'ESPECIALIDADE', accessor: 'especialidade', className: 'text-industrial-text/60' },
                { header: 'HORA', accessor: 'hora', className: 'font-mono' },
                { 
                  header: 'STATUS', 
                  accessor: (row) => (
                    <Badge variant="outline" className="border-industrial-border text-[10px] uppercase font-mono tracking-tight bg-[#f9f9f9]">
                      {row.status}
                    </Badge>
                  ) 
                },
                {
                  header: '',
                  accessor: () => <ChevronRight className="w-4 h-4 text-industrial-text/20 ml-auto" />,
                  className: 'w-[40px]'
                }
              ]}
              data={mockAppointments}
              keyExtractor={(row) => row.id}
            />
          </div>

          <footer className="pt-10 border-t border-industrial-border flex justify-between text-[11px] text-industrial-text/40 font-mono">
            <p>PROPOSTA INDUSTRIAL / SKILL: WEB-DESIGN-GUIDELINES</p>
            <p>ACCESSIBILITY LEVEL: AAA / CONTRAST: 7.1:1</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
