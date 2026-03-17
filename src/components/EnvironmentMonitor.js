import React, { useState, useEffect, useCallback } from "react";
import StatusTable from "./StatusTable";
import ResponseChart from "./ResponseChart";
import Notification from "./Notification";
import StatsPanel from "./StatsPanel";
import { monitoringService } from "../services/monitoringService";
import { exportToCSV } from "../utils/csvExport";

function EnvironmentMonitor({ environment, apps, settings, onNotification }) {
  const [environmentApps, setEnvironmentApps] = useState([]);
  const [history, setHistory] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser les applications pour cet environnement
  useEffect(() => {
    const initialApps = apps.map((app) => ({
      ...app,
      status: "Unknown",
      responseTime: 0,
      lastCheck: null,
      lastOnline: null,
    }));

    setEnvironmentApps(initialApps);

    // Démarrer la surveillance pour cet environnement
    monitoringService.startMonitoring(
      initialApps,
      setEnvironmentApps,
      setHistory,
      handleNotification,
      settings
    );

    // Nettoyer à la destruction
    return () => {
      monitoringService.stopMonitoring();
    };
  }, [apps, settings]);

  const handleNotification = useCallback((app, previousStatus, newStatus) => {
    // Sons pour les notifications
    const playSound = (soundType) => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (soundType === "alert") {
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        } else if (soundType === "warning") {
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        } else {
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log("Audio non supporté");
      }
    };

    // Notification du navigateur
    const showBrowserNotification = (title, message) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      }
    };

    // Demander la permission pour les notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let notificationType = "info";
    let browserTitle = `Moniteur ${environment}`;
    let browserMessage = "";

    if (newStatus === "Hors service") {
      playSound("alert");
      notificationType = "error";
      browserTitle = `🚨 ${environment} - Hors Service`;
      browserMessage = `${app.name} est hors service`;
    } else if (newStatus === "Lente") {
      playSound("warning");
      notificationType = "warning";
      browserTitle = `⚠️ ${environment} - Application Lente`;
      browserMessage = `${app.name} répond lentement`;
    } else if (
      newStatus === "En ligne" &&
      (previousStatus === "Hors service" || previousStatus === "Lente")
    ) {
      playSound("success");
      notificationType = "success";
      browserTitle = `✅ ${environment} - Rétablie`;
      browserMessage = `${app.name} est de nouveau en ligne`;
    }

    if (
      newStatus === "Hors service" ||
      newStatus === "Lente" ||
      (newStatus === "En ligne" &&
        (previousStatus === "Hors service" || previousStatus === "Lente"))
    ) {
      const notification = {
        id: Date.now(),
        appName: app.name,
        environment: environment,
        message: `${environment} - ${app.name} : ${previousStatus} → ${newStatus}`,
        type: notificationType,
        timestamp: new Date(),
      };

      setNotifications((prev) => [notification, ...prev.slice(0, 9)]);

      // Notifier le composant parent
      if (onNotification) {
        onNotification(notification);
      }

      // Notification du navigateur
      if (browserMessage) {
        showBrowserNotification(browserTitle, browserMessage);
      }
    }
  }, [environment, onNotification]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await monitoringService.checkAllApps(environmentApps, setEnvironmentApps, setHistory, handleNotification, settings);
    setIsLoading(false);
  };

  const handleExportCSV = () => {
    exportToCSV(environmentApps, history, environment);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const getEnvironmentTitle = () => {
    switch (environment) {
      case "prod":
        return "🔴 Production";
      case "preprod":
        return "🟡 Pré-Production";
      default:
        return environment;
    }
  };

  const getEnvironmentClass = () => {
    switch (environment) {
      case "prod":
        return "environment-prod";
      case "preprod":
        return "environment-preprod";
      default:
        return "";
    }
  };

  return (
    <div className={`environment-monitor ${getEnvironmentClass()}`}>
      <header className="app-header">
        <h1>{getEnvironmentTitle()}</h1>
        <div className="controls">
          <button
            className="btn btn-primary"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Actualisation..." : "Actualiser"}
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            Exporter CSV
          </button>
        </div>
      </header>

      <div className="app-content">
        <div className="main-panel">
          <StatsPanel apps={environmentApps} environment={environment} />
          
          <StatusTable
            apps={environmentApps}
            onAppSelect={setSelectedApp}
            selectedApp={selectedApp}
          />

          {selectedApp && (
            <div className="chart-section">
              <h3>Historique des temps de réponse - {selectedApp.name}</h3>
              <ResponseChart
                data={history[selectedApp.name] || []}
                appName={selectedApp.name}
              />
            </div>
          )}
        </div>

        <div className="notifications-panel">
          <h3>Notifications {environment}</h3>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <Notification
                key={notification.id}
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            ))}
            {notifications.length === 0 && (
              <p className="no-notifications">Aucune notification</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnvironmentMonitor;