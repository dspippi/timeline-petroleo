// Shared OilMap React component — driven by a `theme` prop.
// Exports OilMap to window so all variations can use it.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Status meta ----------
const STATUS_META = {
  operando:        { label: 'Em operação',        order: 0 },
  interrompida:    { label: 'Produção interrompida', order: 1 },
  descomissionada: { label: 'Descomissionada',    order: 2 },
};

// ---------- Utils ----------
const fmtNum = (n) => n == null || isNaN(n) ? '—' : new Intl.NumberFormat('pt-BR').format(n);
const shortOp = (op) => {
  if (!op) return '—';
  return op
    .replace('PETRÓLEO BRASILEIRO S.A. - PETROBRAS', 'PETROBRAS')
    .replace(/ S\.A\.?$/i, '')
    .replace(/ LTDA\.?$/i, '')
    .replace(/ DO BRASIL$/i, '')
    .replace(/ BRASIL$/i, '')
    .replace(/ ENERGIA$/i, '')
    .replace(/ PETROLEUM OFFSHORE$/i, '')
    .replace(/ PETRÓLEO E GÁS$/i, '')
    .replace(/ EP BRASIL$/i, '')
    .trim();
};
const shortClass = (c) => {
  if (!c) return '—';
  if (c.includes('FPSO')) return 'FPSO';
  if (c.includes('TLP') || c.includes('Tension')) return 'TLP';
  if (c.includes('Semissubmers')) return 'SS';
  if (c.includes('Caisson')) return 'Caisson';
  if (c.includes('Jaqueta')) return 'Fixa';
  return c;
};

const normalizeFieldName = (name) => (name || '').trim().replace(/\s+/g, ' ').toUpperCase();
const normalizeText = (text) => normalizeFieldName(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const FIELD_BASIN_COLORS = {
  'ALAGOAS': '#7c3aed',
  'CAMAMU': '#d97706',
  'CAMPOS': '#2563eb',
  'CEARA': '#0f766e',
  'CUMURUXATIBA': '#be123c',
  'ESPIRITO SANTO': '#16a34a',
  'POTIGUAR': '#9333ea',
  'SANTOS': '#ea580c',
  'SERGIPE': '#0891b2',
};
const fieldColorForBasin = (basin) => FIELD_BASIN_COLORS[normalizeText(basin)] || '#64748b';
const fieldArea = (feature) => Number(feature && feature.properties && feature.properties.AREA) || 0;
const fieldLimitForZoom = (zoom) => {
  if (zoom >= 10) return Infinity;
  if (zoom >= 9) return 100;
  if (zoom >= 8) return 70;
  if (zoom >= 7) return 45;
  if (zoom >= 6) return 28;
  return 14;
};
const shortPlatformName = (name) => {
  if (!name) return '';
  return name
    .replace(/^PLATAFORMA\s+/i, '')
    .replace(/^FPSO\s+/i, '')
    .replace(/^PETROBRAS\s+/i, '')
    .replace(/^P-?\s*(\d+)/i, 'P-$1')
    .trim();
};
const platformLabelText = (platform, showDetail) => {
  if (!showDetail) return platform.sigla;
  const detail = shortPlatformName(platform.nome);
  const sigla = platform.sigla.toUpperCase();
  const normalizedDetail = detail.toUpperCase();
  const siglaNumber = sigla.match(/^P-(\d+)$/);

  if (!detail || normalizedDetail === sigla) return platform.sigla;
  if (siglaNumber && normalizedDetail === siglaNumber[1]) return platform.sigla;
  return `${platform.sigla} · ${detail}`;
};

// ---------- The big component ----------
// ---------- Metadata (data freshness) ----------
const DATA_META = {
  versao: 'v.2026.04',
  autor: 'Diogo S. P. Calegari',
  email: 'timelinedopetroleo@gmail.com',
  ultima_atualizacao: '26/04/2026',
  inclusao: 'Plataformas offshore do Brasil — 76 unidades nas bacias de Campos, Santos, Espírito Santo, Potiguar e Camamu',
};

const FOOTER_TEXT = "Projeto pessoal e independente. Informações baseadas em fontes públicas e literatura especializada — Envie um email caso identifique algum erro, inconsistência ou tenha alguma sugestão de melhoria. O autor não se responsabiliza pelo uso das informações aqui apresentadas.";

function OilMap({ theme, platforms, fieldFeatures, onToggleMode }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersLayer = useRef(null);
  const fieldsLayer = useRef(null);
  const fieldLabelsLayer = useRef(null);
  const platformLabelsLayer = useRef(null);

  // Sidebar widths (resizable)
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(380);
  const [footerExpanded, setFooterExpanded] = useState(false);

  // Filters
  const [selectedOps, setSelectedOps] = useState(new Set());
  const [selectedCampos, setSelectedCampos] = useState(new Set());
  const [selectedStatus, setSelectedStatus] = useState(new Set(['operando', 'interrompida', 'descomissionada']));
  const [selectedBacias, setSelectedBacias] = useState(new Set());
  const [selectedClasses, setSelectedClasses] = useState(new Set());
  const yearMinAll = useMemo(() => Math.min(...platforms.map(p => p.ano_inicio_operacao || 9999).filter(y => y !== 9999)), [platforms]);
  const yearMaxAll = useMemo(() => Math.max(...platforms.map(p => p.ano_inicio_operacao || 0)), [platforms]);
  const [yearRange, setYearRange] = useState([yearMinAll, yearMaxAll]);
  const [search, setSearch] = useState('');
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showFields, setShowFields] = useState(true);
  const [mapZoom, setMapZoom] = useState(5);
  const [mapViewTick, setMapViewTick] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const allOps = useMemo(() => {
    const counts = {};
    platforms.forEach(p => { counts[p.operador] = (counts[p.operador] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([op]) => op);
  }, [platforms]);
  const opCounts = useMemo(() => {
    const c = {};
    platforms.forEach(p => { c[p.operador] = (c[p.operador] || 0) + 1; });
    return c;
  }, [platforms]);
  const allBacias = useMemo(() => [...new Set(platforms.map(p => p.bacia))].sort(), [platforms]);
  const allClasses = useMemo(() => [...new Set(platforms.map(p => p.classificacao))].sort(), [platforms]);
  const allCampos = useMemo(() => {
    const set = new Set();
    platforms.forEach(p => {
      if (p.campos) p.campos.split('/').forEach(c => { const t = c.trim(); if (t) set.add(t); });
    });
    return [...set].sort();
  }, [platforms]);
  const campoCounts = useMemo(() => {
    const c = {};
    platforms.forEach(p => {
      if (p.campos) p.campos.split('/').forEach(f => { const t = f.trim(); if (t) c[t] = (c[t] || 0) + 1; });
    });
    return c;
  }, [platforms]);

  const filtered = useMemo(() => {
    return platforms.filter(p => {
      if (selectedOps.size && !selectedOps.has(p.operador)) return false;
      if (!selectedStatus.has(p.status)) return false;
      if (selectedBacias.size && !selectedBacias.has(p.bacia)) return false;
      if (selectedClasses.size && !selectedClasses.has(p.classificacao)) return false;
      if (selectedCampos.size) {
        const platCampos = (p.campos || '').split('/').map(c => c.trim()).filter(Boolean);
        if (!platCampos.some(c => selectedCampos.has(c))) return false;
      }
      if (p.ano_inicio_operacao && (p.ano_inicio_operacao < yearRange[0] || p.ano_inicio_operacao > yearRange[1])) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(p.nome.toLowerCase().includes(q) || p.sigla.toLowerCase().includes(q) || (p.campos || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [platforms, selectedOps, selectedCampos, selectedStatus, selectedBacias, selectedClasses, yearRange, search]);

  const selectedPlat = useMemo(() => filtered.find(p => p.sigla === selectedId) || platforms.find(p => p.sigla === selectedId), [filtered, platforms, selectedId]);
  const visibleFieldFeatures = useMemo(() => {
    if (!fieldFeatures || fieldFeatures.length === 0) return [];
    const selectedFieldNames = new Set([...selectedCampos].map((field) => normalizeFieldName(field)));
    const selectedBasinNames = new Set([...selectedBacias].map((basin) => normalizeText(basin)));
    return fieldFeatures.filter((feature) => {
      const props = feature.properties || {};
      const fieldName = normalizeFieldName(props.NOM_CAMPO);
      const basinName = props.NOM_BACIA || '';
      if (!fieldName) return false;
      if (selectedFieldNames.size && !selectedFieldNames.has(fieldName)) return false;
      if (selectedBasinNames.size && !selectedBasinNames.has(normalizeText(basinName))) return false;
      if (search) {
        const q = normalizeText(search);
        const haystack = `${normalizeText(props.NOM_CAMPO)} ${normalizeText(basinName)} ${normalizeText(props.SIG_CAMPO)}`;
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [fieldFeatures, search, selectedBacias, selectedCampos]);
  const displayedFieldFeatures = useMemo(() => {
    if (search || selectedCampos.size) return visibleFieldFeatures;
    const limit = fieldLimitForZoom(mapZoom);
    if (!Number.isFinite(limit) || visibleFieldFeatures.length <= limit) return visibleFieldFeatures;
    return [...visibleFieldFeatures]
      .sort((a, b) => fieldArea(b) - fieldArea(a))
      .slice(0, limit);
  }, [mapZoom, search, selectedCampos, visibleFieldFeatures]);

  // Stats
  const stats = useMemo(() => {
    const totalCap = filtered.reduce((s, p) => s + (p.capacidade_petroleo_bbl_d || 0), 0);
    const opCount = filtered.filter(p => p.status === 'operando').length;
    return { count: filtered.length, totalCap, opCount };
  }, [filtered]);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapEl.current, {
      center: [-15, -42],
      zoom: 5,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.createPane('fieldsPane').style.zIndex = 350;
    mapRef.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    fieldLabelsLayer.current = L.layerGroup().addTo(map);
    platformLabelsLayer.current = L.layerGroup().addTo(map);
    const syncMapViewState = () => {
      setMapZoom(map.getZoom());
      setMapViewTick((v) => v + 1);
    };
    map.on('zoomend', syncMapViewState);
    map.on('moveend', syncMapViewState);
    syncMapViewState();
  }, []);

  // Tile layer (changes with theme)
  const tileRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileRef.current) {
      mapRef.current.removeLayer(tileRef.current);
    }
    tileRef.current = L.tileLayer(theme.tileUrl, {
      attribution: theme.tileAttribution,
      maxZoom: 19,
      subdomains: theme.subdomains || 'abc',
    }).addTo(mapRef.current);
    // Re-style background of map div in case tiles are partially transparent
    if (mapEl.current) mapEl.current.style.background = theme.mapBg;
  }, [theme.tileUrl, theme.mapBg, theme.tileAttribution]);

  // Render markers when filtered changes
  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();
    if (!showPlatforms) return;

    filtered.forEach(p => {
      const color = theme.statusColors[p.status];
      const isSel = p.sigla === selectedId;
      const baseR = theme.markerSize || 7;
      const radius = isSel ? baseR + 4 : baseR;
      const style = theme.markerStyle || 'dot';
      let marker;
      if (style === 'pulse') {
        // Outer halo + inner solid circle, via divIcon
        const halo = baseR * 2.5;
        marker = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            className: 'oilmap-pulse-wrap',
            html: `<span class="oilmap-pulse-halo" style="width:${halo*2}px;height:${halo*2}px;background:${color}"></span><span class="oilmap-pulse-core" style="width:${radius*2}px;height:${radius*2}px;background:${color};border-color:${theme.markerStroke}"></span>`,
            iconSize: [halo*2, halo*2],
            iconAnchor: [halo, halo],
          })
        });
      } else if (style === 'ring') {
        marker = L.circleMarker([p.latitude, p.longitude], {
          radius,
          color: color,
          weight: isSel ? 3.5 : 2.25,
          fillColor: theme.bg,
          fillOpacity: 0.85,
        });
      } else {
        // 'dot' (default)
        marker = L.circleMarker([p.latitude, p.longitude], {
          radius,
          color: theme.markerStroke,
          weight: isSel ? 2.5 : 1.25,
          fillColor: color,
          fillOpacity: p.status === 'descomissionada' ? 0.55 : 0.92,
        });
      }
      marker.on('click', () => setSelectedId(p.sigla));
      marker.bindTooltip(`<b>${p.sigla}</b> · ${shortOp(p.operador)}`, { className: `oilmap-tip oilmap-tip-${theme.id}`, direction: 'top', offset: [0, -8] });
      marker.addTo(markersLayer.current);
    });
  }, [filtered, selectedId, showPlatforms, theme]);

  useEffect(() => {
    if (fieldsLayer.current && mapRef.current) mapRef.current.removeLayer(fieldsLayer.current);
    if (!displayedFieldFeatures || displayedFieldFeatures.length === 0) { fieldsLayer.current = null; return; }
    fieldsLayer.current = L.geoJSON(displayedFieldFeatures, {
      style: (feature) => {
        const fieldColor = fieldColorForBasin(feature.properties && feature.properties.NOM_BACIA);
        return {
        color: fieldColor,
        weight: 1.7,
        fillColor: fieldColor,
        fillOpacity: theme.id === 'dark' ? 0.13 : 0.16,
        opacity: 0.82,
        };
      },
      pane: 'fieldsPane',
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        layer.bindTooltip(
          `<b>${p.NOM_CAMPO}</b><br>${p.NOM_BACIA} · ${p.AREA ? p.AREA + ' km²' : ''}`,
          { className: `oilmap-tip oilmap-tip-${theme.id}`, sticky: true }
        );
      },
    });
    if (showFields && mapRef.current) fieldsLayer.current.addTo(mapRef.current);
    return () => { if (mapRef.current && fieldsLayer.current) mapRef.current.removeLayer(fieldsLayer.current); };
  }, [displayedFieldFeatures, theme.id]);

  useEffect(() => {
    if (!mapRef.current || !fieldsLayer.current) return;
    if (showFields) {
      fieldsLayer.current.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(fieldsLayer.current);
    }
  }, [showFields]);

  useEffect(() => {
    if (!mapRef.current || !fieldLabelsLayer.current || !platformLabelsLayer.current) return;

    const map = mapRef.current;
    const fieldLayer = fieldLabelsLayer.current;
    const platformLayer = platformLabelsLayer.current;
    fieldLayer.clearLayers();
    platformLayer.clearLayers();

    const viewport = map.getBounds().pad(0.15);
    const nearPlatformZoom = mapZoom >= 11;
    const platformClass = nearPlatformZoom ? 'oilmap-label-platform is-near' : 'oilmap-label-platform is-mid';
    const platformLabelPoints = [];
    const platformLabelCandidates = [];

    // Plataformas: aparecem progressivamente em zoom medio/proximo
    if (showPlatforms && mapZoom >= 8) {
      const maxLabels = nearPlatformZoom ? 140 : 60;
      let emitted = 0;

      filtered.forEach((p) => {
        const isSelected = p.sigla === selectedId;
        if (!isSelected && emitted >= maxLabels) return;

        const latlng = L.latLng(p.latitude, p.longitude);
        if (!isSelected && !viewport.contains(latlng)) return;
        if (!isSelected && !nearPlatformZoom && p.status !== 'operando') return;

        platformLabelCandidates.push({ p, latlng, isSelected });
        platformLabelPoints.push(map.latLngToLayerPoint(latlng));
        if (!isSelected) emitted += 1;
      });

      platformLabelCandidates.forEach(({ p, latlng, isSelected }) => {
        const text = platformLabelText(p, nearPlatformZoom);
        const selectedClass = isSelected ? ' is-selected' : '';

        L.marker(latlng, {
          interactive: false,
          keyboard: false,
          zIndexOffset: isSelected ? 300 : 120,
          icon: L.divIcon({
            className: `oilmap-label ${platformClass}${selectedClass}`,
            html: `<span>${text}</span>`,
          }),
        }).addTo(platformLayer);

      });
    }

    // Campos: aparecem sempre e deslocam para evitar sobreposição com labels de plataforma
    if (showFields && displayedFieldFeatures && displayedFieldFeatures.length > 0) {
      const fieldClass = nearPlatformZoom ? 'oilmap-label-field is-near' : 'oilmap-label-field is-mid';
      const fieldPoints = [];
      const minGap = nearPlatformZoom ? 42 : 30;
      const tryOffsets = [
        L.point(0, 0),
        L.point(0, -24),
        L.point(20, -18),
        L.point(-20, -18),
        L.point(24, 0),
        L.point(-24, 0),
        L.point(0, 24),
        L.point(20, 18),
        L.point(-20, 18),
      ];

      const hasCollision = (point) => {
        for (let i = 0; i < platformLabelPoints.length; i += 1) {
          if (point.distanceTo(platformLabelPoints[i]) < minGap) return true;
        }
        for (let i = 0; i < fieldPoints.length; i += 1) {
          if (point.distanceTo(fieldPoints[i]) < minGap) return true;
        }
        return false;
      };

      displayedFieldFeatures.forEach((feature) => {
        const props = feature.properties || {};
        const rawName = props.NOM_CAMPO || '';
        const normalized = normalizeFieldName(rawName);
        if (!normalized) return;

        const center = L.geoJSON(feature).getBounds().getCenter();
        if (!viewport.contains(center)) return;

        const centerPoint = map.latLngToLayerPoint(center);
        let finalPoint = centerPoint;
        for (let i = 0; i < tryOffsets.length; i += 1) {
          const candidate = centerPoint.add(tryOffsets[i]);
          if (!hasCollision(candidate)) {
            finalPoint = candidate;
            break;
          }
        }

        fieldPoints.push(finalPoint);
        const finalLatLng = map.layerPointToLatLng(finalPoint);

        L.marker(finalLatLng, {
          interactive: false,
          keyboard: false,
          zIndexOffset: -100,
          icon: L.divIcon({
            className: `oilmap-label ${fieldClass}`,
            html: `<span style="--field-color:${fieldColorForBasin(props.NOM_BACIA)}">${rawName}</span>`,
          }),
        }).addTo(fieldLayer);
      });
    }
  }, [displayedFieldFeatures, filtered, mapViewTick, mapZoom, selectedId, showFields, showPlatforms]);

  // Pan to selected
  useEffect(() => {
    if (selectedPlat && mapRef.current) {
      mapRef.current.flyTo([selectedPlat.latitude, selectedPlat.longitude], Math.max(mapRef.current.getZoom(), 8), { duration: 0.8 });
    }
  }, [selectedId]);

  const toggleSetItem = (set, setter, item) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item); else next.add(item);
    setter(next);
  };

  const t = theme; // shorthand

  // ---------- Render UI ----------
  return (
    <div className={`oilmap-root oilmap-${t.id}`} style={{ '--accent': t.accent, '--bg': t.bg, '--bg2': t.bg2, '--fg': t.fg, '--fg2': t.fg2, '--border': t.border, '--card': t.card, '--cOp': t.statusColors.operando, '--cInt': t.statusColors.interrompida, '--cDec': t.statusColors.descomissionada }}>
      {/* Header */}
      <header className="oilmap-header">
        <div className="oilmap-brand">
          <div className="oilmap-logo" aria-hidden="true">
            {t.logoSvg}
          </div>
          <div className="oilmap-brand-text">
            <div className="oilmap-brand-title">{t.brandTitle}</div>
            <div className="oilmap-brand-sub">{t.brandSub}</div>
          </div>
        </div>
        <nav className="oilmap-nav">
          <a href="#" className="oilmap-nav-link">Mapa</a>
          <a href="https://www.timelinedopetroleo.com.br" target="_blank" rel="noopener" className="oilmap-nav-link">Timeline ↗</a>
          <a href="#" className="oilmap-nav-link">Sobre</a>
        </nav>
        <div className="oilmap-header-meta">
          <span className="oilmap-pill">Brasil</span>
          <span className="oilmap-count">{filtered.length} <span>/ {platforms.length}</span></span>
          {onToggleMode && (
            <button className="oilmap-mode-btn" onClick={onToggleMode} aria-label="alternar modo">
              {theme.id === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
              )}
              {theme.id === 'light' ? 'Noturno' : 'Diurno'}
            </button>
          )}
        </div>
      </header>

      {/* Body grid */}
      <div className="oilmap-body" style={{ gridTemplateColumns: `${filtersOpen ? leftWidth : 40}px 1fr` }}>
        {/* Filters sidebar */}
        <aside className={`oilmap-filters ${filtersOpen ? '' : 'is-collapsed'}`}>
          <div className="oilmap-filters-head">
            <span>Filtros &amp; Lista</span>
            <button className="oilmap-icon-btn" onClick={() => setFiltersOpen(o => !o)} aria-label="toggle filtros">
              {filtersOpen ? '◀' : '▶'}
            </button>
          </div>

          {filtersOpen && (
            <div className="oilmap-filters-body">
              {/* Stats */}
              <div className="oilmap-stats">
                <div className="oilmap-stat">
                  <div className="oilmap-stat-num">{stats.count}</div>
                  <div className="oilmap-stat-lbl">Plataformas</div>
                </div>
                <div className="oilmap-stat">
                  <div className="oilmap-stat-num">{stats.opCount}</div>
                  <div className="oilmap-stat-lbl">Operando</div>
                </div>
              </div>

              <div className="oilmap-search-wrap">
                <input
                  className="oilmap-search"
                  placeholder="Buscar nome, sigla, campo…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Combobox-style platform picker */}
              <PlatformCombobox
                list={filtered}
                onSelect={setSelectedId}
                selectedId={selectedId}
                statusColors={t.statusColors}
              />

              {/* Status */}
              <Section title="Status">
                <div className="oilmap-status-row">
                  {Object.entries(STATUS_META).map(([key, meta]) => {
                    const active = selectedStatus.has(key);
                    return (
                      <button
                        key={key}
                        className={`oilmap-chip oilmap-chip-status ${active ? 'is-on' : ''}`}
                        onClick={() => toggleSetItem(selectedStatus, setSelectedStatus, key)}
                        data-status={key}
                      >
                        <span className="oilmap-dot" style={{ background: t.statusColors[key] }}></span>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Year range */}
              <Section title={`Ano de operação (${yearRange[0]} – ${yearRange[1]})`}>
                <DualRange
                  min={yearMinAll}
                  max={yearMaxAll}
                  value={yearRange}
                  onChange={setYearRange}
                />
              </Section>

              {/* Bacia */}
              <Section title="Bacia">
                <div className="oilmap-chip-wrap">
                  {allBacias.map(b => (
                    <button
                      key={b}
                      className={`oilmap-chip oilmap-chip-basin ${selectedBacias.has(b) ? 'is-on' : ''}`}
                      onClick={() => toggleSetItem(selectedBacias, setSelectedBacias, b)}
                    >
                      <span className="oilmap-basin-swatch" style={{ background: fieldColorForBasin(b) }}></span>
                      {b}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Tipo */}
              <Section title="Tipo de plataforma">
                <div className="oilmap-chip-wrap">
                  {allClasses.map(c => (
                    <button
                      key={c}
                      className={`oilmap-chip ${selectedClasses.has(c) ? 'is-on' : ''}`}
                      onClick={() => toggleSetItem(selectedClasses, setSelectedClasses, c)}
                    >{shortClass(c)}</button>
                  ))}
                </div>
              </Section>

              {/* Operador */}
              <Section title={`Operador (${selectedOps.size || 'todos'})`}>
                <OperatorDropdown
                  options={allOps}
                  counts={opCounts}
                  selected={selectedOps}
                  onToggle={op => toggleSetItem(selectedOps, setSelectedOps, op)}
                  onClear={() => setSelectedOps(new Set())}
                  searchPlaceholder="Filtrar operador…"
                  allLabel="Todos os operadores"
                />
              </Section>

              {/* Campo */}
              <Section title={`Campo (${selectedCampos.size || 'todos'})`}>
                <OperatorDropdown
                  options={allCampos}
                  counts={campoCounts}
                  selected={selectedCampos}
                  onToggle={c => toggleSetItem(selectedCampos, setSelectedCampos, c)}
                  onClear={() => setSelectedCampos(new Set())}
                  searchPlaceholder="Filtrar campo…"
                  allLabel="Todos os campos"
                />
              </Section>

              <Section title="Camadas">
                <label className="oilmap-toggle-row">
                  <input type="checkbox" checked={showPlatforms} onChange={e => setShowPlatforms(e.target.checked)} />
                  <span>Plataformas</span>
                </label>
                <label className="oilmap-toggle-row">
                  <input type="checkbox" checked={showFields} onChange={e => setShowFields(e.target.checked)} />
                  <span>Campos</span>
                </label>
              </Section>
            </div>
          )}
          {/* Resize handle for left sidebar */}
          {filtersOpen && (
            <ResizeHandle
              side="left"
              onResize={delta => setLeftWidth(w => Math.max(240, Math.min(560, w + delta)))}
            />
          )}
        </aside>

        {/* Map area */}
        <main className="oilmap-map-area">
          <div className="oilmap-map" ref={mapEl}></div>
        </main>

        {/* Detail panel */}
        <DetailPanel
          platform={selectedPlat}
          onClose={() => setSelectedId(null)}
          statusColors={t.statusColors}
          width={rightWidth}
          onResize={delta => setRightWidth(w => Math.max(300, Math.min(640, w - delta)))}
        />
      </div>

      {/* Footer */}
      <footer className="oilmap-footer">
        <div className="oilmap-footer-credit">
          Desenvolvido por <strong>{DATA_META.autor}</strong>
          {' · '}
          <a href={`mailto:${DATA_META.email}`}>{DATA_META.email}</a>
          {' · '}
          <span className="oilmap-footer-version">{DATA_META.versao}</span>
        </div>
        <div className="oilmap-footer-msg">{FOOTER_TEXT}</div>
        <div className="oilmap-footer-meta">
          <span className="oilmap-footer-meta-lbl">Atualização</span>
          <span className="oilmap-footer-meta-val">{DATA_META.ultima_atualizacao}</span>
        </div>
      </footer>
    </div>
  );
}

// ---------- Sub-components ----------
function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="oilmap-section">
      <button className="oilmap-section-head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="oilmap-section-chev">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="oilmap-section-body">{children}</div>}
    </div>
  );
}

function DualRange({ min, max, value, onChange }) {
  const [lo, hi] = value;
  return (
    <div className="oilmap-dual-range">
      <div className="oilmap-dual-track">
        <div
          className="oilmap-dual-fill"
          style={{
            left: `${((lo - min) / (max - min)) * 100}%`,
            right: `${100 - ((hi - min) / (max - min)) * 100}%`,
          }}
        />
      </div>
      <input type="range" min={min} max={max} value={lo} onChange={e => onChange([Math.min(parseInt(e.target.value), hi), hi])} />
      <input type="range" min={min} max={max} value={hi} onChange={e => onChange([lo, Math.max(parseInt(e.target.value), lo)])} />
      <div className="oilmap-dual-labels">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function OperatorDropdown({ options, counts, selected, onToggle, onClear, searchPlaceholder = 'Filtrar…', allLabel = 'Todos' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const filtered = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()) || (window.SHORT_OP ? window.SHORT_OP(o).toLowerCase().includes(query.toLowerCase()) : false)) : options;
  const label = selected.size === 0 ? allLabel : `${selected.size} selecionado${selected.size > 1 ? 's' : ''}`;
  return (
    <div className="oilmap-combo" ref={wrapRef}>
      <button className="oilmap-combo-trigger" onClick={() => setOpen(o => !o)} type="button">
        <span className="oilmap-combo-placeholder" style={{color: selected.size ? 'var(--fg)' : 'var(--fg2)'}}>{label}</span>
        {selected.size > 0 && (
          <span className="oilmap-combo-clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>×</span>
        )}
        <span className="oilmap-combo-chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="oilmap-combo-pop">
          <input className="oilmap-combo-search" autoFocus placeholder={searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} />
          <div className="oilmap-combo-list">
            {filtered.length === 0 && <div className="oilmap-combo-empty">Nenhum resultado</div>}
            {filtered.map(op => (
              <label key={op} className={`oilmap-op-row ${selected.has(op) ? 'is-sel' : ''}`}>
                <input type="checkbox" checked={selected.has(op)} onChange={() => onToggle(op)} />
                <span className="oilmap-op-name">{window.SHORT_OP ? window.SHORT_OP(op) : op}</span>
                <span className="oilmap-op-count">{counts[op]}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformCombobox({ list, onSelect, selectedId, statusColors }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  const selected = list.find(p => p.sigla === selectedId);

  const filtered = useMemo(() => {
    if (!query) return list.slice(0, 50);
    const q = query.toLowerCase();
    return list.filter(p =>
      p.sigla.toLowerCase().includes(q) ||
      p.nome.toLowerCase().includes(q) ||
      (p.campos || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [list, query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p) => {
    onSelect(p.sigla);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="oilmap-section">
      <div className="oilmap-section-head" style={{cursor: 'default'}}>
        <span>Plataforma ({list.length})</span>
      </div>
      <div className="oilmap-combo" ref={wrapRef}>
        <button
          className="oilmap-combo-trigger"
          onClick={() => setOpen(o => !o)}
          type="button"
        >
          {selected ? (
            <span className="oilmap-combo-selected">
              <span className="oilmap-dot" style={{background: statusColors[selected.status]}}></span>
              <span className="oilmap-combo-sigla">{selected.sigla}</span>
              <span className="oilmap-combo-name">{selected.nome}</span>
            </span>
          ) : (
            <span className="oilmap-combo-placeholder">Selecionar plataforma…</span>
          )}
          <span className="oilmap-combo-chev">{open ? '▴' : '▾'}</span>
        </button>
        {open && (
          <div className="oilmap-combo-pop">
            <input
              className="oilmap-combo-search"
              autoFocus
              placeholder="Filtrar…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="oilmap-combo-list">
              {filtered.length === 0 && (
                <div className="oilmap-combo-empty">Nenhum resultado</div>
              )}
              {filtered.map(p => (
                <button
                  key={p.sigla}
                  className={`oilmap-combo-row ${p.sigla === selectedId ? 'is-sel' : ''}`}
                  onClick={() => pick(p)}
                >
                  <span className="oilmap-dot" style={{background: statusColors[p.status]}}></span>
                  <span className="oilmap-combo-sigla">{p.sigla}</span>
                  <span className="oilmap-combo-row-name">{p.nome}</span>
                  <span className="oilmap-combo-row-bacia">{p.bacia}</span>
                </button>
              ))}
              {list.length > filtered.length && !query && (
                <div className="oilmap-combo-more">{list.length - filtered.length} mais — refine a busca</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarList({ list, onSelect, selectedId, statusColors }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="oilmap-section">
      <button className="oilmap-section-head" onClick={() => setOpen(!open)}>
        <span>Plataformas ({list.length})</span>
        <span className="oilmap-section-chev">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="oilmap-sidebar-list">
          {list.length === 0 && <div className="oilmap-sidebar-list-empty">Nenhum resultado</div>}
          {list.map(p => (
            <button
              key={p.sigla}
              className={`oilmap-sidebar-list-row ${p.sigla === selectedId ? 'is-sel' : ''}`}
              onClick={() => onSelect(p.sigla)}
            >
              <span className="oilmap-dot" style={{ background: statusColors[p.status] }}></span>
              <div className="oilmap-sidebar-list-text">
                <span className="oilmap-list-sigla">{p.sigla}</span>
                <span className="oilmap-list-name">{p.nome}</span>
              </div>
              <span className="oilmap-list-bacia">{p.bacia}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResizeHandle({ side, onResize }) {
  const startX = useRef(0);
  const onDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    const onMove = (ev) => {
      const dx = ev.clientX - startX.current;
      startX.current = ev.clientX;
      onResize(dx);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <div
      className={`oilmap-resize-handle oilmap-resize-${side}`}
      onMouseDown={onDown}
      title="Arrastar para redimensionar"
    ></div>
  );
}

function PlatformList({ list, onSelect, selectedId, statusColors }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`oilmap-list-wrap ${open ? 'is-open' : ''}`}>
      <button className="oilmap-list-toggle" onClick={() => setOpen(!open)}>
        <span>Lista ({list.length})</span>
        <span>{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="oilmap-list">
          {list.map(p => (
            <button
              key={p.sigla}
              className={`oilmap-list-row ${p.sigla === selectedId ? 'is-sel' : ''}`}
              onClick={() => onSelect(p.sigla)}
            >
              <span className="oilmap-dot" style={{ background: statusColors[p.status] }}></span>
              <span className="oilmap-list-sigla">{p.sigla}</span>
              <span className="oilmap-list-name">{p.nome}</span>
              <span className="oilmap-list-bacia">{p.bacia}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ platform, onClose, statusColors, width, onResize }) {
  const open = !!platform;
  return (
    <aside className={`oilmap-detail ${open ? 'is-open' : ''}`} style={{ width: width ? `${width}px` : undefined }}>
      {open && onResize && <ResizeHandle side="right" onResize={onResize} />}
      {platform && (
        <div className="oilmap-detail-inner">
          <div className="oilmap-detail-head">
            <div className="oilmap-detail-status" style={{ background: statusColors[platform.status] }}>
              {STATUS_META[platform.status].label}
            </div>
            <button className="oilmap-icon-btn oilmap-close" onClick={onClose} aria-label="fechar">×</button>
          </div>

          <div className="oilmap-detail-sigla">{platform.sigla}</div>
          <h2 className="oilmap-detail-name">{platform.nome}</h2>
          <div className="oilmap-detail-op">{shortOp(platform.operador)}</div>

          <div className="oilmap-kv-grid">
            <KV label="Bacia" value={platform.bacia} />
            <KV label="Tipo" value={shortClass(platform.classificacao)} />
            <KV label="Lâmina d'água" value={platform.lamina_agua_m ? `${fmtNum(platform.lamina_agua_m)} m` : '—'} />
            <KV label="Início produção" value={platform.data_inicio_producao || '—'} />
            <KV label="Ano operação" value={platform.ano_inicio_operacao || '—'} />
            <KV label="Escoamento" value={platform.sistema_escoamento || '—'} />
          </div>

          <div className="oilmap-detail-section">
            <div className="oilmap-detail-section-title">Capacidade</div>
            <div className="oilmap-cap-grid">
              <div className="oilmap-cap-cell">
                <div className="oilmap-cap-num">{fmtNum(platform.capacidade_petroleo_bbl_d)}</div>
                <div className="oilmap-cap-lbl">bbl / dia (óleo)</div>
              </div>
              <div className="oilmap-cap-cell">
                <div className="oilmap-cap-num">{fmtNum(platform.capacidade_gas_mil_m3_d)}</div>
                <div className="oilmap-cap-lbl">mil m³ / dia (gás)</div>
              </div>
            </div>
          </div>

          <div className="oilmap-detail-section">
            <div className="oilmap-detail-section-title">Campos</div>
            <div className="oilmap-fields">
              {(platform.campos || '').split('/').map(f => f.trim()).filter(Boolean).map(f => (
                <span key={f} className="oilmap-field-chip">{f}</span>
              ))}
            </div>
          </div>

          <div className="oilmap-detail-section">
            <div className="oilmap-detail-section-title">Coordenadas</div>
            <div className="oilmap-coords">
              <code>{platform.latitude.toFixed(5)}, {platform.longitude.toFixed(5)}</code>
            </div>
          </div>

          {platform.fonte && (
            <div className="oilmap-detail-section">
              <div className="oilmap-detail-section-title">Fonte do início de produção</div>
              <a className="oilmap-source-link" href={platform.fonte} target="_blank" rel="noopener">
                Ver fonte original ↗
              </a>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function KV({ label, value }) {
  return (
    <div className="oilmap-kv">
      <div className="oilmap-kv-label">{label}</div>
      <div className="oilmap-kv-value">{value}</div>
    </div>
  );
}

window.OilMap = OilMap;
window.SHORT_OP = shortOp;
