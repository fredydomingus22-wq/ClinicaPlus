import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Switch, 
  Badge, 
  StatusBadge,
  KpiCard,
  HeroBanner
} from '@clinicaplus/ui';
import { EstadoAgendamento } from '@clinicaplus/types';
import { toast } from 'react-hot-toast';
import { 
  Beaker, 
  Stethoscope, 
  Calendar, 
  ShieldCheck, 
  Bell,
  ArrowRight
} from 'lucide-react';

const mockData = [
  { id: 1, nome: 'João Domingos', status: 'CONFIRMADO', specialidade: 'Cardiologia', hora: '09:00' },
  { id: 2, nome: 'Maria Antónia', status: 'PENDENTE', specialidade: 'Pediatria', hora: '10:30' },
  { id: 3, nome: 'Carlos Silva', status: 'EM_PROGRESSO', specialidade: 'Clínica Geral', hora: '11:15' },
];

export default function StyleGuidePage() {
  const [toggle, setToggle] = useState(true);

  const showToast = () => {
    toast.success('Notificação com estilo Glass Modern!', {
      style: {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    });
  };

  return (
    <div className="glass-theme min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="space-y-4">
          <Badge variant="info" className="px-3 py-1">v4 Prototype</Badge>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 font-display">
            Style Guide: <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-400">Glass Modern</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl font-body">
            Este guia demonstra a nova linguagem visual do ClinicaPlus, focada em profundidade, 
            profissionalismo e harmonia visual usando OKLCH e Glassmorphism.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard 
            label="Pacientes Hoje" 
            value="42" 
            icon={Stethoscope} 
            trend={{ value: 12, isPositive: true }}
            className="glass-effect"
          />
          <KpiCard 
            label="Consultas Pendentes" 
            value="08" 
            icon={Calendar} 
            className="glass-effect"
          />
          <KpiCard 
            label="Saturação Global" 
            value="85%" 
            icon={Beaker} 
            trend={{ value: 3, isPositive: false }}
            className="glass-effect"
          />
        </section>

        {/* Components Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Card & Inputs */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 font-display flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary-500" />
              Superfícies e Controlos
            </h2>
            <Card className="glass-effect space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-700">Configuração de Sistema</h3>
                <p className="text-sm text-slate-500">Ajuste o comportamento global da interface.</p>
              </div>
              
              <Switch 
                checked={toggle}
                onCheckedChange={setToggle}
                label="Modo Glass Ativo"
                description="Activa transparências e blurs em toda a UI."
              />

              <div className="flex gap-3 pt-4">
                <Button onClick={showToast} className="rounded-xl shadow-lg shadow-primary-500/20">
                  Testar Toast <Bell className="ml-2 w-4 h-4" />
                </Button>
                <Button variant="secondary" className="rounded-xl glass-effect">
                  Cancelar
                </Button>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <StatusBadge estado={EstadoAgendamento.CONFIRMADO} />
              <StatusBadge estado={EstadoAgendamento.PENDENTE} />
              <StatusBadge estado={EstadoAgendamento.EM_PROGRESSO} />
              <StatusBadge estado={EstadoAgendamento.CANCELADO} />
            </div>
          </section>

          {/* Table Demo */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 font-display flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-500" />
              Data Display (Tabelas)
            </h2>
            <div className="glass-effect rounded-3xl overflow-hidden">
              <Table 
                columns={[
                  { header: 'Paciente', accessor: 'nome', className: 'font-bold' },
                  { header: 'Especialidade', accessor: 'specialidade' },
                  { 
                    header: 'Estado', 
                    accessor: (item) => <StatusBadge estado={item.status as EstadoAgendamento} /> 
                  },
                ]}
                data={mockData}
                keyExtractor={(item) => item.id}
                className="border-none shadow-none bg-transparent"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button className="text-sm font-bold text-primary-600 flex items-center gap-1 hover:gap-2 transition-all">
                Ver todos os registos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

        </div>

        <HeroBanner 
          title="Pronto para a transição?"
          subtitle="O novo ClinicaPlus v4 traz performance superior e uma experiência de utilização inigualável."
          action={
            <Button onClick={() => {}} className="rounded-xl px-6">
              Começar Migração
            </Button>
          }
          className="bg-gradient-to-br from-primary-600 to-blue-700 rounded-[32px] overflow-hidden shadow-2xl shadow-primary-900/20"
        />

      </div>
    </div>
  );
}
