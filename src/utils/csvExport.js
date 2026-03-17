// ══════════════════════════════════════════════════════════
//  src/utils/csvExport.js
//  Génération de Rapport PDF Professionnel — Autohall Maroc
// ══════════════════════════════════════════════════════════

export function exportToCSV(apps, history) {
  // Sécurisation des dates
  const safeDate = (d) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "—";
      return dt.toLocaleString("fr-FR");
    } catch {
      return "—";
    }
  };

  const now = new Date().toLocaleString("fr-FR");
  const totalApps = apps.length;
  const online = apps.filter(a => a.status === "En ligne").length;
  const offline = apps.filter(a => a.status === "Hors service" || a.status === "Hors ligne").length;
  const slow = apps.filter(a => a.status === "Lente").length;
  
  const availability = totalApps > 0
    ? (((online + slow) / totalApps) * 100).toFixed(1)
    : "0.0";

  // ── Grouper par catégorie ────────────────────────────
  const grouped = apps.reduce((acc, app) => {
    const cat = app.category || "Applications Générales";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(app);
    return acc;
  }, {});

  // ── Couleurs et Labels ──────────────────────────────
  const statusColor = (s) => {
    if (s === "En ligne") return "#059669";
    if (s === "Hors service" || s === "Hors ligne") return "#DC2626";
    if (s === "Lente") return "#D97706";
    return "#6B7280";
  };

  const statusBg = (s) => {
    if (s === "En ligne") return "#D1FAE5";
    if (s === "Hors service" || s === "Hors ligne") return "#FEE2E2";
    if (s === "Lente") return "#FEF3C7";
    return "#F3F4F6";
  };

  const priLabel = (p) => {
    const labels = { critical: "Critique", high: "Haute", medium: "Moyenne", low: "Basse" };
    return labels[p] || "Moyenne";
  };

  const availColor = parseFloat(availability) >= 95 ? "#059669" : parseFloat(availability) >= 85 ? "#D97706" : "#DC2626";

  // ── Génération des lignes par catégorie ──────────────
  const categoryRows = Object.entries(grouped).map(([cat, catApps]) => {
    const catOnline = catApps.filter(a => a.status === "En ligne").length;
    const catOffline = catApps.filter(a => a.status === "Hors service" || a.status === "Hors ligne").length;
    const catSlow = catApps.filter(a => a.status === "Lente").length;

    const appRows = catApps.map(app => `
      <tr>
        <td style="padding:10px 14px;">
          <strong>${app.name}</strong>
          ${app.description ? `<br><span style="font-size:0.72rem;color:#6B7280;">${app.description}</span>` : ""}
        </td>
        <td style="padding:10px 14px;font-family:monospace;font-size:0.75rem;color:#374151;">${app.url}</td>
        <td style="padding:10px 14px;text-align:center;">
          <span style="background:${statusBg(app.status)};color:${statusColor(app.status)};padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;">
            ${app.status}
          </span>
        </td>
        <td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:700;">
          ${app.responseTime > 0 ? app.responseTime + " ms" : "—"}
        </td>
        <td style="padding:10px 14px;text-align:center;font-size:0.7rem;font-weight:700;">
          ${priLabel(app.priority)}
        </td>
        <td style="padding:10px 14px;font-size:0.75rem;color:#6B7280;text-align:right;">${safeDate(app.lastCheck)}</td>
      </tr>`).join("");

    return `
      <tr>
        <td colspan="6" style="padding:12px 14px;background:#F0F6FF;border-left:4px solid #0055CC;">
          <strong style="color:#0055CC;font-size:0.88rem;">${cat}</strong>
          <span style="margin-left:12px;font-size:0.72rem;color:#6B7280;">
            (${catOnline} OK, ${catSlow} Lentes, ${catOffline} HS)
          </span>
        </td>
      </tr>
      ${appRows}`;
  }).join("");

  // ── Historique (Mini Graphiques) ────────────────────────
  const historyRows = Object.entries(history).length > 0 ? Object.entries(history).slice(0, 10).map(([appName, points]) => {
    const lastPoints = points.slice(-8);
    const avgRT = lastPoints.length > 0 ? Math.round(lastPoints.reduce((s, p) => s + p.responseTime, 0) / lastPoints.length) : 0;
    
    const miniCharts = lastPoints.map(p => {
      const h = Math.max(5, Math.min(25, (p.responseTime / 20)));
      const c = p.status === "En ligne" ? "#059669" : p.status === "Lente" ? "#D97706" : "#DC2626";
      return `<div style="width:12px;height:${h}px;background:${c};display:inline-block;margin-right:2px;border-radius:1px;vertical-align:bottom;"></div>`;
    }).join("");

    return `
      <tr>
        <td style="padding:10px 14px;">${appName}</td>
        <td style="padding:10px 14px;vertical-align:bottom;">${miniCharts}</td>
        <td style="padding:10px 14px;text-align:center;font-weight:700;">${avgRT} ms</td>
      </tr>`;
  }).join("") : "<tr><td colspan='3' style='padding:20px;text-align:center;color:#9CA3AF;'>Aucun historique disponible</td></tr>";

  // ── Construction du HTML Final ──────────────────────────
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport Auto Hall</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1F2937; margin: 0; padding: 0; }
        .header { background: #002D72; color: white; padding: 40px; text-align: left; border-bottom: 8px solid #E30613; }
        .header h1 { margin: 0; font-size: 24px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 30px; background: #F3F4F6; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center; }
        .stat-val { font-size: 24px; font-weight: bold; display: block; }
        .stat-label { font-size: 12px; color: #6B7280; text-transform: uppercase; }
        .content { padding: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; font-size: 12px; color: #6B7280; padding: 10px 14px; border-bottom: 2px solid #E5E7EB; }
        .no-print { position: fixed; top: 20px; right: 20px; background: #E30613; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-weight: bold; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <button class="no-print" onclick="window.print()">🖨️ Générer le PDF</button>
      
      <div class="header">
        <h1>🔍 RAPPORT DE MONITORING — AUTOHALL MAROC</h1>
        <p>Généré le ${now} | État global du système</p>
      </div>

      <div class="summary-grid">
        <div class="stat-card"><span class="stat-val" style="color:#002D72">${totalApps}</span><span class="stat-label">Total Apps</span></div>
        <div class="stat-card"><span class="stat-val" style="color:${availColor}">${availability}%</span><span class="stat-label">Disponibilité</span></div>
        <div class="stat-card"><span class="stat-val" style="color:#059669">${online}</span><span class="stat-label">En Ligne</span></div>
        <div class="stat-card"><span class="stat-val" style="color:#DC2626">${offline}</span><span class="stat-label">Hors Service</span></div>
      </div>

      <div class="content">
        <h2>📊 État détaillé par Catégorie</h2>
        <table>
          <thead>
            <tr>
              <th>Application</th><th>URL</th><th>Statut</th><th>Temps Rép.</th><th>Priorité</th><th style="text-align:right">Dernière Vérif</th>
            </tr>
          </thead>
          <tbody>${categoryRows}</tbody>
        </table>

        <h2 style="margin-top:40px;">📈 Tendances Récentes (Historique)</h2>
        <table style="width: 60%">
          <thead>
            <tr><th>Application</th><th>Graphique (8 pts)</th><th style="text-align:center">Moyenne</th></tr>
          </thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>

      <div style="text-align:center; padding:40px; color:#9CA3AF; font-size:12px;">
        © ${new Date().getFullYear()} Auto Hall Maroc - Système de Monitoring Interne
      </div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}