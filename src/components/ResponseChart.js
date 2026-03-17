import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// ══════════════════════════════════════════════════════════
//  ResponseChart.js — Historique temps de réponse d'une app
// ══════════════════════════════════════════════════════════

// ── Couleur du point selon le statut ──────────────────
const dotColor = (status) => {
  if (status === "En ligne")     return "#22C55E";
  if (status === "Lente")        return "#F59E0B";
  if (status === "Hors service") return "#EF4444";
  return "#94A3B8";
};

// ── Tooltip personnalisé ──────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const color = dotColor(d.status);

  return (
    <div style={{
      background: "#1E293B",
      border: `1px solid ${color}40`,
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "0.78rem",
      color: "#F1F5F9",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      minWidth: "160px",
    }}>
      <div style={{ fontWeight: 700, marginBottom: "6px", color }}>
        {d.status || "—"}
      </div>
      <div style={{ color: "#94A3B8", marginBottom: "4px" }}>🕐 {label}</div>
      <div style={{ fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 700 }}>
        {d.responseTime > 0 ? `${d.responseTime} ms` : "Hors service"}
      </div>
    </div>
  );
};

// ── Point coloré selon le statut ─────────────────────
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const color = dotColor(payload.status);
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

function ResponseChart({ data = [], appName = "" }) {

  // ── Préparer les données ───────────────────────────
  const chartData = useMemo(() =>
    data.map(point => ({
      ...point,
      // Les points "Hors service" → responseTime = null pour briser la ligne
      responseTime: point.status === "Hors service" ? null : (point.responseTime || 0),
      // Garder la valeur originale pour le tooltip
      rawRT: point.responseTime,
    })),
    [data]
  );

  // ── Stats ─────────────────────────────────────────
  const validPoints  = data.filter(p => p.responseTime > 0);
  const avgRT        = validPoints.length
    ? Math.round(validPoints.reduce((s, p) => s + p.responseTime, 0) / validPoints.length)
    : 0;
  const maxRT        = validPoints.length ? Math.max(...validPoints.map(p => p.responseTime)) : 0;
  const minRT        = validPoints.length ? Math.min(...validPoints.map(p => p.responseTime)) : 0;
  const uptime       = data.length
    ? Math.round((data.filter(p => p.status === "En ligne").length / data.length) * 100)
    : 0;
  const slowCount    = data.filter(p => p.status === "Lente").length;
  const offlineCount = data.filter(p => p.status === "Hors service").length;

  const slowThreshold = 300;

  if (!data || data.length === 0) {
    return (
      <div style={{
        background: "#F8FAFF",
        border: "1px solid #E5E7EB",
        borderRadius: "14px",
        padding: "40px 20px",
        textAlign: "center",
        color: "#9CA3AF",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📊</div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Aucune donnée disponible</div>
        <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
          Les données apparaîtront après le premier cycle de vérification
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E5E7EB",
      borderRadius: "14px",
      padding: "20px 22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>
            📈 Temps de réponse
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "2px" }}>
            {data.length} mesure{data.length > 1 ? "s" : ""} enregistrée{data.length > 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Mini stats ── */}
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { label: "Moy.", value: avgRT > 0 ? `${avgRT}ms` : "—", color: avgRT > slowThreshold ? "#F59E0B" : "#22C55E" },
            { label: "Max", value: maxRT > 0 ? `${maxRT}ms` : "—", color: "#EF4444" },
            { label: "Dispo", value: `${uptime}%`, color: uptime >= 90 ? "#22C55E" : uptime >= 70 ? "#F59E0B" : "#EF4444" },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: "center",
              background: "#F8FAFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "6px 12px",
            }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.62rem", color: "#9CA3AF", marginTop: "1px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Graphique ── */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>

          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}ms`}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Ligne seuil lenteur */}
          <ReferenceLine
            y={slowThreshold}
            stroke="#F59E0B"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: `Seuil ${slowThreshold}ms`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "#F59E0B",
            }}
          />

          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#rtGradient)"
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Légende statuts ── */}
      <div style={{
        display: "flex", gap: "14px", marginTop: "14px",
        padding: "10px 14px",
        background: "#F8FAFF",
        borderRadius: "8px",
        fontSize: "0.72rem",
      }}>
        {[
          { color: "#22C55E", label: `En ligne (${data.filter(p => p.status === "En ligne").length})` },
          { color: "#F59E0B", label: `Lente (${slowCount})` },
          { color: "#EF4444", label: `Hors service (${offlineCount})` },
          { color: "#F59E0B", style: "dashed", label: `Seuil lenteur (${slowThreshold}ms)` },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#6B7280" }}>
            {item.style === "dashed" ? (
              <div style={{ width: 16, height: 2, borderTop: `2px dashed ${item.color}` }} />
            ) : (
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
            )}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResponseChart;