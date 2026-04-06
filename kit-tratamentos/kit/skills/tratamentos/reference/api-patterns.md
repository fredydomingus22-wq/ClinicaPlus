# Referência: Padrões de API — Tratamentos e Exames

## Endpoints completos (v1)

### Catálogos Mestre (Novos)
| Método | Path | Auth | Resposta |
|--------|------|------|---------|
| `GET`  | `/api/clinica/config/tipos-exames` | requireAuth | `200 TipoExameClinica[]` |
| `POST` | `/api/clinica/config/tipos-exames` | requireAuth | `201 TipoExameClinica` |
| `GET`  | `/api/clinica/config/tipos-tratamento` | requireAuth | `200 TipoTratamento[]` |
| `POST` | `/api/clinica/config/tipos-tratamento` | requireAuth | `201 TipoTratamento` |

### Exames
| Método | Path | Auth | Body / Query | Resposta |
|--------|------|------|-------------|---------|
| `POST` | `/api/clinica/exames` | requireAuth | `CriarExameDto` | `201 ExameResponse` |
| `GET` | `/api/clinica/exames` | requireAuth | `?pacienteId=&estado=&page=&limit=` | `200 { data: ExameResponse[], total: number }` |
| `PATCH` | `/api/clinica/exames/:id` | requireAuth | `AtualizarExameDto` | `200 ExameResponse` |
| `POST` | `/api/clinica/exames/:id/laudo-upload-url` | requireAuth | `{ mimeType: string }` | `200 { signedUrl, token, path }` |
| `POST` | `/api/clinica/exames/:id/laudo-confirmar` | requireAuth | `{ path: string }` | `200 ExameResponse` |


### Structure de route file Integrada (padrão do projecto)

*Não sobrescrever Endpoints se eles existirem (Ex: Exames).* Integrar os Endpoints PATCH em ficheiros existentes (Ex: `exames.routes.ts`) convertendo o router pré-existente para comportar a nova validação lógica:

```typescript
// apps/api/src/routes/exames.ts
import { Router } from 'express'
import { examesService } from '../services/exames.service'
import { AtualizarExameSchema } from '@clinicaplus/types'
// ...

router.patch(
  '/:id',
  validateBody(AtualizarExameSchema),
  async (req, res) => {
    // Agora o DB usa o Model Exame validamente validando a transição de estado na service.
    const exame = await examesService.atualizarExame(req.clinica!.id, req.params.id, req.body)
    res.json(exame)
  }
)
```

## Responses de erro standard

```json
// 400 — Transição de estado inválida
{
  "error": "Não é possível passar de \"LAUDADO\" para \"PENDENTE\"",
  "code": "INVALID_STATE_TRANSITION"
}
```
