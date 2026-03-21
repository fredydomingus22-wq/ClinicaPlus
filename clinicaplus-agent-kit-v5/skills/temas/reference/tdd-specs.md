# Reference — TDD Specs: Módulo Temas e White-label

## logoService.ts

```typescript
describe('logoService.upload', () => {
  it('deve fazer upload para Supabase Storage e retornar URL CDN', async () => {
    // Assert: supabase.storage.from('logos').upload chamado
    // Assert: URL retornada contém domínio do Supabase
  });

  it('deve incluir cache-bust na URL retornada', async () => {
    // Assert: URL tem parâmetro ?t= com timestamp
  });

  it('deve usar upsert:true (substituir logo anterior)', async () => {
    // Assert: upload chamado com { upsert: true }
  });

  it('deve rejeitar PNG com mais de 2MB (400 LOGO_TOO_LARGE)', async () => {
    // Arrange: file.size = 3 * 1024 * 1024
    // Assert: lança AppError LOGO_TOO_LARGE (400)
  });

  it('deve rejeitar PDF (400 LOGO_INVALID_TYPE)', async () => {
    // Arrange: file.mimetype = 'application/pdf'
    // Assert: lança AppError LOGO_INVALID_TYPE (400)
  });

  it('deve aceitar PNG, JPG, SVG e WebP', async () => {
    // Para cada tipo: verificar que upload prossegue sem erro
  });

  it('deve guardar URL na ConfiguracaoClinica via upsert', async () => {
    // Assert: prisma.configuracaoClinica.upsert chamado com logoUrl
  });
});

describe('logoService.remover', () => {
  it('deve remover todos os ficheiros do bucket para a clínica', async () => {
    // Assert: supabase.storage.from('logos').remove chamado
  });

  it('deve limpar logoUrl na DB para null', async () => {
    // Assert: prisma.configuracaoClinica.update com logoUrl: null
  });
});
```

---

## Endpoint GET /api/public/tema

```typescript
describe('GET /api/public/tema', () => {
  it('deve retornar cores do tema correcto para subdomínio conhecido', async () => {
    // Arrange: clínica com slug "nutrimacho" e temaId "verde-saude"
    // Act: GET /api/public/tema?domain=nutrimacho.clinicaplus.ao
    // Assert: res.data.cores.primary = '#059669'
  });

  it('deve retornar cores default para domínio desconhecido', async () => {
    // Act: GET /api/public/tema?domain=desconhecido.clinicaplus.ao
    // Assert: res.data = null
  });

  it('deve resolver por dominioCustom', async () => {
    // Arrange: clínica com dominioCustom = "sistema.nutrimacho.ao"
    // Act: GET /api/public/tema?domain=sistema.nutrimacho.ao
    // Assert: res.data.clinicaSlug = "nutrimacho"
  });

  it('deve retornar cores custom se temaId="custom" e temaCustomCores preenchido', async () => {
    // Arrange: temaId="custom", temaCustomCores={ primary: "#ff0000", ... }
    // Assert: res.data.cores.primary = "#ff0000"
  });

  it('deve responder sem autenticação (endpoint público)', async () => {
    // Assert: sem header Authorization → status 200 (não 401)
  });

  it('deve incluir logoUrl, nomeApp e faviconUrl na resposta', async () => {
    // Assert: todos os campos presentes no data
  });
});
```

---

## PATCH /api/clinicas/me/tema

```typescript
describe('PATCH /api/clinicas/me/tema', () => {
  it('deve actualizar temaId para template válido (PRO)', async () => {
    // Assert: status 200, temaId actualizado na DB
  });

  it('deve rejeitar temaId inexistente', async () => {
    // Arrange: temaId = "tema-inventado"
    // Assert: status 400
  });

  it('deve rejeitar temaId="custom" para clínica não-ENTERPRISE', async () => {
    // Arrange: plano PRO
    // Assert: status 402
  });

  it('deve aceitar temaCustomCores para ENTERPRISE', async () => {
    // Arrange: plano ENTERPRISE
    // Assert: temaCustomCores guardado na DB
  });

  it('deve rejeitar PATCH de tema para plano BASICO', async () => {
    // Assert: status 402 PLAN_UPGRADE_REQUIRED
  });
});
```

---

## PATCH /api/clinicas/me/dominio

```typescript
describe('PATCH /api/clinicas/me/dominio', () => {
  it('deve guardar subdomínio válido para PRO', async () => {
    // Assert: status 200
  });

  it('deve rejeitar subdomínio com caracteres inválidos', async () => {
    // Arrange: subdominio = "Nutrimacho!"
    // Assert: status 400
  });

  it('deve rejeitar subdomínio já em uso por outra clínica', async () => {
    // Assert: status 409
  });

  it('deve rejeitar dominioCustom para plano PRO', async () => {
    // Assert: status 402
  });

  it('deve aceitar dominioCustom para ENTERPRISE', async () => {
    // Assert: status 200
  });
});
```

---

## TemaProvider.tsx (component test)

```typescript
describe('TemaProvider', () => {
  it('deve chamar /api/public/tema com o hostname actual no boot', async () => {
    // Arrange: window.location.hostname = "nutrimacho.clinicaplus.ao"
    // Assert: fetch chamado com domain=nutrimacho.clinicaplus.ao
  });

  it('deve injectar CSS custom properties no :root após carregar', async () => {
    // Assert: document.documentElement.style.getPropertyValue('--color-brand-primary') ≠ ""
  });

  it('deve usar tema default se endpoint falha', async () => {
    // Arrange: fetch rejeita
    // Assert: nenhum erro lançado, tema default mantido
  });
});
```

---

## LogoClinica.tsx (component test)

```typescript
describe('LogoClinica', () => {
  it('deve renderizar img com src da logoUrl quando existe', async () => {
    // Assert: <img src="https://...logo.png">
  });

  it('deve renderizar nome da clínica como fallback quando logoUrl é null', async () => {
    // Assert: texto com nomeApp visível
  });

  it('deve esconder img e mostrar fallback quando img falha a carregar', async () => {
    // Act: disparar evento onerror no img
    // Assert: img com display:none OU fallback visível
  });
});
```
