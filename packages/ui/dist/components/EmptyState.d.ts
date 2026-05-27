import { LucideIcon } from 'lucide-react';
interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary' | 'ghost';
    };
    className?: string;
}
export declare function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EmptyState.d.ts.map