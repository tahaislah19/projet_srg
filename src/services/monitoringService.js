// ═══════════════════════════════════════════════════════
//  monitoringService.js
//  Récupère les données depuis FastAPI : http://localhost:8000
// ═══════════════════════════════════════════════════════

const API_URL = "http://localhost:8000";

let intervalId     = null;
let previousStates = {};

// ── Récupérer le statut de toutes les apps ─────────────
const checkAllApps = async (apps, setApps, setHistory, onNotify, settings = {}) => {
  const { slowThreshold = 300 } = settings;

  try {
    const response = await fetch(`${API_URL}/api/status`, {
      method: "GET",
      cache:  "no-cache",
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    // ── Mettre à jour les apps avec les données du backend ──
    const updated = data.map(item => ({
      // Garder les infos de config.json (icon, category, etc.)
      ...(apps.find(a => a.name === item.name) || {}),
      ...item,
      lastCheck: new Date().toISOString(),
    }));

    // ── Notifications sur changement de statut ──────────
    updated.forEach(app => {
      const prev = previousStates[app.name];
      const curr = app.status;

      if (prev !== undefined && prev !== curr) {
        onNotify && onNotify(app, prev, curr);
      }
      if (prev === undefined && (curr === "Hors service" || curr === "Lente")) {
        onNotify && onNotify(app, "Unknown", curr);
      }
      previousStates[app.name] = curr;
    });

    setApps && setApps(updated);

    // ── Historique ──────────────────────────────────────
    if (setHistory) {
      setHistory(prev => {
        const next = { ...prev };
        updated.forEach(app => {
          if (!next[app.name]) next[app.name] = [];
          next[app.name] = [
            ...next[app.name].slice(-29),
            {
              time:         new Date().toLocaleTimeString("fr-FR"),
              responseTime: app.responseTime || 0,
              status:       app.status,
            },
          ];
        });
        return next;
      });
    }

    return updated;

  } catch (err) {
    console.error("❌ Impossible de contacter l'API FastAPI :", err.message);

    // Si l'API est down, marquer toutes les apps comme inconnues
    const fallback = apps.map(a => ({
      ...a,
      status:       "Unknown",
      responseTime: 0,
      lastCheck:    new Date().toISOString(),
      error:        "API backend inaccessible",
    }));
    setApps && setApps(fallback);
    return fallback;
  }
};

// ── checkApp (compatibilité) ───────────────────────────
const checkApp = async (app) => {
  try {
    const res  = await fetch(`${API_URL}/api/status`);
    const data = await res.json();
    return data.find(d => d.name === app.name) || app;
  } catch {
    return { ...app, status: "Unknown" };
  }
};

// ── startMonitoring ────────────────────────────────────
const startMonitoring = (apps, setApps, setHistory, onNotify, settings = {}) => {
  const { checkInterval = 30000 } = settings;

  previousStates = {};
  if (intervalId) clearInterval(intervalId);

  // Première vérification immédiate
  checkAllApps(apps, setApps, setHistory, onNotify, settings);

  // Vérifications périodiques
  intervalId = setInterval(() => {
    checkAllApps(apps, setApps, setHistory, onNotify, settings);
  }, checkInterval);

  return () => { if (intervalId) clearInterval(intervalId); };
};

// ── Exports ────────────────────────────────────────────
export const monitoringService = { checkApp, checkAllApps, startMonitoring };
export { checkApp, checkAllApps, startMonitoring };