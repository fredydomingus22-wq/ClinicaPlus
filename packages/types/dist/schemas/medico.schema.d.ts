import { z } from 'zod';
export declare const HorarioDiaSchema: z.ZodObject<{
    ativo: z.ZodBoolean;
    inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    inicio?: string | undefined;
    fim?: string | undefined;
    pausaInicio?: string | undefined;
    pausaFim?: string | undefined;
}, {
    ativo: boolean;
    inicio?: string | undefined;
    fim?: string | undefined;
    pausaInicio?: string | undefined;
    pausaFim?: string | undefined;
}>;
export declare const MedicoHorarioSchema: z.ZodObject<{
    segunda: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    terca: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    quarta: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    quinta: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    sexta: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    sabado: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
    domingo: z.ZodObject<{
        ativo: z.ZodBoolean;
        inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }, {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    segunda: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    terca: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    quarta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    quinta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    sexta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    sabado: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    domingo: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
}, {
    segunda: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    terca: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    quarta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    quinta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    sexta: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    sabado: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
    domingo: {
        ativo: boolean;
        inicio?: string | undefined;
        fim?: string | undefined;
        pausaInicio?: string | undefined;
        pausaFim?: string | undefined;
    };
}>;
export declare const MedicoCreateSchema: z.ZodObject<{
    utilizadorId: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    nome: z.ZodString;
    especialidadeId: z.ZodString;
    ordem: z.ZodOptional<z.ZodString>;
    telefoneDireto: z.ZodOptional<z.ZodString>;
    horario: z.ZodObject<{
        segunda: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        terca: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quarta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quinta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sexta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sabado: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        domingo: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }>;
    duracaoConsulta: z.ZodDefault<z.ZodNumber>;
    preco: z.ZodNumber;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    especialidadeId: string;
    horario: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    };
    duracaoConsulta: number;
    preco: number;
    utilizadorId?: string | undefined;
    email?: string | undefined;
    ordem?: string | undefined;
    telefoneDireto?: string | undefined;
}, {
    nome: string;
    especialidadeId: string;
    horario: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    };
    preco: number;
    ativo?: boolean | undefined;
    utilizadorId?: string | undefined;
    email?: string | undefined;
    ordem?: string | undefined;
    telefoneDireto?: string | undefined;
    duracaoConsulta?: number | undefined;
}>;
export declare const MedicoUpdateSchema: z.ZodObject<{
    ativo: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    nome: z.ZodOptional<z.ZodString>;
    especialidadeId: z.ZodOptional<z.ZodString>;
    ordem: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    telefoneDireto: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    horario: z.ZodOptional<z.ZodObject<{
        segunda: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        terca: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quarta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quinta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sexta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sabado: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        domingo: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }>>;
    duracaoConsulta: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    preco: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    especialidadeId?: string | undefined;
    ordem?: string | undefined;
    telefoneDireto?: string | undefined;
    horario?: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    } | undefined;
    duracaoConsulta?: number | undefined;
    preco?: number | undefined;
}, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    especialidadeId?: string | undefined;
    ordem?: string | undefined;
    telefoneDireto?: string | undefined;
    horario?: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    } | undefined;
    duracaoConsulta?: number | undefined;
    preco?: number | undefined;
}>;
export declare const MedicoListQuerySchema: z.ZodObject<{
    especialidadeId: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    ativo: z.ZodEffects<z.ZodOptional<z.ZodBoolean>, boolean | undefined, unknown>;
    page: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, unknown>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, unknown>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    ativo?: boolean | undefined;
    especialidadeId?: string | undefined;
}, {
    ativo?: unknown;
    especialidadeId?: unknown;
    page?: unknown;
    limit?: unknown;
}>;
export declare const MedicoSlotQuerySchema: z.ZodObject<{
    data: z.ZodString;
}, "strip", z.ZodTypeAny, {
    data: string;
}, {
    data: string;
}>;
export type MedicoCreateInput = z.infer<typeof MedicoCreateSchema>;
export type MedicoUpdateInput = z.infer<typeof MedicoUpdateSchema>;
export type MedicoListQuery = z.infer<typeof MedicoListQuerySchema>;
export type MedicoSlotQuery = z.infer<typeof MedicoSlotQuerySchema>;
export type MedicoHorario = z.infer<typeof MedicoHorarioSchema>;
/**
 * Fields the médico can update on their own profile.
 * Price, specialty and status are admin-only.
 */
export declare const MedicoSelfUpdateSchema: z.ZodObject<{
    telefoneDireto: z.ZodOptional<z.ZodString>;
    horario: z.ZodOptional<z.ZodObject<{
        segunda: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        terca: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quarta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        quinta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sexta: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        sabado: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
        domingo: z.ZodObject<{
            ativo: z.ZodBoolean;
            inicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            fim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaInicio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
            pausaFim: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
        }, "strip", z.ZodTypeAny, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }, {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }, {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    }>>;
    duracaoConsulta: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    telefoneDireto?: string | undefined;
    horario?: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    } | undefined;
    duracaoConsulta?: number | undefined;
}, {
    telefoneDireto?: string | undefined;
    horario?: {
        segunda: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        terca: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quarta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        quinta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sexta: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        sabado: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
        domingo: {
            ativo: boolean;
            inicio?: string | undefined;
            fim?: string | undefined;
            pausaInicio?: string | undefined;
            pausaFim?: string | undefined;
        };
    } | undefined;
    duracaoConsulta?: number | undefined;
}>;
export type MedicoSelfUpdateInput = z.infer<typeof MedicoSelfUpdateSchema>;
//# sourceMappingURL=medico.schema.d.ts.map