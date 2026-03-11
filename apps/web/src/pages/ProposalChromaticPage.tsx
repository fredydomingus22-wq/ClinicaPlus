import React from 'react';
import { 
  Table, 
  Button, 
  Badge, 
  Card
} from '@clinicaplus/ui';
import { 
  Circle, 
  Square, 
  Triangle, 
  Hexagon,
  Wind,
  Sun,
  Zap,
  Shield,
  Layers
} from 'lucide-react';

const mockSystemData = [
  { id: 'S1', component: 'Coração', vitalidade: 85, aura: 'var(--color-chromatic-teal)' },
  { id: 'S2', component: 'Pulmão', vitalidade: 92, aura: 'var(--color-chromatic-teal)' },
  { id: 'S3', component: 'Neuro', vitalidade: 78, aura: 'var(--color-chromatic-golden)' },
  { id: 'S4', component: 'Immuno', vitalidade: 64, aura: 'var(--color-chromatic-violet)' },
];

export default function ProposalChromaticPage() {
  return (
    <div className="chromatic-theme min-h-screen bg-app font-body text-primary flex flex-col lg:flex-row p-6 lg:p-12 gap-12 selection:bg-chromatic-violet/20">
      
      {/* SIDEBAR: Geometric Rhythm */}
       <aside className="w-full lg:w-20 bg-white rounded-[40px] shadow-lg flex flex-col items-center py-10 gap-10 border border-slate-100 shrink-0">
          <div className="h-10 w-10 bg-chromatic-violet rounded-full flex items-center justify-center text-white shadow-lg shadow-chromatic-violet/40">
             <Hexagon className="w-5 h-5 fill-current" />
          </div>
          
          <nav className="flex flex-col gap-8">
            {[Circle, Square, Triangle, Layer].map((Icon, i) => (
              <div key={i} className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer group">
                <Icon className="w-5 h-5 text-slate-300 group-hover:text-chromatic-violet transition-colors" />
              </div>
            ))}
          </nav>

          <div className="mt-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
            <Sun className="w-4 h-4 text-chromatic-golden" />
          </div>
       </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 space-y-16 lg:pt-8">
        
        {/* ARTISTIC HEADER */}
        <header className="flex flex-col md:flex-row items-end gap-12 border-b-2 border-slate-100 pb-12">
          <div className="space-y-6 flex-1">
             <div className="flex gap-2">
                <span className="h-2 w-8 bg-chromatic-violet rounded-full" />
                <span className="h-2 w-4 bg-chromatic-golden rounded-full" />
                <span className="h-2 w-2 bg-chromatic-teal rounded-full" />
             </div>
             <h1 className="text-6xl lg:text-8xl font-display font-light leading-[0.9] tracking-tight">
               Chromatic <br />
               <span className="font-bold text-chromatic-violet">Vitality</span>
             </h1>
             <p className="max-w-md text-slate-400 font-medium leading-relaxed">
               A cor como sistema de navegação e tranquilidade. 
               Uma abordagem rítmica para a gestão da vida.
             </p>
          </div>
          <div className="flex gap-4">
             <Button className="h-16 px-10 rounded-full bg-chromatic-violet text-white shadow-xl shadow-chromatic-violet/20 hover:scale-[1.05] transition-transform text-lg">
               Iniciar Processo
             </Button>
          </div>
        </header>

        {/* SYSTEM OVERVIEW GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'Energia', icon: Zap, color: 'var(--color-chromatic-golden)', value: 'High' },
             { label: 'Fluxo', icon: Wind, color: 'var(--color-chromatic-teal)', value: 'Steady' },
             { label: 'Acolhimento', icon: Sun, color: 'var(--color-chromatic-golden)', value: 'Warm' },
             { label: 'Foco Clínica', icon: Shield, color: 'var(--color-chromatic-violet)', value: 'Active' },
           ].map(stat => (
             <Card key={stat.label} className="p-8 rounded-[48px] bg-white border-none shadow-sm flex flex-col items-center text-center gap-6 hover:shadow-xl transition-shadow cursor-default group">
                <div style={{ backgroundColor: stat.color }} className="h-16 w-16 rounded-[24px] flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                   <stat.icon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{stat.label}</p>
                   <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
             </Card>
           ))}
        </section>

        {/* ARTISTIC DATA TABLE */}
        <section className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <h2 className="text-3xl font-display font-bold">Métricas do Sistema</h2>
              <div className="flex gap-2">
                 <Badge className="rounded-full bg-chromatic-teal/10 text-chromatic-teal border-none font-bold">VIVOS: 98%</Badge>
                 <Badge className="rounded-full bg-chromatic-golden/10 text-chromatic-golden border-none font-bold">AVISOS: 02%</Badge>
              </div>
           </div>

           <div className="bg-white rounded-[50px] shadow-sm p-2 overflow-hidden border border-slate-50">
              <Table
                columns={[
                  { 
                    header: 'COMPONENTE', 
                    accessor: (row) => (
                      <div className="flex items-center gap-6 py-4">
                         <div style={{ backgroundColor: row.aura }} className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg">
                            <Layers className="w-6 h-6" />
                         </div>
                         <span className="text-xl font-bold tracking-tight">{row.component}</span>
                      </div>
                    )
                  },
                  { 
                    header: 'VITALIDADE', 
                    accessor: (row) => (
                      <div className="flex items-center gap-4 w-full max-w-[200px]">
                         <span className="font-bold text-slate-400">{row.vitalidade}%</span>
                         <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${row.vitalidade}%`, backgroundColor: row.aura }} className="h-full rounded-full" />
                         </div>
                      </div>
                    )
                  },
                  { 
                    header: 'RITMO', 
                    accessor: () => (
                      <div className="flex gap-1 h-8 items-center">
                        {[1, 0.4, 0.8, 0.2, 0.6, 1].map((h, i) => (
                          <div key={i} style={{ height: `${h * 100}%` }} className="w-1.5 bg-slate-100 rounded-full animate-pulse" />
                        ))}
                      </div>
                    ) 
                  },
                  {
                    header: '',
                    accessor: () => <Button className="h-12 w-12 rounded-full bg-slate-50 hover:bg-chromatic-violet hover:text-white transition-all">❯</Button>,
                    className: 'text-right'
                  }
                ]}
                data={mockSystemData}
                keyExtractor={(row) => row.id}
                className="bg-transparent"
              />
           </div>
        </section>

        {/* SYSTEM STATUS FOOTER */}
        <footer className="pt-24 grid grid-cols-1 md:grid-cols-3 gap-12 items-start opacity-40 hover:opacity-100 transition-opacity">
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Filosofia</p>
              <p className="text-sm italic leading-relaxed">
                Toda a cura começa com a ordem. <br />
                Toda a ordem começa com o ritmo.
              </p>
           </div>
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Skillset</p>
              <p className="text-sm font-bold">CANVAS-DESIGN / PHILOSOPHY: CHROMATIC</p>
           </div>
           <div className="space-y-4 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Version</p>
              <p className="text-sm font-mono tracking-tighter">BUILD.2026.03.09.CHROMATIC</p>
           </div>
        </footer>

      </main>
    </div>
  );
}

// Mocked helper for the loop
const Layer = Layers;
