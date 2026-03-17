import React, { useState, useEffect, useCallback } from "react";
import StatusTable from "./components/StatusTable";
import ResponseChart from "./components/ResponseChart";
import Notification from "./components/Notification";
import StatsPanel from "./components/StatsPanel";
import { monitoringService } from "./services/monitoringService";
import { exportToCSV } from "./utils/csvExport";
import AppManager from "./components/AppManager";
import logoAH from "./assets/images/AUTO.png"
import "./App.css";

function App() {
  const [apps, setApps]                   = useState([]);
  const [settings, setSettings]           = useState({});
  const [history, setHistory]             = useState({});
  const [notifications, setNotifications] = useState([]);
  const [selectedApp, setSelectedApp]     = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [showManager, setShowManager]     = useState(false);

  // ── Chargement config ──────────────────────────────
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/config.json");
        const config   = await response.json();

        const initialApps = config.apps.map(app => ({
          ...app,
          status:       "Unknown",
          responseTime: 0,
          lastCheck:    null,
          lastOnline:   null,
        }));

        setApps(initialApps);
        setSettings(config.settings);
        setIsLoading(false);

        monitoringService.startMonitoring(
          initialApps, setApps, setHistory, handleNotification, config.settings
        );
      } catch (error) {
        console.error("Erreur config:", error);
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  // ── Notification handler ───────────────────────────
  const handleNotification = useCallback((app, previousStatus, newStatus) => {

    // Son
    const playSound = (type) => {
      try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === "alert")   { osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.setValueAtTime(300, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.3, ctx.currentTime); }
        else if (type === "warning") { osc.frequency.setValueAtTime(300, ctx.currentTime); gain.gain.setValueAtTime(0.2, ctx.currentTime); }
        else { osc.frequency.setValueAtTime(500, ctx.currentTime); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.2, ctx.currentTime); }
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    };

    let type = "info";
    if (newStatus === "Hors service") { playSound("alert");   type = "error";   }
    else if (newStatus === "Lente")   { playSound("warning"); type = "warning"; }
    else if (newStatus === "En ligne" && previousStatus !== "En ligne" && previousStatus !== "Unknown") {
      playSound("success"); type = "success";
    }

    // Ajouter la notif — elle reste jusqu'à ce que l'utilisateur la ferme
    const notif = {
      id:             Date.now() + Math.random(),
      appName:        app.name,
      app:            app,
      message:        `${app.name} : ${previousStatus} → ${newStatus}`,
      type,
      timestamp:      new Date(),
    };

    setNotifications(prev => [notif, ...prev.slice(0, 49)]); // max 50
  }, []);

  // ── Actualisation manuelle ─────────────────────────
  const handleManualRefresh = async () => {
    setIsLoading(true);
    await monitoringService.checkAllApps(apps, setApps, setHistory, handleNotification, settings);
    setIsLoading(false);
  };

  // ── Fermer une notif ───────────────────────────────
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ── Tout effacer ──────────────────────────────────
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ── Écran de chargement ────────────────────────────
  if (isLoading) {
    return (
      <div className="app-loading">
        <div style={{ textAlign: "center" }}>
          <img
            src={logoAH}
            alt="Auto Hall"
            style={{ height: 60, filter: "brightness(0) invert(1)", marginBottom: 8 }}
          />
          <div className="spinner" style={{ margin: "24px auto 16px" }}></div>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", fontWeight: 600 }}>
            Chargement du monitoring...
          </p>
        </div>
      </div>
    );
  }

  // ── Compteurs pour le badge ────────────────────────
  const unreadErrors   = notifications.filter(n => n.type === "error").length;
  const unreadWarnings = notifications.filter(n => n.type === "warning").length;
  const badgeCount     = notifications.length;

  return (
    <div className="app">
      {showManager && <AppManager onClose={() => { setShowManager(false); handleManualRefresh(); }} />}

      {/* ══ HEADER ══ */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* <img
            src={logoAH}
            // alt="Auto Hall"
            style={{ height: 36, filter: "brightness(0) invert(1)" }}
          /> */}
          <img src={logoAH} alt="logo" style={{ height: 40 , borderRadius : "10px" }} />
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.25)" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.2px" }}>
              Moniteur d'Applications
            </div>
            <div style={{ fontSize: "0.65rem", opacity: 0.55, marginTop: 1 }}>
              {apps.length} applications surveillées
            </div>
          </div>
        </div>

        <div className="controls">
          <button className="btn btn-secondary" onClick={() => setShowManager(true)}>
            ⚙️ Gérer les Apps
          </button>
          <button className="btn btn-primary" onClick={handleManualRefresh} disabled={isLoading}>
            {isLoading ? "⏳ Actualisation..." : "🔄 Actualiser"}
          </button>
          <button className="btn btn-secondary" onClick={() => exportToCSV(apps, history)}>
            📄 Rapport PDF
          </button>
        </div>
      </header>

      <div className="app-content">

        {/* ══ PANNEAU PRINCIPAL ══ */}
        <div className="main-panel">
          <StatsPanel apps={apps} />

          <StatusTable
            apps={apps}
            onAppSelect={setSelectedApp}
            selectedApp={selectedApp}
            checkInterval={settings.checkInterval || 30000}
          />

          {selectedApp && (
            <div className="chart-section">
              <h3>📈 Historique — {selectedApp.name}</h3>
              <ResponseChart
                data={history[selectedApp.name] || []}
                appName={selectedApp.name}
              />
            </div>
          )}
        </div>

        {/* ══ TABLEAU DE NOTIFICATIONS ══ */}
        <div className="notifications-panel">

          {/* En-tête du panel */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
                🔔 Notifications
              </h3>
              {/* Badge compteur */}
              {badgeCount > 0 && (
                <div style={{ display: "flex", gap: "4px" }}>
                  {unreadErrors > 0 && (
                    <span style={{
                      background: "#EF4444", color: "white",
                      borderRadius: "99px", padding: "1px 7px",
                      fontSize: "0.65rem", fontWeight: 700,
                    }}>{unreadErrors}</span>
                  )}
                  {unreadWarnings > 0 && (
                    <span style={{
                      background: "#F59E0B", color: "white",
                      borderRadius: "99px", padding: "1px 7px",
                      fontSize: "0.65rem", fontWeight: 700,
                    }}>{unreadWarnings}</span>
                  )}
                </div>
              )}
            </div>

            {/* Bouton tout effacer */}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                style={{
                  background: "none",
                  border: "1px solid #E5E7EB",
                  borderRadius: "7px",
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.target.style.background = "#FEF2F2"; e.target.style.color = "#EF4444"; e.target.style.borderColor = "#FECACA"; }}
                onMouseLeave={e => { e.target.style.background = "none"; e.target.style.color = "#6B7280"; e.target.style.borderColor = "#E5E7EB"; }}
                title="Effacer toutes les notifications"
              >
                🗑️ Tout effacer
              </button>
            )}
          </div>

          {/* Liste des notifications — scrollable */}
          <div
            className="notifications-list"
            style={{
              overflowY: "auto",
              maxHeight: "calc(100vh - 200px)",
              paddingRight: "2px",
            }}
          >
            {notifications.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9CA3AF",
              }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>🔕</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Aucune notification</div>
                <div style={{ fontSize: "0.7rem", marginTop: "4px" }}>
                  Les alertes apparaîtront ici
                </div>
              </div>
            ) : (
              notifications.map(notif => (
                <Notification
                  key={notif.id}
                  notification={notif}
                  onClose={() => removeNotification(notif.id)}
                />
              ))
            )}
          </div>

          {/* Compteur total en bas */}
          {notifications.length > 0 && (
            <div style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid #F3F4F6",
              fontSize: "0.7rem",
              color: "#9CA3AF",
              textAlign: "center",
            }}>
              {notifications.length} notification{notifications.length > 1 ? "s" : ""} · Cliquer ✕ pour fermer
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;