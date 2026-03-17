from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import requests
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import time
import datetime
import os

import models
from database import engine, get_db

# ── Créer les tables au démarrage ─────────────────────
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auto Hall Monitoring API", version="1.0.0")

# ── CORS pour React ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════
#  📧 CONFIGURATION EMAIL GMAIL
#  ⚠️  Remplir avant utilisation
# ══════════════════════════════════════════════════════
EMAIL_CONFIG = {
    "expediteur":  os.getenv("EMAIL_USER", "votre.email@gmail.com"),
    "password":    os.getenv("EMAIL_PASS", "xxxx xxxx xxxx xxxx"),  # App Password Gmail
    "destinataires": {
        "Ressources Humaines": os.getenv("EMAIL_RH",    "rh@autohall.ma"),
        "Stock":               os.getenv("EMAIL_STOCK",  "stock@autohall.ma"),
        "Ventes":              os.getenv("EMAIL_VENTES", "ventes@autohall.ma"),
        "Après-Vente":         os.getenv("EMAIL_SAV",    "sav@autohall.ma"),
        "Finance":             os.getenv("EMAIL_FIN",    "finance@autohall.ma"),
        "IT & Système":        os.getenv("EMAIL_IT",     "it@autohall.ma"),
    },
    "admin": os.getenv("EMAIL_ADMIN", "admin@autohall.ma"),
}

# Cooldown anti-spam : 1 email / 10min par app
email_cooldown = {}
COOLDOWN_SEC   = 600

# ── Schémas Pydantic ──────────────────────────────────
class AppCreate(BaseModel):
    name:         str
    url:          str
    icon:         Optional[str] = "🔗"
    category:     Optional[str] = "Général"
    description:  Optional[str] = None
    environment:  Optional[str] = "Production"
    priority:     Optional[str] = "medium"
    threshold_ms: Optional[int] = 300
    timeout_ms:   Optional[int] = 5000
    cause:        Optional[str] = None
    solution:     Optional[str] = None

class AppUpdate(BaseModel):
    name:         Optional[str] = None
    url:          Optional[str] = None
    icon:         Optional[str] = None
    category:     Optional[str] = None
    description:  Optional[str] = None
    environment:  Optional[str] = None
    priority:     Optional[str] = None
    threshold_ms: Optional[int] = None
    timeout_ms:   Optional[int] = None
    cause:        Optional[str] = None
    solution:     Optional[str] = None
    active:       Optional[bool] = None

# ══════════════════════════════════════════════════════
#  📧 FONCTIONS EMAIL
# ══════════════════════════════════════════════════════
def send_email(to: str, subject: str, html: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"Auto Hall Monitoring <{EMAIL_CONFIG['expediteur']}>"
        msg["To"]      = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_CONFIG["expediteur"], EMAIL_CONFIG["password"])
            server.sendmail(EMAIL_CONFIG["expediteur"], to, msg.as_string())

        print(f"📧 Email envoyé à {to} : {subject}")
    except Exception as e:
        print(f"📧 Erreur email : {e}")


def build_alert_html(app_name, category, status, cause, solution, response_time, heure):
    is_down  = status == "Hors service"
    emoji    = "🔴" if is_down else "🟡"
    color    = "#DC2626" if is_down else "#D97706"
    bg_color = "#FEF2F2" if is_down else "#FFFBEB"
    label    = "HORS SERVICE" if is_down else "LENTE"

    cause_row    = f"<tr><td style='padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;'>CAUSE</td><td style='padding:10px 14px;font-size:0.82rem;color:#374151;border-bottom:1px solid #E5E7EB;'>{cause}</td></tr>" if cause else ""
    solution_row = f"<tr style='background:#F0FDF4;'><td style='padding:10px 14px;font-size:0.78rem;color:#166534;font-weight:700;'>SOLUTION</td><td style='padding:10px 14px;font-size:0.82rem;color:#166534;'>{solution}</td></tr>" if solution else ""
    rt_text      = f" · Temps de réponse : <strong>{response_time}ms</strong>" if response_time > 0 else ""

    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#001F5C,#0055CC);padding:28px 32px;text-align:center;">
    <div style="color:white;font-size:1.4rem;font-weight:800;">🔍 Auto Hall · Monitoring</div>
    <div style="color:rgba(255,255,255,0.6);font-size:0.8rem;margin-top:4px;">Système de surveillance des applications</div>
  </div>
  <div style="background:{bg_color};border-left:5px solid {color};margin:24px;border-radius:10px;padding:20px 22px;">
    <div style="font-size:1.3rem;font-weight:900;color:{color};margin-bottom:6px;">{emoji} {app_name} — {label}</div>
    <div style="font-size:0.82rem;color:#6B7280;">Détecté le <strong>{heure}</strong>{rt_text}</div>
  </div>
  <div style="padding:0 24px 24px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
      <tr style="background:#F8FAFF;">
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;width:35%;border-bottom:1px solid #E5E7EB;">APPLICATION</td>
        <td style="padding:10px 14px;font-size:0.85rem;color:#111827;font-weight:700;border-bottom:1px solid #E5E7EB;">{app_name}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;">DÉPARTEMENT</td>
        <td style="padding:10px 14px;font-size:0.85rem;color:#111827;border-bottom:1px solid #E5E7EB;">{category}</td>
      </tr>
      <tr style="background:#F8FAFF;">
        <td style="padding:10px 14px;font-size:0.78rem;color:#6B7280;font-weight:700;border-bottom:1px solid #E5E7EB;">STATUT</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;"><span style="background:{color};color:white;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;">{label}</span></td>
      </tr>
      {cause_row}
      {solution_row}
    </table>
    <div style="text-align:center;margin-top:20px;">
      <a href="http://localhost:3021" style="background:#0055CC;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.85rem;display:inline-block;">🔍 Voir le Dashboard</a>
    </div>
  </div>
  <div style="background:#F8FAFF;padding:16px;text-align:center;font-size:0.72rem;color:#9CA3AF;border-top:1px solid #E5E7EB;">Auto Hall Maroc · Monitoring automatique · {heure}</div>
</div></body></html>"""


def send_alert(app_name, category, status, cause, solution, response_time):
    cooldown_key = f"{app_name}-{status}"
    now = time.time()
    if cooldown_key in email_cooldown and (now - email_cooldown[cooldown_key]) < COOLDOWN_SEC:
        print(f"📧 [COOLDOWN] Email ignoré pour {app_name}")
        return
    email_cooldown[cooldown_key] = now

    dest  = EMAIL_CONFIG["destinataires"].get(category, EMAIL_CONFIG["admin"])
    heure = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
    emoji = "🔴" if status == "Hors service" else "🟡"
    label = "HORS SERVICE" if status == "Hors service" else "LENTE"
    html  = build_alert_html(app_name, category, status, cause, solution, response_time, heure)

    send_email(dest, f"{emoji} ALERTE — {app_name} est {label} | Auto Hall", html)


def send_recovery(app_name, category, response_time):
    dest  = EMAIL_CONFIG["destinataires"].get(category, EMAIL_CONFIG["admin"])
    heure = datetime.datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
    rt    = f" · Temps de réponse : <strong>{response_time}ms</strong>" if response_time > 0 else ""
    html  = f"""<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#001F5C,#0055CC);padding:28px 32px;text-align:center;">
    <div style="color:white;font-size:1.4rem;font-weight:800;">🔍 Auto Hall · Monitoring</div>
  </div>
  <div style="background:#F0FDF4;border-left:5px solid #22C55E;margin:24px;border-radius:10px;padding:20px 22px;">
    <div style="font-size:1.3rem;font-weight:900;color:#166534;margin-bottom:6px;">✅ {app_name} — RÉTABLI</div>
    <div style="font-size:0.82rem;color:#6B7280;">Rétabli le <strong>{heure}</strong>{rt}</div>
  </div>
  <div style="padding:0 24px 24px;text-align:center;">
    <a href="http://localhost:3021" style="background:#0055CC;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.85rem;display:inline-block;">🔍 Voir le Dashboard</a>
  </div>
  <div style="background:#F8FAFF;padding:16px;text-align:center;font-size:0.72rem;color:#9CA3AF;border-top:1px solid #E5E7EB;">Auto Hall Maroc · Monitoring automatique</div>
</div></body></html>"""
    send_email(dest, f"✅ RÉTABLI — {app_name} fonctionne à nouveau | Auto Hall", html)


# ══════════════════════════════════════════════════════
#  🔍 ROUTES MONITORING
# ══════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"message": "Auto Hall Monitoring API", "version": "1.0.0", "status": "running"}


@app.get("/api/status")
def get_all_status(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Vérifie toutes les apps et retourne leur statut en temps réel"""

    apps = db.query(models.Application).filter(models.Application.active == True).all()

    # Données de démo si la table est vide
    if not apps:
        HOST = "192.168.8.38"
        demo_apps = [
            models.Application(name="Portail RH",           url=f"http://{HOST}:3001/rh",           icon="👥", category="Ressources Humaines", priority="critical", threshold_ms=300, cause="Index manquant sur conges_employes", solution="Ajouter un index SQL + redémarrer PostgreSQL"),
            models.Application(name="Gestion des Congés",   url=f"http://{HOST}:3001/conges",       icon="🗓️", category="Ressources Humaines", priority="high",     threshold_ms=300),
            models.Application(name="Stock Véhicules Neufs",url=f"http://{HOST}:3002/stock/neufs",  icon="🚗", category="Stock",               priority="critical", threshold_ms=300),
            models.Application(name="Stock Pièces",         url=f"http://{HOST}:3002/stock/pieces", icon="🔧", category="Stock",               priority="high",     threshold_ms=300, cause="Connexion DB refusée port 5432", solution="net start postgresql-x64-18"),
            models.Application(name="CRM Clients",          url=f"http://{HOST}:3003/crm",          icon="🤝", category="Ventes",              priority="critical", threshold_ms=300),
            models.Application(name="Gestion Commandes",    url=f"http://{HOST}:3003/commandes",    icon="📦", category="Ventes",              priority="critical", threshold_ms=300),
            models.Application(name="Gestion SAV",          url=f"http://{HOST}:3004/sav",          icon="🛠️", category="Après-Vente",        priority="high",     threshold_ms=300),
            models.Application(name="Rendez-Vous Atelier",  url=f"http://{HOST}:3004/atelier",      icon="📅", category="Après-Vente",        priority="medium",   threshold_ms=300, cause="Module email surchargé", solution="Limiter l'envoi à 100 mails/min"),
            models.Application(name="Stock Occasion",       url=f"http://{HOST}:3002/stock/occasion",icon="🚙",category="Stock",               priority="high",     threshold_ms=300),
            models.Application(name="Devis & Offres",       url=f"http://{HOST}:3003/devis",        icon="📋", category="Ventes",              priority="high",     threshold_ms=300),
            models.Application(name="Suivi Réparations",    url=f"http://{HOST}:3004/reparations",  icon="🔩", category="Après-Vente",        priority="medium",   threshold_ms=300),
            models.Application(name="Gestion de la Paie",   url=f"http://{HOST}:3001/rh/paie",      icon="💰", category="Ressources Humaines", priority="critical", threshold_ms=300),
        ]
        db.add_all(demo_apps)
        db.commit()
        apps = db.query(models.Application).filter(models.Application.active == True).all()

    results = []
    prev_incidents = {
        inc.app_id: inc
        for inc in db.query(models.Incident).filter(models.Incident.resolved == False).all()
    }

    for app_info in apps:
        try:
            start = time.time()
            response = requests.get(app_info.url, timeout=app_info.timeout_ms / 1000)
            duration = int((time.time() - start) * 1000)

            if response.status_code >= 400:
                raise Exception(f"HTTP {response.status_code}")

            status = "Lente" if duration > app_info.threshold_ms else "En ligne"
            reason = "Temps de réponse élevé" if status == "Lente" else ""

            # Résoudre incident existant si rétabli
            if app_info.id in prev_incidents and status == "En ligne":
                inc = prev_incidents[app_info.id]
                inc.resolved    = True
                inc.resolved_at = datetime.datetime.utcnow()
                db.commit()
                background_tasks.add_task(send_recovery, app_info.name, app_info.category, duration)

            # Créer nouvel incident si lente
            if status == "Lente" and app_info.id not in prev_incidents:
                new_inc = models.Incident(
                    app_id=app_info.id, app_name=app_info.name,
                    category=app_info.category, status=status,
                    cause=app_info.cause, solution=app_info.solution,
                )
                db.add(new_inc)
                db.commit()
                background_tasks.add_task(
                    send_alert, app_info.name, app_info.category,
                    status, app_info.cause, app_info.solution, duration
                )

        except Exception as e:
            duration = 0
            status   = "Hors service"
            reason   = str(e) if len(str(e)) < 100 else "Serveur inaccessible"

            # Créer incident si pas déjà ouvert
            if app_info.id not in prev_incidents:
                new_inc = models.Incident(
                    app_id=app_info.id, app_name=app_info.name,
                    category=app_info.category, status=status,
                    cause=app_info.cause or reason, solution=app_info.solution,
                )
                db.add(new_inc)
                db.commit()
                background_tasks.add_task(
                    send_alert, app_info.name, app_info.category,
                    status, app_info.cause or reason, app_info.solution, 0
                )

        # Enregistrer le log
        log = models.PerformanceLog(
            app_id=app_info.id, status=status,
            response_time=duration, reason=reason
        )
        db.add(log)

        results.append({
            "id":           app_info.id,
            "name":         app_info.name,
            "url":          app_info.url,
            "icon":         app_info.icon,
            "category":     app_info.category,
            "description":  app_info.description,
            "environment":  app_info.environment,
            "priority":     app_info.priority,
            "status":       status,
            "responseTime": duration,
            "reason":       reason,
            "cause":        app_info.cause,
            "solution":     app_info.solution,
            "lastCheck":    datetime.datetime.utcnow().isoformat(),
        })

    db.commit()
    return results


# ══════════════════════════════════════════════════════
#  📋 ROUTES CRUD APPLICATIONS
# ══════════════════════════════════════════════════════

@app.get("/api/apps")
def get_apps(db: Session = Depends(get_db)):
    """Lister toutes les applications"""
    return db.query(models.Application).all()


@app.post("/api/apps")
def create_app(payload: AppCreate, db: Session = Depends(get_db)):
    """Ajouter une nouvelle application"""
    new_app = models.Application(**payload.dict())
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app


@app.put("/api/apps/{app_id}")
def update_app(app_id: int, payload: AppUpdate, db: Session = Depends(get_db)):
    """Modifier une application"""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application non trouvée")
    for field, value in payload.dict(exclude_none=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@app.delete("/api/apps/{app_id}")
def delete_app(app_id: int, db: Session = Depends(get_db)):
    """Supprimer une application"""
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application non trouvée")
    db.delete(app)
    db.commit()
    return {"message": f"Application '{app.name}' supprimée"}


# ══════════════════════════════════════════════════════
#  📊 ROUTES HISTORIQUE & INCIDENTS
# ══════════════════════════════════════════════════════

@app.get("/api/history/{app_id}")
def get_history(app_id: int, limit: int = 30, db: Session = Depends(get_db)):
    """Historique des 30 derniers logs d'une app"""
    logs = (
        db.query(models.PerformanceLog)
        .filter(models.PerformanceLog.app_id == app_id)
        .order_by(models.PerformanceLog.checked_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "status":        l.status,
            "responseTime":  l.response_time,
            "reason":        l.reason,
            "time":          l.checked_at.strftime("%H:%M:%S"),
        }
        for l in reversed(logs)
    ]


@app.get("/api/incidents")
def get_incidents(resolved: bool = False, db: Session = Depends(get_db)):
    """Lister les incidents ouverts ou résolus"""
    incidents = (
        db.query(models.Incident)
        .filter(models.Incident.resolved == resolved)
        .order_by(models.Incident.started_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":          i.id,
            "app_name":    i.app_name,
            "category":    i.category,
            "status":      i.status,
            "cause":       i.cause,
            "solution":    i.solution,
            "email_sent":  i.email_sent,
            "started_at":  i.started_at.isoformat(),
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
            "resolved":    i.resolved,
        }
        for i in incidents
    ]


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Statistiques globales"""
    total    = db.query(models.Application).filter(models.Application.active == True).count()
    logs     = db.query(models.PerformanceLog).order_by(models.PerformanceLog.checked_at.desc()).limit(total * 5).all()
    online   = sum(1 for l in logs if l.status == "En ligne")
    slow     = sum(1 for l in logs if l.status == "Lente")
    offline  = sum(1 for l in logs if l.status == "Hors service")
    avg_rt   = int(sum(l.response_time for l in logs if l.response_time > 0) / max(len([l for l in logs if l.response_time > 0]), 1))
    incidents_open = db.query(models.Incident).filter(models.Incident.resolved == False).count()

    return {
        "total":           total,
        "online":          online,
        "slow":            slow,
        "offline":         offline,
        "avg_response_ms": avg_rt,
        "incidents_open":  incidents_open,
    }