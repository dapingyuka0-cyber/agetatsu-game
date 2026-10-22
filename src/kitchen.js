import {shareComposition,captureRender} from './share-render.js';
import {CHURRO_PAN_SCALE,OIL_RADIUS,DOUGH_RADIUS,STATION_SHIFT,pathBounds,servingFit} from './churro-layout.js';
import {applyComedy,makeSparkles,makeBlast} from './comedy-3d.js';
import {growthProgress} from './comedy.js';
import smokeTextureURL from './assets/blast-smoke.png';
import {makeChurroPlate} from './churro-plate.js';
import {isCraft} from './craft.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RECIPES} from './simulation.js';
import {makeFood,surface,foodParts} from './food.js';
export function kitchen(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.localClippingEnabled=true;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#d8b68b');const kitchenFog=new T.Fog('#d8b68b',19,42);scene.fog=kitchenFog;
 const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.05);scene.environment=env.texture;pmrem.dispose();
 // Decode the small baked atlas before cooking; no noise generation at impact.
 const blastTexture=new T.TextureLoader().load(smokeTextureURL);blastTexture.flipY=false;blastTexture.minFilter=blastTexture.magFilter=T.LinearFilter;blastTexture.generateMipmaps=false;
 const sparkles=makeSparkles(),blast=makeBlast(blastTexture),blastOrigin=new T.Vector3(0,.87,0);scene.add(sparkles.group,blast.group);let specialEvent=null;
 const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const camera=new T.PerspectiveCamera(39,1,.1,70);const focus=new T.Vector3(0,.3,0);let azimuth=.15,elevation=1,zoom=1;
 const sun=new T.DirectionalLight(0xffedca,2.7);sun.position.set(-4,9,-2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.025;scene.environmentIntensity=.65;scene.add(sun,new T.HemisphereLight(0xf9f8e9,0x997558,.55));
 const mat=(c,r=.6,m=0)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});
 const steel=mat('#a7afaa',.25,.85),black=mat('#282e2b',.38,.5),white=mat('#eeeee1',.25),wood=mat('#bc8e54',.76),green=mat('#e9d7b9',.62);
 const add=(g,m,x=0,y=0,z=0,parent=scene)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,p);
 const cylinder=(r1,r2,h,m,x,y,z,n=72,p=scene)=>add(new T.CylinderGeometry(r1,r2,h,n),m,x,y,z,p);
 function texture(type){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle=type==='wood'?'#bc9568':'#d8d4c5';ctx.fillRect(0,0,512,512);let seed=42;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<(type==='wood'?950:18000);i++){ctx.fillStyle=type==='wood'?`rgba(88,49,13,${r()*.13})`:`rgba(${r()>.5?'255,255,255':'113,107,88'},${r()*.13})`;ctx.fillRect(r()*512,r()*512,type==='wood'?20+r()*180:1+r()*3,type==='wood'?.3+r():1+r()*2);}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(type==='wood'?1:3,type==='wood'?1:3);return tex;}
 const stone=mat('#fff9e9',.84);stone.map=texture('stone');wood.map=texture('wood');
 const counter=box(22,.5,15,wood,0,-.55,1);box(22,5,.2,green,0,2,-5);
 const grout=mat('#dcc6a2');for(let x=-11;x<=11;x+=1.2)box(.025,4,.025,grout,x,1.9,-4.88);for(let y=0;y<5;y+=.65)box(22,.025,.025,grout,0,y,-4.87);
 box(22,.12,.35,wood,0,-.08,-4.7);
 // Rear shelf and ingredient jars.
 box(13,.12,1,wood,0,2.7,-4.3);
 for(let i=0;i<5;i++){const x=-4.8+i*1.05;cylinder(.29,.29,.73,mat(i%2?'#ddd5b3':'#c2b184',.6),x,3.11,-4.25,32);cylinder(.31,.31,.10,wood,x,3.52,-4.25,32);box(.25,.25,.018,white,x,3.15,-3.95);}
 const rail=cylinder(.035,.035,5,steel,3,1.5,-4.62,12);rail.rotation.z=Math.PI/2;
 for(let i=0;i<3;i++){const x=1.9+i*.9;box(.06,.85,.05,steel,x,1.02,-4.5);const utensil=add(new T.TorusGeometry(.17,.026,8,24),steel,x,.52,-4.5);if(i===1){box(.35,.35,.04,steel,x,.55,-4.5);}}
 const panStart=scene.children.length;
 // Brushed stainless deep-frying pan: continuous lathed cross-section, open interior.
 box(4.75,.25,4.55,steel,0,-.18,.05);box(4.40,.09,4.20,black,0,-.005,.05);
 for(const x of [-1.40,1.40])box(.11,.12,4.1,black,x,.05,.05);
 for(const z of [-1.40,1.40])box(4.1,.12,.11,black,0,.05,z);
 const panMetal=new T.MeshPhysicalMaterial({color:'#dce0df',metalness:1,roughness:.23,clearcoat:.3,envMapIntensity:1.3});
 panMetal.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 metalPos;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmetalPos=position;');
  shader.fragmentShader='varying vec3 metalPos;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=.19+.065*(.5+.5*sin(metalPos.y*780.+sin(metalPos.x*65.)*.7));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   diffuseColor.rgb*=.92+.08*sin(metalPos.y*390.+metalPos.z*5.);`);
 };
 const profile=[[0,.13],[1.63,.13],[1.76,.16],[1.83,.20],[1.87,.28],[1.98,.98],[2.0,1.035],[2.0,1.07],[1.98,1.09],[1.95,1.09],[1.93,1.06],[1.92,.99],[1.81,.31],[1.76,.25],[1.67,.23],[0,.23]].map(p=>new T.Vector2(...p));
 add(new T.LatheGeometry(profile,112),panMetal);
 const lip=add(new T.TorusGeometry(1.967,.045,12,112),steel,0,1.066,0);lip.rotation.x=Math.PI/2;
 for(const side of [-1,1]){
  const points=[[side*1.94,.80,-.32],[side*2.36,.87,-.39],[side*2.59,.87,-.22],[side*2.62,.87,.10],[side*2.39,.86,.37],[side*1.94,.80,.32]].map(p=>new T.Vector3(...p));
  add(new T.TubeGeometry(new T.CatmullRomCurve3(points),40,.065,10,false),panMetal);
  for(const z of [-.32,.32]){box(.12,.17,.17,panMetal,side*1.97,.80,z);const rivet=add(new T.SphereGeometry(.046,12,8),steel,side*1.86,.80,z);rivet.scale.x=.40;}
 }
 cylinder(1.45,1.45,.10,black,0,.02,0);
 const flameMat=new T.MeshBasicMaterial({color:'#307cfc',transparent:true,opacity:.55,depthWrite:false});
 const flames=new T.InstancedMesh(new T.ConeGeometry(.055,.17,5),flameMat,36),flameDummy=new T.Object3D();scene.add(flames);
 for(let i=0;i<36;i++){let a=i/36*Math.PI*2;flameDummy.position.set(Math.cos(a)*1.68,.15,Math.sin(a)*1.68);flameDummy.updateMatrix();flames.setMatrixAt(i,flameDummy.matrix);}
 for(const x of [-.65,.65]){const knob=cylinder(.16,.16,.15,black,x,-.02,2.1,24);knob.rotation.x=Math.PI/3;}
 const oilUniform={time:{value:0},activity:{value:0},drop:{value:0},rippleCenter:{value:new T.Vector2(0,0)}};
 const oilMat=new T.MeshPhysicalMaterial({color:'#fff0bd',metalness:0,roughness:.075,transmission:.76,thickness:.48,ior:1.465,attenuationColor:'#d99b25',attenuationDistance:1.1,clearcoat:1,clearcoatRoughness:.10,side:T.DoubleSide});
 oilMat.onBeforeCompile=s=>{Object.assign(s.uniforms,oilUniform);s.vertexShader='uniform float time;uniform float activity;uniform float drop;uniform vec2 rippleCenter;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float rad=length(position.xz-rippleCenter);float wave=sin(position.x*9.+time*1.5)*cos(position.z*8.-time*1.3)+.45*sin(position.x*17.+position.z*11.+time*2.8);
 transformed.y+=wave*(.008+activity*.012)+sin(rad*18.-time*7.)*drop*.055*exp(-rad*.5);`);
 s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 objectNormal.x+=cos(position.x*9.+time*1.5)*cos(position.z*8.-time*1.3)*(.06+activity*.12);
 objectNormal.z-=sin(position.x*9.+time*1.5)*sin(position.z*8.-time*1.3)*(.06+activity*.12);`);};
 const oilGeo=new T.CircleGeometry(1.865,100);oilGeo.rotateX(-Math.PI/2);
 // Subdivide oil disk radially for actual displaced ripples.
 const pos=[],ind=[];for(let ri=0;ri<=40;ri++)for(let j=0;j<=100;j++){let a=j/100*Math.PI*2,r=ri/40*1.865;pos.push(Math.cos(a)*r,0,Math.sin(a)*r);}for(let ri=0;ri<40;ri++)for(let j=0;j<100;j++){let a=ri*101+j,b=a+101;ind.push(a,a+1,b,b,a+1,b+1);}const og=new T.BufferGeometry();og.setAttribute('position',new T.Float32BufferAttribute(pos,3));og.setIndex(ind);og.computeVertexNormals();const oil=add(og,oilMat,0,.80,0);oil.receiveShadow=true;oil.castShadow=false;
 const panGroup=new T.Group();for(const child of scene.children.slice(panStart))panGroup.add(child);scene.add(panGroup);
 const leftStart=scene.children.length;
 // Preparation board, flour / egg / crumbs bowls.
 box(3.2,.17,3.4,wood,-3.8,-.18,.2);
 for(let i=0;i<3;i++){const x=-5+i*.95,z=-1.2;cylinder(.40,.31,.20,white,x,.04,z,40);cylinder(.34,.32,.04,mat(['#ebe6d4','#e0a931','#d8bb82'][i],i===1?.24:.95),x,.155,z,40);const rr=add(new T.TorusGeometry(.37,.03,8,40),white,x,.16,z);rr.rotation.x=Math.PI/2;}
 const leftStation=new T.Group();for(const child of scene.children.slice(leftStart))leftStation.add(child);scene.add(leftStation);const rightStart=scene.children.length;
 const rackStart=scene.children.length;
 // Wire draining rack.
 box(3.0,.10,2.05,steel,3.5,-.13,-1.20);const rim=mat('#c6cdc6',.24,.8);
 for(let i=0;i<13;i++)box(2.78,.024,.018,rim,3.5,.035,-2.1+i*.15);for(let i=0;i<5;i++)box(.025,.05,1.8,rim,2.3+i*.60,.015,-1.2);
 for(const x of [2.03,4.97])box(.04,.14,2.02,rim,x,-.02,-1.2);for(const z of [-2.2,-.2])box(3,.14,.04,rim,3.5,-.02,z);
 const rack=new T.Group();for(const child of scene.children.slice(rackStart))rack.add(child);scene.add(rack);
 // Ceramic plate, thin concentric glazed rim.
 const standardPlate=new T.Group();scene.add(standardPlate);const cafePlate=makeChurroPlate();cafePlate.position.set(3.5,-.16,1.65);cafePlate.visible=false;scene.add(cafePlate);const plateMat=mat('#eff1dd',.22);cylinder(1.62,1.48,.12,plateMat,3.5,-.16,1.65,72,standardPlate);for(const [r,h] of [[1.48,.025],[1.56,.045]]){const o=add(new T.TorusGeometry(r,h,10,80),plateMat,3.5,-.075,1.65,standardPlate);o.rotation.x=Math.PI/2;}
 // Lemon wedge and cabbage garnish.
 const garnish=new T.Group();scene.add(garnish);
 const lemon=add(new T.SphereGeometry(.27,22,16,0,Math.PI),mat('#edcc37',.55),4.55,.08,1.08,garnish);lemon.rotation.z=-.3;
 // Airy, layered julienne mound at the far rim; merged into three draw calls.
 const cabbageMats=[mat('#dde6ac',.88),mat('#b4c77d',.91),mat('#edf0c5',.85)];
 const cabbageStrands=[[],[],[]];
 for(let i=0;i<180;i++){
  const a=i*2.39996,r=Math.sqrt((i+.5)/180),x=3.94+Math.cos(a)*r*.42,z=.83+Math.sin(a)*r*.22;
  const peak=.16+.53*(1-r*r),dx=Math.cos(i*1.31),dz=Math.sin(i*1.31),len=.30+(i%5)*.045,curl=Math.sin(i*3.71)*.055;
  const curve=new T.CatmullRomCurve3([
   new T.Vector3(x-dx*len*.5,.055+peak*.35,z-dz*len*.5),
   new T.Vector3(x-dx*len*.25-dz*curl,peak*.78,z-dz*len*.25+dx*curl),
   new T.Vector3(x+dz*curl,peak,z-dx*curl),
   new T.Vector3(x+dx*len*.25+dz*curl,peak*.80,z+dz*len*.25-dx*curl),
   new T.Vector3(x+dx*len*.5,.06+peak*.30,z+dz*len*.5)
  ]);
  cabbageStrands[i%3].push(new T.TubeGeometry(curve,12,.012+(i%4)*.0015,4,false));
 }
 for(let c=0;c<3;c++){
  add(mergeGeometries(cabbageStrands[c]),cabbageMats[c],0,0,0,garnish);
  cabbageStrands[c].forEach(geometry=>geometry.dispose());
 }
 const rightStation=new T.Group();for(const child of scene.children.slice(rightStart))rightStation.add(child);scene.add(rightStation);
 // Tongs, animated toward the food on actions.
 const tongs=new T.Group();for(const side of [-1,1]){const arm=box(.09,.055,1.65,steel,side*.12,0,0,tongs);arm.rotation.y=side*.08;const tip=box(.23,.07,.36,steel,side*.23,0,-.86,tongs);tip.rotation.y=side*.12;}
 tongs.position.set(-2.45,.08,2.18);tongs.rotation.y=.8;scene.add(tongs);
 const spoon=new T.Group(),spoonMetal=steel.clone();spoonMetal.side=T.DoubleSide;const bowl=add(new T.SphereGeometry(.24,20,12,0,Math.PI*2,0,Math.PI/2),spoonMetal,0,0,0,spoon);bowl.scale.set(1,.35,1.35);bowl.rotation.x=Math.PI;box(.055,.05,1.12,steel,0,.025,.65,spoon);scene.add(spoon);spoon.visible=false;

 // Instanced bubble rings and convex highlights, always bounded to the pan.
 const bubbleCount=720,bubbleGeo=new T.SphereGeometry(1,10,7),bubbleMat=new T.MeshPhysicalMaterial({color:'#fff9dc',metalness:.12,roughness:.045,transparent:true,opacity:.65,clearcoat:1,depthWrite:false});
 bubbleMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float fresnel=pow(1.-abs(dot(normalize(normal),normalize(vViewPosition))),3.);diffuseColor.a*=.10+fresnel*.85;#include <opaque_fragment>`.replace(';#include',';\n#include'));};
 const bubbles=new T.InstancedMesh(bubbleGeo,bubbleMat,bubbleCount);bubbles.frustumCulled=false;scene.add(bubbles);
 const rings=new T.InstancedMesh(new T.TorusGeometry(1,.065,4,12),new T.MeshStandardMaterial({color:'#fff3ca',roughness:.12,metalness:.2,transparent:true,opacity:.50,depthWrite:false}),bubbleCount);rings.frustumCulled=false;scene.add(rings);
 const bSeeds=Array.from({length:bubbleCount},(_,i)=>({angle:i*2.39996,r:(Math.sin(i*99.17)*.5+.5),speed:.6+(i%11)/13,phase:(i*.617)%1}));
 const drops=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshPhysicalMaterial({color:'#f7d66e',metalness:.15,roughness:.08,transparent:true,opacity:.65,clearcoat:1,depthWrite:false}),24);drops.frustumCulled=false;scene.add(drops);
 const prepMaterial=new T.MeshStandardMaterial({color:'#f8eed7',roughness:.9});
 const prepParticles=new T.InstancedMesh(new T.IcosahedronGeometry(.014,0),prepMaterial,160);prepParticles.frustumCulled=false;prepParticles.count=0;scene.add(prepParticles);
 const brush=new T.Group();box(.09,.07,.55,wood,0,.04,.30,brush);box(.22,.06,.18,steel,0,.035,-.06,brush);
 for(let i=0;i<12;i++)box(.012,.045,.22,mat('#e9b94e',.4),(i-5.5)*.016,0,-.24,brush);brush.visible=false;scene.add(brush);
 const dummy=new T.Object3D();let food=makeFood('shrimp'),dropTime=-100,tongTime=-100,flipped=0,liftTime=-100,flipTime=-100,activitySmooth=0,lastStage='prep',motionStart=-100,motionFrom=new T.Vector3(),motionKind='',moveTime=-100,stirTime=-100,basteTime=-100,checkHeight=0;scene.add(food.group);
 food.group.position.set(0,.98,0);food.uniforms.prepLevel.value=3;
 let blastShot=null,blastShotDish=null;
 let views=[],selectedIndex=0,pickHandler=()=>{},downX=0,downY=0,selectionFoodHidden=false;
 const selectMarker=new T.Mesh(new T.RingGeometry(.15,.19,40),new T.MeshBasicMaterial({color:0xffdc77,side:T.DoubleSide,transparent:true,opacity:.85,depthTest:false}));selectMarker.rotation.x=-Math.PI/2;selectMarker.renderOrder=4;scene.add(selectMarker);
 let lastW=0,lastH=0,quality='high',yawDrag=false,lastX=0;
 let craftHandler=()=>false,craftPointer=null,activePointer=null,churroAtPan=false;
 function localPointer(e){const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const q=new T.Vector3();if(!ray.ray.intersectPlane((churroAtPan?new T.Plane(new T.Vector3(0,1,0),-.86):food.pointerPlane?.())||new T.Plane(new T.Vector3(0,1,0),-food.group.position.y-.08),q))return {x:99,z:99};if(churroAtPan)return {x:q.x,z:q.z};food.group.updateWorldMatrix(true,false);food.group.worldToLocal(q);return {x:q.x,z:q.z};}
 canvas.addEventListener('pointerdown',e=>{if(activePointer!==null)return;activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);e.preventDefault();if(craftHandler('down',localPointer(e))){craftPointer=e.pointerId;return;}if(churroAtPan)return;yawDrag=true;lastX=downX=e.clientX;downY=e.clientY;});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;if(craftPointer===e.pointerId){e.preventDefault();const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])craftHandler('move',localPointer(sample));return;}if(yawDrag){azimuth=Math.max(-.7,Math.min(.7,azimuth+(e.clientX-lastX)*.006));lastX=e.clientX;}});
 function finishPointer(e,cancel=false){if(e.pointerId!==activePointer)return;activePointer=null;if(craftPointer===e.pointerId){craftHandler(cancel?'cancel':'up',localPointer(e));craftPointer=null;yawDrag=false;return;}yawDrag=false;if(cancel||Math.hypot(e.clientX-downX,e.clientY-downY)>6||views.length<2)return;const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=ray.intersectObjects(views.map(v=>v.model.group),true);if(hits.length){let obj=hits[0].object;while(obj.parent&&!views.some(v=>v.model.group===obj))obj=obj.parent;const index=views.findIndex(v=>v.model.group===obj);if(index>=0)pickHandler(index);}}
 canvas.addEventListener('pointerup',e=>finishPointer(e));canvas.addEventListener('pointercancel',e=>finishPointer(e,true));
 function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);if(w!==lastW||h!==lastH){lastW=w;lastH=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
 function select(id,thickness=1,batch=null){
  selectionFoodHidden=false;
  if(blastShot){blastShot.width=blastShot.height=0;blastShot=null;}blastShotDish=null;
  activePointer=craftPointer=null;yawDrag=false;
  const oldModels=views.length?views.map(v=>v.model):[food];for(const f of oldModels){scene.remove(f.group);f.dispose();}
  const n=batch?.pieces.length||1;views=Array.from({length:n},(_,i)=>{const model=makeFood(id,thickness,n>1?i:null);scene.add(model.group);model.group.position.set(id==='churros'?0:-3.8,id==='churros'?.78:.35,id==='churros'?0:.45);return {model,index:i,lastStage:'prep',start:-100,from:model.group.position.clone(),flip:0,moveAt:-100};});
  food=views[0].model;selectedIndex=0;activitySmooth=0;liftTime=dropTime=flipTime=tongTime=moveTime=stirTime=basteTime=-100;
 }
 function syncBatch(batch){
  if(batch.pieces[0]?.id!=='churros')return;
  while(views.length<batch.pieces.length){const index=views.length,model=makeFood('churros');scene.add(model.group);model.group.position.set(0,.78,0);views.push({model,index,lastStage:'prep',start:-100,from:model.group.position.clone(),flip:0,moveAt:-100});}
 }
 function updatePiece(view,p,time,dt,menu=false){
  const m=view.model,stage=menu?'fry':p.stage,c=p.id==='churros'?{x:0,z:0,y:0}:views.length>1?foodParts(p.id)[view.index]:{x:0,z:0,y:0};
  const fy=p.id==='fries'?.845:['squid','onion'].includes(p.id)?.89:.95;
  const target=stage==='prep'?(p.id==='churros'?new T.Vector3(0,.78,0):new T.Vector3(-3.8+c.x,.35+(c.y||0),.45+c.z)):stage==='fry'?new T.Vector3(c.x,p.id==='churros'?.78:fy,c.z):stage==='drain'?new T.Vector3(3.5+c.x,.38,-1.2+c.z*.75):new T.Vector3(3.35+c.x,.40,1.75+c.z*.8);
  if(p.id==='churros'&&['drain','plate'].includes(stage))target.set(3.5+STATION_SHIFT,stage==='plate'?-.045:.18,stage==='plate'?1.65:-1.2);
  if(stage==='fry'&&p.id!=='churros'){target.x+=p.panX||0;target.z+=p.panZ||0;}
  const enteringFry=stage!==view.lastStage&&stage==='fry';if(stage!==view.lastStage){view.from.copy(m.group.position);view.fromScale=m.group.scale.x;view.start=time;view.lastStage=stage;}
  const u=T.MathUtils.clamp((time-view.start)/.9,0,1);m.group.position.lerpVectors(view.from,target,u*u*(3-2*u));m.group.position.y+=Math.sin(u*Math.PI)*(p.id==='churros'&&enteringFry?.22:1.0);
  if(p.id==='churros'&&(stage==='prep'||stage==='fry'))m.group.position.copy(target);
  view.flip+=(p.flips*Math.PI-view.flip)*(1-Math.exp(-dt*8));view.inspect=(view.inspect||0)+((p.checking?2.15:0)-(view.inspect||0))*(1-Math.exp(-dt*7));m.group.rotation.set(stage==='fry'||(p.id==='bread'&&['drain','plate'].includes(stage))?view.flip+view.inspect:0,stage==='plate'?-.08:0,0);
  if(stage==='fry'){
   if(p.id==='churros')m.group.position.y+=.08*(1-Math.cos(view.flip));
   m.group.position.y+=Math.sin(time*3+view.index)*.012+(p.checking?.78:0)+Math.sin(Math.min(1,Math.abs(p.flips*Math.PI-view.flip))*Math.PI)*.16;
   const moving=time-view.moveAt;if(moving<.85){m.group.position.x+=Math.sin(moving/.85*Math.PI)*.10;m.group.position.z+=Math.sin(moving/.85*Math.PI*2)*.055;}
   if(time-stirTime<1){m.group.position.x+=Math.sin((time-stirTime)*Math.PI*2+view.index)*.055;m.group.rotation.y+=Math.sin((time-stirTime)*Math.PI)*.17;}
  }
  if(stage==='prep'&&p.prepBusy){const k=1-p.prepBusy/1.35;m.group.position.y+=Math.sin(k*Math.PI)*.13;m.group.rotation.z=Math.sin(k*Math.PI*2)*.13;}
  m.update(menu?{...p,stage:'fry',coating:3,heat:[.95,1.1],core:1,damage:0,rupture:false}:p,dt);
  if(!menu){applyComedy(m.group,p,specialEvent,!!reducedMotion?.matches);if(p.id==='churros'){
    if(view.layoutRevision!==p.craft.revision){view.layoutRevision=p.craft.revision;view.bounds=pathBounds(p.craft.path);view.plateFit=servingFit(p.craft.path);view.rackFit=servingFit(p.craft.path,.85);}
    if(['drain','plate'].includes(stage)){
     const fit=stage==='plate'?view.plateFit:view.rackFit;
     // Recenter the original path by a rigid transform; uniform scale preserves shape/thickness ratios.
     const scale=(view.fromScale??1)+(fit.scale-(view.fromScale??1))*u*u*(3-2*u);m.group.scale.multiplyScalar(scale);
     const center=new T.Vector3(fit.x,0,fit.z).applyQuaternion(m.group.quaternion).multiplyScalar(scale);
     m.group.position.addScaledVector(center,-u*u*(3-2*u));
    }else if(stage==='prep'||stage==='fry'){
     if(p.craft.drawing){m.group.rotation.set(0,0,0);m.group.position.set(0,.78,0);}
     else if(!specialEvent||specialEvent.type!=='blast'){
      const margin=Math.max(0,OIL_RADIUS-(view.bounds?.doughRadius||DOUGH_RADIUS)-(view.bounds?.originRadius||0)-.015),r=Math.hypot(m.group.position.x,m.group.position.z);
      if(r>margin){m.group.position.x*=margin/r;m.group.position.z*=margin/r;}
      // Rotation is around the dough centre height, so flipping cannot push an edge out of the oil.
      m.group.position.z+=Math.sin(m.group.rotation.x)*.08;
     }
    }
   }}else{m.group.scale.setScalar(1);m.group.visible=true;}
  return target;
 }

 function animate(s,time,dt,menu=false,batch=null,event=null){specialEvent=event;
  resize();const widePan=!menu&&s.id==='churros',panScale=widePan?CHURRO_PAN_SCALE:1;scene.fog=widePan?null:kitchenFog;leftStation.position.x=widePan?-STATION_SHIFT:0;rightStation.position.x=widePan?STATION_SHIFT:0;panGroup.scale.set(panScale,1,panScale);panGroup.rotation.y=widePan?Math.PI/4:0;const gyoza=s.id==='gyoza';cafePlate.visible=!gyoza&&['churros','bread'].includes(s.id);standardPlate.visible=!gyoza&&!cafePlate.visible;garnish.visible=!gyoza&&!cafePlate.visible;churroAtPan=!menu&&s.id==='churros'&&['prep','fry'].includes(s.stage);if(batch&&s.id==='churros')syncBatch(batch);if(views.length&&batch){selectedIndex=batch.selected;food=views[selectedIndex].model;}const frying=!menu&&batch?batch.pieces.map((p,i)=>({p,i})).filter(x=>x.p.stage==='fry'&&!x.p.checking&&!x.p.exploded):[];const playing=(frying.length>0||(!batch&&s.stage==='fry'&&!s.checking&&!s.exploded))&&!s.paused;const quantity=frying.length||1,amount=.78+Math.sqrt(quantity)*.18;const burst=Math.exp(-Math.max(0,time-dropTime)*1.2);const fryAge=frying.length?frying.reduce((a,x)=>a+x.p.time,0)/frying.length:s.time;const activityTarget=playing?Math.max(.22,1-fryAge/(RECIPES[s.id].time*2.8))*(s.oil-110)/70*amount+burst*.65:menu?.65:0;activitySmooth+=(activityTarget-activitySmooth)*(1-Math.exp(-dt*(activityTarget>activitySmooth?9:1.65)));const activity=activitySmooth;
  oilUniform.time.value=time;oilUniform.activity.value=activity;oilUniform.drop.value=Math.max(Math.exp(-(time-dropTime)*1.8),Math.exp(-(time-flipTime)*2.4)*.65);
  const stage=menu?'fry':s.stage;
  let destination;
  if(views.length&&batch&&!menu){for(let i=0;i<views.length;i++){const p=batch.pieces[i];if(s.id==='churros'){const waiting=churroAtPan&&!s.craft.drawing&&!s.checking&&p.stage==='prep'&&!p.craft.path.length;p.craft.selected=i===batch.selected||waiting;const visible=i===batch.selected||p.stage==='fry'||waiting;views[i].model.group.visible=visible;if(!visible){views[i].model.sleep?.();continue;}}const d=updatePiece(views[i],p,time,dt);if(i===batch.selected)destination=d;}}
  else{if(!views.length)views=[{model:food,index:0,lastStage:'fry',start:-100,from:food.group.position.clone(),flip:0,moveAt:-100}];destination=updatePiece(views[selectedIndex]||views[0],s,time,dt,menu);}
  oilUniform.rippleCenter.value.set(food.group.position.x,food.group.position.z);
  const preparing=stage==='prep'&&s.prepBusy>0&&!s.paused,step=RECIPES[s.id].steps[s.prep-1],wet=step==='卵'||step==='衣液'||step==='下味';
  brush.visible=preparing&&wet;prepParticles.count=preparing?160:0;
  if(preparing){
   const progress=1-s.prepBusy/1.35,part=views.length>1?selectedIndex:0,anchor=views.length>1?foodParts(s.id)[part]:{x:0,y:0,z:0};
   prepMaterial.color.set(wet?step==='下味'?'#b77c3b':'#eeb330':step==='パン粉'?'#e5cb91':'#f7f1df');prepMaterial.roughness=wet?.22:.94;
   brush.position.copy(food.group.position).add(new T.Vector3(Math.sin(progress*Math.PI*3)*.28,.30,.10));brush.rotation.y=Math.sin(progress*Math.PI*2)*.5;
   food.group.updateMatrixWorld(true);
   for(let i=0;i<160;i++){const phase=(progress*1.6+i*.617)%1,q=surface(s.id,.04+((i*.311)%1)*.92,.02+((i*.173)%1)*.44,s.thickness,part);q.sub(new T.Vector3(anchor.x,anchor.y||0,anchor.z));q.applyMatrix4(food.group.matrixWorld);dummy.position.copy(q);dummy.position.y+=(1-phase)*.65;dummy.rotation.set(i*.31,progress*3+i,i*.17);dummy.scale.setScalar(wet?.65:step==='パン粉'?1.25:.55);dummy.updateMatrix();prepParticles.setMatrixAt(i,dummy.matrix);}prepParticles.instanceMatrix.needsUpdate=true;
  }
  const look=menu?new T.Vector3(0,.65,0):destination.clone();if(views.length>1){look.x=stage==='prep'?-3.8:stage==='fry'?0:3.5;look.z=stage==='prep'?.45:stage==='fry'?0:stage==='plate'?1.75:-1.2;}look.y=stage==='fry'?.72:.3;if(churroAtPan)look.set(0,.83,0);const overview=stage==='prep'&&frying.length>0&&s.id!=='churros';if(overview)look.set(-1.6,.6,0);if(churroAtPan)focus.copy(look);else if(craftPointer===null)focus.lerp(look,1-Math.exp(-dt*3));
  const churroServing=!menu&&s.id==='churros'&&['drain','plate'].includes(stage);
  const viewFov=churroAtPan?35:39;if(camera.fov!==viewFov){camera.fov=viewFov;camera.updateProjectionMatrix();}
  const churroElevation=.995;
  const desiredWidth=churroAtPan?4*CHURRO_PAN_SCALE/.85:overview?8.1:stage==='fry'||(stage==='prep'&&s.id==='churros')?5.7:stage==='plate'?4.2:stage==='prep'?4.3:4.4;
  const desiredHeight=churroAtPan?4.3*CHURRO_PAN_SCALE+.3:stage==='fry'||(stage==='prep'&&s.id==='churros')?4.7:stage==='plate'?3.4:stage==='prep'?3.5:3.5;
  const fitDistance=Math.max(desiredWidth/camera.aspect,desiredHeight)/(2*Math.tan(T.MathUtils.degToRad(camera.fov*.5)));
  let distance=fitDistance;const angle=.08+azimuth;
  if(!menu)distance*=1+.65*(specialEvent?.type==='grow'&&specialEvent.p===s?growthProgress(specialEvent.age):s.giant?1:0);
  if(churroAtPan)camera.position.set(focus.x,focus.y+distance*churroElevation,focus.z+distance*Math.sqrt(1-churroElevation*churroElevation));else if(churroServing)camera.position.set(focus.x,focus.y+distance*.97,focus.z+distance*.243);else camera.position.set(focus.x+Math.sin(angle)*distance*.30,focus.y+distance*.80,focus.z+Math.cos(angle)*distance*.60);camera.lookAt(focus);
  flames.visible=stage==='fry'||frying.length>0;flameMat.opacity=.40+.13*Math.sin(time*17);
  for(let i=0;i<bubbleCount;i++){
   const b=bSeeds[i],cycle=(time*b.speed+b.phase)%1;
   const active=frying.length?frying[i%frying.length]:null;const part=active?.i??i%food.parts.length;const emitter=s.id==='churros'&&active?views[part].model:food;const edge=s.id==='churros'&&active?emitter.sampleOil(.06+b.r*.88,i%2===0?0:.5):emitter.sample?emitter.sample(.06+b.r*.88,i%2===0?0:.5):surface(food.id,.06+b.r*.88,i%2===0?0:.5,s.thickness,part);if(active&&views.length===1){edge.applyEuler(food.group.rotation);edge.add(food.group.position);}if(active&&views.length>1){const anchor=s.id==='churros'?{x:0,z:0}:foodParts(food.id)[part];edge.sub(new T.Vector3(anchor.x,anchor.y||0,anchor.z));edge.applyEuler(views[part].model.group.rotation);edge.add(views[part].model.group.position);}
   const outward=i%2===0?1:-1;
   const jitter=Math.sin(time*(3+b.speed)+b.angle)*.025;
   const spread=.015+((i*1.317)%1)*.27;
   let x=edge.x+(active?0:stage==='fry'?food.group.position.x:0)+Math.sin(b.angle+time*.3)*spread*.7+jitter,z=edge.z+(active?0:stage==='fry'?food.group.position.z:0)+outward*spread+jitter;if(i%7===0){const radius=.55+b.r*1.2;x=Math.cos(b.angle)*radius;z=Math.sin(b.angle)*radius;}
   const radial=Math.hypot(x,z);if(radial>1.77*panScale){x*=1.77*panScale/radial;z*=1.77*panScale/radial;}
   let size=(s.id==='onion'?.011+(i%8)*.004:s.id==='squid'?.009+(i%7)*.004:.013+(i%9)*.005)*Math.sin(cycle*Math.PI)*Math.min(1.25,activity);
   if(i>Math.min(bubbleCount,210+activity*(s.id==='fries'?440:380)))size=0;
   let y=.81+cycle*.025;
   if(i%19===0){y+=Math.sin(cycle*Math.PI)*.30*Math.min(1.2,activity);size*=.6;}
   dummy.rotation.set(0,0,0);dummy.position.set(x,y,z);dummy.scale.set(size,size*.75,size);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);
   dummy.rotation.x=-Math.PI/2;dummy.position.y=.815;dummy.scale.set(size*1.1,size*1.1,size*.65);dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);
  }bubbles.instanceMatrix.needsUpdate=true;rings.instanceMatrix.needsUpdate=true;
  const pouring=stage==='fry'&&time-basteTime<1.1;
  spoon.visible=pouring;if(pouring){spoon.position.copy(food.group.position).add(new T.Vector3(.35,.70,.1));spoon.rotation.z=-.45-Math.sin((time-basteTime)*Math.PI)*.35;}
  for(let i=0;i<24;i++){
   const age=time-liftTime,life=(time*1.7+i*.137)%1,show=pouring||(age>=0&&age<3.4&&stage==='drain')||(s.checking&&stage==='fry');
   dummy.rotation.set(0,0,0);dummy.position.copy(food.group.position);
   dummy.position.x+=pouring?.35+Math.sin(i*2.399)*.12:Math.sin(i*2.399)*.73;
   dummy.position.z+=Math.cos(i*2.399)*(pouring?.10:.22);
   dummy.position.y+=pouring?.65-life*.65:-.2-life*life*.9;
   const scale=show&&dummy.position.y>.07?.012+(i%4)*.003:0;dummy.scale.set(scale,scale*(1+life*2),scale);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
  }drops.instanceMatrix.needsUpdate=true;
  selectMarker.visible=!menu&&views.length>1&&!s.exploded;selectMarker.position.copy(food.group.position);selectMarker.position.y+=s.id==='fries'?.14:.38;
  const t=Math.max(0,1-(time-tongTime)/.7);const rest=new T.Vector3(-2.45,.08,2.18);const grab=food.group.position.clone().add(new T.Vector3(.0,.15,.86));const grip=s.checking&&stage==='fry'?1:Math.sin(t*Math.PI);tongs.position.copy(rest).lerp(grab,grip);tongs.rotation.y=.8-grip*.8;for(let i=0;i<tongs.children.length;i++){const child=tongs.children[i];const side=i<2?-1:1;child.position.x=side*(i%2===0?.12:.23)*(1-.35*grip);}
  if(menu&&selectionFoodHidden)for(const view of views)view.model.group.visible=false;
  const eventView=event&&batch?views[batch.pieces.indexOf(event.p)]:null;sparkles.update(menu?null:event,eventView?.model.group.position,quality==='low');
  blast.update(menu?null:event,blastOrigin,false,camera,!!reducedMotion?.matches);
  renderer.render(scene,camera);
  // Capture one real frame while this round's existing smoke is active. Never replay it.
  if(!menu&&event?.type==='blast'&&event.p.exploded&&event.age>=.82&&blastShotDish!==event.p){
   blastShotDish=event.p;
   try{const shotCamera=camera.clone();shotCamera.aspect=1080/760;shotCamera.updateProjectionMatrix();blastShot=captureRender(renderer,scene,shotCamera);}catch(error){console.warn('爆発画像を取得できませんでした',error);}
  }
 }
 function captureResult(selected,batch){
  if(selected.exploded){if(blastShotDish!==selected||!blastShot)throw new Error('今回の爆発画像を取得できませんでした。投稿文で共有できます。');return blastShot;}
  const composition=shareComposition({views,batch,selected,standardPlate,cafePlate,garnish,rack,counter,environment:scene.environment,environmentIntensity:scene.environmentIntensity});
  try{return captureRender(renderer,composition.scene,composition.camera);}finally{composition.dispose();}
 }
 function thumbnails(){
  const out={};const rs=new T.Scene();rs.background=new T.Color('#f7f5ee');rs.environment=scene.environment;rs.add(new T.HemisphereLight(0xffffff,0xa48b63,3));const light=new T.DirectionalLight(0xffffff,4);light.position.set(-3,5,4);rs.add(light);
  const cam=new T.PerspectiveCamera(36,1.2,.1,20);cam.position.set(1.8,2.6,4.4);cam.lookAt(0,0,0);
  const rt=new T.WebGLRenderTarget(240,200);rt.texture.colorSpace=T.SRGBColorSpace;const old=renderer.getRenderTarget();renderer.setRenderTarget(rt);
  for(const id of Object.keys(RECIPES)){const f=makeFood(id);f.update({id,side:0,flips:0,stage:'plate',coating:3,heat:[.95,.95],core:1,damage:0,rupture:false});rs.add(f.group);renderer.render(rs,cam);const bytes=new Uint8Array(240*200*4);renderer.readRenderTargetPixels(rt,0,0,240,200,bytes);const c=document.createElement('canvas');c.width=240;c.height=200;const ctx=c.getContext('2d'),data=ctx.createImageData(240,200);for(let y=0;y<200;y++)data.data.set(bytes.subarray(y*240*4,(y+1)*240*4),(199-y)*240*4);ctx.putImageData(data,0,0);out[id]=c.toDataURL('image/png');rs.remove(f.group);f.dispose();}
  renderer.setRenderTarget(old);rt.dispose();return out;
 }
 return {animate,select,syncBatch,captureResult,hideForSelection(){selectionFoodHidden=true;for(const view of views)view.model.group.visible=false;},setCraftHandler(fn){craftHandler=fn;},thumbnails,setPickHandler(fn){pickHandler=fn;},choose(i){selectedIndex=i;food=views[i].model;},signal(type,time,state){if(type==='move'&&views[selectedIndex])views[selectedIndex].moveAt=time;if(type==='move')moveTime=time;if(type==='stir')stirTime=time;if(type==='baste')basteTime=time;if(type==='drop')dropTime=time;if(type==='lift')liftTime=time;if(type==='flip')flipTime=time;if(['drop','flip','lift','move','stir','check'].includes(type))tongTime=time;},resetView(){azimuth=.05;},quality(q){quality=q;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:1.6));renderer.shadowMap.enabled=q!=='low';oilMat.transmission=q==='low'?.55:.82;lastW=0;},renderer,scene,camera};
}
