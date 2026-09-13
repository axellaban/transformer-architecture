import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {facts,compute} from './facts.js';
import {sourceHTML} from './sources.js';
import {attentionSpec,accessCell,positionalValue,toyLogits,softmax} from './presentation.mjs';
import {chapters,duration as storyDuration,storyPosition,StoryClock} from './story.mjs';
import {buildCameraPaths,sampleCameraPath} from './camera-path.mjs';
import {ui,etiquetaPlana,nombreCorto,marco,conRama,metricas} from './i18n.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={era:0,time:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,pace:1,n:4096,ready:false,selected:null};
const motionAllowed=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const story={active:false,clock:new StoryClock(),paths:null,blend:null,cueKey:null,savedContext:4096,resumeAfterDialog:false};
const icons={play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M9 5v14M15 5v14"/>',replay:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',sound:'<path d="M4 9.5v5h3.4L12.5 18V6L7.4 9.5z"/><path d="M15.8 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.8a7.4 7.4 0 0 1 0 10.4"/>',mute:'<path d="M4 9.5v5h3.4L12.5 18V6L7.4 9.5z"/><path d="m16.4 9.8 4.6 4.4m0-4.4-4.6 4.4"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const palette={old:0xedb565,new:0x65d9ce,idle:0x365164,purple:0xc093dd,blue:0x70adf0,red:0xef7d80};
const wrap=$('#scene-wrap'),labelsEl=$('#labels'),renderer=new THREE.WebGLRenderer({canvas:$('#scene'),alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0x0b131e,0);
let width=1,height=1,kit,cubeGeometry,tokenGeometry,transition=null,syncing=false,labels=[];const dummy=new THREE.Object3D(),color=new THREE.Color();
const single=()=>!story.active&&width<980,viewport=v=>({x:single()?0:v.side*width/2,w:single()?width:width/2,show:!single()||v.side===state.era});
const views=[0,1].map(side=>{const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xc9e4ff,0x35424e,2.4));const light=new THREE.DirectionalLight(0xfff0d7,3.5);light.position.set(-9,17,16);scene.add(light);const rim=new THREE.DirectionalLight(0x7aadf3,2);rim.position.set(9,11,-8);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(36,1,.05,500),surface=document.createElement('div');surface.style.cssText='position:absolute;top:0;bottom:0;touch-action:none';wrap.insertBefore(surface,labelsEl);
 const controls=new OrbitControls(camera,surface);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=3.5;controls.maxDistance=68;controls.zoomToCursor=true;controls.zoomSpeed=.8;controls.maxPolarAngle=Math.PI*.88;
 const world=new THREE.Group();scene.add(world);const grid=new THREE.GridHelper(34,34,0x29475e,0x1c3143);grid.position.y=-1.1;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
 const v={side,scene,camera,controls,surface,world,root:null,components:[],selected:null};
 surface.addEventListener('pointerdown',e=>{v.down=[e.clientX,e.clientY];v.zoomPoint=null;transition=null});surface.addEventListener('pointerup',e=>{if(v.down&&Math.hypot(e.clientX-v.down[0],e.clientY-v.down[1])<5)selectAt(v,e.clientX,e.clientY)});
 surface.addEventListener('wheel',e=>{const r=wrap.getBoundingClientRect(),vp=viewport(v);v.zoomPoint={x:(e.clientX-r.left-vp.x)/vp.w*2-1,y:-(e.clientY-r.top)/height*2+1};views[1-side].zoomPoint={...v.zoomPoint};},{passive:true,capture:true});
 controls.addEventListener('start',()=>{interruptStory();transition=null;v.selected=null;views[1-side].selected=null;state.selected=null;});controls.addEventListener('change',()=>{if(syncing||transition||state.selected||!state.ready)return;syncing=true;const o=views[1-side],delta=camera.position.clone().sub(controls.target);o.controls.target.copy(controls.target);o.camera.position.copy(o.controls.target).add(delta);o.controls.update();syncing=false});return v;});
labelsEl.addEventListener('wheel',e=>{const rect=wrap.getBoundingClientRect(),side=single()?state.era:(e.clientX-rect.left<width/2?0:1);e.preventDefault();views[side].surface.dispatchEvent(new WheelEvent('wheel',{clientX:e.clientX,clientY:e.clientY,deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,ctrlKey:e.ctrlKey,cancelable:true}));},{passive:false});
function syncViewport(){document.body.classList.toggle('story-single',story.active&&single());document.body.dataset.storyEra=String(state.era);for(const v of views){const r=viewport(v);v.surface.style.left=r.x+'px';v.surface.style.width=r.w+'px';v.surface.style.display=r.show?'':'none';v.camera.aspect=r.w/height;v.camera.updateProjectionMatrix()}$$('[data-era]').forEach(b=>{b.classList.toggle('active',+b.dataset.era===state.era);b.setAttribute('aria-pressed',+b.dataset.era===state.era)})}
function resize(){width=wrap.clientWidth;height=wrap.clientHeight;renderer.setSize(width,height,false);syncViewport();if(state.ready){if(story.active){story.paths=buildCameraPaths(views.map(v=>v.data),width,height);updateStoryCamera(performance.now());}else if(state.selected)moveToComponents(views.map(v=>v.selected),state.era,false);else home(false)}}new ResizeObserver(resize).observe(wrap);
function cameraTo(targets,offset,animate=true){animate=animate&&motionAllowed;const offsets=Array.isArray(offset)?offset:views.map(()=>offset);const starts=views.map(v=>({p:v.camera.position.clone(),t:v.controls.target.clone()}));transition=animate?{time:performance.now(),starts,targets,offsets}:null;if(!animate){syncing=true;views.forEach((v,i)=>{v.controls.target.copy(targets[i]);v.camera.position.copy(targets[i]).add(offsets[i]);v.controls.update()});syncing=false}}
function home(animate=true){state.selected=null;for(const v of views){v.selected=null;v.zoomPoint=null;v.missing=null;}$('#selection').hidden=true;const aspect=(single()?width:width/2)/height;const d=Math.max(27.5,11/(Math.tan(Math.PI/10)*aspect));cameraTo([new THREE.Vector3(0,8,0),new THREE.Vector3(0,8,0)],new THREE.Vector3(d*.62,d*.31,d),animate)}
function format(n){return n===1048576?'1M':n>=1024&&n%1024===0?(n/1024)+'K':n.toLocaleString('es-ES')}
function bytes(n){return n>=1e9?(n/1e9).toFixed(2).replace('.',',')+' GB':n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' MB':Math.round(n/1000)+' KB'}
const guideSVG=document.createElementNS('http://www.w3.org/2000/svg','svg');guideSVG.classList.add('label-guides');guideSVG.setAttribute('aria-hidden','true');labelsEl.prepend(guideSVG);
function addLabel(v,text,point,cls,action){const el=document.createElement(action?'button':'div');el.className='label '+cls;el.innerHTML=text;if(action)el.onclick=action;labelsEl.append(el);const l={v,el,point:new THREE.Vector3(...point),opacity:1};labels.push(l);return l}
function lines(parent,pts,col,opacity=.5){const g=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p))),o=new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity}));parent.add(o);return o}
function instances(parent,count){const mat=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.26,roughness:.33,transparent:true,opacity:1});const o=new THREE.InstancedMesh(cubeGeometry,mat,count);o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.frustumCulled=false;parent.add(o);return o}
function instance(o,i,pos,scale,col){dummy.position.set(...pos);dummy.scale.set(...scale);dummy.rotation.set(0,0,0);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);o.setColorAt(i,color.setHex(col))}
function finish(o){o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true}
function annotate(v,d,text,p){const l=addLabel(v,text,[0,0,0],'small');l.opacity=0;l.owner=d;l.localAnchor=new THREE.Vector3(...p);(d.annotations??=[]).push({l,p:l.localAnchor});return l;}
function makeInterior(v,n){const g=new THREE.Group();g.position.set(n.x,n.y,.5);v.world.add(g);const d={n,g,zoom:0,opacity:1,kind:n.part,objects:[],base:[],h:3.2};const col=v.side?palette.new:palette.old;
 if(['attention','cross'].includes(n.part)){
  d.cells=instances(g,256);d.heads=instances(g,v.side?64:8);for(let i=0;i<(v.side?64:8);i++){const cols=8,xx=(i%cols-3.5)*.34,yy=1.7+Math.floor(i/cols)*.14;instance(d.heads,i,[xx,yy,.25],[.22,.085,.32],col)}finish(d.heads);
  d.objects.push(d.cells,d.heads);
  if(v.side){d.globalKV=instances(g,1);d.localKV=instances(g,16);d.indexHeads=instances(g,32);d.topSelection=instances(g,1);d.objects.push(d.globalKV,d.localKV,d.indexHeads,d.topSelection);d.kvAnnotation=annotate(v,d,'',[2.03,.9,0]);d.localAnnotation=annotate(v,d,metricas.local128,[2.04,-1.4,0]);d.indexAnnotation=annotate(v,d,metricas.cabezasIndice,[0,-2.62,0]);lines(g,[[1.85,.7,.2],[1.85,.4,.2],[1.5,.4,.2]],col,.35);}
lines(g,[[-1.5,-1.55,.1],[-1.5,2.7,.1]],col,.25);lines(g,[[1.5,-1.55,.1],[1.5,2.7,.1]],col,.25);
 }else if(n.part==='ffn'){
  d.experts=instances(g,v.side?385:32);d.objects.push(d.experts);if(v.side){d.router=instances(g,1);instance(d.router,0,[0,1.8,.3],[.35,.15,.3],col);finish(d.router);d.objects.push(d.router);}
  d.routes=Array.from({length:v.side?7:32},()=>lines(g,[[0,1.8,.3],[0,0,.3]],col,.45));
 }else if(n.part==='residual'){
  d.streams=instances(g,v.side?16:4);const count=v.side?4:1;for(let r=0;r<count;r++)for(let j=0;j<4;j++)instance(d.streams,r*4+j,[(r-(count-1)/2)*.55,(j-1.5)*.55,.15],[.23,.13,.38],col);finish(d.streams);d.objects.push(d.streams);
  if(v.side)for(let a=0;a<4;a++)for(let b=0;b<4;b++)lines(g,[[(a-1.5)*.55,-.4,.15],[(b-1.5)*.55,.4,.15]],col,.18);for(let r=0;r<count;r++)lines(g,[[(r-(count-1)/2)*.55,-1.1,.1],[(r-(count-1)/2)*.55,1.1,.1]],col,.75);
 }else if(n.part==='embedding'){
  d.vector=instances(g,v.side?80:8);for(let i=0;i<(v.side?80:8);i++)instance(d.vector,i,[(i%8-3.5)*.34,(Math.floor(i/8)-(v.side?4.5:0))*.23,.2],[.22,.13,.3],col);finish(d.vector);d.objects.push(d.vector);
 }else if(n.part==='memory'){
  d.banks=instances(g,v.side?4:6);d.objects.push(d.banks);
 }else if(n.part==='vision'){
  d.patches=instances(g,81);d.objects.push(d.patches);
  const layerCount=n.id==='vision_encoder'?32:2;d.visionLayers=instances(g,layerCount);for(let i=0;i<layerCount;i++)instance(d.visionLayers,i,[0,0,-.10-i*.028],[2.7,2.7,.016],palette.purple);finish(d.visionLayers);d.objects.push(d.visionLayers);
 }else if(n.part==='engram'){
  d.slots=instances(g,48);d.lookups=instances(g,48);d.objects.push(d.slots,d.lookups);lines(g,[[-1.5,0,.1],[1.5,0,.1]],palette.purple,.3);
 }else if(n.part==='speed'){
  d.markov=lines(g,[[0,0,0],[0,0,0]],palette.blue,.5);d.drafts=instances(g,5);d.draftBlocks=instances(g,3);for(let i=0;i<3;i++)instance(d.draftBlocks,i,[0,-.6+i*.4,-.8],[3,.2,.4],palette.blue);finish(d.draftBlocks);d.verifyGate=instances(g,1);instance(d.verifyGate,0,[0,-1.35,.65],[3.6,.15,.55],col);finish(d.verifyGate);d.objects.push(d.drafts,d.draftBlocks,d.verifyGate);
 }else if(n.part==='indexer'){
  d.pool=instances(g,64);d.objects.push(d.pool);
 }else if(n.part==='head'){
  d.distribution=instances(g,16);d.objects.push(d.distribution);
 }else if(n.part==='position'){
  for(let j=0;j<8;j++){const dimension=Math.floor(j/2)*64+j%2;lines(g,Array.from({length:193},(_,i)=>[(i/192-.5)*3,positionalValue(i/192*64,dimension)*.6,(j-3.5)*.18]),palette.purple,.55);}
 }else{
  d.generic=instances(g,12);for(let i=0;i<12;i++)instance(d.generic,i,[(i%4-1.5)*.55,(Math.floor(i/4)-1)*.6,.2],[.35,.3,.3],col);finish(d.generic);d.objects.push(d.generic);
 }
 d.shell=[];v.root.traverse(o=>{if(o.userData.component_id===n.id)o.traverse(m=>{if(m.isMesh)d.shell.push(m)})});const title=nombreCorto(v.side,n);d.label=addLabel(v,title,[n.x,n.y,1.65],'component',()=>focus(v,n));d.metric=addLabel(v,'',[n.x,n.y+2.6,2.7],'metric '+(v.side?'modern':'original'));d.metric.opacity=0;d.label.node=n;d.label.el.dataset.component=n.id;d.metric.el.dataset.component=n.id;if(n.kind==='box'){const guide=document.createElementNS(guideSVG.namespaceURI,'path');guideSVG.append(guide);d.label.guide=guide;d.label.el.classList.add('callout');const ink='#'+(d.shell[0]?.material.color.getHexString()??n.color);d.label.el.style.setProperty('--component-colour',ink);guide.style.stroke=ink;d.label.el.onpointerenter=()=>guide.classList.add('active');d.label.el.onpointerleave=()=>guide.classList.remove('active');}d.metric.owner=d;if(!title)d.label.el.hidden=true;return d;}
function componentFor(v,n){if(!v.side&&n.branch==='decoder'&&n.part==='cross')return v.data.nodes.find(q=>q.id==='decoder_cross');return v.data.nodes.find(q=>q.part===n.part&&(q.branch===n.branch||!n.branch)&&q.kind==='box')||v.data.nodes.find(q=>q.part===n.part)}
function moveToComponents(nodes,side,animate=true){
 state.era=side;syncViewport();const n=nodes[side];state.selected=n?{side,id:n.id}:null;
 views.forEach((v,i)=>{v.selected=nodes[i]||null;v.zoomPoint=null;v.missing=null;});
 const aspect=(single()?width:width/2)/height,overview=Math.max(27.5,11/(Math.tan(Math.PI/10)*aspect));
 const targets=views.map(v=>{const q=v.selected,modernAttention=v.side&&q?.part==='attention';return q?new THREE.Vector3(q.x+(modernAttention?.65:0),q.y+(story.active?(modernAttention?.4:.15):.7),1.5):new THREE.Vector3(0,8,0)});
 const offsets=views.map(v=>{if(!v.selected)return new THREE.Vector3(overview*.62,overview*.31,overview);const modernAttention=v.side&&v.selected.part==='attention',span=modernAttention?2.5:1.85,d=Math.max(story.active?(modernAttention?12.4:10.6):8.2,span/(Math.tan(Math.PI/10)*aspect));return new THREE.Vector3(d*.12,d*.09,d);});
 cameraTo(targets,offsets,animate);
 if(n)$('#selection-name').textContent=conRama(side,n);$('#selection').hidden=!n;
}
function focus(v,n){interruptStory();if(n.id.endsWith('position_label'))n=v.data.nodes.find(q=>q.kind==='position'&&q.branch===n.branch)||n;if(n.part==='memory'&&n.kind==='text'&&n.id!=='kv_label')n=v.data.nodes.find(q=>q.id==='hidden_states')||n;const other=views[1-v.side],match=componentFor(other,n)||other.data.nodes.find(q=>q.part==='attention'&&q.branch===n.branch);const nodes=[];nodes[v.side]=n;nodes[1-v.side]=match;moveToComponents(nodes,v.side);}
function selectAt(v,x,y){const r=wrap.getBoundingClientRect(),vp=viewport(v),ray=new THREE.Raycaster();ray.setFromCamera({x:(x-r.left-vp.x)/vp.w*2-1,y:-(y-r.top)/height*2+1},v.camera);for(const hit of ray.intersectObject(v.root,true)){let o=hit.object;while(o&&!o.userData.component_id)o=o.parent;if(!o)continue;const n=v.data.nodes.find(n=>n.id===o.userData.component_id);if(n?.part){focus(v,n);return}}}
function smooth(a,b,x){x=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)}
function pointOn(path,t){const x=(((t%1)+1)%1)*(path.length-1),i=Math.min(path.length-2,Math.floor(x)),q=x-i;return path[i].map((n,k)=>n+(path[i+1][k]-n)*q)}
function particle(v,i,pos,col,size){dummy.position.set(...pos);dummy.rotation.set(0,i*.52,0);dummy.scale.setScalar(size);dummy.updateMatrix();v.flow.setMatrixAt(i,dummy.matrix);v.flow.setColorAt(i,color.setHex(col))}
function flow(v){let i=0;const grouping=Math.round(3+Math.log2(state.n/256)/2);for(const [ei,e] of v.data.edges.entries()){if(e.role==='position')continue;const col=e.role==='draft'?palette.blue:e.role==='residual'?0xf4cf8b:e.role==='conditional'?palette.purple:v.side?palette.new:palette.old;for(let j=0;j<grouping;j++)particle(v,i++,pointOn(e.spatial_path,(state.time*.20+j/grouping+ei*.11)%1),col,e.role==='flow'?.105:.075)}v.flow.count=i;finish(v.flow)}
function tickInterior(v,d){const {n,g}=d,col=v.side?palette.new:palette.old,pos=new THREE.Vector3(n.x,n.y,.7),distance=v.camera.position.distanceTo(pos),pixels=Math.max(n.w,2.6)*height/(2*Math.tan(v.camera.fov*Math.PI/360)*distance);const weight=story.active?(v.storyWeights?.get(n.id)??0):0,raw=story.active?weight:v.selected?.id===n.id?1:smooth(112,235,pixels),hot=v.hot===d;d.zoom=THREE.MathUtils.lerp(d.zoom,story.active?raw:hot?raw:0,.10);const zoom=d.zoom,otherFade=story.active?1-(v.storyFocus??0)*(1-weight)*.985:v.hot&&!hot?1-v.hot.zoom*.87:1;d.opacity=otherFade;
 const coarse=Math.min(.4,Math.max(.14,n.h/3.7));g.scale.setScalar(.72+zoom*.12);g.scale.y=coarse+(1-coarse)*zoom;g.position.z=.5+zoom*1.35;g.visible=story.active?weight>.015:otherFade>.08;for(const o of d.objects)o.material.opacity=(.6+.4*zoom)*otherFade;
 for(const m of d.shell){m.material.opacity=(m.userData.initialOpacity??1)*otherFade*(1-zoom*.92);m.material.depthWrite=m.material.opacity>.5;}
 d.label.opacity=(1-smooth(.1,.6,zoom))*otherFade;d.metric.opacity=smooth(.52,.86,zoom)*otherFade;d.metric.point.set(n.x,n.y+3,2.8);
 const phase=state.time*.6,step=Math.floor(state.time*.65);
 if(d.cells){
  const spec=v.side?attentionSpec(n.layer,state.n,facts.deepseek):null;
  if(v.side&&d.accessKey!==`${state.n}:${step}`){d.accessKey=`${state.n}:${step}`;d.accessMap=Array.from({length:256},(_,i)=>accessCell(spec,Math.floor(i/16),i%16,step));}
  for(let i=0;i<256;i++){const row=Math.floor(i/16),c=i%16,active=v.side?d.accessMap[i]:n.branch!=='decoder'||n.part==='cross'||c<=row;const cc=active?(v.side&&!spec.hasGlobal?palette.purple:col):palette.idle,pulse=Math.floor(phase*10)%16===row;instance(d.cells,i,[(c-7.5)*.18,(7.5-row)*.18,.12],[.15,.15,active?(pulse?.26:.13):.055],cc)}finish(d.cells);
  if(v.side){
   instance(d.globalKV,0,[1.85,.1,.15],spec.hasGlobal?[.25,1.05,.3]:[0,0,0],spec.mode==='Full'?col:palette.old);finish(d.globalKV);
   for(let i=0;i<16;i++)instance(d.localKV,i,[1.85,-.66-i*.04,.15],[.25,.027,.2],palette.purple);finish(d.localKV);
   for(let i=0;i<32;i++)instance(d.indexHeads,i,[2.48+(i%4)*.19,.54-Math.floor(i/4)*.13,.15],spec.hasIndexer?[.12,.07,.2]:[0,0,0],col);finish(d.indexHeads);
   instance(d.topSelection,0,[0,-1.75,.15],spec.hasGlobal?[2.35,.08,.2]:[0,0,0],spec.mode==='Reuse'?palette.red:col);finish(d.topSelection);
   d.kvAnnotation.el.textContent=spec.hasGlobal?(spec.mode==='Full'?metricas.kvNuevo:metricas.kvCompartido):'';d.indexAnnotation.el.textContent=spec.hasIndexer?metricas.cabezasIndice:spec.hasGlobal?metricas.indicesReutilizados:'';d.indexAnnotation.localAnchor.set(...(spec.hasIndexer?[2.78,-.69,0]:[0,-2.0,0]));
   d.metric.el.innerHTML=metricas.cabezasQ(spec.mode,spec.selected,spec.local);
  }else d.metric.el.innerHTML=metricas.cabezas(n.part==='cross'?metricas.atencionCruzada:n.branch==='decoder'?metricas.atencionEnmascarada:metricas.atencionBidireccional);

 }else if(d.experts){const active=Array.from({length:6},(_,i)=>(step*53+i*61+17)%384);for(let i=0;i<(v.side?385:32);i++){const shared=i===384,yes=!v.side||shared||active.includes(i),p=v.side?(shared?[0,-1.7,.15]:[(i%24-11.5)*.125,(7.5-Math.floor(i/24))*.125,.15]):[(i%8-3.5)*.34,(1.5-Math.floor(i/8))*.5,.15];instance(d.experts,i,p,shared?[2.8,.12,.22]:v.side?[.102,.102,yes?.23:.075]:[.23,.28,.28],yes?col:palette.idle)}finish(d.experts);d.routes.forEach((r,i)=>{const id=v.side?(i===6?384:active[i]):i,p=v.side?(id===384?[0,-1.7,.2]:[(id%24-11.5)*.125,(7.5-Math.floor(id/24))*.125,.2]):[(id%8-3.5)*.34,(1.5-Math.floor(id/8))*.5,.2];r.geometry.setFromPoints([new THREE.Vector3(0,1.8,.3),new THREE.Vector3(...p)]);r.material.opacity=zoom*.45*otherFade});d.metric.el.innerHTML=v.side?metricas.expertosModernos:metricas.expertosOriginal;
 }else if(d.vector){d.metric.el.innerHTML=metricas.dimensiones(v.side?'5120':'512');}else if(d.streams){d.metric.el.innerHTML=v.side?metricas.flujosModernos:metricas.flujosOriginal;}
 else if(d.banks){d.metric.point.set(n.x,n.y+(v.side?1.15:2.5),2.8);const c=compute(state.n),growth=Math.cbrt(state.n/1048576),count=v.side?4:6;for(let i=0;i<count;i++){const ratio=v.side?Math.cbrt((i===3?356:178)/2048):1,k=growth*ratio;instance(d.banks,i,[(i-(count-1)/2)*.55,-1.2+1.5*k,.4],[.37*k,3*k,1.2*k],col)}finish(d.banks);d.metric.el.innerHTML=bytes(v.side?c.newCache:c.oldCache)+'<small>'+(v.side?metricas.cacheModerna:metricas.cacheOriginal)+'</small>';}
 else if(d.patches){const t=n.id==='vision_encoder'?0:(Math.sin(state.time*.65)+1)/2;for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,xx=(c-4)*.30*(1-t)+(Math.floor(c/3)-1)*.92*t+(c%3-1)*.055*t,yy=(r-4)*.30*(1-t)+(Math.floor(r/3)-1)*.92*t+(r%3-1)*.055*t;instance(d.patches,i,[xx,yy,.4+t*.5],[.18*(1-t*.55),.18*(1-t*.55),.14],palette.purple)}finish(d.patches);d.metric.el.innerHTML=n.id==='vision_encoder'?metricas.visionEncoder:metricas.visionProyector;}
 else if(d.slots){for(let i=0;i<48;i++){const row=Math.floor(i/8),y=(2.5-row)*.38+(row<3?.15:-.15),x=(i%8-3.5)*.34;instance(d.slots,i,[x,y,.15],[.23,.24,.17],palette.purple);instance(d.lookups,i,[x,y+(((step*7+i*11)%13)/12-.5)*.15,.26],[.2,.027,.04],col);}finish(d.slots);finish(d.lookups);d.metric.el.innerHTML=metricas.engram;}
 else if(d.drafts){const t=(state.time*.3)%1,positions=[];for(let i=0;i<5;i++){const accepted=i<3,p=[(i-2)*.60,t<.6?1.15-t/.6*2.35:accepted?-1.2-(t-.6)*3:-1.2,.65];positions.push(new THREE.Vector3(...p));instance(d.drafts,i,p,!accepted&&t>.9?[0,0,0]:[.37,.32,.4],t<.6?palette.blue:accepted?col:palette.red)}finish(d.drafts);d.markov.geometry.setFromPoints(positions);d.markov.material.opacity=t<.6?zoom*.5*otherFade:0;d.metric.el.innerHTML=metricas.dspark;}

 else if(d.pool){const candidates=Math.min(state.n,16384),selected=Math.min(state.n,512),activeGroups=Math.round(64*selected/candidates);for(let i=0;i<64;i++){const yes=(i*17+step*7)%64<activeGroups;instance(d.pool,i,[(i%8-3.5)*.32,(3.5-Math.floor(i/8))*.32,.2],[.22,.24,yes?.5:.12],yes?palette.blue:palette.idle)}finish(d.pool);d.metric.el.innerHTML=metricas.candidatos(candidates.toLocaleString('es-ES'),selected);}

 else if(d.distribution){const logits=toyLogits(step),probabilities=softmax(logits),linear=n.id==='linear';for(let i=0;i<16;i++){const value=linear?logits[i]*.42:probabilities[i]*4,h=Math.max(.025,Math.abs(value)),y=linear?value/2:-1.05+h/2;instance(d.distribution,i,[(i-7.5)*.18,y,.25],[.12,h,.24],linear&&value<0?palette.purple:col)}finish(d.distribution);d.metric.el.innerHTML=linear?metricas.lineal:n.id==='target_head'?metricas.cabezaVocabulario:metricas.siguienteToken;}

 else if(n.part==='position')d.metric.el.innerHTML=metricas.posiciones;
 else if(n.part==='hidden')d.metric.el.innerHTML=metricas.estadosFinales;
 else d.metric.el.innerHTML=etiquetaPlana(v.side,n);
 if(d.annotations){g.updateWorldMatrix(true,false);for(const a of d.annotations){a.l.point.copy(a.p).applyMatrix4(g.matrixWorld);a.l.opacity=smooth(.6,.9,zoom)*otherFade;}}
}
function findHot(v){if(story.active)return;if(v.selected){v.hot=v.components.find(d=>d.n.id===v.selected.id)||null;return;}const vp=viewport(v);let best=null,bestScore=-1;for(const d of v.components){const n=d.n,p=new THREE.Vector3(n.x,n.y,.7).project(v.camera);if(p.z<0||p.z>1||Math.abs(p.x)>1.15||Math.abs(p.y)>.9)continue;const pixels=Math.max(n.w,2.6)*height/(2*Math.tan(v.camera.fov*Math.PI/360)*v.camera.position.distanceTo(new THREE.Vector3(n.x,n.y,.7))),center=Math.hypot(p.x-(v.zoomPoint?.x??0),(p.y-(v.zoomPoint?.y??0))*.8),score=pixels/(1+center*8)*(v.selected?.id===n.id?3:1);if(pixels>125&&score>bestScore){best=d;bestScore=score}}v.hot=best;}
function updateLabels(){
 const callouts=[];
 for(const l of labels){
  const vp=viewport(l.v),p=l.point.clone().project(l.v.camera),metric=l.owner?.metric===l,x=metric?vp.x+vp.w/2:(p.x*.5+.5)*vp.w+vp.x,y=metric?(story.active?(width<600?146:90):38):(-p.y*.5+.5)*height;
  const detailOnly=story.active;const yes=(!detailOnly||l.owner===l.v.hot)&&vp.show&&l.opacity>.035&&p.z>0&&p.z<1&&x>vp.x+4&&x<vp.x+vp.w-4&&y>4&&y<height-40;
  l.el.style.display=yes?'':'none';l.el.style.opacity=l.opacity;if(l.guide)l.guide.style.display='none';
  if(l.guide&&yes){
   const n=l.node,points=[];for(const xx of [-1,1])for(const yy of [-1,1])for(const zz of [-.15,1.24]){const q=new THREE.Vector3(n.x+xx*n.w/2,n.y+yy*n.h/2,zz).project(l.v.camera);points.push({x:(q.x*.5+.5)*vp.w+vp.x,y:(-q.y*.5+.5)*height});}
   const left=Math.min(...points.map(q=>q.x)),right=Math.max(...points.map(q=>q.x)),side=n.x<0?-1:1;
   callouts.push({l,vp,y,left,right,side,anchor:side<0?left:right});continue;
  }
  if(l.node)l.el.style.width=l.node.id==='kv_label'?'48px':'auto';
  if(!l.node&&!l.owner&&l.v.hot)l.el.style.opacity=l.opacity*(1-l.v.hot.zoom*.88);
  const labelX=story.active&&l.owner&&!metric?THREE.MathUtils.clamp(x,vp.x+l.el.offsetWidth/2+6,vp.x+vp.w-l.el.offsetWidth/2-6):x;
  l.el.style.left=labelX+'px';l.el.style.top=y+'px';
 }
 for(const v of views){
  const all=callouts.filter(c=>c.l.v===v);if(!all.length)continue;
  const vp=viewport(v),outerLeft=Math.min(...all.map(c=>c.left)),outerRight=Math.max(...all.map(c=>c.right));
  for(const side of [-1,1]){
   const lane=all.filter(c=>c.side===side).sort((a,b)=>a.y-b.y);if(!lane.length)continue;
   const available=side<0?outerLeft-vp.x-32:vp.x+vp.w-outerRight-32,labelWidth=Math.max(82,Math.min(144,available));
   const edge=side<0?Math.max(vp.x+labelWidth+12,outerLeft-20):Math.min(vp.x+vp.w-labelWidth-12,outerRight+20);
   for(const c of lane){c.l.el.style.width=labelWidth+'px';c.l.el.dataset.side=side<0?'left':'right';c.h=c.l.el.offsetHeight;c.labelY=Math.max(20+c.h/2,c.y);}
   for(let i=1;i<lane.length;i++)lane[i].labelY=Math.max(lane[i].labelY,lane[i-1].labelY+(lane[i-1].h+lane[i].h)/2+7);
   const last=lane.at(-1),overflow=Math.max(0,last.labelY+last.h/2-(height-48));if(overflow)for(const c of lane)c.labelY-=overflow;
   for(let i=lane.length-2;i>=0;i--)lane[i].labelY=Math.min(lane[i].labelY,lane[i+1].labelY-(lane[i+1].h+lane[i].h)/2-7);
   for(const c of lane){const {l}=c;const end=edge-side*5,elbow=c.anchor+side*Math.min(12,Math.abs(end-c.anchor)*.4);l.el.style.left=edge+'px';l.el.style.top=c.labelY+'px';l.guide.style.display='';l.guide.style.opacity=l.opacity;l.guide.setAttribute('d',`M ${c.anchor} ${c.y} L ${elbow} ${c.y} L ${end} ${c.labelY}`);}
  }
 }
}
function applyStoryCue(position){
 const {cue,chapter,index,cueIndex}=position;story.cueKey=`${index}:${cueIndex}`;
 document.body.dataset.storyChapter=chapter.id;document.body.dataset.storyCue=String(cueIndex);
 $('#story-title').textContent=cue.title??chapter.title;$('#story-caption').textContent=cue.caption;
}
function blendStoryCamera(){story.blend={start:performance.now(),starts:views.map(v=>({target:v.controls.target.clone(),position:v.camera.position.clone()}))};}
function updateStoryCamera(now){
 if(!story.paths)return;
 const blend=story.blend?Math.min(1,(now-story.blend.start)/1400):1,ease=blend*blend*(3-2*blend);
 syncing=true;
 views.forEach((v,i)=>{
  const pose=sampleCameraPath(story.paths[i],story.clock.time),target=new THREE.Vector3(...pose.target),position=target.clone().add(new THREE.Vector3(...pose.offset));
  if(story.blend){v.controls.target.lerpVectors(story.blend.starts[i].target,target,ease);v.camera.position.lerpVectors(story.blend.starts[i].position,position,ease);}else{v.controls.target.copy(target);v.camera.position.copy(position);}
  v.camera.lookAt(v.controls.target);
  const mix=smooth(.08,.92,pose.progress);v.storyWeights=new Map();
  if(pose.from)v.storyWeights.set(pose.from,pose.from===pose.to?1:1-mix);
  if(pose.to)v.storyWeights.set(pose.to,pose.from===pose.to?1:mix);
  v.storyFocus=Math.max(0,...v.storyWeights.values());
  const id=pose.from===pose.to?pose.from:mix<.5?pose.from:pose.to;
  v.selected=v.data.nodes.find(n=>n.id===id)||null;v.hot=v.components.find(d=>d.n.id===id)||null;
 });
 syncing=false;if(blend===1)story.blend=null;
}
function updateStoryTransport(position=storyPosition(story.clock.time)){
 const label=position.complete?ui.historiaRepetir:story.clock.playing?ui.historiaPausar:ui.historiaReanudar;
 if($('#story-play').getAttribute('aria-label')!==label){$('#story-play').innerHTML=icon(position.complete?'replay':story.clock.playing?'pause':'play');$('#story-play').setAttribute('aria-label',label);$('#story-play').title=label;}
 $('#story-previous').disabled=story.clock.time===0;$('#story-next').disabled=position.complete;
 const nextLabel=position.index===chapters.length-1?ui.capituloFinal:ui.capituloSiguiente;$('#story-next').setAttribute('aria-label',nextLabel);$('#story-next').title=nextLabel;
 const seconds=Math.floor(position.time);$('#story-time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} / 1:00`;
 document.body.dataset.storyState=position.complete?'complete':story.clock.playing?'playing':'paused';
 for(const [i,button] of story.chapterButtons.entries()){const c=chapters[i];button.style.setProperty('--progress',Math.max(0,Math.min(1,(position.time-c.start)/c.duration)));if(i===position.index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}
}
// Narración en español del recorrido de un minuto. La pista dura lo mismo que la
// historia, así que basta con seguir el reloj: cada capítulo empieza en su segundo.
const narration={el:new Audio(),on:true,failed:false,source:'./assets/narracion-es.mp3?v=b6a3a6591751'};
try{narration.on=localStorage.getItem('narracion')!=='off'}catch{}
narration.el.preload='none';narration.el.src=narration.source;
if('preservesPitch' in narration.el)narration.el.preservesPitch=true;
narration.el.addEventListener('error',()=>{narration.failed=true;updateNarrationButton()});
// Safari en iOS ignora preload y descarga la pista mientras suena, así que un tirón
// de red la corta a mitad de frase. Se baja entera una vez y se reproduce de memoria.
async function preloadNarration(){
 try{
  const response=await fetch(narration.source);
  if(!response.ok)return;
  const url=URL.createObjectURL(await response.blob());
  if(!story.active){narration.el.src=url;narration.el.load();}
 }catch{}
}
function updateNarrationButton(){
 const button=$('#story-audio'),active=narration.on&&!narration.failed;
 const label=narration.failed?ui.narracionNoDisponible:active?ui.narracionSilenciar:ui.narracionActivar;
 button.innerHTML=icon(active?'sound':'mute');button.setAttribute('aria-label',label);button.title=label;
 button.setAttribute('aria-pressed',String(active));button.disabled=narration.failed;
}
function syncNarration(reposition=false){
 const el=narration.el;if(narration.failed)return;
 if(!story.active||!narration.on){if(!el.paused)el.pause();return;}
 // Solo se reposiciona en los saltos explícitos: en iOS cada búsqueda interrumpe el
 // sonido, así que la deriva pequeña se corrige estirando un poco la velocidad.
 const drift=story.clock.time-el.currentTime;
 if(reposition||Math.abs(drift)>1){el.playbackRate=1;try{el.currentTime=story.clock.time}catch{}}
 else el.playbackRate=Math.min(1.05,Math.max(.95,1+drift*.5));
 const play=story.clock.playing&&!document.hidden&&!$('#source-dialog').open;
 if(play&&el.paused)el.play().catch(()=>{});else if(!play&&!el.paused)el.pause();
}
function stopNarration(){if(narration.failed)return;narration.el.pause();narration.el.playbackRate=1;try{narration.el.currentTime=0}catch{}}
function toggleNarration(){
 narration.on=!narration.on;try{localStorage.setItem('narracion',narration.on?'on':'off')}catch{}
 updateNarrationButton();syncNarration(true);
}
function startStory(){
 if(!state.ready)return;story.savedContext=state.n;state.n=4096;story.active=true;story.cueKey=null;story.blend=null;transition=null;for(const v of views){v.controls.enabled=false;v.surface.style.pointerEvents='none';}
 document.body.classList.add('is-story');$('#explore-controls').hidden=true;$('#story-panel').hidden=false;
 $('#story-toggle').setAttribute('aria-pressed','true');$('#story-toggle').setAttribute('aria-label',ui.historiaSalir);$('#story-toggle-label').textContent=ui.historiaExplorar;$('#story-duration').hidden=true;
 story.clock.seek(0,performance.now());story.clock.play(performance.now());stopNarration();syncNarration(true);resize();applyStoryCue(storyPosition(0));updateStoryTransport();
}
function stopStory(){
 if(!story.active){home();return;}story.clock.pause(performance.now());story.active=false;stopNarration();story.blend=null;story.resumeAfterDialog=false;state.n=story.savedContext;for(const v of views){v.controls.enabled=true;v.surface.style.pointerEvents='';v.storyWeights=null;}
 document.body.classList.remove('is-story');delete document.body.dataset.storyChapter;delete document.body.dataset.storyCue;delete document.body.dataset.storyState;
 $('#story-panel').hidden=true;$('#explore-controls').hidden=false;$('#story-toggle').setAttribute('aria-pressed','false');$('#story-toggle').setAttribute('aria-label',ui.historiaIniciar);$('#story-toggle-label').textContent=ui.historiaModo;$('#story-duration').hidden=false;
 $('#context').value=Math.log2(state.n);$('#context-value').textContent=format(state.n)+' '+ui.tokens;resize();home();
}
function pauseStory(){if(!story.active)return;story.clock.pause(performance.now());syncNarration();updateStoryTransport();}
function interruptStory(){if(story.active)pauseStory();}
function toggleStoryPlayback(){if(!story.active)return;if(story.clock.playing)pauseStory();else{const replay=story.clock.time>=storyDuration;if(replay)blendStoryCamera();story.clock.play(performance.now());if(replay)applyStoryCue(storyPosition(0));syncNarration(replay);updateStoryTransport();}}
function seekStory(time){blendStoryCamera();const p=story.clock.seek(time,performance.now());applyStoryCue(p);syncNarration(true);updateStoryTransport(p);}
function nextChapter(){const p=storyPosition(story.clock.time);seekStory(chapters[p.index+1]?.start??storyDuration);}
function previousChapter(){const p=storyPosition(story.clock.time);seekStory(p.local>2?p.chapter.start:chapters[Math.max(0,p.index-1)].start);}
story.chapterButtons=chapters.map((chapter,i)=>{const button=document.createElement('button');button.setAttribute('aria-label',`${ui.capitulo(i+1)}: ${chapter.name}`);button.title=chapter.name;button.onclick=()=>seekStory(chapter.start);$('#story-chapters').append(button);return button;});
$('#story-audio').onclick=toggleNarration;updateNarrationButton();$('#story-exit').onclick=stopStory;$('#story-toggle').disabled=true;$('#story-toggle').onclick=()=>story.active?stopStory():startStory();$('#story-play').innerHTML=icon('pause');$('#story-play').onclick=toggleStoryPlayback;$('#story-previous').onclick=previousChapter;$('#story-next').onclick=nextChapter;
$('#home').onclick=$('#selection').onclick=()=>story.active?stopStory():home();
$$('[data-era]').forEach(b=>b.onclick=()=>{interruptStory();state.era=+b.dataset.era;syncViewport()});
function updatePlay(){$('#play').innerHTML=icon(state.playing?'pause':'play');$('#play').setAttribute('aria-label',state.playing?ui.pausarFlujo:ui.reproducirFlujo);$('#play').title=state.playing?ui.pausa:ui.reproducir;}
$('#play').onclick=()=>{state.playing=!state.playing;updatePlay()};$('#context').oninput=e=>{state.n=2**+e.target.value;$('#context-value').textContent=format(state.n)+' '+ui.tokens};$('#pace').onchange=e=>state.pace=+e.target.value;
document.addEventListener('keydown',e=>{if($('#source-dialog').open)return;if(e.key==='Escape'){story.active?stopStory():home();return;}if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(story.active){if(e.code==='Space'){e.preventDefault();toggleStoryPlayback();}else if(e.key==='ArrowRight'){e.preventDefault();nextChapter();}else if(e.key==='ArrowLeft'){e.preventDefault();previousChapter();}else if(e.key==='Home'){e.preventDefault();seekStory(0);}else if(e.key==='End'){e.preventDefault();seekStory(storyDuration);}}else if(e.code==='Space'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();state.playing=!state.playing;updatePlay();}});
document.addEventListener('visibilitychange',()=>{story.clock.resetVisibility();syncNarration();});
$('#source-content').innerHTML=sourceHTML;$('#sources').onclick=()=>{story.resumeAfterDialog=story.active&&story.clock.playing;if(story.resumeAfterDialog)pauseStory();$('#source-dialog').showModal();};$('#close-sources').onclick=()=>$('#source-dialog').close();$('#source-dialog').addEventListener('close',()=>{if(story.resumeAfterDialog&&story.active){story.clock.play(performance.now());updateStoryTransport();}story.resumeAfterDialog=false;syncNarration();});
try{const loader=new GLTFLoader(),[assets,data]=await Promise.all([Promise.all(['spatial-original','spatial-deepseek','detail_kit'].map(n=>loader.loadAsync('./assets/'+n+'.glb?review=6'))),fetch('./assets/spatial-data.json?review=6').then(r=>r.json())]);kit=assets[2].scene;cubeGeometry=kit.getObjectByName('cache_unit').geometry;tokenGeometry=kit.getObjectByName('token_unit').geometry;
 for(const [i,v] of views.entries()){v.root=assets[i].scene;v.data=data[i];v.world.add(v.root);v.wires=[];v.root.traverse(o=>{if(o.isMesh){if(/^(wire_|arrow_|repeat_)/.test(o.name))v.wires.push(o);o.material=o.material.clone();o.material.transparent=true;o.material.opacity=o.name.startsWith('repeat_')?.2:1;o.material.depthWrite=true;o.userData.initialOpacity=o.material.opacity}});for(const n of v.data.nodes){if(n.part&&(n.kind==='box'||['kv_label','residual_input'].includes(n.id)||n.kind==='position'||n.part==='head'))v.components.push(makeInterior(v,n));else if(n.label)addLabel(v,n.id.endsWith('position_label')?ui.posicion:etiquetaPlana(v.side,n),[n.x,n.y,1.5],n.part?'component':'small',n.part?()=>focus(v,n):null)}for(const f of v.data.frames)addLabel(v,marco(f.label),[f.tx,f.ty,-.2],'small');v.flow=new THREE.InstancedMesh(tokenGeometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,toneMapped:false}),1024);v.flow.frustumCulled=false;v.flow.renderOrder=4;v.scene.add(v.flow)}state.ready=true;$('#loading').hidden=true;$('#story-toggle').disabled=false;preloadNarration();resize();updatePlay();
}catch(e){console.error(e);$('#loading').textContent=ui.error;state.error=String(e)}
let before=performance.now();function frame(now){const dt=Math.max(0,Math.min(.08,(now-before)/1000));before=now;if(state.ready){if(story.active){const p=story.clock.tick(now,!document.hidden);if(story.cueKey!==`${p.index}:${p.cueIndex}`)applyStoryCue(p);updateStoryCamera(now);updateStoryTransport(p);syncNarration();}if((story.active?story.clock.playing:state.playing)&&!document.hidden)state.time+=dt*(story.active?1:state.pace);
 if(transition){const t=Math.min(1,(now-transition.time)/1000),s=t*t*(3-2*t);syncing=true;views.forEach((v,i)=>{v.controls.target.lerpVectors(transition.starts[i].t,transition.targets[i],s);v.camera.position.lerpVectors(transition.starts[i].p,transition.targets[i].clone().add(transition.offsets[i]),s);v.controls.update()});syncing=false;if(t===1)transition=null}
 for(const v of views){findHot(v);flow(v);v.components.forEach(d=>tickInterior(v,d));const fade=1-(story.active?(v.storyFocus??0)*.93:(v.hot?.zoom??0)*.72);v.wires.forEach(m=>m.material.opacity=m.userData.initialOpacity*fade);v.flow.material.opacity=fade;if(!story.active)v.controls.update()}const current=views[state.era],active=current.hot;$('#selection').hidden=!(active&&active.zoom>.55);if(active&&active.zoom>.55)$('#selection-name').textContent=conRama(state.era,active.n);updateLabels();renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);for(const v of views){const vp=viewport(v);if(!vp.show)continue;renderer.setViewport(vp.x,0,vp.w,height);renderer.setScissor(vp.x,0,vp.w,height);renderer.render(v.scene,v.camera)}renderer.setScissorTest(false)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
