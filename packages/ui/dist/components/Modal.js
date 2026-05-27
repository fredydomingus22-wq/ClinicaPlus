"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = Modal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("./Button");
const Dialog = __importStar(require("@radix-ui/react-dialog"));
const cn_1 = require("../utils/cn");
function Modal({ isOpen, title, onClose, children, footer, size = 'md' }) {
    const contentRef = (0, react_1.useRef)(null);
    const previousActiveElement = (0, react_1.useRef)(null);
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };
    // Focus trap implementation
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return undefined;
        // Save the previously focused element
        previousActiveElement.current = document.activeElement;
        // Focus the modal content
        setTimeout(() => {
            contentRef.current?.focus();
        }, 100);
        // Trap focus within modal
        const handleTab = (e) => {
            if (e.key !== 'Tab')
                return;
            const focusableElements = contentRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusableElements || focusableElements.length === 0)
                return;
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            }
            else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => {
            document.removeEventListener('keydown', handleTab);
            // Restore focus to previous element
            previousActiveElement.current?.focus();
        };
    }, [isOpen]);
    return ((0, jsx_runtime_1.jsx)(Dialog.Root, { open: isOpen, onOpenChange: (val) => !val && onClose(), children: (0, jsx_runtime_1.jsxs)(Dialog.Portal, { children: [(0, jsx_runtime_1.jsx)(Dialog.Overlay, { className: "fixed inset-0 z-50 bg-black/60 animate-fade-in" }), (0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none", children: (0, jsx_runtime_1.jsxs)(Dialog.Content, { ref: contentRef, tabIndex: -1, className: (0, cn_1.cn)("pointer-events-auto relative bg-white w-full overflow-hidden flex flex-col max-h-[95vh] animate-scale-in border border-[#e5e5e5]", sizeClasses[size]), "aria-describedby": undefined, children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-4 py-3 md:px-6 md:py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]", children: [(0, jsx_runtime_1.jsx)(Dialog.Title, { className: "text-sm font-bold text-[#1a1a1a] leading-tight uppercase tracking-wider font-mono", children: title }), (0, jsx_runtime_1.jsx)(Dialog.Close, { asChild: true, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f0f0f0]", "aria-label": "Fechar", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "px-4 py-4 md:px-6 md:py-5 overflow-y-auto", children: children }), footer && ((0, jsx_runtime_1.jsx)("div", { className: "px-4 py-3 md:px-6 md:py-4 border-t border-[#e5e5e5] bg-[#f9f9f9] flex justify-end gap-2", children: footer }))] }) })] }) }));
}
//# sourceMappingURL=Modal.js.map