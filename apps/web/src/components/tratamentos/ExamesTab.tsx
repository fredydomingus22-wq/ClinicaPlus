import React, { useRef } from 'react';
import { useConfirmarLaudo } from '../../hooks/useTratamentos';
import { Badge, Button } from '@clinicaplus/ui';
import { formatDateTime } from '@clinicaplus/utils';
import { FileText, Upload, CheckCircle } from 'lucide-react';
import { tratamentosApi } from '../../api/tratamentos';
import { ExameDTO } from '@clinicaplus/types';

const statusColorMap: Record<string, string> = {
  PENDENTE: 'bg-neutral-100 text-neutral-700',
  AGENDADO: 'bg-blue-100 text-blue-700',
  REALIZADO: 'bg-emerald-100 text-emerald-800',
  LAUDADO: 'bg-green-600 text-white shadow-sm',
  CANCELADO: 'bg-red-50 text-red-600 line-through decoration-red-200',
};

const statusLabelMap: Record<string, string> = {
  PENDENTE: 'Pendente',
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  LAUDADO: 'Laudado',
  CANCELADO: 'Cancelado',
};

export const ExamesTab: React.FC<{ exames: ExameDTO[]; pacienteId: string }> = ({ exames, pacienteId }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeExameId, setActiveExameId] = React.useState<string | null>(null);
  const { mutate: confirmarLaudo, isPending: confirmando } = useConfirmarLaudo();

  const handleUploadClick = (exameId: string) => {
    setActiveExameId(exameId);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeExameId) return;

    try {
      // 1. Get Signed URL
      const { uploadUrl, path } = await tratamentosApi.getLaudoUploadUrl(activeExameId, file.name);

      // 2. Upload to Supabase Storage
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!response.ok) throw new Error('Falha no upload do arquivo');

      // 3. Confirm with API
      confirmarLaudo({ id: activeExameId, path, pacienteId });
    } catch {
      alert('Erro ao carregar o laudo. Tente novamente.');
    } finally {
      setActiveExameId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (exames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
        <FileText className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">Nenhum exame solicitado para este paciente.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        onChange={onFileChange}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      
      <div className="divide-y divide-neutral-100">
        {exames.map((exame) => (
          <div key={exame.id} className="flex items-center justify-between py-4 px-2 group hover:bg-neutral-50 transition-colors">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-800">
                {exame.nome || 'Exame s/ nome'}
              </span>
              <span className="text-xs text-neutral-500">
                Pedido em: {formatDateTime(exame.dataPedido)}
              </span>
              {exame.descricao && (
                <p className="text-xs text-neutral-400 mt-1 italic max-w-md line-clamp-1">
                  "{exame.descricao}"
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Badge className={statusColorMap[exame.estado] || ''}>
                {statusLabelMap[exame.estado] || exame.estado}
              </Badge>

              <div className="flex items-center w-[120px] justify-end">
                {exame.estado === 'REALIZADO' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                    onClick={() => handleUploadClick(exame.id)}
                    disabled={activeExameId === exame.id || confirmando}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Inserir Laudo
                  </Button>
                )}
                
                {exame.estado === 'LAUDADO' && exame.laudoUrl && (
                  <a 
                    href={exame.laudoUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:underline p-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Ver Laudo
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
