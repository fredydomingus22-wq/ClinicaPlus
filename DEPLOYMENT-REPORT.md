# DEPLOYMENT REPORT

**Date:** 2026-03-13
**Time:** 11:18 UTC (12:18 Africa/Luanda)
**Version (Git SHA):** b99e595c94ccced1750b1868c7c8e57f65ab2f25

## 🟢 Results of Health Check (Prod)

- **API Endpoints:**
    - Health: ✅ HTTP 200
    - Auth login (public): ✅ HTTP 401 (Correct, requires credentials)
    - Auth refresh (no cookie): ✅ HTTP 401 (Correct, requires session)
- **Protected Endpoints:**
    - Pacientes: ✅ HTTP 401 (Protected)
    - Agendamentos: ✅ HTTP 401 (Protected)
    - Dashboard: ✅ HTTP 401 (Protected)
- **Frontend:**
    - Web app: ✅ HTTP 200
    - Deep link (router): ✅ HTTP 200

## 🔗 Production URLs

- **API:** [https://clinicaplus-api.up.railway.app](https://clinicaplus-api.up.railway.app)
- **Web App:** [https://clinica-plus-web.vercel.app](https://clinica-plus-web.vercel.app)

## 🛡️ Security & CORS Verification

- **HSTS:** Enabled (`Strict-Transport-Security: max-age=31536000`)
- **CORS:** Correctly configured (ONLY allows `https://clinica-plus-web.vercel.app`)
- **Helmet Headers:** Active (X-Frame-Options, X-Content-Type-Options, etc.)
- **Rate Limiting:** Functional (verified via `Ratelimit-Remaining` headers)

## 🛠️ Problems Resolved

1. **Port Binding (0.0.0.0):** Fixed healthcheck failures by binding to all network interfaces.
2. **Docker Dependency Issues:** Fixed missing `express` and shared package modules at runtime.
3. **CORS Normalization:** Fixed origin mismatch errors by stripping trailing slashes.
4. **Database Pooling (PGBouncer):** Fixed 500 errors in Super Admin login and Scheduler by disabling prepared statement cache (`statement_cache_size=0`).
5. **Proxy Trust:** Configured `trust proxy` to support accurate rate limiting on Railway.

## 🚀 Next Steps

- Monitor error logs for any recurring PGBouncer collision patterns.
- Implement production-specific monitoring alerts (Railway Metrics).
- Finalize the remaining functional modules transition to production data.
