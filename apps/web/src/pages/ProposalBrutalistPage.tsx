import React from 'react';
import { 
  Table, 
  Button, 
  Badge, 
  Card
} from '@clinicaplus/ui';
import { 
  Plus, 
  ArrowRight,
  Activity,
  Droplets,
  Calendar,
  Users,
  Settings,
  Flame,
  Zap
} from 'lucide-react';

const mockData = [
  { id: '1', nome: 'Bento Kangamba', tipo: 'URGÊNCIA', status: 'TRIAGEM', cor: '#ff4500' },
  { id: '2', nome: 'Rosa Duque', tipo: 'CONSULTA', status: 'A_ESPERA', cor: '#000000' },
  { id: '3', nome: 'Filipe Nyusi', tipo: 'EXAME', status: 'FINALIZADO', cor: '#555555' },
];

export default function ProposalBrutalistPage() {
  return (
    <div className="brutalist-theme grain-overlay min-h-screen bg-app font-body text-black flex flex-col md:flex-row relative overflow-hidden">
      
      {/* SIDEBAR: Brutalist Block */}
      <aside className="w-full md:w-[120px] bg-black text-white flex flex-col items-center py-12 gap-12 border-r-4 border-black z-20">
        <div className="rotate-[-90deg] whitespace-nowrap font-display text-4xl font-black tracking-tighter mt-12 mb-24 origin-center">
          CLINICAPLUS.AO
        </div>
        
        <nav className="flex flex-col gap-8">
          {[Calendar, Users, Activity, Settings].map((Icon, i) => (
            <div key={i} className="p-3 border-2 border-transparent hover:border-white transition-all cursor-pointer group">
              <Icon className="w-8 h-8 group-hover:scale-125 transition-transform" />
            </div>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t-2 border-white/20 w-full flex justify-center">
          <Flame className="w-8 h-8 text-brutalist-accent" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex flex-col p-8 md:p-16 gap-16">
        
        {/* DECORATIVE ELEMENTS */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-brutalist-accent/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-[0%] left-[-5%] w-[30%] h-[40%] bg-black/5 rounded-full blur-3xl -z-10" />

        <header className="flex flex-col md:flex-row items-start justify-between gap-8 border-b-8 border-black pb-12">
          <div className="space-y-4">
            <Badge className="bg-brutalist-accent text-white rounded-none font-black px-6 py-2 text-lg italic border-none">
              LIVE_SYSTEM_03
            </Badge>
            <h1 className="text-7xl md:text-9xl font-display font-black leading-[0.85] tracking-tighter uppercase">
              Brutalist <br />
              <span className="text-brutalist-accent">Health</span>
            </h1>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
             <Button className="bg-black text-white rounded-none h-20 px-12 text-2xl font-black hover:bg-brutalist-accent transition-colors flex items-center justify-between group">
               NOVO_ATENDIMENTO <ArrowRight className="w-8 h-8 group-hover:translate-x-4 transition-transform" />
             </Button>
             <div className="flex gap-4">
                <Button className="flex-1 bg-white border-4 border-black text-black rounded-none h-16 font-black text-xl hover:translate-x-1 hover:-translate-y-1 transition-transform">
                  IMPRIMIR
                </Button>
                <Button className="flex-1 bg-white border-4 border-black text-black rounded-none h-16 font-black text-xl hover:translate-x-1 hover:-translate-y-1 transition-transform">
                  FILTRAR
                </Button>
             </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           <Card className="bg-white border-4 border-black p-10 rounded-none shadow-brutalist space-y-8 hover:-translate-x-2 hover:-translate-y-2 transition-transform cursor-pointer group">
              <div className="flex justify-between items-start">
                <Zap className="w-16 h-16 text-brutalist-accent" />
                <span className="font-display font-black text-4xl opacity-10">01</span>
              </div>
              <div className="space-y-4">
                <h3 className="text-5xl font-display font-black tracking-tighter">VITALIDADE_TOTAL</h3>
                <p className="text-xl font-medium leading-tight">Métrica de prontidão clínica baseada em 128 pontos de dados em tempo real.</p>
              </div>
              <div className="h-4 w-full bg-black/10">
                <div className="h-full w-3/4 bg-brutalist-accent" />
              </div>
           </Card>

           <div className="grid grid-cols-2 gap-8">
              <div className="bg-brutalist-accent text-white p-8 border-4 border-black font-black flex flex-col justify-between">
                 <h4 className="text-2xl italic tracking-widest">PACIENTES</h4>
                 <p className="text-7xl leading-none">4.2k</p>
              </div>
              <div className="bg-black text-white p-8 border-4 border-black font-black flex flex-col justify-between">
                 <h4 className="text-2xl italic tracking-widest">TRIAGEM</h4>
                 <p className="text-7xl leading-none">08</p>
              </div>
              <div className="col-span-2 bg-white border-4 border-black p-8 font-black flex items-center justify-between group">
                 <div className="space-y-2">
                   <h4 className="text-2xl italic tracking-widest opacity-40">SYSTEM_LOAD</h4>
                   <p className="text-5xl">ESTÁVEL_99%</p>
                 </div>
                 <Activity className="w-16 h-16 group-hover:animate-pulse" />
              </div>
           </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-6">
            <h2 className="text-6xl font-display font-black tracking-tighter">FILA_ATTEND</h2>
            <div className="h-1 flex-1 bg-black" />
          </div>

          <div className="border-4 border-black bg-white overflow-hidden shadow-brutalist">
            <Table
              columns={[
                { 
                  header: 'NOME_ITEM', 
                  accessor: (row) => (
                    <div className="flex items-center gap-4 py-4 min-w-[300px]">
                      <div style={{ backgroundColor: row.cor }} className="w-12 h-12 border-4 border-black shrink-0" />
                      <span className="font-black text-2xl uppercase tracking-tighter">{row.nome}</span>
                    </div>
                  )
                },
                { header: 'CATEGORIA', accessor: 'tipo', className: 'font-black text-xl italic opacity-50' },
                { 
                  header: 'STATUS_NOW', 
                  accessor: (row) => (
                    <div className="bg-black text-white px-4 py-2 font-black inline-block text-lg">
                       {row.status}
                    </div>
                  ) 
                },
                {
                  header: '',
                  accessor: () => <Button className="bg-transparent border-4 border-black p-4 hover:bg-black hover:text-white transition-all"><Plus className="w-6 h-6" /></Button>,
                  className: 'text-right'
                }
              ]}
              data={mockData}
              keyExtractor={(row) => row.id}
            />
          </div>
        </section>

        <footer className="pt-24 flex flex-col md:flex-row justify-between items-end gap-12 font-black">
           <div className="space-y-4">
             <Droplets className="w-12 h-12 text-brutalist-accent" />
             <p className="text-4xl leading-tight">DESIGN_SYSTEM_BRUTAL <br /> CLINICAPLUS_PROPOSAL_03</p>
           </div>
           <div className="text-right space-y-2">
             <p className="text-xl">FRONTEND_DESIGN_SKILL</p>
             <p className="opacity-40">ALL_RIGHTS_RESERVED_2026</p>
           </div>
        </footer>

      </main>
    </div>
  );
}
