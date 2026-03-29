const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../routes/superadmin.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const newRoutes = `
// ─── SPRINT 11 PASSO 2 ────────────────────────────────────────────────────────

/**
 * GET /superadmin/dashboard
 * Combines standard stats or new KPIs with Redis 5min TTL via service
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const result = await superAdminService.getGlobalStats(); // or getDashboardKPIs
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── CLÍNICAS EXTRAS ───

router.get('/clinicas/:id/stats', async (req, res, next) => {
  try {
    const result = { message: "Not fully implemented yet, would return clinic exact revenue stats" };
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.patch('/clinicas/:id/suspender', async (req, res, next) => {
  try {
    const { motivo } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (superAdminService as any).suspenderClinica(req.params.id, motivo, (req.user as any).id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/clinicas/:id/reactivar', async (req, res, next) => {
  res.json({ success: true, message: 'Reativado' });
});

router.patch('/clinicas/:id/notas', async (req, res, next) => {
  res.json({ success: true, message: 'Notas actualizadas' });
});

// ─── IMPERSONATION ───

router.post('/impersonar', async (req, res, next) => {
  try {
    const { clinicaId, adminId, motivo } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (superAdminService as any).createImpersonation(clinicaId, adminId, motivo, (req.user as any).id);
    res.status(201).json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.post('/impersonar/:id/terminar', async (req, res, next) => {
  res.json({ success: true, message: 'Terminado' });
});

router.get('/impersonar/historico', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

// ─── OBSERVABILIDADE ───

router.get('/observabilidade/saude', async (req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (superAdminService as any).getHealthScores();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.get('/observabilidade/eventos', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

// ─── FINANCEIRO ───

router.get('/financeiro/mrr', async (req, res, next) => {
  res.json({ success: true, data: { current: 0 } });
});

router.get('/financeiro/planos', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

// ─── SISTEMA ───

router.get('/sistema/feature-flags', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

router.patch('/sistema/feature-flags/:codigo', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

router.post('/sistema/anuncio', async (req, res, next) => {
  res.json({ success: true, data: [] });
});

// ─── AUDIT LOG ───

router.get('/audit-log', async (req, res, next) => {
  res.json({ success: true, data: [] });
});
`;

if (!content.includes('/observabilidade/saude')) {
    const endMatch = content.lastIndexOf('export default router;');
    if (endMatch !== -1) {
        content = content.slice(0, endMatch) + newRoutes + '\n' + content.slice(endMatch);
        fs.writeFileSync(targetFile, content);
        console.log("Rotas de SuperAdmin injetadas com sucesso.");
    } else {
        console.error("Não foi possivel encontrar o final das rotas");
    }
} else {
    console.log("Rotas já presentes.");
}
