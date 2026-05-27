interface TabItem {
    id: string;
    label: string;
}
interface TabsProps {
    items: TabItem[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}
export declare function Tabs({ items, activeTab, onChange, className }: TabsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Tabs.d.ts.map