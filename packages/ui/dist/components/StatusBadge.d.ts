import { EstadoAgendamento } from '@clinicaplus/types';
export declare const ESTADO_CONFIG: Record<EstadoAgendamento, {
    label: string;
    styles: string;
    dot: string;
}>;
interface StatusBadgeProps {
    estado: EstadoAgendamento;
    className?: string;
}
export declare function StatusBadge({ estado, className }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=StatusBadge.d.ts.map