// Una única comparación continua. Cada momento es una idea visual breve y respaldada por las fuentes.
export const chapters = [
  {id:'workload',name:'La tarea',title:'Arquitectura',duration:6,cues:[
    {at:0,overview:true,targets:[null,null],caption:'Original: 6 capas de codificador + 6 de decodificador. V4.1: 20 de codificador causal + 20 de decodificador.'},
    {at:3,targets:['encoder_attention','encoder_full'],title:'Atención del codificador',caption:'Codificador original: atención bidireccional. Codificador de V4.1: atención causal.'}
  ]},
  {id:'attention',name:'Atención',title:'Atención del decodificador',duration:10,cues:[
    {at:0,targets:['decoder_attention','decoder_full'],caption:'Original: atención causal densa. V4.1: atención global dispersa más atención local.'},
    {at:4,targets:['decoder_attention','candidate_pool'],title:'Recuperación global',caption:'V4.1: hasta 512 entradas globales seleccionadas. Original: sin índice de recuperación.'},
    {at:7,targets:['decoder_attention','decoder_full'],title:'Atención local',caption:'V4.1: ventana local de 128 tokens. Original: atención sobre las posiciones anteriores del objetivo.'}
  ]},
  {id:'reuse',name:'Reutilización',title:'Memoria de atención',duration:9,cues:[
    {at:0,targets:['decoder_cross','decoder_full'],title:'Capas Full',caption:'Original: proyecciones K/V propias en cada capa del decodificador. V4.1 Full: K/V global e índices nuevos.'},
    {at:3,targets:['decoder_cross','decoder_reuse_first_node'],title:'Capas Reuse',caption:'Original: K/V por capa. V4.1 Reuse: K/V global e índices de recuperación compartidos.'},
    {at:6,targets:['decoder_cross','decoder_reindex'],title:'Capas Reindex',caption:'V4.1 Reindex reutiliza el K/V global y recalcula los índices de recuperación.'}
  ]},
  {id:'experts',name:'Expertos',title:'Capas feed-forward',duration:8,cues:[
    {at:0,targets:['encoder_ffn','encoder_moe_full'],caption:'Original: capa densa de 2.048 unidades. V4.1: 384 expertos enrutados y un experto compartido.'},
    {at:4,targets:['encoder_ffn','encoder_moe_full'],closer:true,title:'Activación de expertos',caption:'Original: cómputo denso. V4.1: 6 expertos enrutados + 1 compartido por token.'}
  ]},
  {id:'residuals',name:'Rutas residuales',title:'Conexiones residuales',duration:5,cues:[
    {at:0,targets:['encoder_norm1','embedding'],caption:'Original: un único flujo residual con Add & Norm. V4.1: cuatro flujos con Single-Pass mHC.'}
  ]},
  {id:'engram',name:'Memoria aprendida',title:'Memoria Engram',duration:8,cues:[
    {at:0,targets:[null,'engram'],caption:'Solo en V4.1: dos módulos de consulta aprendidos, con 196.000 millones de parámetros en total.'},
    {at:4,targets:[null,'kv_label'],title:'Caché KV global',caption:'El KV global de V4.1 guarda el contexto actual. Engram guarda parámetros aprendidos.'}
  ]},
  {id:'vision',name:'Visión',title:'Codificador de visión',duration:7,cues:[
    {at:0,targets:[null,'vision_encoder'],caption:'Original: entrada de texto. V4.1: un codificador de visión de 32 capas para parches de imagen.'},
    {at:3,targets:[null,'vision_embedding'],title:'Proyector de visión',caption:'V4.1: fusión espacial 3×3 y después un proyector de dos capas hacia el modelo de lenguaje.'}
  ]},
  {id:'drafting',name:'Borradores',title:'Salida del siguiente token',duration:7,cues:[
    {at:0,targets:['softmax','target_head'],caption:'Ambas arquitecturas producen una distribución de probabilidad sobre el siguiente token.'},
    {at:3,targets:['softmax','dspark'],title:'Borradores DSpark',caption:'Original: decodificación secuencial. V4.1: borradores de cinco posiciones verificados por el backbone.'}
  ]}
];
let offset=0;
for(const chapter of chapters){chapter.start=offset;offset+=chapter.duration;}
export const duration=offset;
export const cues=chapters.flatMap((chapter,index)=>chapter.cues.map((cue,cueIndex)=>({...cue,time:chapter.start+cue.at,chapterIndex:index,cueIndex})));

export function storyPosition(seconds){
  const time=Math.max(0,Math.min(duration,seconds));
  const index=chapters.findLastIndex(c=>time>=c.start);
  const chapter=chapters[index],local=Math.min(chapter.duration,time-chapter.start);
  const cueIndex=chapter.cues.findLastIndex(c=>local>=c.at);
  return {time,index,chapter,local,cueIndex,cue:chapter.cues[cueIndex],complete:time===duration};
}

export class StoryClock {
  constructor(){this.time=0;this.playing=false;this.last=null;}
  tick(now,visible=true){
    if(this.playing&&visible&&this.last!==null)this.time=Math.min(duration,this.time+Math.max(0,now-this.last)/1000);
    this.last=now;
    if(this.time>=duration)this.playing=false;
    return storyPosition(this.time);
  }
  play(now){if(this.time>=duration)this.time=0;this.playing=true;this.last=now;}
  pause(now){this.tick(now);this.playing=false;this.last=null;}
  seek(time,now){this.time=Math.max(0,Math.min(duration,time));this.last=now;if(this.time>=duration)this.playing=false;return storyPosition(this.time);}
  resetVisibility(){this.last=null;}
}
