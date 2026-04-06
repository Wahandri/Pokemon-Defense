'use client';

import { useEffect, useRef } from 'react';

export default function GameCanvas() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import('../game/Game.js').then(({ Game }) => {
      window._game = new Game();
    });

    return () => {
      initialized.current = false;
      if (window._game) {
        window._game = null;
      }
    };
  }, []);

  return (
    <>
      <div id="app">

        {/* ═══ SIDEBAR ═══ */}
        <div id="sidebar">
          <div id="sidebar-header">
            <div className="game-logo">🎮 ENTRENADOR<span>POKÉMON</span></div>
            <p>Captura · Completa · Domina</p>
          </div>

          {/* HUD */}
          <div id="hud">
            <div className="hud-row">
              <div className="hud-item" id="hud-captures">
                <div className="hud-label">✅ Capturas</div>
                <div className="hud-value" id="val-captures" style={{ color: 'var(--accent)' }}>0</div>
              </div>
              <div className="hud-item" id="hud-pokeballs">
                <div className="hud-label">🔴 Pokébolas</div>
                <div className="hud-value" id="val-pokeballs">3</div>
              </div>
            </div>
            <div className="hud-row">
              <div className="hud-item" id="hud-candy">
                <div className="hud-label">🍬 RareCandy</div>
                <div className="hud-value" id="val-candy">0</div>
              </div>
              <div className="hud-item" id="hud-wave">
                <div className="hud-label">🌊 Ronda</div>
                <div className="hud-value" id="val-wave">0</div>
              </div>
            </div>
            <div className="hud-row">
              <div className="hud-item" id="hud-enemies">
                <div className="hud-label">🎯 Pokémon</div>
                <div className="hud-value" id="val-enemies">0</div>
              </div>
              <div className="hud-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px' }}>
                <div className="hud-label">Lanzar 🎯</div>
                <div id="pokeball-drag-src" title="Arrastra sobre un Pokémon debilitado, o haz clic directamente sobre él">🔴</div>
              </div>
            </div>
            <div className="hud-row">
              <div className="hud-item" style={{ flex: 2 }}>
                <div className="hud-label">🗺️ Zona</div>
                <div className="hud-value" id="val-zone" style={{ fontSize: '11px' }}>—</div>
              </div>
              <div className="hud-item">
                <div className="hud-label">🏅 Medallas</div>
                <div className="hud-value" id="val-badges" style={{ fontSize: '11px' }}>—</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div id="controls">
            <button className="btn-primary" id="btn-start-wave" disabled>▶ LANZAR RONDA 1</button>
            <div id="controls-row">
              <button className="btn-secondary" id="btn-pause">⏸ Pausa</button>
              <button className="btn-danger" id="btn-reset">↺ Menú</button>
            </div>
            <div id="speed-btns">
              <button className="btn-secondary active" id="btn-speed1" style={{ flex: 1 }}>×1</button>
              <button className="btn-secondary" id="btn-speed2" style={{ flex: 1 }}>×2</button>
              <button className="btn-secondary" id="btn-speed4" style={{ flex: 1 }}>×4</button>
            </div>
            <div id="special-slots" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px', marginTop: '6px' }}></div>
          </div>

          {/* Backpack (Party) */}
          <div id="tower-selector">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3>👜 Equipo</h3>
              <button id="btn-open-pc" style={{ fontSize: '10px', background: 'rgba(163,113,247,.12)', border: '1px solid #5a3a7a', color: '#a371f7', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>💾 PC</button>
            </div>
            <div id="tower-buttons">
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Elige un starter para comenzar</span>
            </div>
          </div>

          {/* Tower info panel */}
          <div id="tower-info">
            <div id="tower-info-header">
              <img id="tower-info-sprite" src="" alt="" width={40} height={40} style={{ imageRendering: 'pixelated' }} />
              <div>
                <div id="tower-info-name">Pokémon</div>
              </div>
            </div>
            <div id="tower-stats"></div>
            <button id="btn-evolve" style={{ display: 'none', background: 'linear-gradient(135deg,#7B2FBE,#f0c040)', color: '#fff', border: 'none', padding: '7px', borderRadius: '6px', fontSize: '11px', width: '100%', marginTop: '3px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: '700' }}>⭐ Evolucionar</button>
            <button id="btn-use-candy" style={{ display: 'none', background: 'linear-gradient(135deg,#a371f7,#c792ea)', color: '#fff', border: 'none', padding: '7px', borderRadius: '6px', fontSize: '11px', width: '100%', marginTop: '3px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: '700' }}>🍬 Rare Candy (0)</button>
            <button id="btn-sell">📦 Recuperar</button>
          </div>

          {/* Pokédex */}
          <div id="pokedex">
            <div id="pokedex-header">
              <h3>📖 Pokédex</h3>
              <span id="pokedex-count" style={{ fontSize: '10px', color: 'var(--yellow)', fontFamily: "'Orbitron', sans-serif" }}>0/151</span>
            </div>
            <div id="pokedex-grid">
              <span id="pokedex-empty" style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                ¡Captura Pokémon para llenar tu Pokédex!
              </span>
            </div>
          </div>
        </div>

        {/* ═══ CANVAS ═══ */}
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
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ATQ</span>
                      <div className="starter-stat-bar"><div style={{ width: '86%', background: '#78c850' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ALC</span>
                      <div className="starter-stat-bar"><div style={{ width: '92%', background: '#78c850' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">VEL</span>
                      <div className="starter-stat-bar"><div style={{ width: '73%', background: '#78c850' }}></div></div>
                    </div>
                  </div>
                </button>

                <button className="starter-btn" data-starter="charmander">
                  <img src="/sprites/gen1/4.png" alt="Charmander" />
                  <div className="starter-name">Charmander</div>
                  <div className="starter-type-badge" style={{ color: '#f08030' }}>🔥 Fuego</div>
                  <div className="starter-stats">
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ATQ</span>
                      <div className="starter-stat-bar"><div style={{ width: '100%', background: '#f08030' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ALC</span>
                      <div className="starter-stat-bar"><div style={{ width: '85%', background: '#f08030' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">VEL</span>
                      <div className="starter-stat-bar"><div style={{ width: '100%', background: '#f08030' }}></div></div>
                    </div>
                  </div>
                </button>

                <button className="starter-btn" data-starter="squirtle">
                  <img src="/sprites/gen1/7.png" alt="Squirtle" />
                  <div className="starter-name">Squirtle</div>
                  <div className="starter-type-badge" style={{ color: '#6890f0' }}>💧 Agua</div>
                  <div className="starter-stats">
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ATQ</span>
                      <div className="starter-stat-bar"><div style={{ width: '79%', background: '#6890f0' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">ALC</span>
                      <div className="starter-stat-bar"><div style={{ width: '100%', background: '#6890f0' }}></div></div>
                    </div>
                    <div className="starter-stat-row">
                      <span className="starter-stat-label">VEL</span>
                      <div className="starter-stat-bar"><div style={{ width: '64%', background: '#6890f0' }}></div></div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button className="menu-btn" id="btn-play" disabled>▶ INICIAR AVENTURA</button>
          </div>

          <div id="paused-banner">PAUSADO</div>

          <canvas id="game-canvas"></canvas>

          <div id="kb-hints">
            Clic: seleccionar/colocar · Clic derecho: recuperar<br />
            Arrastra 🔴 o clic en debilitado para capturar · Esc: cancelar<br />
            P: pausa · D: debug
          </div>
        </div>

      </div>

      <div id="msg"></div>
      <div id="round-clear"></div>
    </>
  );
}
