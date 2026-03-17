import React, { useEffect, useState } from "react";

// ══════════════════════════════════════════════════════
//  Notification.js — reste dans le tableau, dismiss manuel
// ══════════════════════════════════════════════════════

const TYPE_CONFIG = {
  error: {
    icon: "🔴",
    label: "Hors service",
    bg: "#FEF2F2",
    border: "#FECACA",
    color: "#991B1B",
    bar: "#EF4444",
  },
  warning: {
    icon: "🟡",
    label: "Lente",
    bg: "#FFFBEB",
    border: "#FDE68A",
    color: "#92400E",
    bar: "#F59E0B",
  },
  success: {
    icon: "🟢",
    label: "Rétablie",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    color: "#166534",
    bar: "#22C55E",
  },
  info: {
    icon: "🔵",
    label: "Info",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    color: "#1E40AF",
    bar: "#3B82F6",
  },
};

function Notification({ notification, onClose }) {
  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cfg         = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const hasCause    = notification.app?.cause;
  const hasSolution = notification.app?.solution;

  useEffect(() => {
    // Animation entrée uniquement — PAS d'auto-fermeture
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.bar}`,
        borderRadius: "10px",
        padding: "11px 13px",
        marginBottom: "8px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(16px)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
        position: "relative",
        cursor: hasCause ? "pointer" : "default",
      }}
      onClick={() => hasCause && setExpanded(e => !e)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span style={{ fontSize: "1rem", lineHeight: 1.4, flexShrink: 0 }}>{cfg.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Nom + bouton fermer ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontWeight: 700, fontSize: "0.8rem", color: cfg.color }}>
              {notification.appName}
            </span>
            <button
              onClick={e => { e.stopPropagation(); handleClose(); }}
              title="Supprimer"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: cfg.color, opacity: 0.55, fontSize: "0.85rem",
                padding: "0 0 0 8px", lineHeight: 1, flexShrink: 0,
              }}
            >✕</button>
          </div>

          {/* ── Statut + heure ── */}
          <div style={{ fontSize: "0.72rem", color: cfg.color, opacity: 0.8, marginTop: "2px" }}>
            {cfg.label} · {notification.timestamp?.toLocaleTimeString("fr-FR") || ""}
          </div>

          {/* ── Cause ── */}
          {hasCause && (
            <div style={{
              fontSize: "0.71rem",
              color: cfg.color,
              marginTop: "6px",
              padding: "5px 8px",
              background: "rgba(0,0,0,0.04)",
              borderRadius: "6px",
              lineHeight: 1.45,
            }}>
              ⚠️ <strong>Cause :</strong> {notification.app.cause}
            </div>
          )}

          {/* ── Solution (toggle) ── */}
          {expanded && hasSolution && (
            <div style={{
              fontSize: "0.71rem",
              color: "#166534",
              marginTop: "5px",
              padding: "5px 8px",
              background: "rgba(34,197,94,0.08)",
              borderRadius: "6px",
              lineHeight: 1.45,
              borderLeft: "3px solid #22C55E",
            }}>
              ✅ <strong>Solution :</strong> {notification.app.solution}
            </div>
          )}

          {/* ── Hint clic ── */}
          {hasCause && hasSolution && (
            <div style={{ fontSize: "0.63rem", color: cfg.color, opacity: 0.4, marginTop: "4px" }}>
              {expanded ? "▲ Masquer la solution" : "▼ Voir la solution"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Notification;