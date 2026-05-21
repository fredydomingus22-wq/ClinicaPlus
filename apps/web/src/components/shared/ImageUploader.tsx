import React, { useState, useRef } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';

export interface ImageUploaderProps {
  initialImage?: string | null | undefined;
  onUploadSuccess: (url: string) => void;
  getUploadUrlFn: (fileName: string) => Promise<{ uploadUrl: string; path: string; provider: 'supabase' | 'local' }>;
  confirmUploadFn: (path: string, provider: 'supabase' | 'local', base64Data?: string) => Promise<{ url: string }>;
  label?: string;
  className?: string;
  maxSizeMB?: number;
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  initialImage,
  onUploadSuccess,
  getUploadUrlFn,
  confirmUploadFn,
  label = 'Carregar Imagem',
  className = '',
  maxSizeMB = 2,
}) => {
  const [currentImage, setCurrentImage] = useState<string | null>(initialImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      addToast({ type: 'error', message: `A imagem excede o tamanho máximo de ${maxSizeMB}MB.` });
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'O ficheiro deve ser uma imagem válida (PNG, JPG, etc).' });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Mostrar preview imediato
      const previewUrl = URL.createObjectURL(file);
      setCurrentImage(previewUrl);

      // 2. Pedir coordenadas de upload ao Backend
      const { uploadUrl, path, provider } = await getUploadUrlFn(file.name);

      let publicUrl = '';

      // 3. Executar o Upload Estratégico
      if (provider === 'supabase') {
        // Upload binário directo para Supabase
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error('Falha no upload para o Supabase Storage');

        // Confirmar guardo
        const confirmResult = await confirmUploadFn(path, provider);
        publicUrl = confirmResult.url;
      } else {
        // Fallback local: Converter Base64 e enviar no Payload da Confirmação
        const base64Data = await readFileAsBase64(file);
        const confirmResult = await confirmUploadFn(path, provider, base64Data);
        publicUrl = confirmResult.url;
      }

      // Cleanup preview e assumir public URL
      URL.revokeObjectURL(previewUrl);
      setCurrentImage(publicUrl);
      onUploadSuccess(publicUrl);
      addToast({ type: 'success', message: 'Imagem actualizada com sucesso!' });
    } catch {
      addToast({ type: 'error', message: 'Não foi possível fazer o upload da imagem.' });
      setCurrentImage(initialImage || null); // Reverter
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div 
        className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-neutral-300 hover:border-teal-500 bg-neutral-50 flex items-center justify-center cursor-pointer transition-colors"
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center text-teal-600 z-10">
            <Loader2 className="w-6 h-6 animate-spin mb-1" />
            <span className="text-[10px] font-semibold tracking-wider">A GRAVAR</span>
          </div>
        ) : null}

        {currentImage ? (
          <img src={currentImage} className="w-full h-full object-cover" alt="Avatar/Logo Preview" />
        ) : (
          <ImageIcon className="w-10 h-10 text-neutral-300 group-hover:text-teal-400" />
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Upload className="w-6 h-6 text-white" />
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="text-center space-y-1">
         {label && <p className="text-sm font-medium text-neutral-700">{label}</p>}
         <p className="text-xs text-neutral-400">Suporta JPG, PNG. Máx {maxSizeMB}MB</p>
      </div>
    </div>
  );
};
