/**
 * =========================================================
 * POKÉDEX DATABASE - LÓGICA PRINCIPAL (APP.JS)
 * Formato de Lista Moderna & Panel Inspector Maestro-Detalle
 * =========================================================
 */

// Tipos elementales con colores y nombres en español
const TYPE_CONFIG = {
  normal:   { name: 'Normal',   color: '#94a3b8' },
  fire:     { name: 'Fuego',    color: '#ef4444' },
  water:    { name: 'Agua',     color: '#3b82f6' },
  grass:    { name: 'Planta',   color: '#10b981' },
  electric: { name: 'Eléctrico',color: '#eab308' },
  ice:      { name: 'Hielo',    color: '#06b6d4' },
  fighting: { name: 'Lucha',    color: '#b91c1c' },
  poison:   { name: 'Veneno',   color: '#a855f7' },
  ground:   { name: 'Tierra',   color: '#d97706' },
  flying:   { name: 'Volador',  color: '#818cf8' },
  psychic:  { name: 'Psíquico', color: '#ec4899' },
  bug:      { name: 'Bicho',    color: '#84cc16' },
  rock:     { name: 'Roca',     color: '#78716c' },
  ghost:    { name: 'Fantasma', color: '#6366f1' },
  dragon:   { name: 'Dragón',   color: '#6d28d9' },
  steel:    { name: 'Acero',    color: '#64748b' },
  dark:     { name: 'Siniestro',color: '#334155' },
  fairy:    { name: 'Hada',     color: '#f472b6' }
};

// Traducción de estadísticas de combate
const STAT_TRANSLATIONS = {
  'hp': 'PS',
  'attack': 'Ataque',
  'defense': 'Defensa',
  'special-attack': 'Atq. Esp.',
  'special-defense': 'Def. Esp.',
  'speed': 'Velocidad'
};

// Rangos oficiales de generaciones
const GENERATION_RANGES = {
  gen1: [1, 151],
  gen2: [152, 251],
  gen3: [252, 386],
  gen4: [387, 493],
  gen5: [494, 649],
  gen6: [650, 721],
  gen7: [722, 809],
  gen8: [810, 905],
  gen9: [906, 1025]
};

// Estado global de la aplicación
const state = {
  currentId: 4, // Inicia en Charmander (#004) como ejemplo icónico solicitado
  allPokemon: [],
  filteredPokemon: [],
  pokemonCache: new Map(),
  speciesCache: new Map(),
  isShiny: false,
  isMuted: false,
  activeAudio: null,
  audioCtx: null,
  searchQuery: '',
  genFilter: 'all',
  typeFilter: 'all',
  typeLookup: new Map()
};

// Referencias DOM
const elements = {
  // Cabecera & Filtros
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  genFilter: document.getElementById('genFilter'),
  typeFilter: document.getElementById('typeFilter'),
  resultsCount: document.getElementById('resultsCount'),
  btnRandom: document.getElementById('btnRandom'),
  btnSoundToggle: document.getElementById('btnSoundToggle'),
  soundIcon: document.getElementById('soundIcon'),
  soundText: document.getElementById('soundText'),

  // Lista
  pokemonListRows: document.getElementById('pokemonListRows'),

  // Inspector
  detailId: document.getElementById('detailId'),
  detailName: document.getElementById('detailName'),
  detailImg: document.getElementById('detailImg'),
  artworkHalo: document.getElementById('artworkHalo'),
  detailSpinner: document.getElementById('detailSpinner'),
  detailTypes: document.getElementById('detailTypes'),
  btnShiny: document.getElementById('btnShiny'),
  btnPlayCry: document.getElementById('btnPlayCry'),
  inspectorSoundWave: document.getElementById('inspectorSoundWave'),

  // Pestañas del Inspector
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Contenidos
  detailBst: document.getElementById('detailBst'),
  detailStatsList: document.getElementById('detailStatsList'),
  detailEvolutionFlow: document.getElementById('detailEvolutionFlow'),
  detailFlavor: document.getElementById('detailFlavor'),
  detailHeight: document.getElementById('detailHeight'),
  detailWeight: document.getElementById('detailWeight'),
  detailCategory: document.getElementById('detailCategory'),
  detailAbilities: document.getElementById('detailAbilities'),

  // Navegación rápida
  btnNavPrev: document.getElementById('btnNavPrev'),
  btnNavNext: document.getElementById('btnNavNext'),
  navIndicator: document.getElementById('navIndicator')
};

/**
 * =========================================================
 * SISTEMA DE SONIDO
 * =========================================================
 */
function getAudioContext() {
  if (!state.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function playUiBeep(freq = 600, duration = 0.06) {
  if (state.isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playPokemonCry(pokemonId) {
  if (state.isMuted) return;

  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio.currentTime = 0;
    state.activeAudio = null;
  }

  const cryUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`;
  const legacyUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/${pokemonId}.ogg`;

  const audio = new Audio();
  audio.volume = 0.8;
  state.activeAudio = audio;

  elements.inspectorSoundWave.classList.add('active');

  audio.onended = () => {
    elements.inspectorSoundWave.classList.remove('active');
    state.activeAudio = null;
  };

  audio.onerror = () => {
    if (audio.src !== legacyUrl) {
      audio.src = legacyUrl;
      audio.play().catch(() => {
        elements.inspectorSoundWave.classList.remove('active');
      });
    } else {
      elements.inspectorSoundWave.classList.remove('active');
    }
  };

  audio.src = cryUrl;
  audio.play().catch(() => {
    elements.inspectorSoundWave.classList.remove('active');
  });
}

/**
 * =========================================================
 * FORMATEO Y UTILIDADES
 * =========================================================
 */
function formatDexNumber(id) {
  return '#' + String(id).padStart(3, '0');
}

/**
 * =========================================================
 * SELECCIÓN Y CARGA DE POKÉMON EN EL INSPECTOR
 * =========================================================
 */
async function selectPokemon(id, options = { playSound: true, scrollToList: false }) {
  if (!id || id < 1 || id > 1025) return;
  state.currentId = id;

  if (options.playSound) {
    playUiBeep(750, 0.04);
    playPokemonCry(id);
  }

  elements.detailSpinner.classList.add('visible');
  elements.detailImg.style.opacity = '0.3';
  elements.navIndicator.textContent = formatDexNumber(id);

  highlightActiveRow(id, options.scrollToList);

  try {
    const pokemon = await getPokemonData(id);
    const species = await getSpeciesData(id);

    renderInspectorVisuals(pokemon);
    renderInspectorStats(pokemon);
    renderInspectorEvolutions(species);
    renderInspectorInfo(pokemon, species);

  } catch (error) {
    console.error('Error al cargar Pokémon:', error);
  } finally {
    elements.detailSpinner.classList.remove('visible');
    elements.detailImg.style.opacity = '1';
  }
}

/**
 * Obtener datos de la API con caché
 */
async function getPokemonData(id) {
  if (state.pokemonCache.has(id)) return state.pokemonCache.get(id);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.pokemonCache.set(id, data);
  return data;
}

async function getSpeciesData(id) {
  if (state.speciesCache.has(id)) return state.speciesCache.get(id);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.speciesCache.set(id, data);
  return data;
}

/**
 * =========================================================
 * RENDERIZADO DEL PANEL INSPECTOR
 * =========================================================
 */
function renderInspectorVisuals(pokemon) {
  elements.detailId.textContent = formatDexNumber(pokemon.id);
  elements.detailName.textContent = pokemon.name.toUpperCase();

  // Imágenes
  const officialArt = pokemon.sprites?.other?.['official-artwork']?.front_default;
  const officialShiny = pokemon.sprites?.other?.['official-artwork']?.front_shiny;
  const fallback = pokemon.sprites?.front_default;

  const currentImg = state.isShiny ? (officialShiny || officialArt || fallback) : (officialArt || fallback);
  elements.detailImg.src = currentImg;
  elements.detailImg.alt = pokemon.name;

  // Resplandor temático según el tipo primario
  const primaryType = pokemon.types[0]?.type?.name || 'normal';
  const typeColor = TYPE_CONFIG[primaryType]?.color || '#38bdf8';
  elements.artworkHalo.style.background = `radial-gradient(circle, ${typeColor}55 0%, transparent 70%)`;

  // Badges de tipos
  elements.detailTypes.innerHTML = '';
  pokemon.types.forEach(t => {
    const tName = t.type.name;
    const info = TYPE_CONFIG[tName] || { name: tName, color: '#64748b' };
    const pill = document.createElement('span');
    pill.className = 'type-pill';
    pill.style.backgroundColor = info.color;
    pill.textContent = info.name;
    elements.detailTypes.appendChild(pill);
  });
}

function renderInspectorStats(pokemon) {
  elements.detailStatsList.innerHTML = '';
  let totalBST = 0;

  pokemon.stats.forEach(s => {
    const statKey = s.stat.name;
    const statName = STAT_TRANSLATIONS[statKey] || statKey.toUpperCase();
    const statVal = s.base_stat;
    totalBST += statVal;

    const pct = Math.min(100, Math.round((statVal / 180) * 100));

    // Color de la barra
    let barColor = '#ef4444'; // Rojo (<60)
    if (statVal >= 120) barColor = '#06b6d4'; // Cian (120+)
    else if (statVal >= 90) barColor = '#10b981'; // Verde (90-119)
    else if (statVal >= 60) barColor = '#f59e0b'; // Ámbar (60-89)

    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `
      <span class="stat-label">${statName}</span>
      <span class="stat-value">${statVal}</span>
      <div class="stat-track">
        <div class="stat-fill" style="width: 0%; background-color: ${barColor};"></div>
      </div>
    `;

    elements.detailStatsList.appendChild(item);

    setTimeout(() => {
      const fill = item.querySelector('.stat-fill');
      if (fill) fill.style.width = `${pct}%`;
    }, 40);
  });

  elements.detailBst.textContent = totalBST;
}

async function renderInspectorEvolutions(species) {
  elements.detailEvolutionFlow.innerHTML = '<div class="loading-spin" style="margin:20px auto;"></div>';

  if (!species.evolution_chain?.url) {
    elements.detailEvolutionFlow.innerHTML = '<p style="color:#64748b; text-align:center;">Sin datos evolutivos.</p>';
    return;
  }

  try {
    const res = await fetch(species.evolution_chain.url);
    const chainData = await res.json();
    const stages = parseEvolutionChain(chainData.chain);

    elements.detailEvolutionFlow.innerHTML = '';

    if (stages.length === 0) {
      elements.detailEvolutionFlow.innerHTML = '<p style="color:#64748b; text-align:center;">Este Pokémon no evoluciona.</p>';
      return;
    }

    stages.forEach((step, idx) => {
      if (idx > 0) {
        const divider = document.createElement('div');
        divider.className = 'evo-arrow-divider';
        let triggerLabel = 'Evolución';
        if (step.trigger) {
          if (step.trigger.min_level) triggerLabel = `Nivel ${step.trigger.min_level}`;
          else if (step.trigger.item) triggerLabel = step.trigger.item.name.replace('-', ' ');
          else if (step.trigger.trigger?.name === 'trade') triggerLabel = 'Intercambio';
          else if (step.trigger.min_happiness) triggerLabel = 'Felicidad';
        }
        divider.innerHTML = `↓ <span style="font-size:0.75rem; color:#94a3b8;">${triggerLabel}</span>`;
        elements.detailEvolutionFlow.appendChild(divider);
      }

      const card = document.createElement('div');
      card.className = `evo-step-card ${step.id === state.currentId ? 'current' : ''}`;
      card.title = `Seleccionar a ${step.name}`;

      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${step.id}.png`;

      card.innerHTML = `
        <img class="evo-step-sprite" src="${spriteUrl}" alt="${step.name}" loading="lazy">
        <div class="evo-step-meta">
          <span class="evo-step-num">${formatDexNumber(step.id)}</span>
          <span class="evo-step-name">${step.name}</span>
        </div>
        ${step.id === state.currentId ? '<span class="evo-step-badge">ACTUAL</span>' : ''}
      `;

      card.addEventListener('click', () => {
        selectPokemon(step.id, { playSound: true, scrollToList: true });
      });

      elements.detailEvolutionFlow.appendChild(card);
    });

  } catch (e) {
    console.error(e);
    elements.detailEvolutionFlow.innerHTML = '<p style="color:#64748b; text-align:center;">Error al cargar evoluciones.</p>';
  }
}

function parseEvolutionChain(chainNode) {
  const result = [];
  function walk(node, trigger = null) {
    if (!node) return;
    const parts = node.species.url.split('/').filter(Boolean);
    const id = parseInt(parts[parts.length - 1], 10);
    result.push({
      id: id,
      name: node.species.name,
      trigger: trigger
    });
    if (node.evolves_to && node.evolves_to.length > 0) {
      node.evolves_to.forEach(child => {
        const details = child.evolution_details && child.evolution_details[0] ? child.evolution_details[0] : null;
        walk(child, details);
      });
    }
  }
  walk(chainNode);
  return result;
}

function renderInspectorInfo(pokemon, species) {
  let esEntry = species.flavor_text_entries?.find(e => e.language.name === 'es');
  if (!esEntry) esEntry = species.flavor_text_entries?.find(e => e.language.name === 'en');
  const text = esEntry ? esEntry.flavor_text.replace(/[\n\f\r]/g, ' ') : 'Sin descripción disponible.';
  elements.detailFlavor.textContent = `"${text}"`;

  elements.detailHeight.textContent = (pokemon.height / 10).toFixed(1) + ' m';
  elements.detailWeight.textContent = (pokemon.weight / 10).toFixed(1) + ' kg';

  const genus = species.genera?.find(g => g.language.name === 'es') || species.genera?.find(g => g.language.name === 'en');
  elements.detailCategory.textContent = genus ? genus.genus : 'Desconocida';

  const abilities = pokemon.abilities.map(a => a.ability.name.replace('-', ' ')).join(', ');
  elements.detailAbilities.textContent = abilities || 'Ninguna';
}

/**
 * =========================================================
 * RENDERIZADO DE LA GRAN LISTA DE POKÉMON
 * =========================================================
 */
function renderPokemonList(list) {
  elements.pokemonListRows.innerHTML = '';
  elements.resultsCount.textContent = `${list.length} Pokémon encontrados`;

  if (list.length === 0) {
    elements.pokemonListRows.innerHTML = `
      <div style="padding:40px; text-align:center; color:#64748b;">
        No se encontraron Pokémon con los filtros aplicados.
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(poke => {
    const row = document.createElement('div');
    row.className = `pokemon-row-item ${poke.id === state.currentId ? 'active' : ''}`;
    row.id = `poke-row-${poke.id}`;
    row.dataset.id = poke.id;

    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`;

    row.innerHTML = `
      <span class="row-number">${formatDexNumber(poke.id)}</span>
      <div class="row-pokemon-info">
        <img class="row-sprite" src="${spriteUrl}" alt="${poke.name}" loading="lazy">
        <span class="row-name">${poke.name}</span>
      </div>
      <div class="row-types" id="row-types-${poke.id}">
        <!-- Tipos cargados dinámicamente -->
        <span class="type-pill" style="background:#334155;">Cargando...</span>
      </div>
      <div class="row-quick-stats" id="row-stats-${poke.id}">
        <div class="stat-pill"><span class="stat-pill-label">N°</span><span class="stat-pill-val">${poke.id}</span></div>
      </div>
      <button class="row-audio-btn" title="Escuchar grito de ${poke.name}">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
      </button>
    `;

    // Clic en la fila completa selecciona al Pokémon
    row.addEventListener('click', (e) => {
      // Si hizo clic en el botón de audio, solo reproduce audio
      if (e.target.closest('.row-audio-btn')) {
        e.stopPropagation();
        playUiBeep(880, 0.04);
        playPokemonCry(poke.id);
        return;
      }
      selectPokemon(poke.id, { playSound: true, scrollToList: false });
    });

    fragment.appendChild(row);
  });

  elements.pokemonListRows.appendChild(fragment);

  // Cargar badges de tipos visibles
  enrichVisibleRowData(list.slice(0, 50));
}

function highlightActiveRow(id, scrollToList = false) {
  document.querySelectorAll('.pokemon-row-item').forEach(r => r.classList.remove('active'));
  const activeRow = document.getElementById(`poke-row-${id}`);
  if (activeRow) {
    activeRow.classList.add('active');
    if (scrollToList) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

/**
 * Enriquecer filas con tipos y estadísticas rápidas
 */
async function enrichVisibleRowData(sampleList) {
  for (const poke of sampleList) {
    const typesContainer = document.getElementById(`row-types-${poke.id}`);
    const statsContainer = document.getElementById(`row-stats-${poke.id}`);

    if (typesContainer && (!typesContainer.dataset.loaded || typesContainer.dataset.loaded === 'false')) {
      try {
        const data = await getPokemonData(poke.id);
        typesContainer.innerHTML = '';
        data.types.forEach(t => {
          const tName = t.type.name;
          const info = TYPE_CONFIG[tName] || { name: tName, color: '#64748b' };
          const pill = document.createElement('span');
          pill.className = 'type-pill';
          pill.style.backgroundColor = info.color;
          pill.textContent = info.name;
          typesContainer.appendChild(pill);
        });

        if (statsContainer) {
          const hp = data.stats.find(s => s.stat.name === 'hp')?.base_stat || 0;
          const atk = data.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
          const def = data.stats.find(s => s.stat.name === 'defense')?.base_stat || 0;
          statsContainer.innerHTML = `
            <div class="stat-pill"><span class="stat-pill-label">PS</span><span class="stat-pill-val">${hp}</span></div>
            <div class="stat-pill"><span class="stat-pill-label">ATQ</span><span class="stat-pill-val">${atk}</span></div>
            <div class="stat-pill"><span class="stat-pill-label">DEF</span><span class="stat-pill-val">${def}</span></div>
          `;
        }

        typesContainer.dataset.loaded = 'true';
        state.typeLookup.set(poke.id, data.types.map(t => t.type.name));
      } catch (e) {}
    }
  }
}

/**
 * =========================================================
 * FILTRADO EN TIEMPO REAL
 * =========================================================
 */
function applyFilters() {
  const query = state.searchQuery.toLowerCase().trim();
  let result = [...state.allPokemon];

  // 1. Filtrar por Generación
  if (state.genFilter !== 'all' && GENERATION_RANGES[state.genFilter]) {
    const [min, max] = GENERATION_RANGES[state.genFilter];
    result = result.filter(p => p.id >= min && p.id <= max);
  }

  // 2. Filtrar por Búsqueda (Nombre o Número)
  if (query) {
    const cleanNum = query.replace('#', '');
    const isNum = /^\d+$/.test(cleanNum);

    if (isNum) {
      const searchNum = parseInt(cleanNum, 10);
      result = result.filter(p => p.id === searchNum || String(p.id).includes(cleanNum));
    } else {
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }
  }

  // 3. Filtrar por Tipo
  if (state.typeFilter !== 'all') {
    result = result.filter(p => {
      const types = state.typeLookup.get(p.id);
      return types ? types.includes(state.typeFilter) : true;
    });
  }

  state.filteredPokemon = result;
  renderPokemonList(result);
}

/**
 * =========================================================
 * INICIALIZACIÓN
 * =========================================================
 */
async function initApp() {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await res.json();

    state.allPokemon = data.results.map((item, index) => {
      const id = index + 1;
      return { id: id, name: item.name, url: item.url };
    });

    state.filteredPokemon = [...state.allPokemon];
    renderPokemonList(state.allPokemon);

    // Cargar Charmander (#004) por defecto
    await selectPokemon(4, { playSound: false, scrollToList: true });

    // Pre-cargar tipos de primera generación
    for (let i = 1; i <= 151; i++) {
      getPokemonData(i).then(p => {
        state.typeLookup.set(i, p.types.map(t => t.type.name));
      }).catch(() => {});
    }

  } catch (error) {
    console.error('Error al inicializar:', error);
    elements.resultsCount.textContent = 'Error de conexión';
  }
}

/**
 * =========================================================
 * EVENTOS Y CONTROLES
 * =========================================================
 */
// Búsqueda
elements.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  applyFilters();
});

elements.clearSearchBtn.addEventListener('click', () => {
  elements.searchInput.value = '';
  state.searchQuery = '';
  applyFilters();
  elements.searchInput.focus();
});

// Filtros
elements.genFilter.addEventListener('change', (e) => {
  playUiBeep(550, 0.04);
  state.genFilter = e.target.value;
  applyFilters();
});

elements.typeFilter.addEventListener('change', (e) => {
  playUiBeep(550, 0.04);
  state.typeFilter = e.target.value;
  applyFilters();
});

// Botón Aleatorio
elements.btnRandom.addEventListener('click', () => {
  const randomId = Math.floor(Math.random() * 1025) + 1;
  selectPokemon(randomId, { playSound: true, scrollToList: true });
});

// Botón de Audio On/Off
elements.btnSoundToggle.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  if (state.isMuted) {
    elements.soundIcon.textContent = '🔇';
    elements.soundText.textContent = 'Mudo';
    elements.btnSoundToggle.style.color = '#94a3b8';
  } else {
    elements.soundIcon.textContent = '🔊';
    elements.soundText.textContent = 'Sonido';
    elements.btnSoundToggle.style.color = '#fff';
    playUiBeep(800, 0.05);
  }
});

// Botón Grito Oficial en el Inspector
elements.btnPlayCry.addEventListener('click', () => {
  playUiBeep(900, 0.04);
  playPokemonCry(state.currentId);
});

// Alternar Shiny
elements.btnShiny.addEventListener('click', () => {
  state.isShiny = !state.isShiny;
  elements.btnShiny.classList.toggle('active', state.isShiny);
  playUiBeep(state.isShiny ? 1100 : 500, 0.05);
  selectPokemon(state.currentId, { playSound: false, scrollToList: false });
});

// Pestañas del Inspector
elements.tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playUiBeep(650, 0.03);
    const tab = btn.dataset.tab;
    elements.tabButtons.forEach(b => b.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(`content${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (target) target.classList.add('active');
  });
});

// Navegación rápida Anterior / Siguiente
function navigate(delta) {
  let next = state.currentId + delta;
  if (next < 1) next = 1025;
  if (next > 1025) next = 1;
  selectPokemon(next, { playSound: true, scrollToList: true });
}

elements.btnNavPrev.addEventListener('click', () => navigate(-1));
elements.btnNavNext.addEventListener('click', () => navigate(1));

// Navegación con teclado
window.addEventListener('keydown', (e) => {
  if (document.activeElement === elements.searchInput) {
    if (e.key === 'Escape') elements.searchInput.blur();
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    navigate(1);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    navigate(-1);
  } else if (e.key === ' ') {
    e.preventDefault();
    playPokemonCry(state.currentId);
  }
});

// Desbloquear Web Audio API en primer clic
window.addEventListener('click', () => {
  getAudioContext();
}, { once: true });

document.addEventListener('DOMContentLoaded', initApp);
