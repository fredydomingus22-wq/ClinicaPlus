import { LucideIcon } from 'lucide-react';
interface KpiCardProps {
    label?: string;
    title?: string;
    value: string | number;
    icon: LucideIcon;
    color?: 'blue' | 'amber' | 'green' | 'slate' | 'red' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
    loading?: boolean;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    badgeText?: string;
    className?: string;
}
/**
 * Premium KPI Card for Dashboards.
 * Follows ClinicaPlus visual system tokens.
 */
export declare function KpiCard({ label, title, value, icon: Icon, color, loading, trend, badgeText, className }: KpiCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=KpiCard.d.ts.map