import React from 'react';
interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}
export declare function Modal({ isOpen, title, onClose, children, footer, size }: ModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Modal.d.ts.map