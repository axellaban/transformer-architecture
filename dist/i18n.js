// Todo el texto visible de la aplicación, en español.
// Los datos del diagrama (dist/assets/spatial-data.json) conservan los identificadores
// y las etiquetas originales en inglés porque se generan desde Blender; aquí se
// traducen en el momento de dibujarlas.

export const ui={
  vistaGeneral:'Vista general',
  volverVistaGeneral:'Volver a la vista general',
  pausarFlujo:'Pausar el flujo de tokens',
  reproducirFlujo:'Reproducir el flujo de tokens',
  pausa:'Pausa',
  reproducir:'Reproducir',
  tokens:'tokens',
  error:'No se pudieron abrir las arquitecturas. Vuelve a cargar la página.',
  historiaModo:'Modo historia',
  historiaExplorar:'Explorar',
  historiaIniciar:'Ver la historia de un minuto',
  historiaSalir:'Salir de la historia y explorar',
  historiaRepetir:'Repetir la historia',
  historiaPausar:'Pausar la historia',
  historiaReanudar:'Reanudar la historia',
  capituloSiguiente:'Capítulo siguiente',
  capituloFinal:'Terminar la historia',
  capitulo:n=>`Capítulo ${n}`,
  narracionActivar:'Activar la narración',
  narracionSilenciar:'Silenciar la narración',
  narracionNoDisponible:'Narración no disponible',
  posicion:'Posición',
  codificacionPosicional:'Codificación posicional'
};

export const ramas={encoder:'Codificador',decoder:'Decodificador'};

// Etiquetas de los componentes del diagrama, por lado (0 = original, 1 = DeepSeek) e id.
export const etiquetas=[{
  encoder_input:'Entradas',
  encoder_embed:'Embedding\nde entrada',
  encoder_position_label:'Codificación\nposicional',
  encoder_attention:'Atención\nmulticabeza',
  encoder_norm1:'Suma y norma',
  encoder_ffn:'Red\nfeed-forward',
  encoder_norm2:'Suma y norma',
  decoder_input:'Salidas\n(desplazadas)',
  decoder_embed:'Embedding\nde salida',
  decoder_position_label:'Codificación\nposicional',
  decoder_attention:'Atención\nmulticabeza\nenmascarada',
  decoder_norm1:'Suma y norma',
  decoder_ffn:'Red\nfeed-forward',
  decoder_norm3:'Suma y norma',
  decoder_cross:'Atención\nmulticabeza',
  decoder_norm2:'Suma y norma',
  kv_label:'K, V',
  linear:'Lineal',
  softmax:'Softmax',
  probabilities:'Probabilidades\nde salida'
},{
  text_embedding:'Embedding\nde texto',
  vision_encoder:'Codificador\nde visión',
  vision_embedding:'Embedding\nde visión',
  embedding:'Flujos de entrada',
  hidden_states:'Salida del codificador',
  kv_label:'KV compartido',
  candidate_pool:'Conjunto de\ncandidatos',
  engram:'Engram ×2',
  dspark:'Borradores DSpark',
  output:'Tokens de salida',
  compression_encoder:'Compresión 2:1',
  compression_decoder:'Compresión 1:1',
  target_head:'Cabeza de salida'
}];

// Nombres cortos de los componentes al acercarse a ellos.
export const nombresCortos=[{
  encoder_attention:'Autoatención',
  decoder_attention:'Atención enmascarada',
  decoder_cross:'Atención cruzada',
  encoder_ffn:'Feed-forward',
  decoder_ffn:'Feed-forward'
},{
  vision_encoder:'Visión',
  vision_embedding:'Proyector',
  text_embedding:'Texto',
  residual_input:'mHC',
  hidden_states:'Salida del codificador',
  engram:'Engram ×2'
}];

// Marcos de repetición del diagrama, por su etiqueta original.
export const marcos={'Causal encoder · 20':'Codificador causal · 20','Decoder · 20':'Decodificador · 20'};

const limpia=texto=>texto.replaceAll('\n',' ');

export function etiqueta(side,node){return etiquetas[side]?.[node.id]??node.label??'';}
export function etiquetaPlana(side,node){return limpia(etiqueta(side,node));}
export function nombreCorto(side,node){return nombresCortos[side]?.[node.id]??etiquetaPlana(side,node);}
export function marco(label){return marcos[label]??label;}
export function conRama(side,node){
  const nombre=etiquetaPlana(side,node)||ui.codificacionPosicional;
  return (node.branch&&ramas[node.branch]?ramas[node.branch]+' · ':'')+nombre;
}

// Métricas que aparecen al abrir un componente.
export const metricas={
  cabezasQ:(mode,globales,locales)=>`64 cabezas Q<small>${mode} · ${globales} entradas globales + ${locales} locales</small>`,
  cabezas:detalle=>`8 cabezas<small>${detalle}</small>`,
  atencionCruzada:'K/V del codificador · Q del decodificador',
  atencionEnmascarada:'autoatención enmascarada',
  atencionBidireccional:'autoatención bidireccional',
  kvNuevo:'KV nuevo',
  kvCompartido:'KV compartido',
  cabezasIndice:'32 cabezas de índice',
  indicesReutilizados:'Índices reutilizados',
  local128:'128 locales',
  expertosModernos:'6 de 384<small>expertos enrutados + 1 compartido</small>',
  expertosOriginal:'2.048 unidades ocultas<small>cómputo denso · ReLU</small>',
  dimensiones:valor=>`${valor}<small>dimensiones por token</small>`,
  flujosModernos:'4 flujos<small>Single-Pass mHC</small>',
  flujosOriginal:'Suma y norma<small>un flujo residual · post-LayerNorm</small>',
  cacheModerna:'KV global · 890 B/token',
  cacheOriginal:'KV de atención cruzada · BF16 asumido',
  visionEncoder:'32 capas<small>parches de entrada de 14 píxeles</small>',
  visionProyector:'9 parches → 1 posición<small>proyector de visión de 2 capas</small>',
  engram:'196 mil M · 2 módulos<small>capas 1 y 14 · 24 tablas hash por módulo</small>',
  dspark:'5 posiciones de borrador<small>opcional · 3 bloques · verificación del objetivo</small>',
  candidatos:(candidatas,elegidas)=>`${candidatas} → ${elegidas}<small>entradas candidatas → entradas seleccionadas</small>`,
  lineal:'Proyección lineal<small>512 dimensiones ocultas → logits de vocabulario</small>',
  cabezaVocabulario:'Cabeza de vocabulario<small>129.280 entradas de vocabulario</small>',
  siguienteToken:'Probabilidades del siguiente token<small>softmax · valores ilustrativos normalizados</small>',
  posiciones:'Posiciones sinusoidales<small>se suman a los embeddings de token</small>',
  estadosFinales:'Estados finales del codificador<small>el KV global del decodificador se proyecta desde estos estados</small>'
};
