import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

const CATEGORIES = ["Ressources Humaines", "Stock", "Ventes", "Après-Vente", "Finance", "IT & Système"];
const PRIORITIES = ["critical", "high", "medium", "low"];
const ENVS       = ["Production", "Pré-production"];
const ICONS      = ["👥","🗓️","💰","🚗","🚙","🔧","🤝","📦","📋","🛠️","📅","🔩","📊","🧾","📈","⚙️","👤","🔍","🔗"];

const PRIORITY_LABEL = { critical: "Critique", high: "Haute", medium: "Moyenne", low: "Basse" };
const PRIORITY_COLOR = { critical: "#DC2626", high: "#D97706", medium: "#2563EB", low: "#6B7280" };

const empty = {
  name: "", url: "", icon: "🔗", category: "Ressources Humaines",
  description: "", environment: "Production", priority: "medium",
  threshold_ms: 300, timeout_ms: 5000, cause: "", solution: "",
};

function AppManager({ onClose }) {
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editApp, setEditApp]   = useState(null);
  const [form, setForm]         = useState(empty);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg]           = useState(null);

  // ── Charger les apps ─────────────────────────────
  const loadApps = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/apps`);
      const data = await res.json();
      setApps(data);
    } catch {
      showMsg("❌ Impossible de contacter l'API", "error");
    }
    setLoading(false);
  };

  useEffect(() => { loadApps(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  // ── Ouvrir formulaire ajout ───────────────────────
  const handleAdd = () => {
    setEditApp(null);
    setForm(empty);
    setShowForm(true);
  };

  // ── Ouvrir formulaire modification ───────────────
  const handleEdit = (app) => {
    setEditApp(app);
    setForm({
      name:         app.name        || "",
      url:          app.url         || "",
      icon:         app.icon        || "🔗",
      category:     app.category    || "Ressources Humaines",
      description:  app.description || "",
      environment:  app.environment || "Production",
      priority:     app.priority    || "medium",
      threshold_ms: app.threshold_ms || 300,
      timeout_ms:   app.timeout_ms   || 5000,
      cause:        app.cause        || "",
      solution:     app.solution     || "",
    });
    setShowForm(true);
  };

  // ── Sauvegarder (ajout ou modif) ─────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      showMsg("⚠️ Nom et URL sont obligatoires", "error");
      return;
    }
    setSaving(true);
    try {
      const method = editApp ? "PUT" : "POST";
      const url    = editApp ? `${API}/api/apps/${editApp.id}` : `${API}/api/apps`;
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showMsg(editApp ? `✅ "${form.name}" modifiée` : `✅ "${form.name}" ajoutée`);
      setShowForm(false);
      loadApps();
    } catch {
      showMsg("❌ Erreur lors de la sauvegarde", "error");
    }
    setSaving(false);
  };

  // ── Supprimer ─────────────────────────────────────
  const handleDelete = async (app) => {
    if (!window.confirm(`Supprimer "${app.name}" ?`)) return;
    setDeleting(app.id);
    try {
      await fetch(`${API}/api/apps/${app.id}`, { method: "DELETE" });
      showMsg(`🗑️ "${app.name}" supprimée`);
      loadApps();
    } catch {
      showMsg("❌ Erreur suppression", "error");
    }
    setDeleting(null);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Grouper par catégorie ─────────────────────────
  const grouped = apps.reduce((acc, app) => {
    const cat = app.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(app);
    return acc;
  }, {});

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 1000, display: "flex", alignItems: "flex-start",
      justifyContent: "center", padding: "24px", overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", width: "100%",
        maxWidth: "900px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        marginBottom: "24px",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg,#001F5C,#0055CC)",
          padding: "20px 24px", borderRadius: "16px 16px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem" }}>
              ⚙️ Gestion des Applications
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "2px" }}>
              {apps.length} application{apps.length > 1 ? "s" : ""} surveillée{apps.length > 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleAdd} style={{
              background: "white", color: "#0055CC", border: "none",
              borderRadius: "8px", padding: "8px 16px", fontWeight: 700,
              fontSize: "0.82rem", cursor: "pointer",
            }}>+ Ajouter</button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.15)", color: "white", border: "none",
              borderRadius: "8px", padding: "8px 14px", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
            }}>✕</button>
          </div>
        </div>

        {/* ── Message feedback ── */}
        {msg && (
          <div style={{
            margin: "16px 24px 0",
            padding: "10px 16px",
            background: msg.type === "error" ? "#FEF2F2" : "#F0FDF4",
            border: `1px solid ${msg.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            borderRadius: "8px",
            color: msg.type === "error" ? "#991B1B" : "#166534",
            fontSize: "0.82rem", fontWeight: 600,
          }}>{msg.text}</div>
        )}

        {/* ── Formulaire ajout/modif ── */}
        {showForm && (
          <div style={{
            margin: "16px 24px",
            padding: "20px",
            background: "#F8FAFF",
            border: "1px solid #DBEAFE",
            borderRadius: "12px",
          }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1E40AF", marginBottom: "16px" }}>
              {editApp ? `✏️ Modifier — ${editApp.name}` : "➕ Nouvelle Application"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

              {/* Nom */}
              <div>
                <label style={lbl}>Nom *</label>
                <input style={inp} value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ex: Portail RH" />
              </div>

              {/* URL */}
              <div>
                <label style={lbl}>URL *</label>
                <input style={inp} value={form.url} onChange={e => f("url", e.target.value)} placeholder="http://localhost:3001/rh" />
              </div>

              {/* Icône */}
              <div>
                <label style={lbl}>Icône</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => f("icon", ic)} style={{
                      fontSize: "1.2rem", padding: "4px 6px", border: `2px solid ${form.icon === ic ? "#0055CC" : "#E5E7EB"}`,
                      borderRadius: "6px", background: form.icon === ic ? "#EFF6FF" : "#fff", cursor: "pointer",
                    }}>{ic}</button>
                  ))}
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label style={lbl}>Catégorie</label>
                <select style={inp} value={form.category} onChange={e => f("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Priorité */}
              <div>
                <label style={lbl}>Priorité</label>
                <select style={inp} value={form.priority} onChange={e => f("priority", e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
              </div>

              {/* Environnement */}
              <div>
                <label style={lbl}>Environnement</label>
                <select style={inp} value={form.environment} onChange={e => f("environment", e.target.value)}>
                  {ENVS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>

              {/* Seuil lenteur */}
              <div>
                <label style={lbl}>Seuil lenteur (ms)</label>
                <input style={inp} type="number" value={form.threshold_ms} onChange={e => f("threshold_ms", parseInt(e.target.value))} />
              </div>

              {/* Timeout */}
              <div>
                <label style={lbl}>Timeout (ms)</label>
                <input style={inp} type="number" value={form.timeout_ms} onChange={e => f("timeout_ms", parseInt(e.target.value))} />
              </div>

              {/* Description */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Description</label>
                <input style={inp} value={form.description} onChange={e => f("description", e.target.value)} placeholder="Courte description de l'app" />
              </div>

              {/* Cause */}
              <div>
                <label style={lbl}>Cause connue (optionnel)</label>
                <input style={inp} value={form.cause} onChange={e => f("cause", e.target.value)} placeholder="Ex: Index manquant sur la table..." />
              </div>

              {/* Solution */}
              <div>
                <label style={lbl}>Solution (optionnel)</label>
                <input style={inp} value={form.solution} onChange={e => f("solution", e.target.value)} placeholder="Ex: Redémarrer le service..." />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{
                background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB",
                borderRadius: "8px", padding: "9px 20px", fontWeight: 600,
                fontSize: "0.82rem", cursor: "pointer",
              }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: "#0055CC", color: "white", border: "none",
                borderRadius: "8px", padding: "9px 24px", fontWeight: 700,
                fontSize: "0.82rem", cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}>{saving ? "⏳ Sauvegarde..." : editApp ? "✅ Modifier" : "✅ Ajouter"}</button>
            </div>
          </div>
        )}

        {/* ── Liste des apps ── */}
        <div style={{ padding: "16px 24px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⏳</div>
              Chargement...
            </div>
          ) : Object.entries(grouped).map(([cat, catApps]) => (
            <div key={cat} style={{ marginBottom: "20px" }}>
              {/* Titre catégorie */}
              <div style={{
                fontSize: "0.72rem", fontWeight: 700, color: "#6B7280",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px",
              }}>
                {cat}
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ color: "#9CA3AF", fontWeight: 500 }}>{catApps.length} app{catApps.length > 1 ? "s" : ""}</span>
              </div>

              {/* Apps */}
              {catApps.map(app => (
                <div key={app.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "#F8FAFF",
                  border: "1px solid #E5E7EB", borderRadius: "10px",
                  marginBottom: "8px",
                }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{app.icon}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>{app.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280", fontFamily: "monospace", marginTop: "2px" }}>{app.url}</div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <span style={{
                      background: app.environment === "Production" ? "#FEF2F2" : "#FFFBEB",
                      color: app.environment === "Production" ? "#DC2626" : "#D97706",
                      padding: "2px 8px", borderRadius: "99px", fontSize: "0.65rem", fontWeight: 700,
                    }}>{app.environment}</span>
                    <span style={{
                      background: "#F3F4F6", color: PRIORITY_COLOR[app.priority],
                      padding: "2px 8px", borderRadius: "99px", fontSize: "0.65rem", fontWeight: 700,
                    }}>{PRIORITY_LABEL[app.priority]}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button onClick={() => handleEdit(app)} style={{
                      background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE",
                      borderRadius: "7px", padding: "6px 12px", fontSize: "0.75rem",
                      fontWeight: 700, cursor: "pointer",
                    }}>✏️ Modifier</button>
                    <button onClick={() => handleDelete(app)} disabled={deleting === app.id} style={{
                      background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA",
                      borderRadius: "7px", padding: "6px 12px", fontSize: "0.75rem",
                      fontWeight: 700, cursor: "pointer",
                      opacity: deleting === app.id ? 0.5 : 1,
                    }}>{deleting === app.id ? "⏳" : "🗑️"}</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles inline réutilisables ──────────────────────
const lbl = {
  display: "block", fontSize: "0.72rem", fontWeight: 700,
  color: "#374151", marginBottom: "4px",
};
const inp = {
  width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB",
  borderRadius: "8px", fontSize: "0.82rem", color: "#111827",
  background: "#fff", boxSizing: "border-box", outline: "none",
};

export default AppManager;