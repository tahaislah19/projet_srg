import React, { useState, useEffect } from 'react';

const StatusTable = ({ apps, onAppSelect, selectedApp, checkInterval = 30000 }) => {

  const [filter, setFilter]       = useState('Tous');
  const [search, setSearch]       = useState('');
  const [countdown, setCountdown] = useState(checkInterval / 1000);

  useEffect(() => {
    setCountdown(checkInterval / 1000);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return checkInterval / 1000;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkInterval]);

  const countdownPercent = (countdown / (checkInterval / 1000)) * 100;

  const categories = ['Tous', ...new Set(apps.map(a => a.category).filter(Boolean))];

  const filtered = apps.filter(app => {
    const matchCat    = filter === 'Tous' || app.category === filter;
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
                        app.url.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const statusConfig = {
    'En ligne':     { cls: 'status-online',  dot: '#00AA55', label: 'En ligne'     },
    'Lente':        { cls: 'status-slow',    dot: '#FF8800', label: 'Lente'        },
    'Hors service': { cls: 'status-offline', dot: '#CC2200', label: 'Hors service' },
    'Unknown':      { cls: 'status-unknown', dot: '#6B7280', label: 'Inconnu'      },
  };

  const getStatus = (status) => statusConfig[status] || statusConfig['Unknown'];

  const formatTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const online  = apps.filter(a => a.status === 'En ligne').length;
  const offline = apps.filter(a => a.status === 'Hors service').length;
  const slow    = apps.filter(a => a.status === 'Lente').length;

  // Construit l'URL complète cliquable
  const buildUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    return 'http://' + url;
  };

  return (
    <div>

      {/* Countdown Bar */}
      <div style={{
        background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px',
        padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '14px',
        marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
          ⏱ Prochaine vérification
        </span>
        <div style={{ flex: 1, height: '5px', background: '#E5E7EB', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${countdownPercent}%`,
            background: 'linear-gradient(90deg, #0066CC, #66AAFF)',
            borderRadius: '99px', transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontSize: '0.85rem', color: '#0066CC', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {countdown}s
        </span>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: 'white', borderRadius: '14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid #E5E7EB', overflow: 'hidden',
      }}>

        {/* Card Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#0066CC,#3399FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>🖥️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                Statut des Applications
              </div>
              <div style={{ fontSize: '0.73rem', color: '#6B7280' }}>
                {filtered.length} / {apps.length} applications affichées
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { count: online,  label: 'En ligne',    color: '#00AA55', bg: '#EEFFF5' },
              { count: slow,    label: 'Lentes',       color: '#FF8800', bg: '#FFF8EE' },
              { count: offline, label: 'Hors service', color: '#CC2200', bg: '#FFF0EE' },
            ].map(({ count, label, color, bg }) => (
              <div key={label} style={{
                background: bg, border: `1px solid ${color}33`,
                borderRadius: '99px', padding: '4px 12px',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{count} {label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher une application..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                border: '1.5px solid #E5E7EB', borderRadius: '8px',
                fontSize: '0.83rem', outline: 'none', color: '#111827',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0066CC'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: '6px 14px',
                  border: filter === cat ? '1.5px solid #0066CC' : '1.5px solid #E5E7EB',
                  borderRadius: '99px',
                  background: filter === cat ? '#0066CC' : 'white',
                  color: filter === cat ? 'white' : '#6B7280',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Application', 'Catégorie', 'URL', 'Statut', 'Temps de réponse', 'Dernière vérification'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem', fontStyle: 'italic' }}>
                    Aucune application trouvée
                  </td>
                </tr>
              ) : (
                filtered.map((app, i) => {
                  const s = getStatus(app.status);
                  const isSelected = selectedApp?.name === app.name;
                  return (
                    <tr
                      key={i}
                      onClick={() => onAppSelect(app)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#E8F2FF' : 'white',
                        borderLeft: isSelected ? '3px solid #0066CC' : '3px solid transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#FAFBFF'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                    >
                      {/* Name */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem' }}>{app.name}</div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        {app.category ? (
                          <span style={{
                            background: '#E8F2FF', color: '#0066CC',
                            padding: '2px 8px', borderRadius: '6px',
                            fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
                          }}>{app.category.replace('Autohall - ', '')}</span>
                        ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>

                      {/* URL — lien cliquable */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        <a
                          href={buildUrl(app.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            color: '#0066CC',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none',
                            fontFamily: 'monospace',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#0044AA'; e.currentTarget.style.textDecoration = 'underline'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#0066CC'; e.currentTarget.style.textDecoration = 'none'; }}
                          title={`Ouvrir ${app.url}`}
                        >
                          🔗 {app.url}
                        </a>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        <span className={`status-badge ${s.cls}`}>
                          {app.status === 'En ligne' && '● '}
                          {app.status === 'Lente' && '● '}
                          {app.status === 'Hors service' && '● '}
                          {s.label}
                        </span>
                      </td>

                      {/* Response Time */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        {app.responseTime > 0 ? (
                          <span style={{
                            fontFamily: 'monospace', fontSize: '0.82rem',
                            color: app.responseTime > 300 ? '#FF8800' : '#00AA55',
                            fontWeight: 700,
                          }}>
                            {app.responseTime} ms
                          </span>
                        ) : (
                          <span style={{ color: '#D1D5DB', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>

                      {/* Last Check */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #F9FAFB' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6B7280' }}>
                          {formatTime(app.lastCheck)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FAFBFF',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
            Cliquez sur une ligne pour voir l'historique · 🔗 pour ouvrir l'application
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
            {filtered.length} résultats
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusTable;