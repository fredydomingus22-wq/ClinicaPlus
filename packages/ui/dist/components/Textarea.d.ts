import React from 'react';
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string | undefined;
    error?: string | undefined;
    required?: boolean;
}
export declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>;
export {};
//# sourceMappingURL=Textarea.d.ts.map