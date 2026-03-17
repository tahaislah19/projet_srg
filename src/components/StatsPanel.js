import React from 'react';

const StatsPanel = ({ apps }) => {
  const stats = {
    total:   apps.length,
    online:  apps.filter(a => a.status === 'En ligne').length,
    offline: apps.filter(a => a.status === 'Hors service').length,
    slow:    apps.filter(a => a.status === 'Lente').length,
    unknown: apps.filter(a => a.status === 'Unknown').length,
  };

  const availabilityRate = stats.total > 0
    ? ((stats.online + stats.slow) / stats.total * 100).toFixed(1)
    : 0;

  const avgResponseTime = apps.length > 0
    ? (apps.reduce((sum, a) => sum + (a.responseTime || 0), 0) / apps.length).toFixed(0)
    : 0;

  const lastCheck = apps.length > 0
    ? new Date(Math.max(...apps.map(a => new Date(a.lastCheck || 0))))
    : null;

  const getAvailabilityColor = (rate) => {
    if (rate >= 90) return '#00AA55';
    if (rate >= 70) return '#FF8800';
    return '#CC2200';
  };

  const availColor = getAvailabilityColor(parseFloat(availabilityRate));

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: '1px solid #E5E7EB',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg,#0066CC,#3399FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem'
          }}>📊</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Tableau de Bord</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Autohall Maroc — Monitoring en temps réel</div>
          </div>
        </div>
        <div style={{
          background: availColor + '18',
          color: availColor,
          padding: '5px 14px',
          borderRadius: '99px',
          fontSize: '0.78rem',
          fontWeight: 700,
          border: `1px solid ${availColor}33`,
        }}>
          {availabilityRate}% disponible
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {[
          { label: 'Total Apps',    value: stats.total,   icon: '📋', bg: '#E8F2FF', color: '#0066CC', border: '#C3D9F5' },
          { label: 'En Ligne',      value: stats.online,  icon: '✅', bg: '#EEFFF5', color: '#00AA55', border: '#B3F0D4' },
          { label: 'Hors Service',  value: stats.offline, icon: '🔴', bg: '#FFF0EE', color: '#CC2200', border: '#F5C3BA' },
          { label: 'Lentes',        value: stats.slow,    icon: '🟡', bg: '#FFF8EE', color: '#FF8800', border: '#F5E3BA' },
        ].map(({ label, value, icon, bg, color, border }) => (
          <div key={label} style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '1.6rem' }}>{icon}</div>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500, marginTop: '3px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Details Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))',
        gap: '8px',
        background: '#F9FAFB',
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '18px',
        border: '1px solid #F3F4F6',
      }}>
        {[
          { label: '⏱ Temps de réponse moyen', value: `${avgResponseTime} ms` },
          { label: '🕐 Dernière vérification',  value: lastCheck ? lastCheck.toLocaleTimeString() : 'N/A' },
          { label: '❓ Statut inconnu',         value: stats.unknown },
          { label: '📶 Apps surveillées',       value: stats.total },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Availability Bar ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Disponibilité globale</span>
          <span style={{ fontSize: '0.8rem', color: availColor, fontWeight: 700 }}>{availabilityRate}%</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#E5E7EB', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${availabilityRate}%`,
            background: `linear-gradient(90deg, ${availColor}, ${availColor}99)`,
            borderRadius: '99px',
            transition: 'width 0.6s ease',
          }} />
        </div>

        {/* Mini status indicators */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          {[
            { label: 'En ligne',     count: stats.online,  color: '#00AA55', bg: '#EEFFF5' },
            { label: 'Lentes',       count: stats.slow,    color: '#FF8800', bg: '#FFF8EE' },
            { label: 'Hors service', count: stats.offline, color: '#CC2200', bg: '#FFF0EE' },
            { label: 'Inconnu',      count: stats.unknown, color: '#6B7280', bg: '#F3F4F6' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: bg, border: `1px solid ${color}33`,
              borderRadius: '99px', padding: '3px 10px',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>{count} {label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;