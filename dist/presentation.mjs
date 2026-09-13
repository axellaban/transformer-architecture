// Estructura respaldada por los artículos; los patrones deterministas de juguete son solo presentación.
export function attentionSpec(layer, n, config) {
  const latest = ids => ids.filter(i => i <= layer).at(-1) ?? null;
  const hasGlobal = layer >= 2;
  const cacheSource = hasGlobal ? latest(config.fullLayers) : null;
  const indexSource = hasGlobal ? latest([...config.fullLayers, ...config.reindexLayers].sort((a,b)=>a-b)) : null;
  const mode = !hasGlobal ? 'SWA' : layer === cacheSource ? 'Full' : layer === indexSource ? 'Reindex' : 'Reuse';
  const ratio = layer < config.encoder ? 2 : 1;
  return {layer,n,mode,ratio,cacheSource,indexSource,hasGlobal,topk:config.topk,encoderLayers:config.encoder,candidateLimit:config.candidatePool,
    hasIndexer:hasGlobal && mode !== 'Reuse',
    entries:hasGlobal ? Math.floor(n/ratio) : 0,
    selected:hasGlobal ? Math.min(config.topk,Math.floor(n/ratio)) : 0,
    local:Math.min(n,config.window),
    candidates:layer >= config.encoder ? Math.min(n,config.candidatePool) : null};
}

function illustrativeScore(source,row,column,step){
  return (column*31 + column*column*7 + source*column*13 + row*17 + step*(column+3)*11)%97;
}

export function candidateColumns(spec,row,step){
  const columns=Array.from({length:row+1},(_,i)=>i);
  if(spec.layer<spec.encoderLayers || spec.n*(row+1)/16<=spec.candidateLimit)return columns;
  // Grupos gruesos, no una visualización de la proporción numérica de compresión.
  return columns.sort((a,b)=>illustrativeScore(spec.encoderLayers,row,b,step)-illustrativeScore(spec.encoderLayers,row,a,step)).slice(0,Math.max(1,Math.ceil(columns.length/2)));
}

export function accessCell(spec, row, column, step) {
  if (column > row) return false;
  if (!spec.hasGlobal) return row-column < Math.max(1,Math.ceil(spec.local/spec.n*16));
  const visible = Math.floor(spec.n*(row+1)/16/spec.ratio);
  if (visible <= spec.topk) return true;
  // Los consumidores comparten el mapa de su productor. Los indexadores más profundos del
  // decodificador se quedan en el conjunto común de candidatos; Reindex puede elegir otros grupos dentro de él.
  const candidates=candidateColumns(spec,row,step);
  const selected=candidates.sort((a,b)=>illustrativeScore(spec.indexSource,row,b,step)-illustrativeScore(spec.indexSource,row,a,step)).slice(0,Math.max(1,Math.ceil((row+1)*.18)));
  return selected.includes(column);
}

export function positionalValue(position, dimension, hidden=512) {
  const angle=position/10000**(2*Math.floor(dimension/2)/hidden);
  return dimension%2 ? Math.cos(angle) : Math.sin(angle);
}

export function toyLogits(step, count=16) {
  return Array.from({length:count},(_,i)=>2*Math.sin(i*2.5+step));
}

export function softmax(logits) {
  const max=Math.max(...logits), e=logits.map(x=>Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);
  return e.map(x=>x/sum);
}
