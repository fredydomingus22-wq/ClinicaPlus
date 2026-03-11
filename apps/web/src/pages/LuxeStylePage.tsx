import React from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Badge, 
  StatusBadge,
  KpiCard
} from '@clinicaplus/ui';
import { EstadoAgendamento } from '@clinicaplus/types';
import { 
  ChevronRight,
  User,
  Activity,
  Award
} from 'lucide-react';

const mockData = [
  { id: 1, nome: 'Bernardo Silva', status: 'CONFIRMADO', specialidade: 'Neurocirurgia', data: '09 Março' },
  { id: 2, nome: 'Ana Paula Santos', status: 'EM_PROGRESSO', specialidade: 'Dermatologia', data: '09 Março' },
  { id: 3, nome: 'Engrácia Coimbra', status: 'PENDENTE', specialidade: 'Ginecologia', data: '10 Março' },
];

export default function LuxeStylePage() {
  return (
    <div className="luxe-theme grain-overlay min-h-screen bg-app text-primary font-body p-12 lg:p-24 selection:bg-luxe-accent/30">
      <div className="max-w-7xl mx-auto space-y-32">
        
        {/* Editorial Header */}
        <header className="reveal-1 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-black/5 pb-16">
          <div className="space-y-6">
            <Badge variant="outline" className="border-luxe-primary/20 text-luxe-primary font-bold tracking-widest uppercase text-[10px] px-4 py-1.5 rounded-none bg-transparent">
              Estudo Estético N.º 02
            </Badge>
            <h1 className="text-7xl lg:text-9xl font-display font-light leading-none tracking-tight">
              Neo-Clinical <br />
              <span className="italic font-medium text-luxe-primary">Luxe</span>
            </h1>
            <p className="max-w-xl text-lg lg:text-xl text-primary/70 leading-relaxed font-light">
              Uma abordagem que privilegia a autoridade clínica através de tipografia serifada e 
              uma paleta cromática que evoca serenidade e prestígio.
            </p>
          </div>
          <div className="hidden md:block shrink-0 p-8 border border-black/5 bg-white/50 backdrop-blur-sm self-start">
             <Activity className="w-12 h-12 text-luxe-primary opacity-20" />
          </div>
        </header>

        {/* KPIs Section - Asymmetric Grid */}
        <section className="reveal-2 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
             <KpiCard 
                label="Média de Consultas" 
                value="12.4" 
                icon={Award}
                className="bg-white border-none shadow-paper rounded-none h-full p-10"
             />
          </div>
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Card className="bg-luxe-primary text-white p-10 rounded-none shadow-luxe flex flex-col justify-between">
               <div className="space-y-2">
                 <p className="text-[10px] uppercase tracking-widest opacity-60">Status de Rede</p>
                 <h3 className="text-3xl font-display italic">Sistemas Operacionais</h3>
               </div>
               <div className="flex items-center gap-2 mt-8">
                  <span className="h-2 w-2 rounded-full bg-luxe-accent animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">99.8% Uptime</span>
               </div>
            </Card>
            <Card className="bg-white p-10 rounded-none shadow-paper border-none flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-primary/40">Triagens Hoje</p>
                  <h3 className="text-3xl font-display text-luxe-primary">48 Pacientes</h3>
                </div>
                <Button variant="ghost" className="p-0 h-auto justify-start hover:bg-transparent text-luxe-primary font-bold group">
                  Ver Relatório <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </Card>
          </div>
        </section>

        {/* Table Section - Floating Paper Style */}
        <section className="reveal-3 space-y-12">
          <div className="flex items-end gap-6 border-l-4 border-luxe-accent pl-8">
            <h2 className="text-5xl font-display font-medium">Lista de Atendimento</h2>
            <span className="mb-2 text-xs font-bold uppercase tracking-widest text-primary/30">Hoje, 09 Março</span>
          </div>

          <div className="bg-white shadow-luxe p-2 overflow-hidden">
            <div className="border border-black/5">
              <Table 
                columns={[
                  { 
                    header: 'Paciente', 
                    accessor: (item) => (
                      <div className="flex items-center gap-4 py-2">
                        <div className="h-10 w-10 bg-luxe-base flex items-center justify-center">
                          <User className="w-4 h-4 text-luxe-primary" />
                        </div>
                        <span className="font-display text-xl font-medium italic">{item.nome}</span>
                      </div>
                    )
                  },
                  { header: 'Especialidade', accessor: 'specialidade', className: 'text-sm font-light text-primary/60' },
                  { header: 'Data', accessor: 'data', className: 'text-sm font-bold' },
                  { 
                    header: 'Status', 
                    accessor: (item) => <StatusBadge estado={item.status as EstadoAgendamento} className="rounded-none border-none bg-luxe-base text-[10px] font-black uppercase" /> 
                  },
                  {
                    header: '',
                    accessor: () => (
                      <Button variant="ghost" size="sm" className="hover:text-luxe-primary">
                        Detalhes
                      </Button>
                    ),
                    className: 'text-right'
                  }
                ]}
                data={mockData}
                keyExtractor={(item) => item.id}
                className="bg-transparent"
              />
            </div>
          </div>
        </section>

        {/* Footer Editorial Call */}
        <footer className="pt-32 border-t border-black/5 flex flex-col md:flex-row gap-16 items-start">
           <div className="flex-1 space-y-8">
             <h4 className="text-4xl font-display italic">A excelência é um hábito, não um acto.</h4>
             <div className="flex gap-4">
                <Button className="bg-luxe-primary text-white rounded-none px-12 py-8 h-auto shadow-luxe text-lg font-bold hover:scale-105 transition-transform">
                  Implementar Estética
                </Button>
                <Button variant="secondary" className="bg-white border-black/10 rounded-none px-12 py-8 h-auto text-lg">
                  Comparar Glass
                </Button>
             </div>
           </div>
           <div className="w-full md:w-64 space-y-4">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Nota de Design</p>
             <p className="text-sm font-light leading-relaxed">
               Este design foi projectado para clínicas de luxo que pretendem elevar a percepção de valor 
               dos seus pacientes desde o primeiro contacto digital.
             </p>
           </div>
        </footer>

      </div>
    </div>
  );
}
