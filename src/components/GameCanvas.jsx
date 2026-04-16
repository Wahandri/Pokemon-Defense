'use client';

import { useEffect, useRef } from 'react';

export default function GameCanvas() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    import('../game/Game.js').then(({ Game }) => { window._game = new Game(); });
    return () => { initialized.current = false; window._game = null; };
  }, []);

  return (
    <>
      <div id="app">

        {/* ═══ HEADER ═══ */}
        <header id="game-header">
          <div id="header-logo">
            <span className="header-pokeball">⬤</span>
            <span className="header-title">Pokemon<span className="header-title-sub">Defense</span></span>
          </div>
          <nav id="header-nav">
            <button className="header-nav-btn" id="btn-header-map">🗺 Mapa</button>
            <button className="header-nav-btn" id="btn-header-shop">🛒 Tienda</button>
            <button className="header-nav-btn" id="btn-header-backpack">🎒 Mochila</button>
          </nav>
          <div id="header-stats">
            <div className="header-stat">
              <span className="header-stat-icon">💰</span>
              <span className="header-stat-val" id="val-coins">0</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-icon">🔴</span>
              <span className="header-stat-val" id="val-pokeballs">3</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-icon">🌊</span>
              <span className="header-stat-val" id="val-wave">0</span>
            </div>
          </div>
        </header>

        {/* ═══ MAIN AREA ═══ */}
        <div id="main-area">

          {/* ── LEFT PANEL: Equipo siempre visible ── */}
          <div id="left-panel">

            <div id="party-header">
              <span>👜 EQUIPO</span>
              <div id="pokeball-drag-src" title="Arrastra sobre un Pokémon debilitado o haz clic en él">🔴</div>
            </div>

            {/* Party slots — siempre visibles */}
            <div id="tower-buttons">
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '8px 4px', display: 'block' }}>
                Elige un starter para comenzar
              </span>
            </div>

            {/* Tower info (aparece al seleccionar una torre colocada) */}
            <div id="tower-info">
              <div id="tower-info-header">
                <img id="tower-info-sprite" src="" alt="" width={36} height={36} style={{ imageRendering: 'pixelated' }} />
                <div id="tower-info-name">—</div>
              </div>
              <div id="tower-stats"></div>
              <button id="btn-evolve" style={{ display: 'none' }}>⭐ Evolucionar</button>
              <button id="btn-sell">📦 Recuperar</button>
            </div>

            {/* Pokédex mini (en el panel izquierdo) */}
            <div id="pokedex">
              <div id="pokedex-header">
                <h3>📖 Pokédex</h3>
                <span id="pokedex-count">0/151</span>
              </div>
              <div id="pokedex-grid"></div>
            </div>

          </div>

          {/* ── CANVAS + BOTTOM BAR ── */}
          <div id="canvas-area">

            <div id="canvas-wrap">
              {/* Menu overlay */}
              <div id="menu-overlay">
                <div className="menu-logo">ENTRENADOR<span>POKÉMON</span></div>
                <p>Captura Pokémon silvestres debilitándolos con tus aliados y lanzando Pokébolas. ¡Completa la Pokédex de Kanto!</p>
                <div id="starter-select">
                  <p>— Elige tu Starter —</p>
                  <div id="starter-row">
                    <button className="starter-btn" data-starter="bulbasaur">
                      <img src="/sprites/gen1/1.png" alt="Bulbasaur" />
                      <div className="starter-name">Bulbasaur</div>
                      <div className="starter-type-badge" style={{ color: '#78c850' }}>🌿 Planta</div>
                      <div className="starter-stats">
                        <div className="starter-stat-row"><span className="starter-stat-label">ATQ</span><div className="starter-stat-bar"><div style={{ width: '86%', background: '#78c850' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">ALC</span><div className="starter-stat-bar"><div style={{ width: '92%', background: '#78c850' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">VEL</span><div className="starter-stat-bar"><div style={{ width: '73%', background: '#78c850' }}></div></div></div>
                      </div>
                    </button>
                    <button className="starter-btn" data-starter="charmander">
                      <img src="/sprites/gen1/4.png" alt="Charmander" />
                      <div className="starter-name">Charmander</div>
                      <div className="starter-type-badge" style={{ color: '#f08030' }}>🔥 Fuego</div>
                      <div className="starter-stats">
                        <div className="starter-stat-row"><span className="starter-stat-label">ATQ</span><div className="starter-stat-bar"><div style={{ width: '100%', background: '#f08030' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">ALC</span><div className="starter-stat-bar"><div style={{ width: '85%', background: '#f08030' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">VEL</span><div className="starter-stat-bar"><div style={{ width: '100%', background: '#f08030' }}></div></div></div>
                      </div>
                    </button>
                    <button className="starter-btn" data-starter="squirtle">
                      <img src="/sprites/gen1/7.png" alt="Squirtle" />
                      <div className="starter-name">Squirtle</div>
                      <div className="starter-type-badge" style={{ color: '#6890f0' }}>💧 Agua</div>
                      <div className="starter-stats">
                        <div className="starter-stat-row"><span className="starter-stat-label">ATQ</span><div className="starter-stat-bar"><div style={{ width: '79%', background: '#6890f0' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">ALC</span><div className="starter-stat-bar"><div style={{ width: '100%', background: '#6890f0' }}></div></div></div>
                        <div className="starter-stat-row"><span className="starter-stat-label">VEL</span><div className="starter-stat-bar"><div style={{ width: '64%', background: '#6890f0' }}></div></div></div>
                      </div>
                    </button>
                  </div>
                </div>
                <button className="menu-btn" id="btn-play" disabled>▶ INICIAR AVENTURA</button>
              </div>

              <div id="paused-banner">PAUSADO</div>
              <canvas id="game-canvas"></canvas>
              <div id="kb-hints">Clic: colocar · Der: recuperar · Arrastra 🔴: capturar · Esc: cancelar</div>
            </div>

            {/* ── BOTTOM BAR ── */}
            <div id="bottom-bar">
              <button className="btn-primary" id="btn-start-wave" disabled>▶ RONDA 1</button>
              <div className="bottom-divider"></div>
              <button className="btn-secondary" id="btn-pause">⏸</button>
              <button className="btn-danger"    id="btn-reset">↺</button>
              <div className="bottom-divider"></div>
              <button className="btn-secondary active" id="btn-speed1">×1</button>
              <button className="btn-secondary"        id="btn-speed2">×2</button>
              <button className="btn-secondary"        id="btn-speed4">×4</button>
              <div className="bottom-divider"></div>
              <div id="special-slots"></div>
              <div className="bottom-divider"></div>
              {/* Enemies + Pokédex count in bottom bar */}
              <div className="bottom-stat">
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>En pantalla</span>
                <span id="val-enemies" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '13px', color: 'var(--orange)' }}>0</span>
              </div>
              <div className="bottom-stat">
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Pokédex</span>
                <span id="bottom-pokedex" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '13px', color: 'var(--yellow)' }}>0/151</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ═══ MODALS ═══ */}

      {/* Backpack Modal — solo Objetos y Datos (equipo está siempre visible) */}
      <div id="backpack-modal" className="modal-overlay hidden">
        <div className="modal-panel backpack-panel">
          <div className="modal-header">
            <span className="modal-title">🎒 MOCHILA</span>
            <button className="modal-close" id="backpack-close">✕</button>
          </div>
          <div className="modal-tabs" id="backpack-tabs">
            <button className="modal-tab active" data-tab="items">Objetos</button>
            <button className="modal-tab" data-tab="data">Datos</button>
          </div>
          <div className="modal-body">
            <div id="backpack-tab-items" className="backpack-tab-content">
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Inventario</div>
              <div id="backpack-items-list">
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Inventario vacío</span>
              </div>
            </div>
            <div id="backpack-tab-data" className="backpack-tab-content hidden">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="hud-item"><div className="hud-label">✅ Capturas</div><div className="hud-value" style={{ color: 'var(--accent)' }} id="data-captures">0</div></div>
                <div className="hud-item"><div className="hud-label">🏅 Medallas</div><div className="hud-value" id="val-badges" style={{ fontSize: '11px' }}>—</div></div>
                <div className="hud-item"><div className="hud-label">🗺️ Zona</div><div className="hud-value" id="val-zone" style={{ fontSize: '11px' }}>—</div></div>
                <div className="hud-item"><div className="hud-label">📖 Pokédex</div><div className="hud-value" id="data-pokedex">0/151</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PC Modal */}
      <div id="pc-overlay" className="hidden">
        <div className="pc-container">
          <div className="pc-header">
            <span>💻 PC — Gestión de Equipo</span>
            <button id="pc-close-btn">✕ Cerrar</button>
          </div>
          <div className="pc-body">
            <div className="pc-panel" id="pc-party-panel">
              <div className="pc-panel-title">👜 Equipo activo</div>
            </div>
            <div className="pc-panel pc-box-panel">
              <div className="pc-panel-title">📦 PC Box</div>
              <div className="pc-box-grid" id="pc-box-grid"></div>
            </div>
          </div>
          <div className="pc-footer">Clic en un Pokémon del PC para añadirlo al equipo · Clic en uno del equipo para enviarlo al PC</div>
        </div>
      </div>

      <div id="msg"></div>
      <div id="round-clear"></div>
    </>
  );
}
