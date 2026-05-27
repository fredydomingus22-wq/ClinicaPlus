export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly metadata?: Record<string, unknown>;
    constructor(message: string, statusCode?: number, code?: string, metadata?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map