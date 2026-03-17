const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
const { Pool }   = require("pg");

// ══════════════════════════════════════════════════════════
//  🐘 CONNEXION POSTGRESQL
// ══════════════════════════════════════════════════════════
const db = new Pool({
  host:     process.env.PG_HOST     || "localhost",
  port:     process.env.PG_PORT     || 5432,
  database: process.env.PG_DB       || "autohall_monitor",
  user:     process.env.PG_USER     || "postgres",
  password: process.env.PG_PASSWORD || "admin",
});

db.connect()
  .then(() => console.log("🐘 PostgreSQL connecté !"))
  .catch(e => console.error("🐘 PostgreSQL erreur :", e.message));

// Helper : query avec fallback données statiques si DB non dispo
async function query(sql, params = []) {
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (e) {
    console.error("DB Query Error:", e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════
//  📧 CONFIGURATION EMAIL — Remplir avant utilisation
// ══════════════════════════════════════════════════════════
const EMAIL_CONFIG = {
  expediteur:   "wld.latifa@gmail.com",       // ← Ton adresse Gmail
  appPassword:  "wldlatifa1234",          // ← App Password Gmail (16 caractères)
  destinataires: {
    "Ressources Humaines": "rh@autohall.ma",        // ← Email responsable RH
    "Stock":               "stock@autohall.ma",     // ← Email responsable Stock
    "Ventes":              "ventes@autohall.ma",    // ← Email responsable Ventes
    "Après-Vente":         "sav@autohall.ma",       // ← Email responsable SAV
    "Finance":             "finance@autohall.ma",   // ← Email responsable Finance
    "IT & Système":        "it@autohall.ma",        // ← Email responsable IT
  },
  // Email de secours si département inconnu
  adminEmail: "admin@autohall.ma",                  // ← Email administrateur
};

// ── Transporteur Gmail ─────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_CONFIG.expediteur,
    pass: EMAIL_CONFIG.appPassword,
  },
});

// ── Cooldown anti-spam : 1 email max toutes les 10min par service ──
const emailCooldown = {};
const COOLDOWN_MS   = 10 * 60 * 1000; // 10 minutes

// ── Envoi d'alerte email ──────────────────────────────
async function sendAlertEmail(appName, category, status, cause, solution, responseTime) {
  const cooldownKey = `${appName}-${status}`;
  const now         = Date.now();

  // Vérifier cooldown
  if (emailCooldown[cooldownKey] && (now - emailCooldown[cooldownKey]) < COOLDOWN_MS) {
    console.log(`📧 [COOLDOWN] Email pour ${appName} ignoré (délai 10min)`);
    return;
  }
  emailCooldown[cooldownKey] = now;

  const dest   = EMAIL_CONFIG.destinataires[category] || EMAIL_CONFIG.adminEmail;
  const isDown = status === "down" || status === "error";
  const emoji  = isDown ? "🔴" : "🟡";
  const statut = isDown ? "HORS SERVICE" : "LENTE";
  const color  = isDown ? "#DC2626" : "#D97706";
  const bgColor= isDown ? "#FEF2F2" : "#FFFBEB";
  const heure  = new Date().toLocaleString("fr-FR");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#001F5C,#0055CC);padding:28px 32px;text-align:center;">
    <div style="font-size:2rem;margin-bottom:6px;">🔍</div>
    <div style="color:white;font-size:1.3rem;font-weight:800;letter-spacing:-0.5px;">Auto Hall</div>
    <div style="color:rgba(255,255,255,0.65);font-size:0.8rem;margin-top:4px;">Moniteur d'Applications</div>
  </div>

  <!-- Alerte -->
  <div style="background:${bgColor};border-left:5px solid ${color};margin:24px;border-radius:10px;padding:20px 22px;">
    <div style="font-size:1.4rem;font-weight:900;color:${color};margin-bottom:6px;">
      ${emoji} ${appName} — ${statut}
    </div>
    <div style="font-size:0.82rem;color:#6B7280;">
      Détecté le <strong>${heure}</strong>
      ${responseTime > 0 ? ` · Temps de réponse : <strong>${responseTime}ms</strong>` : ""}
    </div>
  </div>

  <!-- Détails -->
  <div style="padding:0 24px 24px;">

    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
      <tr style="background:#F8FAFF;">
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;width:35%;border-bottom:1px solid #E5E7EB;">APPLICATION</td>
        <td style="padding:10px 14px;font-size:0.85rem;color:#111827;font-weight:700;border-bottom:1px solid #E5E7EB;">${appName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;">DÉPARTEMENT</td>
        <td style="padding:10px 14px;font-size:0.85rem;color:#111827;border-bottom:1px solid #E5E7EB;">${category}</td>
      </tr>
      <tr style="background:#F8FAFF;">
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;">STATUT</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;">
          <span style="background:${color};color:white;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;">${statut}</span>
        </td>
      </tr>
      ${cause ? `
      <tr>
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;">CAUSE</td>
        <td style="padding:10px 14px;font-size:0.82rem;color:#374151;border-bottom:1px solid #E5E7EB;">${cause}</td>
      </tr>` : ""}
      ${solution ? `
      <tr style="background:#F0FDF4;">
        <td style="padding:10px 14px;font-size:0.78rem;color:#166534;font-weight:700;">SOLUTION</td>
        <td style="padding:10px 14px;font-size:0.82rem;color:#166534;">${solution}</td>
      </tr>` : ""}
    </table>

    <!-- Lien dashboard -->
    <div style="text-align:center;margin-top:20px;">
      <a href="http://localhost:3021"
        style="background:#0055CC;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.85rem;display:inline-block;">
        🔍 Voir le Dashboard de Monitoring
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#F8FAFF;padding:16px 24px;text-align:center;font-size:0.72rem;color:#9CA3AF;border-top:1px solid #E5E7EB;">
    Auto Hall Maroc · Système de monitoring automatique · ${heure}
  </div>
</div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from:    `"🔍 Auto Hall Monitoring" <${EMAIL_CONFIG.expediteur}>`,
      to:      dest,
      subject: `${emoji} ALERTE — ${appName} est ${statut} | Auto Hall`,
      html,
    });
    console.log(`📧 [EMAIL] Alerte envoyée à ${dest} pour ${appName} (${statut})`);
  } catch (err) {
    console.error(`📧 [EMAIL ERREUR] ${err.message}`);
  }
}

// ── Email de rétablissement ───────────────────────────
async function sendRecoveryEmail(appName, category, responseTime) {
  const dest  = EMAIL_CONFIG.destinataires[category] || EMAIL_CONFIG.adminEmail;
  const heure = new Date().toLocaleString("fr-FR");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#001F5C,#0055CC);padding:28px 32px;text-align:center;">
    <div style="color:white;font-size:1.3rem;font-weight:800;">🔍 Auto Hall · Monitoring</div>
  </div>
  <div style="background:#F0FDF4;border-left:5px solid #22C55E;margin:24px;border-radius:10px;padding:20px 22px;">
    <div style="font-size:1.3rem;font-weight:900;color:#166534;margin-bottom:6px;">
      ✅ ${appName} — RÉTABLI
    </div>
    <div style="font-size:0.82rem;color:#6B7280;">
      Service rétabli le <strong>${heure}</strong>
      ${responseTime > 0 ? ` · Temps de réponse : <strong>${responseTime}ms</strong>` : ""}
    </div>
  </div>
  <div style="padding:0 24px 24px;text-align:center;">
    <a href="http://localhost:3021" style="background:#0055CC;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.85rem;display:inline-block;">
      🔍 Voir le Dashboard
    </a>
  </div>
  <div style="background:#F8FAFF;padding:16px;text-align:center;font-size:0.72rem;color:#9CA3AF;border-top:1px solid #E5E7EB;">
    Auto Hall Maroc · Monitoring automatique
  </div>
</div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from:    `"🔍 Auto Hall Monitoring" <${EMAIL_CONFIG.expediteur}>`,
      to:      dest,
      subject: `✅ RÉTABLI — ${appName} fonctionne à nouveau | Auto Hall`,
      html,
    });
    console.log(`📧 [EMAIL] Rétablissement envoyé à ${dest} pour ${appName}`);
  } catch (err) {
    console.error(`📧 [EMAIL ERREUR] ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════
//  ÉTAT DES SERVICES
// ══════════════════════════════════════════════════════════
const serviceState = {
  rh:          { status: "online", failCount: 0, slowCount: 0 },
  conges:      { status: "online", failCount: 0, slowCount: 0 },
  paie:        { status: "online", failCount: 0, slowCount: 0 },
  neufs:       { status: "online", failCount: 0, slowCount: 0 },
  pieces:      { status: "online", failCount: 0, slowCount: 0 },
  occasion:    { status: "online", failCount: 0, slowCount: 0 },
  crm:         { status: "online", failCount: 0, slowCount: 0 },
  commandes:   { status: "online", failCount: 0, slowCount: 0 },
  devis:       { status: "online", failCount: 0, slowCount: 0 },
  sav:         { status: "online", failCount: 0, slowCount: 0 },
  atelier:     { status: "online", failCount: 0, slowCount: 0 },
  reparations: { status: "online", failCount: 0, slowCount: 0 },
};

setInterval(() => {
  const services = Object.keys(serviceState);
  const nbProblems = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < nbProblems; i++) {
    const svc = services[Math.floor(Math.random() * services.length)];
    const rand = Math.random();

    // Mapping service → catégorie pour l'email
    const categoryMap = {
      rh: "Ressources Humaines", conges: "Ressources Humaines", paie: "Ressources Humaines",
      neufs: "Stock", pieces: "Stock", occasion: "Stock",
      crm: "Ventes", commandes: "Ventes", devis: "Ventes",
      sav: "Après-Vente", atelier: "Après-Vente", reparations: "Après-Vente",
    };
    const appNameMap = {
      rh: "Portail RH", conges: "Gestion des Congés", paie: "Gestion de la Paie",
      neufs: "Stock Véhicules Neufs", pieces: "Stock Pièces de Rechange", occasion: "Stock Véhicules Occasion",
      crm: "CRM Clients", commandes: "Gestion des Commandes", devis: "Devis & Offres",
      sav: "Gestion SAV", atelier: "Rendez-Vous Atelier", reparations: "Suivi Réparations",
    };

    const prevStatus = serviceState[svc].status;

    if (rand < 0.33) {
      serviceState[svc].status = "down"; serviceState[svc].failCount++;
      console.log(`🔴 [PANNE]   ${svc} HORS SERVICE`);
      // 📧 Envoyer email alerte
      sendAlertEmail(appNameMap[svc], categoryMap[svc], "down",
        "Service inaccessible — timeout ou connexion refusée", "Redémarrer le service et vérifier les logs", 0);
      setTimeout(() => {
        serviceState[svc].status = "online";
        console.log(`✅ [RÉTABLI] ${svc}`);
        // 📧 Email rétablissement
        sendRecoveryEmail(appNameMap[svc], categoryMap[svc], 120);
      }, 20000);

    } else if (rand < 0.66) {
      serviceState[svc].status = "slow"; serviceState[svc].slowCount++;
      console.log(`🟡 [LENTE]   ${svc} répond lentement`);
      // 📧 Envoyer email lenteur
      sendAlertEmail(appNameMap[svc], categoryMap[svc], "slow",
        "Temps de réponse élevé — surcharge du serveur", "Vérifier la charge CPU et les connexions DB",
        Math.floor(Math.random() * 1200) + 800);
      setTimeout(() => {
        serviceState[svc].status = "online";
        console.log(`✅ [RÉTABLI] ${svc}`);
        sendRecoveryEmail(appNameMap[svc], categoryMap[svc], 95);
      }, 15000);

    } else {
      serviceState[svc].status = "error"; serviceState[svc].failCount++;
      console.log(`⚠️  [ERREUR]  ${svc} - ERREUR 503`);
      // 📧 Envoyer email erreur
      sendAlertEmail(appNameMap[svc], categoryMap[svc], "error",
        "Erreur HTTP 503 — Service temporairement indisponible", "Vérifier les logs du serveur et redémarrer", 0);
      setTimeout(() => {
        serviceState[svc].status = "online";
        console.log(`✅ [RÉTABLI] ${svc}`);
        sendRecoveryEmail(appNameMap[svc], categoryMap[svc], 150);
      }, 25000);
    }
  }
}, 45000);

function simulate(serviceKey) {
  return async (req, res, next) => {
    const state = serviceState[serviceKey];
    if (state.status === "down") return;
    if (state.status === "error") return res.status(503).json({ error: "Service unavailable" });
    if (state.status === "slow") {
      const delay = Math.floor(Math.random() * 1200) + 800;
      await new Promise(r => setTimeout(r, delay));
    }
    next();
  };
}

// ══════════════════════════════════════════════════════════
//  CSS GLOBAL — Design professionnel Autohall
// ══════════════════════════════════════════════════════════
const baseCSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --blue:      #0055CC;
  --blue-dk:   #003A99;
  --blue-lt:   #E8F0FF;
  --green:     #059669;
  --green-lt:  #D1FAE5;
  --orange:    #D97706;
  --orange-lt: #FEF3C7;
  --red:       #DC2626;
  --red-lt:    #FEE2E2;
  --grey:      #6B7280;
  --grey-lt:   #F9FAFB;
  --border:    #E5E7EB;
  --dark:      #111827;
  --sidebar-w: 230px;
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #F3F6FB;
  color: var(--dark);
  display: flex;
  min-height: 100vh;
  font-size: 14px;
}

/* ── Sidebar ──────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  min-height: 100vh;
  background: var(--blue-dk);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0;
  z-index: 50;
  box-shadow: 4px 0 20px rgba(0,58,153,0.25);
}

.sidebar-logo {
  padding: 22px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 11px;
}

.sidebar-logo .logo-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.sidebar-logo .logo-text h2 {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.sidebar-logo .logo-text p {
  font-size: 0.65rem;
  opacity: 0.55;
  margin-top: 1px;
}

.sidebar-section {
  padding: 10px 0 4px;
}

.sidebar-section-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  padding: 0 18px;
  margin-bottom: 4px;
}

.sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 18px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.15s;
  border-left: 3px solid transparent;
  margin: 1px 0;
}

.sidebar nav a:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.sidebar nav a.active {
  background: rgba(255,255,255,0.13);
  color: #fff;
  border-left-color: #60A5FA;
  font-weight: 600;
}

.sidebar nav a .nav-icon { font-size: 1rem; width: 18px; text-align: center; }

.sidebar-footer {
  margin-top: auto;
  padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.78rem;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.2);
}

.sidebar-footer .user-info p    { font-size: 0.78rem; font-weight: 600; }
.sidebar-footer .user-info span { font-size: 0.65rem; opacity: 0.5; }

/* ── Main ─────────────────────────────────────────────── */
.main {
  margin-left: var(--sidebar-w);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Topbar ───────────────────────────────────────────── */
.topbar {
  background: #fff;
  padding: 0 28px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 40;
}

.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-left h1 { font-size: 1rem; font-weight: 700; color: var(--dark); }
.breadcrumb { font-size: 0.72rem; color: var(--grey); background: var(--grey-lt); padding: 3px 10px; border-radius: 99px; border: 1px solid var(--border); }

.topbar-right { display: flex; align-items: center; gap: 10px; }

.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 99px;
  font-size: 0.72rem; font-weight: 700;
}
.status-pill .dot { width: 7px; height: 7px; border-radius: 50%; }
.status-pill.online  { background: var(--green-lt);  color: var(--green);  }
.status-pill.online .dot  { background: var(--green);  box-shadow: 0 0 0 2px #A7F3D0; }
.status-pill.slow    { background: var(--orange-lt); color: var(--orange); }
.status-pill.slow .dot    { background: var(--orange); }
.status-pill.offline { background: var(--red-lt);    color: var(--red);    }
.status-pill.offline .dot { background: var(--red); }

.topbar-date { font-size: 0.72rem; color: var(--grey); font-family: 'JetBrains Mono', monospace; }

/* ── Content ──────────────────────────────────────────── */
.content { padding: 24px 28px; flex: 1; }

/* ── Alert Banner ─────────────────────────────────────── */
.alert-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 22px;
  border: 1px solid;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: none; } }
.alert-banner.success { background: var(--green-lt);  color: #065F46; border-color: #6EE7B7; }
.alert-banner.warning { background: var(--orange-lt); color: #92400E; border-color: #FCD34D; }
.alert-banner.error   { background: var(--red-lt);    color: #991B1B; border-color: #FCA5A5; }
.alert-icon { font-size: 1.1rem; }

/* ── Stats Grid ───────────────────────────────────────── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 14px 14px 0 0;
}
.stat-card.blue::before   { background: var(--blue); }
.stat-card.green::before  { background: var(--green); }
.stat-card.orange::before { background: var(--orange); }
.stat-card.red::before    { background: var(--red); }

.stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.stat-icon-wrap {
  width: 42px; height: 42px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
}
.stat-card.blue   .stat-icon-wrap { background: var(--blue-lt); }
.stat-card.green  .stat-icon-wrap { background: var(--green-lt); }
.stat-card.orange .stat-icon-wrap { background: var(--orange-lt); }
.stat-card.red    .stat-icon-wrap { background: var(--red-lt); }

.stat-trend {
  font-size: 0.65rem; font-weight: 700;
  padding: 2px 7px; border-radius: 99px;
}
.trend-up   { background: var(--green-lt); color: var(--green); }
.trend-down { background: var(--red-lt);   color: var(--red); }
.trend-flat { background: var(--grey-lt);  color: var(--grey); }

.stat-value { font-size: 1.9rem; font-weight: 800; color: var(--dark); line-height: 1; margin-bottom: 4px; letter-spacing: -1px; }
.stat-label { font-size: 0.75rem; color: var(--grey); font-weight: 500; }
.stat-sub   { font-size: 0.68rem; color: #9CA3AF; margin-top: 2px; }

/* ── Chart Card ───────────────────────────────────────── */
.chart-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  border: 1px solid var(--border);
  margin-bottom: 20px;
}

.chart-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.chart-header h3 { font-size: 0.9rem; font-weight: 700; color: var(--dark); }
.chart-legend { display: flex; gap: 12px; }
.chart-legend span { font-size: 0.68rem; color: var(--grey); display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 110px;
  padding-bottom: 2px;
}
.bar-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.bar-val { font-size: 0.65rem; font-weight: 700; color: var(--blue); font-family: 'JetBrains Mono', monospace; }
.bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #3B82F6, #1D4ED8);
  transition: height 0.6s cubic-bezier(.34,1.56,.64,1);
  min-height: 4px;
}
.bar:hover { background: linear-gradient(180deg, #60A5FA, #2563EB); }
.bar-label { font-size: 0.65rem; color: var(--grey); font-weight: 500; }

/* ── Table Card ───────────────────────────────────────── */
.table-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: 20px;
}

.table-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--grey-lt);
}

.table-header-left { display: flex; align-items: center; gap: 10px; }
.table-header h3 { font-size: 0.88rem; font-weight: 700; color: var(--dark); }
.record-count {
  background: var(--blue-lt); color: var(--blue);
  font-size: 0.68rem; font-weight: 700;
  padding: 2px 8px; border-radius: 99px;
}

.table-actions { display: flex; gap: 8px; align-items: center; }

.search-bar {
  padding: 7px 12px 7px 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  width: 200px;
  outline: none;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center;
  transition: border-color 0.15s;
}
.search-bar:focus { border-color: var(--blue); }

table { width: 100%; border-collapse: collapse; }

thead { background: var(--grey-lt); }
th {
  padding: 10px 16px;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--grey);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

td {
  padding: 12px 16px;
  font-size: 0.83rem;
  color: var(--dark);
  border-bottom: 1px solid #F9FAFB;
  vertical-align: middle;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: #FAFBFF; }

.cell-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--blue);
  font-weight: 500;
}
.cell-primary { font-weight: 600; color: var(--dark); }
.cell-secondary { font-size: 0.78rem; color: var(--grey); }
.cell-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; }
.cell-price { font-weight: 700; color: var(--green); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }
.cell-bold { font-weight: 700; }

/* ── Badges ───────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 99px;
  font-size: 0.68rem; font-weight: 700;
}
.badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
.badge.actif   { background: var(--green-lt);  color: var(--green);  }
.badge.actif::before { background: var(--green); }
.badge.encours { background: var(--orange-lt); color: var(--orange); }
.badge.encours::before { background: var(--orange); }
.badge.inactif { background: var(--red-lt);    color: var(--red);    }
.badge.inactif::before { background: var(--red); }

/* ── Buttons ──────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px;
  border: none; border-radius: 8px;
  font-size: 0.78rem; font-weight: 600;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn:hover { opacity: 0.88; transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary { background: var(--blue);   color: #fff; }
.btn-success { background: var(--green);  color: #fff; }
.btn-warning { background: var(--orange); color: #fff; }
.btn-danger  { background: var(--red);    color: #fff; }
.btn-ghost   { background: var(--grey-lt); color: var(--grey); border: 1px solid var(--border); }
.btn-sm { padding: 5px 10px; font-size: 0.72rem; border-radius: 6px; }

.action-btns { display: flex; gap: 5px; }

/* ── Modal ────────────────────────────────────────────── */
.modal-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(3px);
  z-index: 200;
  align-items: center; justify-content: center;
}
.modal-overlay.open { display: flex; }

.modal {
  background: #fff;
  border-radius: 16px;
  padding: 28px 32px;
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: modalIn 0.2s ease;
}
@keyframes modalIn { from { opacity:0; transform: scale(0.96) translateY(8px); } to { opacity:1; transform: none; } }

.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.modal-header h2 { font-size: 1.05rem; font-weight: 700; color: var(--dark); }
.modal-close { background: var(--grey-lt); border: none; border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 1rem; color: var(--grey); display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: var(--border); }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 0.75rem; color: var(--grey); margin-bottom: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.form-group input,
.form-group select {
  width: 100%; padding: 9px 12px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 0.85rem; font-family: 'Plus Jakarta Sans', sans-serif;
  outline: none; transition: border-color 0.15s;
  background: #fff;
}
.form-group input:focus,
.form-group select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,85,204,0.08); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--border); }

/* ── Login Page ───────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001F5C 0%, var(--blue-dk) 50%, #0066FF 100%);
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.login-box {
  background: #fff;
  border-radius: 20px;
  padding: 40px 44px;
  width: 400px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
  animation: modalIn 0.3s ease;
}

.login-logo { text-align: center; margin-bottom: 30px; }
.login-logo .logo-emoji {
  width: 64px; height: 64px; border-radius: 16px;
  background: var(--blue-lt);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  margin: 0 auto 14px;
}
.login-logo h1 { font-size: 1.3rem; font-weight: 800; color: var(--dark); margin-bottom: 4px; }
.login-logo p  { font-size: 0.8rem; color: var(--grey); }

.login-divider { text-align: center; font-size: 0.72rem; color: var(--grey); margin: 16px 0; }

.login-btn { width: 100%; padding: 12px; font-size: 0.9rem; margin-top: 4px; border-radius: 10px; }
.login-footer { text-align: center; margin-top: 22px; font-size: 0.72rem; color: var(--grey); }
`;

// ── Helpers ──────────────────────────────────────────────
const now = () => new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

function getStatusPill(serviceKey) {
  const s = serviceState[serviceKey].status;
  if (s === "down")  return `<div class="status-pill offline"><div class="dot"></div>Hors Service</div>`;
  if (s === "slow")  return `<div class="status-pill slow"><div class="dot"></div>Lente</div>`;
  if (s === "error") return `<div class="status-pill offline"><div class="dot"></div>Erreur</div>`;
  return `<div class="status-pill online"><div class="dot"></div>En ligne</div>`;
}

function getAlertBanner(serviceKey) {
  const s = serviceState[serviceKey];
  if (s.status === "down")  return `<div class="alert-banner error"><span class="alert-icon">🔴</span> Service <strong>HORS SERVICE</strong> — Équipe technique notifiée. Pannes totales: ${s.failCount}</div>`;
  if (s.status === "slow")  return `<div class="alert-banner warning"><span class="alert-icon">🟡</span> Service <strong>LENT</strong> — Temps de réponse élevé. Vérification en cours...</div>`;
  if (s.status === "error") return `<div class="alert-banner error"><span class="alert-icon">⚠️</span> <strong>ERREUR DE CONNEXION</strong> — Tentative de reconnexion automatique...</div>`;
  return `<div class="alert-banner success"><span class="alert-icon">✅</span> Tous les systèmes fonctionnent <strong>normalement</strong> — Dernière vérification: ${new Date().toLocaleTimeString("fr-FR")}</div>`;
}

function loginPage(icon, appName, port, path, subtitle) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Connexion — ${appName}</title>
<style>${baseCSS}</style></head><body style="display:block">
<div class="login-page">
  <div class="login-box">
    <div class="login-logo">
      <div style="display:flex;justify-content:center;margin-bottom:16px;">
        <img src="http://localhost:3021/autohall-logo.png" alt="Auto Hall"
          style="height:70px;"/>
      </div>
      <h1>${appName}</h1>
      <p>${subtitle || "Autohall Maroc — Accès sécurisé"}</p>
    </div>
    <div class="form-group"><label>Identifiant</label><input type="text" value="m.taha.islah" style="font-family:monospace"/></div>
    <div class="form-group"><label>Mot de passe</label><input type="password" value="••••••••"/></div>
    <button class="btn btn-primary login-btn" onclick="window.location.href='http://localhost:${port}${path}'">Se connecter →</button>
    <div class="login-footer">© 2025 Autohall Maroc · Groupe Droit d'auteur</div>
  </div>
</div></body></html>`;
}

function sc(icon, label, value, sub, color, trend) {
  const tc = trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-flat";
  const tl = trend === "up" ? "↑ Hausse" : trend === "down" ? "↓ Baisse" : "→ Stable";
  return `<div class="stat-card ${color}">
    <div class="stat-top">
      <div class="stat-icon-wrap">${icon}</div>
      ${trend ? `<span class="stat-trend ${tc}">${tl}</span>` : ""}
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
  </div>`;
}

function badge(s) {
  const map = { "Actif": "actif", "En cours": "encours", "Inactif": "inactif" };
  const labels = { "Actif": "Actif", "En cours": "En cours", "Inactif": "Inactif" };
  return `<span class="badge ${map[s] || "actif"}">${labels[s] || s}</span>`;
}

function chartBars(data, label) {
  const max = Math.max(...data.map(d => d.v));
  return `<div class="chart-card">
    <div class="chart-header">
      <h3>📈 ${label || "Activité"}</h3>
      <div class="chart-legend"><span><span class="legend-dot" style="background:#3B82F6"></span>Ce mois</span></div>
    </div>
    <div class="chart-bars">
      ${data.map(d => `<div class="bar-wrap">
        <div class="bar-val">${d.v}</div>
        <div class="bar" style="height:${Math.max(Math.round((d.v / max) * 100), 4)}px"></div>
        <div class="bar-label">${d.l}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

function tableCard(title, count, headers, rows, addModalId) {
  const ths = headers.map(h => `<th>${h}</th>`).join("");
  const trs = rows.map(r => `<tr>${r}</tr>`).join("");
  return `<div class="table-card">
    <div class="table-header">
      <div class="table-header-left">
        <h3>${title}</h3>
        <span class="record-count">${count} entrées</span>
      </div>
      <div class="table-actions">
        <input class="search-bar" placeholder="Rechercher..." oninput="filterTable(this)"/>
        <button class="btn btn-primary btn-sm" onclick="openModal('${addModalId}')">+ Ajouter</button>
      </div>
    </div>
    <table id="mainTable"><thead><tr>${ths}<th>Actions</th></tr></thead>
    <tbody>${trs}</tbody></table>
  </div>`;
}

function actionBtns(id, table, data) {
  const dataAttr = Object.entries(data).map(([k,v]) => `data-${k}="${String(v).replace(/"/g,'&quot;')}"`).join(' ');
  return `<td><div class="action-btns">
    <button class="btn btn-ghost btn-sm" ${dataAttr} data-table="${table}" onclick="openEdit(this)">✏️ Modifier</button>
    <button class="btn btn-danger btn-sm" data-id="${id}" data-table="${table}" onclick="doDelete(this)">🗑️</button>
  </div></td>`;
}

function modal(id, title, fields, table, recordId = null) {
  const inputs = fields.map(([lbl, type, ph, val = "", name = ""]) => `
    <div class="form-group"><label>${lbl}</label>
    ${type === "select"
      ? `<select name="${name || lbl.toLowerCase().replace(/ /g,'_')}"><option value="">${ph}</option>${val.split(",").map(o => `<option>${o.trim()}</option>`).join("")}</select>`
      : `<input name="${name || lbl.toLowerCase().replace(/ /g,'_')}" type="${type}" placeholder="${ph}" value="${val}"/>`}
    </div>`).join("");
  return `<div class="modal-overlay" id="${id}">
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" onclick="closeModal('${id}')">✕</button>
      </div>
      <form id="${id}Form" data-table="${table}" ${recordId ? `data-id="${recordId}"` : ""}>
      ${inputs}
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal('${id}')">Annuler</button>
        <button type="button" class="btn btn-primary" onclick="saveForm('${id}')">💾 Enregistrer</button>
      </div>
      </form>
    </div>
  </div>`;
}

function layout(icon, appName, navLinks, pageTitle, breadcrumb, serviceKey, statsHTML, chartHTML, tableHTML, modalHTML = "") {
  return `<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"/><title>${pageTitle} — Autohall</title>
<style>${baseCSS}</style></head>
<body>

<div class="sidebar">
  <div class="sidebar-logo" style="padding:18px 18px 14px;">
    <img src="http://localhost:3021/autohall-logo.png" alt="Auto Hall"
      style="height:44px;filter:brightness(0) invert(1);display:block;"/>
    <div style="font-size:0.62rem;color:rgba(255,255,255,0.38);margin-top:6px;letter-spacing:0.03em;">${appName}</div>
  </div>
  <nav>${navLinks}</nav>
  <div class="sidebar-footer">
    <div class="avatar">MT</div>
    <div class="user-info"><p>Mohammed Taha</p><span>Administrateur</span></div>
  </div>
</div>

<div class="main">
  <div class="topbar">
    <div class="topbar-left">
      <h1>${pageTitle}</h1>
      <span class="breadcrumb">${breadcrumb}</span>
    </div>
    <div class="topbar-right">
      ${getStatusPill(serviceKey)}
      <span class="topbar-date">${now()}</span>
    </div>
  </div>
  <div class="content">
    ${getAlertBanner(serviceKey)}
    <div class="stats">${statsHTML}</div>
    ${chartHTML}
    ${tableHTML}
  </div>
</div>

${modalHTML}

<script>
// ── Helpers UI ─────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

function filterTable(input) {
  const val = input.value.toLowerCase();
  document.querySelectorAll('#mainTable tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}

// ── Ouvrir formulaire édition avec données actuelles ──
function openEdit(btn) {
  var modal = document.querySelector(".modal-overlay[id^=\"edit\"]");
  if (!modal) { alert("Modal introuvable"); return; }
  var form = modal.querySelector("form");
  form.dataset.table = btn.dataset.table;
  form.dataset.id    = btn.dataset.id;
  form.querySelectorAll("input, select").forEach(function(input) {
    if (input.name && btn.dataset[input.name] !== undefined) {
      input.value = btn.dataset[input.name];
    }
  });
  modal.classList.add("open");
}

// ── Sauvegarder formulaire (ajout ou modif) ──
async function saveForm(modalId) {
  const form   = document.getElementById(modalId + 'Form');
  const table  = form.dataset.table;
  const id     = form.dataset.id;
  const inputs = form.querySelectorAll('input, select');
  const body   = {};
  inputs.forEach(inp => { if (inp.name) body[inp.name] = inp.value; });

  const port   = window.location.port;
  const method = id ? 'PUT' : 'POST';
  const url    = id
    ? 'http://localhost:' + port + '/api/' + table + '/' + id
    : 'http://localhost:' + port + '/api/' + table;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    closeModal(modalId);
    showToast(id ? '✅ Modifié avec succès !' : '✅ Ajouté avec succès !');
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    showToast('❌ Erreur : ' + e.message, true);
  }
}

// ── Supprimer ──
async function doDelete(btn) {
  const id    = btn.dataset.id;
  const table = btn.dataset.table;
  if (!confirm('Supprimer cet enregistrement ? Cette action est irréversible.')) return;

  const port = window.location.port;
  try {
    const res = await fetch('http://localhost:' + port + '/api/' + table + '/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    showToast('🗑️ Supprimé avec succès !');
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    showToast('❌ Erreur : ' + e.message, true);
  }
}

// ── Toast notification ──
function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;color:#fff;background:' + (isError ? '#DC2626' : '#16A34A') + ';box-shadow:0 4px 16px rgba(0,0,0,0.2);animation:fadeIn 0.2s ease';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

setTimeout(() => location.reload(), 30000);
</script>
</body></html>`;
}

// ══════════════════════════════════════════════════════════
//  RH — port 3001
// ══════════════════════════════════════════════════════════
const rh = express(); rh.use(cors());

const rhNav = `
  <div class="sidebar-section">
    <div class="sidebar-section-label">Principal</div>
    <a href="/login"><span class="nav-icon">🏠</span> Accueil</a>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-label">RH</div>
    <a href="/rh"><span class="nav-icon">👥</span> Employés</a>
    <a href="/conges"><span class="nav-icon">🏖️</span> Congés</a>
    <a href="#"><span class="nav-icon">💰</span> Paie</a>
    <a href="#" style="opacity:0.4;cursor:not-allowed;pointer-events:none;"><span class="nav-icon">📊</span> Rapports <span style="font-size:0.6rem;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:4px;margin-left:4px;">Bientôt</span></a>
  </div>`;

rh.use(express.json());

// ── API Routes RH ─────────────────────────────────────
rh.post("/api/employes", async (req, res) => {
  const { nom, poste, ville, telephone, statut = "Actif" } = req.body;
  const code = "EMP-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO employes (code,nom,poste,ville,telephone,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [code, nom, poste, ville, telephone, statut]);
  res.json({ ok: true });
});
rh.put("/api/employes/:id", async (req, res) => {
  const { nom, poste, ville, telephone, statut } = req.body;
  await query("UPDATE employes SET nom=$1,poste=$2,ville=$3,telephone=$4,statut=$5 WHERE id=$6",
    [nom, poste, ville, telephone, statut, req.params.id]);
  res.json({ ok: true });
});
rh.delete("/api/employes/:id", async (req, res) => {
  await query("DELETE FROM employes WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

rh.post("/api/conges", async (req, res) => {
  const { employe, type_conge, date_debut, date_fin, statut = "En cours" } = req.body;
  const code = "CGE-" + String(Math.floor(Math.random()*9000)+1000);
  const d1 = new Date(date_debut), d2 = new Date(date_fin);
  const duree = Math.ceil((d2-d1)/(1000*60*60*24)) + "j";
  await query("INSERT INTO conges (code,employe,type_conge,date_debut,date_fin,duree,statut) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [code, employe, type_conge, date_debut, date_fin, duree, statut]);
  res.json({ ok: true });
});
rh.put("/api/conges/:id", async (req, res) => {
  const { employe, type_conge, date_debut, date_fin, statut } = req.body;
  await query("UPDATE conges SET employe=$1,type_conge=$2,date_debut=$3,date_fin=$4,statut=$5 WHERE id=$6",
    [employe, type_conge, date_debut, date_fin, statut, req.params.id]);
  res.json({ ok: true });
});
rh.delete("/api/conges/:id", async (req, res) => {
  await query("DELETE FROM conges WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

rh.post("/api/paie", async (req, res) => {
  const { employe, poste, salaire, mois, statut = "En attente" } = req.body;
  const code = "PAY-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO paie (code,employe,poste,salaire,mois,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [code, employe, poste, salaire, mois, statut]);
  res.json({ ok: true });
});
rh.put("/api/paie/:id", async (req, res) => {
  const { employe, poste, salaire, mois, statut } = req.body;
  await query("UPDATE paie SET employe=$1,poste=$2,salaire=$3,mois=$4,statut=$5 WHERE id=$6",
    [employe, poste, salaire, mois, statut, req.params.id]);
  res.json({ ok: true });
});
rh.delete("/api/paie/:id", async (req, res) => {
  await query("DELETE FROM paie WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

rh.get("/login", (req, res) => res.send(loginPage("👥", "Portail RH", 3001, "/rh", "Gestion des Ressources Humaines")));

rh.get("/rh", simulate("rh"), async (req, res) => {
  const navActive = rhNav.replace('<a href="/rh">', '<a href="/rh" class="active">');
  const data = await query("SELECT * FROM employes ORDER BY code");
  const rows = (data || []).map(e =>
    `<td class="cell-id">${e.code}</td>
     <td class="cell-primary">${e.nom}</td>
     <td class="cell-secondary">${e.poste}</td>
     <td>${e.ville}</td>
     <td class="cell-mono">${e.telephone}</td>
     <td>${badge(e.statut)}</td>
     ${actionBtns(e.id, "employes", {id:e.id,nom:e.nom,poste:e.poste,ville:e.ville,telephone:e.telephone,statut:e.statut})}`
  );
  const total = data ? data.length : 0;
  const actifs = data ? data.filter(e => e.statut === 'Actif').length : 0;
  const conges_count = data ? data.filter(e => e.statut === 'En congé').length : 0;
  res.send(layout("👥", "Portail RH", navActive, "Gestion des Employés", "RH / Employés", "rh",
    sc("👥", "Total Employés", total.toString(), "Groupe Autohall", "blue", "up") +
    sc("✅", "Actifs", actifs.toString(), "Aujourd'hui", "green", "flat") +
    sc("🏖️", "En Congé", conges_count.toString(), "Cette semaine", "orange", "flat") +
    sc("🆕", "Recrutements", "8", "En cours", "red", "up"),
    chartBars([{l:"Jan",v:285},{l:"Fév",v:292},{l:"Mar",v:298},{l:"Avr",v:303},{l:"Mai",v:307},{l:"Jun",v:310},{l:"Jul",v:total}], "Effectif mensuel"),
    tableCard("Liste des Employés", total.toString(), ["ID", "Nom", "Poste", "Ville", "Téléphone", "Statut"], rows, "addEmp"),
    modal("addEmp", "➕ Ajouter un Employé", [
      ["Nom complet", "text", "Ex: Ahmed Bennani", "", "nom"],
      ["Poste", "text", "Ex: Commercial", "", "poste"],
      ["Ville", "select", "Sélectionner une ville", "Casablanca,Rabat,Marrakech,Tanger,Fès,Agadir", "ville"],
      ["Téléphone", "text", "0600-000000", "", "telephone"],
      ["Statut", "select", "Statut", "Actif,En congé,Inactif", "statut"],
    ], "employes") +
    modal("editEmp", "✏️ Modifier l'Employé", [
      ["Nom", "text", "", "", "nom"],
      ["Poste", "text", "", "", "poste"],
      ["Ville", "select", "Ville", "Casablanca,Rabat,Marrakech,Tanger,Fès,Agadir", "ville"],
      ["Téléphone", "text", "", "", "telephone"],
      ["Statut", "select", "Statut", "Actif,En congé,Inactif", "statut"],
    ], "employes")
  ));
});

rh.get("/conges", simulate("conges"), async (req, res) => {
  const navActive = rhNav.replace('<a href="/conges">', '<a href="/conges" class="active">');
  const data = await query("SELECT * FROM conges ORDER BY code");
  const rows = (data || []).map(c =>
    `<td class="cell-id">${c.code}</td>
     <td class="cell-primary">${c.employe}</td>
     <td>${c.type_conge}</td>
     <td class="cell-mono">${new Date(c.date_debut).toLocaleDateString('fr-FR')}</td>
     <td class="cell-mono">${new Date(c.date_fin).toLocaleDateString('fr-FR')}</td>
     <td class="cell-bold">${c.duree}</td>
     <td>${badge(c.statut)}</td>
     ${actionBtns(c.id, "conges", {id:c.id,employe:c.employe,type_conge:c.type_conge,date_debut:String(c.date_debut).slice(0,10),date_fin:String(c.date_fin).slice(0,10),statut:c.statut})}`
  );
  const total    = data ? data.length : 0;
  const approuves = data ? data.filter(c => c.statut === 'Actif').length : 0;
  const attente  = data ? data.filter(c => c.statut === 'En cours').length : 0;
  res.send(layout("👥", "Portail RH", navActive, "Gestion des Congés", "RH / Congés", "conges",
    sc("📋", "Demandes", total.toString(), "Mars 2026", "blue", "up") +
    sc("✅", "Approuvées", approuves.toString(), `${Math.round(approuves/Math.max(total,1)*100)}% du total`, "green", "up") +
    sc("⏳", "En Attente", attente.toString(), "À traiter", "orange", "flat") +
    sc("📅", "Jours Restants", "428", "Pool collectif", "red", "down"),
    chartBars([{l:"Jan",v:12},{l:"Fév",v:8},{l:"Mar",v:15},{l:"Avr",v:10},{l:"Mai",v:18},{l:"Jun",v:22},{l:"Jul",v:total}], "Demandes par mois"),
    tableCard("Demandes de Congés", total.toString(), ["ID", "Employé", "Type", "Début", "Fin", "Durée", "Statut"], rows, "addConge"),
    modal("addConge", "➕ Nouvelle Demande de Congé", [
      ["Employé", "text", "Nom complet", "", "employe"],
      ["Type de congé", "select", "Sélectionner", "Congé annuel,Congé maladie,Congé maternité,Congé exceptionnel", "type_conge"],
      ["Date de début", "date", "", "", "date_debut"],
      ["Date de fin", "date", "", "", "date_fin"],
    ], "conges") +
    modal("editConge", "✏️ Modifier la Demande", [
      ["Employé", "text", "", "", "employe"],
      ["Type de congé", "select", "Type", "Congé annuel,Congé maladie,Congé maternité,Congé exceptionnel", "type_conge"],
      ["Date de début", "date", "", "", "date_debut"],
      ["Date de fin", "date", "", "", "date_fin"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "conges")
  ));
});

rh.get("/rh/paie", simulate("paie"), async (req, res) => {
  const navActive = rhNav.replace('<a href="/rh">', '<a href="/rh" class="active">');
  const data = await query("SELECT * FROM paie ORDER BY code");
  const rows = (data || []).map(p =>
    `<td class="cell-id">${p.code}</td>
     <td class="cell-primary">${p.employe}</td>
     <td class="cell-secondary">${p.poste}</td>
     <td class="cell-price">${Number(p.salaire).toLocaleString('fr-FR')} MAD</td>
     <td>${p.mois}</td>
     <td>${badge(p.statut)}</td>
     ${actionBtns(p.id, "paie", {id:p.id,employe:p.employe,poste:p.poste,salaire:p.salaire,mois:p.mois,statut:p.statut})}`
  );
  const total  = data ? data.length : 0;
  const payes  = data ? data.filter(p => p.statut === 'Payé').length : 0;
  const attente= data ? data.filter(p => p.statut === 'En attente').length : 0;
  const masse  = data ? data.reduce((sum, p) => sum + parseFloat(p.salaire || 0), 0) : 0;
  res.send(layout("💰", "Portail RH", navActive, "Gestion de la Paie", "RH / Paie", "paie",
    sc("💰", "Masse Salariale", `${Math.round(masse/1000)}k`, "MAD · Mars 2026", "blue", "up") +
    sc("✅", "Bulletins Payés", payes.toString(), `${Math.round(payes/Math.max(total,1)*100)}% traités`, "green", "up") +
    sc("⏳", "En Attente", attente.toString(), "À traiter", "orange", "flat") +
    sc("👥", "Effectif Paie", total.toString(), "Employés", "red", "flat"),
    chartBars([{l:"Jan",v:280},{l:"Fév",v:285},{l:"Mar",v:290},{l:"Avr",v:288},{l:"Mai",v:295},{l:"Jun",v:298},{l:"Jul",v:total}], "Bulletins par mois"),
    tableCard("Bulletins de Paie", total.toString(), ["ID", "Employé", "Poste", "Salaire", "Mois", "Statut"], rows, "addPaie"),
    modal("addPaie", "➕ Ajouter un Bulletin", [
      ["Employé", "text", "Nom complet", "", "employe"],
      ["Poste", "text", "Ex: Commercial", "", "poste"],
      ["Salaire (MAD)", "text", "8000", "", "salaire"],
      ["Mois", "text", "Mars 2026", "", "mois"],
      ["Statut", "select", "Statut", "Payé,En attente", "statut"],
    ], "paie") +
    modal("editPaie", "✏️ Modifier le Bulletin", [
      ["Employé", "text", "", "", "employe"],
      ["Poste", "text", "", "", "poste"],
      ["Salaire (MAD)", "text", "", "", "salaire"],
      ["Mois", "text", "", "", "mois"],
      ["Statut", "select", "Statut", "Payé,En attente", "statut"],
    ], "paie")
  ));
});

rh.listen(3001, () => console.log("✅ RH        → http://localhost:3001/login"));

// ══════════════════════════════════════════════════════════
//  STOCK — port 3002
// ══════════════════════════════════════════════════════════
const stock = express(); stock.use(cors());

const stockNav = `
  <div class="sidebar-section">
    <div class="sidebar-section-label">Principal</div>
    <a href="/login"><span class="nav-icon">🏠</span> Accueil</a>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-label">Stock</div>
    <a href="/stock/neufs"><span class="nav-icon">🚗</span> Véhicules Neufs</a>
    <a href="/stock/occasion"><span class="nav-icon">🔄</span> Occasion</a>
    <a href="/stock/pieces"><span class="nav-icon">🔩</span> Pièces</a>
    <a href="#" style="opacity:0.4;cursor:not-allowed;pointer-events:none;"><span class="nav-icon">📊</span> Rapports <span style="font-size:0.6rem;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:4px;margin-left:4px;">Bientôt</span></a>
  </div>`;

stock.use(express.json());

// ── API Routes Stock ──────────────────────────────────
stock.post("/api/vehicules_neufs", async (req, res) => {
  const { marque, modele, annee, couleur, prix, statut = "Disponible" } = req.body;
  const code = "VN-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO vehicules_neufs (code,marque,modele,annee,couleur,prix,statut) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [code, marque, modele, annee, couleur, prix, statut]);
  res.json({ ok: true });
});
stock.put("/api/vehicules_neufs/:id", async (req, res) => {
  const { marque, modele, annee, couleur, prix, statut } = req.body;
  await query("UPDATE vehicules_neufs SET marque=$1,modele=$2,annee=$3,couleur=$4,prix=$5,statut=$6 WHERE id=$7",
    [marque, modele, annee, couleur, prix, statut, req.params.id]);
  res.json({ ok: true });
});
stock.delete("/api/vehicules_neufs/:id", async (req, res) => {
  await query("DELETE FROM vehicules_neufs WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

stock.post("/api/pieces_rechange", async (req, res) => {
  const { designation, marque, quantite, prix_unit, statut = "Actif" } = req.body;
  const code = "PR-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO pieces_rechange (code,designation,marque,quantite,prix_unit,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [code, designation, marque, quantite, prix_unit, statut]);
  res.json({ ok: true });
});
stock.put("/api/pieces_rechange/:id", async (req, res) => {
  const { designation, marque, quantite, prix_unit, statut } = req.body;
  await query("UPDATE pieces_rechange SET designation=$1,marque=$2,quantite=$3,prix_unit=$4,statut=$5 WHERE id=$6",
    [designation, marque, quantite, prix_unit, statut, req.params.id]);
  res.json({ ok: true });
});
stock.delete("/api/pieces_rechange/:id", async (req, res) => {
  await query("DELETE FROM pieces_rechange WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

stock.post("/api/vehicules_occasion", async (req, res) => {
  const { marque, modele, annee, kilometrage, prix, statut = "Disponible" } = req.body;
  const code = "VO-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO vehicules_occasion (code,marque,modele,annee,kilometrage,prix,statut) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [code, marque, modele, annee, kilometrage, prix, statut]);
  res.json({ ok: true });
});
stock.put("/api/vehicules_occasion/:id", async (req, res) => {
  const { marque, modele, annee, kilometrage, prix, statut } = req.body;
  await query("UPDATE vehicules_occasion SET marque=$1,modele=$2,annee=$3,kilometrage=$4,prix=$5,statut=$6 WHERE id=$7",
    [marque, modele, annee, kilometrage, prix, statut, req.params.id]);
  res.json({ ok: true });
});
stock.delete("/api/vehicules_occasion/:id", async (req, res) => {
  await query("DELETE FROM vehicules_occasion WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

stock.get("/login", (req, res) => res.send(loginPage("🚗", "Gestion Stock", 3002, "/stock/neufs", "Gestion des stocks véhicules et pièces")));

stock.get("/stock/neufs", simulate("neufs"), async (req, res) => {
  const navActive = stockNav.replace('<a href="/stock/neufs">', '<a href="/stock/neufs" class="active">');
  const data = await query("SELECT * FROM vehicules_neufs ORDER BY code");
  const rows = (data || []).map(v =>
    `<td class="cell-id">${v.code}</td>
     <td class="cell-primary">${v.marque} ${v.modele}</td>
     <td>${v.annee}</td>
     <td>${v.couleur}</td>
     <td class="cell-price">${Number(v.prix).toLocaleString('fr-FR')} MAD</td>
     <td>${badge(v.statut)}</td>
     ${actionBtns(v.id, "vehicules_neufs", {id:v.id,marque:v.marque,modele:v.modele,annee:v.annee,couleur:v.couleur,prix:v.prix,statut:v.statut})}`
  );
  const total     = data ? data.length : 0;
  const dispos    = data ? data.filter(v => v.statut === 'Disponible').length : 0;
  const reserves  = data ? data.filter(v => v.statut === 'Réservé').length : 0;
  const vendus    = data ? data.filter(v => v.statut === 'Vendu').length : 0;
  res.send(layout("🚗", "Gestion Stock", navActive, "Stock Véhicules Neufs", "Stock / Neufs", "neufs",
    sc("🚗", "Total Stock", total.toString(), "Véhicules en stock", "blue", "up") +
    sc("✅", "Disponibles", dispos.toString(), "Prêts à la vente", "green", "up") +
    sc("🔖", "Réservés", reserves.toString(), "En cours", "orange", "flat") +
    sc("🏆", "Vendus", vendus.toString(), "Ce mois", "red", "flat"),
    chartBars([{l:"Jan",v:98},{l:"Fév",v:105},{l:"Mar",v:112},{l:"Avr",v:108},{l:"Mai",v:118},{l:"Jun",v:121},{l:"Jul",v:total}], "Stock mensuel"),
    tableCard("Véhicules Neufs", total.toString(), ["ID", "Modèle", "Année", "Couleur", "Prix", "Statut"], rows, "addVh"),
    modal("addVh", "➕ Ajouter un Véhicule", [
      ["Marque", "select", "Sélectionner", "Toyota,Suzuki,Hino", "marque"],
      ["Modèle", "text", "Ex: Land Cruiser 300", "", "modele"],
      ["Année", "text", "2026", "", "annee"],
      ["Couleur", "select", "Sélectionner", "Blanc,Noir,Gris,Rouge,Bleu,Vert", "couleur"],
      ["Prix (MAD)", "text", "Ex: 780000", "", "prix"],
      ["Statut", "select", "Statut", "Disponible,Réservé,Vendu", "statut"],
    ], "vehicules_neufs") +
    modal("editVh", "✏️ Modifier le Véhicule", [
      ["Marque", "select", "Marque", "Toyota,Suzuki,Hino", "marque"],
      ["Modèle", "text", "", "", "modele"],
      ["Année", "text", "", "", "annee"],
      ["Couleur", "select", "Couleur", "Blanc,Noir,Gris,Rouge,Bleu,Vert", "couleur"],
      ["Prix (MAD)", "text", "", "", "prix"],
      ["Statut", "select", "Statut", "Disponible,Réservé,Vendu", "statut"],
    ], "vehicules_neufs")
  ));
});

stock.get("/stock/pieces", simulate("pieces"), async (req, res) => {
  const navActive = stockNav.replace('<a href="/stock/pieces">', '<a href="/stock/pieces" class="active">');
  const data = await query("SELECT * FROM pieces_rechange ORDER BY code");
  const rows = (data || []).map(p =>
    `<td class="cell-id">${p.code}</td>
     <td class="cell-primary">${p.designation}</td>
     <td>${p.marque}</td>
     <td class="cell-bold">${p.quantite}</td>
     <td class="cell-price">${Number(p.prix_unit).toLocaleString('fr-FR')} MAD</td>
     <td>${badge(p.statut)}</td>
     ${actionBtns(p.id, "pieces_rechange", {id:p.id,designation:p.designation,marque:p.marque,quantite:p.quantite,prix_unit:p.prix_unit,statut:p.statut})}`
  );
  const total   = data ? data.length : 0;
  const enStock = data ? data.filter(p => p.statut === 'En stock').length : 0;
  const faible  = data ? data.filter(p => p.statut === 'Faible stock').length : 0;
  res.send(layout("🔩", "Gestion Stock", navActive, "Stock Pièces de Rechange", "Stock / Pièces", "pieces",
    sc("🔩", "Références", total.toString(), "Cataloguées", "blue", "up") +
    sc("✅", "En Stock", enStock.toString(), `${Math.round(enStock/Math.max(total,1)*100)}% des réf.`, "green", "flat") +
    sc("⚠️", "Faible Stock", faible.toString(), "À commander", "red", "down") +
    sc("📦", "Commandes", "12", "En attente", "orange", "flat"),
    chartBars([{l:"Jan",v:980},{l:"Fév",v:1020},{l:"Mar",v:1080},{l:"Avr",v:1100},{l:"Mai",v:1150},{l:"Jun",v:1200},{l:"Jul",v:total}], "Références par mois"),
    tableCard("Pièces de Rechange", total.toString(), ["ID", "Désignation", "Marque", "Quantité", "Prix", "Statut"], rows, "addPiece"),
    modal("addPiece", "➕ Ajouter une Pièce", [
      ["Désignation", "text", "Ex: Filtre à huile", "", "designation"],
      ["Marque", "select", "Sélectionner", "Toyota,Suzuki,Hino,Bosch,NGK,Castrol", "marque"],
      ["Quantité", "text", "100", "", "quantite"],
      ["Prix unitaire (MAD)", "text", "120", "", "prix_unit"],
      ["Statut", "select", "Statut", "En stock,Faible stock,Rupture", "statut"],
    ], "pieces_rechange") +
    modal("editPiece", "✏️ Modifier la Pièce", [
      ["Désignation", "text", "", "", "designation"],
      ["Marque", "select", "Marque", "Toyota,Suzuki,Hino,Bosch,NGK,Castrol", "marque"],
      ["Quantité", "text", "", "", "quantite"],
      ["Prix unitaire (MAD)", "text", "", "", "prix_unit"],
      ["Statut", "select", "Statut", "En stock,Faible stock,Rupture", "statut"],
    ], "pieces_rechange")
  ));
});

stock.get("/stock/occasion", simulate("occasion"), async (req, res) => {
  const navActive = stockNav.replace('<a href="/stock/occasion">', '<a href="/stock/occasion" class="active">');
  const data = await query("SELECT * FROM vehicules_occasion ORDER BY code");
  const rows = (data || []).map(v =>
    `<td class="cell-id">${v.code}</td>
     <td class="cell-primary">${v.marque} ${v.modele}</td>
     <td>${v.annee}</td>
     <td class="cell-mono">${Number(v.kilometrage).toLocaleString('fr-FR')} km</td>
     <td class="cell-price">${Number(v.prix).toLocaleString('fr-FR')} MAD</td>
     <td>${badge(v.statut)}</td>
     ${actionBtns(v.id, "vehicules_occasion", {id:v.id,marque:v.marque,modele:v.modele,annee:v.annee,kilometrage:v.kilometrage,prix:v.prix,statut:v.statut})}`
  );
  const total  = data ? data.length : 0;
  const dispos = data ? data.filter(v => v.statut === 'Disponible').length : 0;
  const vendus = data ? data.filter(v => v.statut === 'Vendu').length : 0;
  res.send(layout("🔄", "Gestion Stock", navActive, "Véhicules Occasion", "Stock / Occasion", "occasion",
    sc("🔄", "Total Stock", total.toString(), "Véhicules", "blue", "up") +
    sc("✅", "Disponibles", dispos.toString(), `${Math.round(dispos/Math.max(total,1)*100)}% du parc`, "green", "up") +
    sc("🔖", "Réservés", data ? data.filter(v=>v.statut==='Réservé').length.toString() : "0", "En cours", "orange", "flat") +
    sc("💰", "Vendus", vendus.toString(), "Total", "red", "up"),
    chartBars([{l:"Jan",v:22},{l:"Fév",v:25},{l:"Mar",v:28},{l:"Avr",v:30},{l:"Mai",v:35},{l:"Jun",v:36},{l:"Jul",v:total}], "Stock occasion mensuel"),
    tableCard("Véhicules Occasion", total.toString(), ["ID", "Modèle", "Année", "Kilométrage", "Prix", "Statut"], rows, "addOc"),
    modal("addOc", "➕ Ajouter Véhicule Occasion", [
      ["Marque", "select", "Sélectionner", "Toyota,Suzuki,Hino", "marque"],
      ["Modèle", "text", "Ex: Corolla", "", "modele"],
      ["Année", "text", "2022", "", "annee"],
      ["Kilométrage", "text", "50000", "", "kilometrage"],
      ["Prix (MAD)", "text", "200000", "", "prix"],
      ["Statut", "select", "Statut", "Disponible,Réservé,Vendu", "statut"],
    ], "vehicules_occasion") +
    modal("editOc", "✏️ Modifier", [
      ["Marque", "select", "Marque", "Toyota,Suzuki,Hino", "marque"],
      ["Modèle", "text", "", "", "modele"],
      ["Année", "text", "", "", "annee"],
      ["Kilométrage", "text", "", "", "kilometrage"],
      ["Prix (MAD)", "text", "", "", "prix"],
      ["Statut", "select", "Statut", "Disponible,Réservé,Vendu", "statut"],
    ], "vehicules_occasion")
  ));
});

stock.listen(3002, () => console.log("✅ Stock     → http://localhost:3002/login"));

// ══════════════════════════════════════════════════════════
//  VENTES — port 3003
// ══════════════════════════════════════════════════════════
const ventes = express(); ventes.use(cors());

const ventesNav = `
  <div class="sidebar-section">
    <div class="sidebar-section-label">Principal</div>
    <a href="/login"><span class="nav-icon">🏠</span> Accueil</a>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-label">Ventes</div>
    <a href="/crm"><span class="nav-icon">👤</span> CRM Clients</a>
    <a href="/commandes"><span class="nav-icon">📦</span> Commandes</a>
    <a href="/devis"><span class="nav-icon">📋</span> Devis & Offres</a>
    <a href="#" style="opacity:0.4;cursor:not-allowed;pointer-events:none;"><span class="nav-icon">📊</span> Rapports <span style="font-size:0.6rem;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:4px;margin-left:4px;">Bientôt</span></a>
  </div>`;

ventes.use(express.json());

// ── API Routes Ventes ─────────────────────────────────
ventes.post("/api/clients", async (req, res) => {
  const { nom, telephone, ville, interet, statut = "Actif" } = req.body;
  const code = "CL-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO clients (code,nom,telephone,ville,interet,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [code, nom, telephone, ville, interet, statut]);
  res.json({ ok: true });
});
ventes.put("/api/clients/:id", async (req, res) => {
  const { nom, telephone, ville, interet, statut } = req.body;
  await query("UPDATE clients SET nom=$1,telephone=$2,ville=$3,interet=$4,statut=$5 WHERE id=$6",
    [nom, telephone, ville, interet, statut, req.params.id]);
  res.json({ ok: true });
});
ventes.delete("/api/clients/:id", async (req, res) => {
  await query("DELETE FROM clients WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

ventes.post("/api/commandes", async (req, res) => {
  const { client, vehicule, date_commande, montant, statut = "En cours" } = req.body;
  const ref = "CMD-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO commandes (ref,client,vehicule,date_commande,montant,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [ref, client, vehicule, date_commande, montant, statut]);
  res.json({ ok: true });
});
ventes.put("/api/commandes/:id", async (req, res) => {
  const { client, vehicule, date_commande, montant, statut } = req.body;
  await query("UPDATE commandes SET client=$1,vehicule=$2,date_commande=$3,montant=$4,statut=$5 WHERE id=$6",
    [client, vehicule, date_commande, montant, statut, req.params.id]);
  res.json({ ok: true });
});
ventes.delete("/api/commandes/:id", async (req, res) => {
  await query("DELETE FROM commandes WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

ventes.post("/api/devis", async (req, res) => {
  const { client, vehicule, montant, date_validite, statut = "En cours" } = req.body;
  const ref = "DEV-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO devis (ref,client,vehicule,montant,date_validite,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [ref, client, vehicule, montant, date_validite, statut]);
  res.json({ ok: true });
});
ventes.put("/api/devis/:id", async (req, res) => {
  const { client, vehicule, montant, date_validite, statut } = req.body;
  await query("UPDATE devis SET client=$1,vehicule=$2,montant=$3,date_validite=$4,statut=$5 WHERE id=$6",
    [client, vehicule, montant, date_validite, statut, req.params.id]);
  res.json({ ok: true });
});
ventes.delete("/api/devis/:id", async (req, res) => {
  await query("DELETE FROM devis WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

ventes.get("/login", (req, res) => res.send(loginPage("💼", "Gestion Ventes", 3003, "/crm", "CRM & Gestion commerciale")));

ventes.get("/crm", simulate("crm"), async (req, res) => {
  const navActive = ventesNav.replace('<a href="/crm">', '<a href="/crm" class="active">');
  const data = await query("SELECT * FROM clients ORDER BY code");
  const rows = (data || []).map(c =>
    `<td class="cell-id">${c.code}</td>
     <td class="cell-primary">${c.nom}</td>
     <td class="cell-mono">${c.telephone}</td>
     <td>${c.ville}</td>
     <td class="cell-secondary">${c.interet}</td>
     <td>${badge(c.statut)}</td>
     ${actionBtns(c.id, "clients", {id:c.id,nom:c.nom,telephone:c.telephone,ville:c.ville,interet:c.interet,statut:c.statut})}`
  );
  const total = data ? data.length : 0;
  res.send(layout("💼", "Gestion Ventes", navActive, "CRM Clients", "Ventes / CRM", "crm",
    sc("👤", "Total Clients", total.toString(), "Base active", "blue", "up") +
    sc("🆕", "Nouveaux", data ? data.filter(c=>c.statut==='Actif').length.toString() : "0", "Actifs", "green", "up") +
    sc("🎯", "En cours", data ? data.filter(c=>c.statut==='En cours').length.toString() : "0", "En pipeline", "orange", "up") +
    sc("📈", "Conversion", "38 %", "Ce mois", "red", "up"),
    chartBars([{l:"Jan",v:168},{l:"Fév",v:185},{l:"Mar",v:204},{l:"Avr",v:198},{l:"Mai",v:220},{l:"Jun",v:238},{l:"Jul",v:total}], "Nouveaux clients par mois"),
    tableCard("Base Clients", total.toString(), ["ID", "Nom", "Téléphone", "Ville", "Intérêt", "Statut"], rows, "addClient"),
    modal("addClient", "➕ Ajouter un Client", [
      ["Nom complet", "text", "Ex: Ahmed Bennani", "", "nom"],
      ["Téléphone", "text", "0661-000000", "", "telephone"],
      ["Ville", "select", "Sélectionner", "Casablanca,Rabat,Marrakech,Tanger,Fès,Agadir", "ville"],
      ["Véhicule d'intérêt", "select", "Sélectionner", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift,Suzuki Vitara", "interet"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "clients") +
    modal("editClient", "✏️ Modifier le Client", [
      ["Nom", "text", "", "", "nom"],
      ["Téléphone", "text", "", "", "telephone"],
      ["Ville", "select", "Ville", "Casablanca,Rabat,Marrakech,Tanger,Fès,Agadir", "ville"],
      ["Véhicule d'intérêt", "select", "Intérêt", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift,Suzuki Vitara", "interet"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "clients")
  ));
});

ventes.get("/commandes", simulate("commandes"), async (req, res) => {
  const navActive = ventesNav.replace('<a href="/commandes">', '<a href="/commandes" class="active">');
  const data = await query("SELECT * FROM commandes ORDER BY ref DESC");
  const rows = (data || []).map(c =>
    `<td class="cell-id">${c.ref}</td>
     <td class="cell-primary">${c.client}</td>
     <td>${c.vehicule}</td>
     <td class="cell-mono">${c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : ''}</td>
     <td class="cell-price">${Number(c.montant).toLocaleString('fr-FR')} MAD</td>
     <td>${badge(c.statut)}</td>
     ${actionBtns(c.id, "commandes", {id:c.id,client:c.client,vehicule:c.vehicule,montant:c.montant,statut:c.statut})}`
  );
  const total = data ? data.length : 0;
  res.send(layout("💼", "Gestion Ventes", navActive, "Gestion des Commandes", "Ventes / Commandes", "commandes",
    sc("📦", "Commandes", total.toString(), "Total", "blue", "up") +
    sc("✅", "Confirmées", data ? data.filter(c=>c.statut==='Actif').length.toString() : "0", "Confirmées", "green", "up") +
    sc("⏳", "En Attente", data ? data.filter(c=>c.statut==='En cours').length.toString() : "0", "À traiter", "orange", "flat") +
    sc("💰", "CA Total", data ? (data.reduce((s,c)=>s+parseFloat(c.montant||0),0)/1000000).toFixed(1)+"M" : "0", "MAD", "red", "up"),
    chartBars([{l:"Jan",v:142},{l:"Fév",v:155},{l:"Mar",v:168},{l:"Avr",v:162},{l:"Mai",v:178},{l:"Jun",v:192},{l:"Jul",v:total}], "Commandes par mois"),
    tableCard("Liste des Commandes", total.toString(), ["Référence", "Client", "Véhicule", "Date", "Montant", "Statut"], rows, "addCmd"),
    modal("addCmd", "➕ Nouvelle Commande", [
      ["Client", "text", "Ex: Ahmed Bennani", "", "client"],
      ["Véhicule", "select", "Sélectionner", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift", "vehicule"],
      ["Date commande", "date", "", "", "date_commande"],
      ["Montant (MAD)", "text", "180000", "", "montant"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "commandes") +
    modal("editCmd", "✏️ Modifier la Commande", [
      ["Client", "text", "", "", "client"],
      ["Véhicule", "select", "Véhicule", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift", "vehicule"],
      ["Montant (MAD)", "text", "", "", "montant"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "commandes")
  ));
});

ventes.get("/devis", simulate("devis"), async (req, res) => {
  const navActive = ventesNav.replace('<a href="/devis">', '<a href="/devis" class="active">');
  const data = await query("SELECT * FROM devis ORDER BY ref DESC");
  const rows = (data || []).map(d =>
    `<td class="cell-id">${d.ref}</td>
     <td class="cell-primary">${d.client}</td>
     <td>${d.vehicule}</td>
     <td class="cell-price">${Number(d.montant).toLocaleString('fr-FR')} MAD</td>
     <td class="cell-mono">${d.date_validite ? new Date(d.date_validite).toLocaleDateString('fr-FR') : ''}</td>
     <td>${badge(d.statut)}</td>
     ${actionBtns(d.id, "devis", {id:d.id,client:d.client,vehicule:d.vehicule,montant:d.montant,statut:d.statut})}`
  );
  const total = data ? data.length : 0;
  res.send(layout("💼", "Gestion Ventes", navActive, "Devis & Offres", "Ventes / Devis", "devis",
    sc("📋", "Devis Émis", total.toString(), "Ce mois", "blue", "up") +
    sc("✅", "Acceptés", data ? data.filter(d=>d.statut==='Actif').length.toString() : "0", "Acceptés", "green", "up") +
    sc("⏳", "En Attente", data ? data.filter(d=>d.statut==='En cours').length.toString() : "0", "À relancer", "orange", "flat") +
    sc("💰", "Valeur Pipeline", data ? (data.reduce((s,d)=>s+parseFloat(d.montant||0),0)/1000000).toFixed(1)+"M" : "0", "MAD en cours", "red", "up"),
    chartBars([{l:"Sep",v:38},{l:"Oct",v:44},{l:"Nov",v:48},{l:"Déc",v:41},{l:"Jan",v:52},{l:"Fév",v:57},{l:"Mar",v:total}], "Devis émis par mois"),
    tableCard("Liste des Devis", total.toString(), ["Référence", "Client", "Véhicule", "Montant", "Date", "Statut"], rows, "addDevis"),
    modal("addDevis", "➕ Nouveau Devis", [
      ["Client", "text", "Ex: Ahmed Bennani", "", "client"],
      ["Véhicule", "select", "Sélectionner", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift", "vehicule"],
      ["Montant (MAD)", "text", "180000", "", "montant"],
      ["Date de validité", "date", "", "", "date_validite"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "devis") +
    modal("editDevis", "✏️ Modifier le Devis", [
      ["Client", "text", "", "", "client"],
      ["Véhicule", "select", "Véhicule", "Toyota Land Cruiser,Toyota Corolla,Toyota Hilux,Toyota RAV4,Suzuki Swift", "vehicule"],
      ["Montant (MAD)", "text", "", "", "montant"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "devis")
  ));
});

ventes.listen(3003, () => console.log("✅ Ventes    → http://localhost:3003/login"));

// ══════════════════════════════════════════════════════════
//  APRÈS-VENTE — port 3004
// ══════════════════════════════════════════════════════════
const sav = express(); sav.use(cors());

const savNav = `
  <div class="sidebar-section">
    <div class="sidebar-section-label">Principal</div>
    <a href="/login"><span class="nav-icon">🏠</span> Accueil</a>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-label">Après-Vente</div>
    <a href="/sav"><span class="nav-icon">🔧</span> SAV</a>
    <a href="/atelier"><span class="nav-icon">📅</span> Atelier</a>
    <a href="/reparations"><span class="nav-icon">🛠️</span> Réparations</a>
    <a href="#" style="opacity:0.4;cursor:not-allowed;pointer-events:none;"><span class="nav-icon">📊</span> Rapports <span style="font-size:0.6rem;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:4px;margin-left:4px;">Bientôt</span></a>
  </div>`;

sav.use(express.json());

// ── API Routes SAV ────────────────────────────────────
sav.post("/api/sav", async (req, res) => {
  const { client, vehicule, probleme, technicien, statut = "En cours" } = req.body;
  const ref = "SAV-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO sav (ref,client,vehicule,probleme,technicien,statut) VALUES($1,$2,$3,$4,$5,$6)",
    [ref, client, vehicule, probleme, technicien, statut]);
  res.json({ ok: true });
});
sav.put("/api/sav/:id", async (req, res) => {
  const { client, vehicule, probleme, technicien, statut } = req.body;
  await query("UPDATE sav SET client=$1,vehicule=$2,probleme=$3,technicien=$4,statut=$5 WHERE id=$6",
    [client, vehicule, probleme, technicien, statut, req.params.id]);
  res.json({ ok: true });
});
sav.delete("/api/sav/:id", async (req, res) => {
  await query("DELETE FROM sav WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

sav.post("/api/atelier", async (req, res) => {
  const { client, vehicule, service, date_rdv, heure_rdv, statut = "Confirmé" } = req.body;
  const ref = "RDV-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO atelier (ref,client,vehicule,service,date_rdv,heure_rdv,statut) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [ref, client, vehicule, service, date_rdv, heure_rdv, statut]);
  res.json({ ok: true });
});
sav.put("/api/atelier/:id", async (req, res) => {
  const { client, vehicule, service, date_rdv, heure_rdv, statut } = req.body;
  await query("UPDATE atelier SET client=$1,vehicule=$2,service=$3,date_rdv=$4,heure_rdv=$5,statut=$6 WHERE id=$7",
    [client, vehicule, service, date_rdv, heure_rdv, statut, req.params.id]);
  res.json({ ok: true });
});
sav.delete("/api/atelier/:id", async (req, res) => {
  await query("DELETE FROM atelier WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

sav.post("/api/reparations", async (req, res) => {
  const { client, vehicule, reparation, cout, technicien, statut = "En cours" } = req.body;
  const ref = "REP-" + String(Math.floor(Math.random()*9000)+1000);
  await query("INSERT INTO reparations (ref,client,vehicule,reparation,cout,technicien,statut) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [ref, client, vehicule, reparation, cout, technicien, statut]);
  res.json({ ok: true });
});
sav.put("/api/reparations/:id", async (req, res) => {
  const { client, vehicule, reparation, cout, technicien, statut } = req.body;
  await query("UPDATE reparations SET client=$1,vehicule=$2,reparation=$3,cout=$4,technicien=$5,statut=$6 WHERE id=$7",
    [client, vehicule, reparation, cout, technicien, statut, req.params.id]);
  res.json({ ok: true });
});
sav.delete("/api/reparations/:id", async (req, res) => {
  await query("DELETE FROM reparations WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

sav.get("/login", (req, res) => res.send(loginPage("🔧", "Après-Vente", 3004, "/sav", "SAV, Atelier & Réparations")));

sav.get("/sav", simulate("sav"), async (req, res) => {
  const navActive = savNav.replace('<a href="/sav">', '<a href="/sav" class="active">');
  const data = await query("SELECT * FROM sav ORDER BY ref");
  const rows = (data || []).map(s =>
    `<td class="cell-id">${s.ref}</td>
     <td class="cell-primary">${s.client}</td>
     <td>${s.vehicule}</td>
     <td class="cell-secondary">${s.probleme}</td>
     <td>${s.technicien}</td>
     <td>${badge(s.statut)}</td>
     ${actionBtns(s.id, "sav", {id:s.id,client:s.client,vehicule:s.vehicule,probleme:s.probleme,technicien:s.technicien,statut:s.statut})}`
  );
  const total    = data ? data.length : 0;
  const encours  = data ? data.filter(s => s.statut === 'En cours').length : 0;
  const termines = data ? data.filter(s => s.statut === 'Actif').length : 0;
  res.send(layout("🔧", "Après-Vente", navActive, "Gestion SAV", "SAV / Interventions", "sav",
    sc("🔧", "Interventions", total.toString(), "Ce mois", "blue", "up") +
    sc("⚙️", "En Cours", encours.toString(), "Aujourd'hui", "orange", "flat") +
    sc("✅", "Terminées", termines.toString(), `${Math.round(termines/Math.max(total,1)*100)}% du total`, "green", "up") +
    sc("⭐", "Satisfaction", "97 %", "Note clients", "green", "up"),
    chartBars([{l:"Jan",v:68},{l:"Fév",v:74},{l:"Mar",v:79},{l:"Avr",v:83},{l:"Mai",v:87},{l:"Jun",v:91},{l:"Jul",v:total}], "Interventions par mois"),
    tableCard("Interventions SAV", total.toString(), ["Référence", "Client", "Véhicule", "Problème", "Technicien", "Statut"], rows, "addSAV"),
    modal("addSAV", "➕ Nouvelle Intervention", [
      ["Client", "text", "Ahmed Bennani", "", "client"],
      ["Véhicule", "text", "Toyota Land Cruiser 2023", "", "vehicule"],
      ["Problème", "text", "Description du problème", "", "probleme"],
      ["Technicien", "text", "Youssef Amrani", "", "technicien"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "sav") +
    modal("editSAV", "✏️ Modifier l'Intervention", [
      ["Client", "text", "", "", "client"],
      ["Véhicule", "text", "", "", "vehicule"],
      ["Problème", "text", "", "", "probleme"],
      ["Technicien", "text", "", "", "technicien"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "sav")
  ));
});

sav.get("/atelier", simulate("atelier"), async (req, res) => {
  const navActive = savNav.replace('<a href="/atelier">', '<a href="/atelier" class="active">');
  const data = await query("SELECT * FROM atelier ORDER BY date_rdv, heure_rdv");
  const rows = (data || []).map(r =>
    `<td class="cell-id">${r.ref}</td>
     <td class="cell-primary">${r.client}</td>
     <td>${r.vehicule}</td>
     <td>${r.service}</td>
     <td class="cell-mono">${new Date(r.date_rdv).toLocaleDateString('fr-FR')}</td>
     <td class="cell-bold">${r.heure_rdv}</td>
     <td>${badge(r.statut)}</td>
     ${actionBtns(r.id, "atelier", {id:r.id,client:r.client,vehicule:r.vehicule,service:r.service,date_rdv:String(r.date_rdv).slice(0,10),heure_rdv:r.heure_rdv,statut:r.statut})}`
  );
  const total     = data ? data.length : 0;
  const confirmes = data ? data.filter(r => r.statut === 'Confirmé').length : 0;
  const attente   = data ? data.filter(r => r.statut === 'En cours').length : 0;
  res.send(layout("📅", "Après-Vente", navActive, "Rendez-Vous Atelier", "SAV / Atelier", "atelier",
    sc("📅", "RDV Total", total.toString(), "Planifiés", "blue", "up") +
    sc("✅", "Confirmés", confirmes.toString(), `${Math.round(confirmes/Math.max(total,1)*100)}% confirmés`, "green", "flat") +
    sc("⏳", "En Attente", attente.toString(), "À confirmer", "orange", "flat") +
    sc("👨‍🔧", "Techniciens", "10", "Disponibles", "green", "flat"),
    chartBars([{l:"Lun",v:8},{l:"Mar",v:11},{l:"Mer",v:9},{l:"Jeu",v:14},{l:"Ven",v:12},{l:"Sam",v:7}], "RDV par jour"),
    tableCard("Planning RDV", total.toString(), ["Référence", "Client", "Véhicule", "Service", "Date", "Heure", "Statut"], rows, "addRDV"),
    modal("addRDV", "➕ Nouveau Rendez-Vous", [
      ["Client", "text", "Ahmed Bennani", "", "client"],
      ["Véhicule", "text", "Toyota Land Cruiser", "", "vehicule"],
      ["Service", "select", "Sélectionner", "Vidange,Révision,Freinage,Diagnostic,Climatisation,Pneus", "service"],
      ["Date", "date", "", "", "date_rdv"],
      ["Heure", "text", "09:00", "", "heure_rdv"],
      ["Statut", "select", "Statut", "Confirmé,En cours,Annulé", "statut"],
    ], "atelier") +
    modal("editRDV", "✏️ Modifier le RDV", [
      ["Client", "text", "", "", "client"],
      ["Véhicule", "text", "", "", "vehicule"],
      ["Service", "select", "Service", "Vidange,Révision,Freinage,Diagnostic,Climatisation,Pneus", "service"],
      ["Date", "date", "", "", "date_rdv"],
      ["Heure", "text", "", "", "heure_rdv"],
      ["Statut", "select", "Statut", "Confirmé,En cours,Annulé", "statut"],
    ], "atelier")
  ));
});

sav.get("/reparations", simulate("reparations"), async (req, res) => {
  const navActive = savNav.replace('<a href="/reparations">', '<a href="/reparations" class="active">');
  const data = await query("SELECT * FROM reparations ORDER BY ref");
  const rows = (data || []).map(r =>
    `<td class="cell-id">${r.ref}</td>
     <td class="cell-primary">${r.client}</td>
     <td>${r.vehicule}</td>
     <td class="cell-secondary">${r.reparation}</td>
     <td>${r.technicien}</td>
     <td class="cell-price">${Number(r.cout).toLocaleString('fr-FR')} MAD</td>
     <td>${badge(r.statut)}</td>
     ${actionBtns(r.id, "reparations", {id:r.id,client:r.client,vehicule:r.vehicule,reparation:r.reparation,cout:r.cout,technicien:r.technicien,statut:r.statut})}`
  );
  const total    = data ? data.length : 0;
  const encours  = data ? data.filter(r => r.statut === 'En cours').length : 0;
  const termines = data ? data.filter(r => r.statut === 'Actif').length : 0;
  const ca       = data ? data.reduce((sum, r) => sum + parseFloat(r.cout || 0), 0) : 0;
  res.send(layout("🛠️", "Après-Vente", navActive, "Suivi des Réparations", "SAV / Réparations", "reparations",
    sc("🛠️", "En Réparation", encours.toString(), "Véhicules actifs", "blue", "flat") +
    sc("✅", "Terminées", termines.toString(), "Ce mois", "green", "up") +
    sc("⏱️", "Délai Moyen", "2,1j", "Par véhicule", "orange", "up") +
    sc("💰", "CA Atelier", `${Math.round(ca/1000)}k`, "MAD · Mars", "red", "up"),
    chartBars([{l:"Jan",v:55},{l:"Fév",v:61},{l:"Mar",v:67},{l:"Avr",v:70},{l:"Mai",v:74},{l:"Jun",v:72},{l:"Jul",v:total}], "Réparations par mois"),
    tableCard("Réparations", total.toString(), ["Référence", "Client", "Véhicule", "Travaux", "Technicien", "Coût", "Statut"], rows, "addRep"),
    modal("addRep", "➕ Nouvelle Réparation", [
      ["Client", "text", "Ahmed Bennani", "", "client"],
      ["Véhicule", "text", "Toyota Land Cruiser 2023", "", "vehicule"],
      ["Travaux", "text", "Description des travaux", "", "reparation"],
      ["Technicien", "text", "Youssef Amrani", "", "technicien"],
      ["Coût (MAD)", "text", "1500", "", "cout"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "reparations") +
    modal("editRep", "✏️ Modifier la Réparation", [
      ["Client", "text", "", "", "client"],
      ["Véhicule", "text", "", "", "vehicule"],
      ["Travaux", "text", "", "", "reparation"],
      ["Technicien", "text", "", "", "technicien"],
      ["Coût (MAD)", "text", "", "", "cout"],
      ["Statut", "select", "Statut", "Actif,En cours,Inactif", "statut"],
    ], "reparations")
  ));
});

sav.listen(3004, () => console.log("✅ SAV       → http://localhost:3004/login"));

// ══════════════════════════════════════════════════════════
console.log("\n🚀 Autohall Monitoring Servers démarrés !");
console.log("─────────────────────────────────────────────────────");
console.log("  RH      → http://localhost:3001/login");
console.log("  Stock   → http://localhost:3002/login");
console.log("  Ventes  → http://localhost:3003/login");
console.log("  SAV     → http://localhost:3004/login");
console.log("─────────────────────────────────────────────────────");
console.log("  ⏱️  Simulation automatique toutes les 45 secondes");
console.log("─────────────────────────────────────────────────────\n");