export interface WhatsAppContact {
    phone: string;
    jid: string;
    name: string;
    type: 'paciente' | 'utilizador';
    id: string;
}
export declare class ContactNotFoundError extends Error {
    constructor(type: string, id: string);
}
export declare function formatGreeting(name: string, formal?: boolean): string;
//# sourceMappingURL=contactResolver.d.ts.map