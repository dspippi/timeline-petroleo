import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const eventsPath = path.join(repoRoot, 'data', 'events.json');
const supportPath = path.join(repoRoot, 'docs', 'event-relationship-analysis.json');
const htmlPath = path.join(repoRoot, 'docs', 'event-relationship-graph.html');

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

const stopwords = new Set(`a o os as um uma uns umas de do da dos das e em no na nos nas por para com sem ao aos à às que se sua seu suas seus como entre sobre pelo pela pelos pelas mais menos muito quando onde após antes desde até anos ano dia era óleo oleo petróleo petroleo petrolífera petrolifera indústria industria global mundial marca marcou primeiro primeira início inicio fim durante`.split(/\s+/));

const categoryRules = [
  ['standard-oil', /standard oil|rockefeller|truste|trust|antitruste|monop[oó]lio/i],
  ['opec', /\bopep\b|\bopec\b|organization of petroleum exporting countries/i],
  ['seven-sisters', /sete irm[ãa]s|seven sisters|exxon|shell|bp|chevron|texaco|mobil|gulf oil|royal dutch/i],
  ['middle-east-geopolitics', /oriente m[eé]dio|ar[aá]bia saudita|iran|iraque|kuwait|golfo p[eé]rsico|suez|egito|israel|palestina/i],
  ['suez', /suez/i],
  ['iran', /iran|persa|anglo-persian|mossadegh/i],
  ['iraq', /iraque|iraq/i],
  ['saudi', /ar[aá]bia saudita|saudi|aramco/i],
  ['venezuela', /venezuela/i],
  ['brazil', /brasil|petrobras|pré-sal|pre-sal|bacia de campos|santos/i],
  ['offshore-platforms', /plataforma|fps(o)?|1º [oó]leo|primeiro [oó]leo|offshore|campo de/i],
  ['pipeline-transport', /oleoduto|duto|pipeline|transporte|navio-tanque|canal/i],
  ['war-security', /guerra|invas[aã]o|conflito|revolu[cç][aã]o|ataque|embargo|crise/i],
  ['nationalization-policy', /nacionaliza|concess[aã]o|pol[ií]tica|acordo|lei|controle estatal|estat/i],
  ['oil-shock', /choque|embargo|pre[cç]o|crise energ[eé]tica/i],
  ['discovery-production', /descoberta|perfura|po[cç]o|campo|produ[cç][aã]o|reserva/i],
  ['technology', /tecnologia|refinaria|oleoduto|navio-tanque|motor|diesel|craqueamento/i],
];

function cleanText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseDate(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, time: Date.UTC(year, month - 1, day) };
}

function tokenize(event) {
  const text = cleanText([event.title, event.country, event.region, event.type, event.company, event.description].filter(Boolean).join(' '));
  return new Set(text.split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !stopwords.has(token)));
}

function entityTokens(event) {
  const text = [event.title, event.company, event.country, event.description].filter(Boolean).join(' ');
  const matches = text.match(/(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.-]+|\b[A-Z]{2,}\b|\bP-\d+\b|\b\d{4}\b)/g) ?? [];
  return new Set(matches.map((m) => cleanText(m)).filter((m) => m.length >= 3 && !stopwords.has(m)));
}

function categories(event) {
  const text = [event.id, event.title, event.country, event.region, event.type, event.company, event.description].filter(Boolean).join(' ');
  return new Set(categoryRules.filter(([, re]) => re.test(text)).map(([name]) => name));
}

const nodes = events.map((event, index) => {
  const date = parseDate(event.start_date);
  return {
    index,
    id: event.id,
    title: event.title,
    start_date: event.start_date,
    end_date: event.end_date,
    year: date?.year ?? null,
    country: event.country ?? null,
    region: event.region ?? null,
    type: event.type ?? null,
    company: event.company ?? null,
    description: event.description ?? '',
    wikipedia: event.wikipedia ?? null,
    tokens: tokenize(event),
    entities: entityTokens(event),
    categories: categories(event),
  };
});

function intersection(a, b) {
  const result = [];
  for (const item of a) if (b.has(item)) result.push(item);
  return result;
}

function unionSize(a, b) {
  const out = new Set(a);
  for (const item of b) out.add(item);
  return out.size;
}

function scorePair(a, b) {
  let raw = 0;
  const reasons = [];

  if (a.country && a.country === b.country) {
    raw += 2.0;
    reasons.push(`mesmo país: ${a.country}`);
  }
  if (a.region && a.region === b.region) {
    raw += 1.1;
    reasons.push(`mesma região: ${a.region}`);
  }
  if (a.type && a.type === b.type) {
    raw += 1.2;
    reasons.push(`mesmo tipo: ${a.type}`);
  }
  if (a.company && b.company && a.company === b.company) {
    raw += 2.4;
    reasons.push(`mesma empresa: ${a.company}`);
  }

  if (a.year !== null && b.year !== null) {
    const delta = Math.abs(a.year - b.year);
    const temporal = delta <= 2 ? 1.8 : delta <= 5 ? 1.5 : delta <= 10 ? 1.2 : delta <= 25 ? 0.8 : delta <= 50 ? 0.45 : delta <= 100 ? 0.2 : 0;
    if (temporal) {
      raw += temporal;
      reasons.push(`proximidade temporal: ${delta} ano(s)`);
    }
  }

  const sharedTokens = intersection(a.tokens, b.tokens).filter((token) => token.length >= 4);
  const jaccard = sharedTokens.length / Math.max(1, unionSize(a.tokens, b.tokens));
  const textScore = Math.min(1.6, jaccard * 8 + Math.min(sharedTokens.length, 6) * 0.12);
  if (textScore >= 0.25) {
    raw += textScore;
    reasons.push(`vocabulário comum: ${sharedTokens.slice(0, 8).join(', ')}`);
  }

  const sharedEntities = intersection(a.entities, b.entities).filter((entity) => !/^\d{4}$/.test(entity));
  const entityScore = Math.min(1.8, sharedEntities.length * 0.45);
  if (entityScore) {
    raw += entityScore;
    reasons.push(`entidades compartilhadas: ${sharedEntities.slice(0, 6).join(', ')}`);
  }

  const sharedCategories = intersection(a.categories, b.categories);
  const categoryScore = Math.min(2.2, sharedCategories.length * 0.75);
  if (categoryScore) {
    raw += categoryScore;
    reasons.push(`tema histórico comum: ${sharedCategories.join(', ')}`);
  }

  if (a.country === b.country && a.type === b.type && a.year !== null && b.year !== null && Math.abs(a.year - b.year) <= 30) {
    raw += 0.8;
    reasons.push('sequência nacional do mesmo tipo histórico');
  }
  if (a.region === b.region && sharedCategories.length && a.year !== null && b.year !== null && Math.abs(a.year - b.year) <= 40) {
    raw += 0.7;
    reasons.push('encadeamento regional e temático');
  }

  const score = raw < 1.25 ? 0 : Math.min(10, Math.round(raw * 10) / 10);
  return { score, reasons: score === 0 ? ['sem relação material detectada pelos critérios definidos'] : reasons };
}

const links = [];
const matrix = nodes.map((node) => ({ id: node.id, title: node.title, correlations: {} }));

for (let i = 0; i < nodes.length; i += 1) {
  for (let j = i + 1; j < nodes.length; j += 1) {
    const { score, reasons } = scorePair(nodes[i], nodes[j]);
    const link = {
      source: nodes[i].id,
      target: nodes[j].id,
      score,
      weight: score / 10,
      line_width_px: Number((0.5 + score * 0.9).toFixed(2)),
      reasons,
    };
    links.push(link);
    matrix[i].correlations[nodes[j].id] = score;
    matrix[j].correlations[nodes[i].id] = score;
  }
}

for (const row of matrix) row.correlations[row.id] = 10;

const publicNodes = nodes.map(({ tokens, entities, categories, ...node }) => ({ ...node, categories: [...categories] }));
const nonZero = links.filter((link) => link.score > 0);
const distribution = Object.fromEntries(Array.from({ length: 11 }, (_, score) => [score, links.filter((link) => Math.round(link.score) === score).length]));

const analysis = {
  generated_at: new Date().toISOString(),
  source_file: 'data/events.json',
  methodology: {
    scale: '0 = nenhuma relação detectada; 10 = correlação máxima pelos critérios heurísticos',
    criteria: [
      'país, região, tipo e empresa em comum',
      'proximidade temporal entre datas de início',
      'similaridade lexical entre título, descrição e metadados',
      'entidades compartilhadas extraídas de nomes próprios, siglas e anos',
      'temas históricos inferidos por palavras-chave: OPEP, Standard Oil, Oriente Médio, guerras, nacionalizações, plataformas offshore etc.',
    ],
    caveat: 'A pontuação é uma inferência heurística para exploração visual. Ela não substitui análise historiográfica manual ou citações fonte a fonte.',
  },
  summary: {
    event_count: nodes.length,
    possible_pairs: links.length,
    non_zero_pairs: nonZero.length,
    zero_pairs: links.length - nonZero.length,
    average_non_zero_score: nonZero.length ? Number((nonZero.reduce((sum, link) => sum + link.score, 0) / nonZero.length).toFixed(2)) : 0,
    distribution_by_rounded_score: distribution,
  },
  nodes: publicNodes,
  links,
  matrix,
};

fs.mkdirSync(path.dirname(supportPath), { recursive: true });
fs.writeFileSync(supportPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');

const graphPayload = JSON.stringify({ nodes: publicNodes, links }, null, 0).replace(/<\//g, '<\\/');
const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Grafo de Correlação dos Eventos do Petróleo</title>
  <style>
    :root { --bg: #11100d; --panel: #1d1a14; --ink: #f7efe0; --muted: #b9aa8d; --accent: #e0a83a; --accent2: #6fb3a8; --line: rgba(224,168,58,.38); }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 15% 15%, rgba(224,168,58,.18), transparent 28%), linear-gradient(135deg, #0e0d0a, #1b1711 48%, #071413); color: var(--ink); font-family: Georgia, 'Times New Roman', serif; }
    header { padding: 28px clamp(16px, 4vw, 48px) 12px; display: grid; gap: 10px; }
    h1 { margin: 0; max-width: 980px; font-size: clamp(30px, 5vw, 64px); line-height: .92; letter-spacing: -0.05em; }
    .sub { max-width: 980px; color: var(--muted); font-size: 15px; line-height: 1.5; }
    .layout { display: grid; grid-template-columns: minmax(270px, 340px) 1fr; gap: 16px; padding: 12px clamp(16px, 4vw, 48px) 32px; }
    aside { background: color-mix(in srgb, var(--panel), transparent 6%); border: 1px solid rgba(247,239,224,.12); border-radius: 22px; padding: 18px; box-shadow: 0 18px 60px rgba(0,0,0,.32); }
    .graph-wrap { position: relative; min-height: 72vh; border: 1px solid rgba(247,239,224,.12); border-radius: 28px; overflow: hidden; background: rgba(13,12,9,.72); box-shadow: inset 0 0 0 1px rgba(224,168,58,.06), 0 18px 60px rgba(0,0,0,.34); }
    svg { display: block; width: 100%; height: 72vh; cursor: grab; }
    label { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin: 14px 0 6px; }
    input, select { width: 100%; accent-color: var(--accent); }
    select, input[type='search'] { background: #0f0e0b; color: var(--ink); border: 1px solid rgba(247,239,224,.16); border-radius: 12px; padding: 10px 12px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    .card { border: 1px solid rgba(247,239,224,.1); border-radius: 16px; padding: 12px; background: rgba(255,255,255,.03); }
    .num { font-size: 24px; color: var(--accent); }
    .caption { color: var(--muted); font-size: 12px; }
    .hint { color: var(--muted); font-size: 13px; line-height: 1.45; margin-top: 14px; }
    .tooltip { position: absolute; pointer-events: none; max-width: 360px; padding: 12px 14px; background: rgba(12,11,8,.94); border: 1px solid rgba(224,168,58,.32); border-radius: 14px; color: var(--ink); box-shadow: 0 16px 44px rgba(0,0,0,.45); opacity: 0; transform: translate(12px, 12px); transition: opacity .12s ease; font-size: 13px; line-height: 1.35; }
    .tooltip b { color: var(--accent); }
    .legend { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; margin-top: 14px; }
    .legend-line { height: 8px; flex: 1; border-radius: 999px; background: linear-gradient(90deg, rgba(224,168,58,.18), rgba(224,168,58,.9)); }
    button { width: 100%; margin-top: 12px; border: 0; border-radius: 14px; padding: 11px 12px; background: var(--accent); color: #181108; font-weight: 700; cursor: pointer; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } svg { height: 66vh; } .graph-wrap { min-height: 66vh; } }
  </style>
</head>
<body>
  <header>
    <h1>Grafo de correlação dos eventos do petróleo</h1>
    <div class="sub">Cada nó é um evento de <code>data/events.json</code>. Cada linha é uma relação inferida; a espessura cresce de acordo com a pontuação de 0 a 10. A visualização usa filtro mínimo para evitar que as relações fracas escondam os encadeamentos principais.</div>
  </header>
  <main class="layout">
    <aside>
      <label for="threshold">Correlação mínima: <span id="thresholdValue">6</span></label>
      <input id="threshold" type="range" min="0" max="10" step="0.5" value="6" />
      <label for="region">Região</label>
      <select id="region"><option value="">Todas</option></select>
      <label for="type">Tipo</label>
      <select id="type"><option value="">Todos</option></select>
      <label for="search">Buscar evento</label>
      <input id="search" type="search" placeholder="Ex.: OPEP, Standard, Brasil" />
      <button id="reset">Centralizar grafo</button>
      <div class="stats">
        <div class="card"><div class="num" id="nodeCount">0</div><div class="caption">eventos visíveis</div></div>
        <div class="card"><div class="num" id="linkCount">0</div><div class="caption">elos visíveis</div></div>
      </div>
      <div class="legend"><span>0</span><div class="legend-line"></div><span>10</span></div>
      <p class="hint">Passe o mouse em uma linha para ver os motivos da correlação. Arraste nós para reorganizar; use a roda do mouse para zoom.</p>
    </aside>
    <section class="graph-wrap">
      <svg id="graph" aria-label="Grafo de relações entre eventos"></svg>
      <div class="tooltip" id="tooltip"></div>
    </section>
  </main>
  <script>
    const data = ${graphPayload};
    const svg = document.getElementById('graph');
    const tooltip = document.getElementById('tooltip');
    const threshold = document.getElementById('threshold');
    const thresholdValue = document.getElementById('thresholdValue');
    const regionSelect = document.getElementById('region');
    const typeSelect = document.getElementById('type');
    const search = document.getElementById('search');
    const reset = document.getElementById('reset');
    const nodeCount = document.getElementById('nodeCount');
    const linkCount = document.getElementById('linkCount');
    const ns = 'http://www.w3.org/2000/svg';
    const palette = ['#e0a83a','#6fb3a8','#c86f4a','#b6c36d','#d9cfb3','#8aa6d6','#d88ba7'];
    const regions = [...new Set(data.nodes.map(n => n.region).filter(Boolean))].sort();
    const types = [...new Set(data.nodes.map(n => n.type).filter(Boolean))].sort();
    regions.forEach(v => regionSelect.add(new Option(v, v)));
    types.forEach(v => typeSelect.add(new Option(v, v)));
    const colorByRegion = new Map(regions.map((r, i) => [r, palette[i % palette.length]]));
    let width = 0, height = 0, zoom = 1, panX = 0, panY = 0, dragNode = null, isPanning = false, last = null, animation;
    const state = { nodes: [], links: [] };
    const root = document.createElementNS(ns, 'g');
    const linkLayer = document.createElementNS(ns, 'g');
    const nodeLayer = document.createElementNS(ns, 'g');
    root.append(linkLayer, nodeLayer); svg.append(root);
    function resize(){ const r = svg.getBoundingClientRect(); width = r.width; height = r.height; render(); }
    function applyTransform(){ root.setAttribute('transform', 'translate(' + panX + ' ' + panY + ') scale(' + zoom + ')'); }
    function filtered(){
      const q = search.value.trim().toLowerCase();
      const visibleNodes = data.nodes.filter(n => (!regionSelect.value || n.region === regionSelect.value) && (!typeSelect.value || n.type === typeSelect.value) && (!q || [n.title,n.id,n.country,n.region,n.type,n.company,n.description].filter(Boolean).join(' ').toLowerCase().includes(q)));
      const ids = new Set(visibleNodes.map(n => n.id));
      const min = Number(threshold.value);
      return { nodes: visibleNodes, links: data.links.filter(l => l.score >= min && ids.has(l.source) && ids.has(l.target)) };
    }
    function render(){
      cancelAnimationFrame(animation);
      const f = filtered();
      thresholdValue.textContent = threshold.value;
      nodeCount.textContent = f.nodes.length;
      linkCount.textContent = f.links.length;
      const old = new Map(state.nodes.map(n => [n.id, n]));
      state.nodes = f.nodes.map((n, i) => ({...n, x: old.get(n.id)?.x ?? width/2 + Math.cos(i)*width*.28, y: old.get(n.id)?.y ?? height/2 + Math.sin(i)*height*.28, vx: old.get(n.id)?.vx ?? 0, vy: old.get(n.id)?.vy ?? 0}));
      const byId = new Map(state.nodes.map(n => [n.id, n]));
      state.links = f.links.map(l => ({...l, sourceNode: byId.get(l.source), targetNode: byId.get(l.target)})).filter(l => l.sourceNode && l.targetNode);
      const nodeMetrics = new Map(state.nodes.map(n => [n.id, { connectionCount: 0, connectionStrength: 0 }]));
      for (const l of state.links) {
        for (const id of [l.source, l.target]) {
          const metric = nodeMetrics.get(id);
          metric.connectionCount += 1;
          metric.connectionStrength += l.score;
        }
      }
      const maxCount = Math.max(1, ...[...nodeMetrics.values()].map(m => m.connectionCount));
      const maxStrength = Math.max(1, ...[...nodeMetrics.values()].map(m => m.connectionStrength));
      for (const n of state.nodes) {
        const metric = nodeMetrics.get(n.id);
        n.connectionCount = metric.connectionCount;
        n.connectionStrength = Number(metric.connectionStrength.toFixed(1));
        const countFactor = metric.connectionCount / maxCount;
        const strengthFactor = metric.connectionStrength / maxStrength;
        n.radius = Number((5 + Math.sqrt(countFactor) * 12 + Math.sqrt(strengthFactor) * 14).toFixed(1));
      }
      drawStatic(); tick();
    }
    function drawStatic(){
      linkLayer.textContent = ''; nodeLayer.textContent = '';
      for (const l of state.links) {
        const line = document.createElementNS(ns, 'line');
        line.dataset.source = l.source; line.dataset.target = l.target;
        line.setAttribute('stroke', 'rgba(224,168,58,' + (0.18 + l.score/16) + ')');
        line.setAttribute('stroke-width', String(0.5 + l.score * 0.9));
        line.addEventListener('mousemove', e => showTip(e, '<b>' + title(l.source) + '</b><br/>↔ <b>' + title(l.target) + '</b><br/>Correlação: <b>' + l.score + '/10</b><br/>' + l.reasons.slice(0,5).join('<br/>')));
        line.addEventListener('mouseleave', hideTip);
        linkLayer.append(line); l.el = line;
      }
      for (const n of state.nodes) {
        const g = document.createElementNS(ns, 'g'); g.style.cursor = 'grab';
        const c = document.createElementNS(ns, 'circle'); c.setAttribute('r', String(n.radius)); c.setAttribute('fill', colorByRegion.get(n.region) || '#d9cfb3'); c.setAttribute('stroke', '#11100d'); c.setAttribute('stroke-width', '2');
        const t = document.createElementNS(ns, 'text'); t.textContent = n.title.length > 28 ? n.title.slice(0, 27) + '…' : n.title; t.setAttribute('x', String(n.radius + 4)); t.setAttribute('y', '4'); t.setAttribute('fill', '#f7efe0'); t.setAttribute('font-size', '11'); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', 'rgba(17,16,13,.9)'); t.setAttribute('stroke-width', '3');
        g.append(c,t); g.addEventListener('pointerdown', e => { dragNode = n; g.setPointerCapture(e.pointerId); });
        g.addEventListener('pointermove', e => { if (dragNode === n) { const p = point(e); n.x = p.x; n.y = p.y; n.vx = n.vy = 0; updatePositions(); } else showTip(e, '<b>' + n.title + '</b><br/>' + [n.start_date,n.country,n.region,n.type,n.company].filter(Boolean).join(' · ') + '<br/>Conexões visíveis: <b>' + n.connectionCount + '</b><br/>Força acumulada: <b>' + n.connectionStrength + '</b>'); });
        g.addEventListener('pointerup', () => { dragNode = null; }); g.addEventListener('pointerleave', hideTip);
        nodeLayer.append(g); n.el = g;
      }
    }
    function title(id){ return data.nodes.find(n => n.id === id)?.title || id; }
    function point(e){ const r = svg.getBoundingClientRect(); return { x: (e.clientX-r.left-panX)/zoom, y: (e.clientY-r.top-panY)/zoom }; }
    function showTip(e, html){ tooltip.innerHTML = html; tooltip.style.opacity = 1; tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; }
    function hideTip(){ tooltip.style.opacity = 0; }
    function tick(){
      const cx = width/2, cy = height/2;
      for (let step=0; step<2; step++) {
        for (const n of state.nodes) { n.vx += (cx - n.x) * 0.0008; n.vy += (cy - n.y) * 0.0008; }
        for (let i=0; i<state.nodes.length; i++) for (let j=i+1; j<state.nodes.length; j++) {
          const a=state.nodes[i], b=state.nodes[j], dx=a.x-b.x, dy=a.y-b.y, d2=Math.max(80, dx*dx+dy*dy), f=1200/d2;
          a.vx += dx*f; a.vy += dy*f; b.vx -= dx*f; b.vy -= dy*f;
        }
        for (const l of state.links) {
          const a=l.sourceNode,b=l.targetNode, dx=b.x-a.x, dy=b.y-a.y, d=Math.max(1,Math.hypot(dx,dy)), target=170-l.score*9, f=(d-target)*0.0009*(1+l.score/8);
          a.vx += dx/d*f; a.vy += dy/d*f; b.vx -= dx/d*f; b.vy -= dy/d*f;
        }
        for (const n of state.nodes) { if (dragNode === n) continue; n.vx*=0.86; n.vy*=0.86; n.x+=n.vx; n.y+=n.vy; }
      }
      updatePositions(); animation = requestAnimationFrame(tick);
    }
    function updatePositions(){
      for (const l of state.links) { l.el.setAttribute('x1', l.sourceNode.x); l.el.setAttribute('y1', l.sourceNode.y); l.el.setAttribute('x2', l.targetNode.x); l.el.setAttribute('y2', l.targetNode.y); }
      for (const n of state.nodes) n.el.setAttribute('transform', 'translate(' + n.x + ' ' + n.y + ')');
    }
    svg.addEventListener('wheel', e => { e.preventDefault(); const old=zoom; zoom=Math.min(4,Math.max(.25,zoom*(e.deltaY<0?1.12:.89))); const r=svg.getBoundingClientRect(); panX=e.clientX-r.left-(e.clientX-r.left-panX)*(zoom/old); panY=e.clientY-r.top-(e.clientY-r.top-panY)*(zoom/old); applyTransform(); });
    svg.addEventListener('pointerdown', e => { if (e.target === svg) { isPanning = true; last = {x:e.clientX,y:e.clientY}; } });
    svg.addEventListener('pointermove', e => { if(isPanning){ panX += e.clientX-last.x; panY += e.clientY-last.y; last={x:e.clientX,y:e.clientY}; applyTransform(); }});
    svg.addEventListener('pointerup', () => { isPanning = false; });
    [threshold, regionSelect, typeSelect, search].forEach(el => el.addEventListener('input', render));
    reset.addEventListener('click', () => { zoom=1; panX=0; panY=0; applyTransform(); render(); });
    window.addEventListener('resize', resize); resize();
  </script>
</body>
</html>`;
fs.writeFileSync(htmlPath, html, 'utf8');

console.log(JSON.stringify({ supportPath, htmlPath, summary: analysis.summary }, null, 2));

