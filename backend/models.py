from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from database import Base
import datetime

# ── Applications surveillées ───────────────────────────
class Application(Base):
    __tablename__ = "applications"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)
    url          = Column(String, nullable=False)
    icon         = Column(String, default="🔗")
    category     = Column(String, default="Général")
    description  = Column(String, nullable=True)
    environment  = Column(String, default="Production")   # Production / Pré-production
    priority     = Column(String, default="medium")       # critical / high / medium / low
    threshold_ms = Column(Integer, default=300)
    timeout_ms   = Column(Integer, default=5000)
    cause        = Column(String, nullable=True)          # Cause si problème connu
    solution     = Column(String, nullable=True)          # Solution recommandée
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.datetime.utcnow)

# ── Logs de performance ────────────────────────────────
class PerformanceLog(Base):
    __tablename__ = "performance_logs"

    id            = Column(Integer, primary_key=True, index=True)
    app_id        = Column(Integer, ForeignKey("applications.id"))
    status        = Column(String)                        # En ligne / Lente / Hors service
    response_time = Column(Integer, default=0)
    reason        = Column(String, nullable=True)
    checked_at    = Column(DateTime, default=datetime.datetime.utcnow)

# ── Historique des incidents ───────────────────────────
class Incident(Base):
    __tablename__ = "incidents"

    id           = Column(Integer, primary_key=True, index=True)
    app_id       = Column(Integer, ForeignKey("applications.id"))
    app_name     = Column(String)
    category     = Column(String)
    status       = Column(String)                         # Hors service / Lente
    cause        = Column(String, nullable=True)
    solution     = Column(String, nullable=True)
    email_sent   = Column(Boolean, default=False)
    started_at   = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at  = Column(DateTime, nullable=True)
    resolved     = Column(Boolean, default=False)