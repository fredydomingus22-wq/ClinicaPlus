interface DataPoint {
    label: string;
    value: number;
}
interface AreaChartProps {
    title: string;
    subtitle?: string;
    data: DataPoint[];
    height?: number;
    className?: string;
    isLoading?: boolean;
}
/**
 * High-fidelity SVG Area Chart component.
 * Uses cubic curves for smoothing and CSS transitions for flair.
 */
export declare function AreaChart({ title, subtitle, data, height, className, isLoading }: AreaChartProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AreaChart.d.ts.map