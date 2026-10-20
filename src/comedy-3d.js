import * as T from 'three';
import {BLAST_WINDUP,BLAST_DURATION,growthProgress,GROW_WINDUP} from './comedy.js';
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// The dish is swallowed by the cloud, never replaced by persistent char fragments.
export function applyComedy(group,s,event,reduced=false){
 const e=event?.p===s?event:null,t=e?.age||0;
 if(!s.exploded)group.visible=true;
 let size=s.giant?3:1;if(e?.type==='grow')size=1+2*growthProgress(t);
 if(e?.type==='grow'&&t<GROW_WINDUP&&!reduced){const shake=(1-t/GROW_WINDUP)*.028;group.position.x+=Math.sin(t*43)*shake;group.rotation.z+=Math.sin(t*36)*shake;}
 const windup=e?.windup??BLAST_WINDUP;
 if(e?.type==='blast'&&t<windup&&!reduced){const tension=smooth(0,Math.min(1,windup),t);size*=1+.18*smooth(.15,windup,t);group.position.x+=Math.sin(t*76)*.035*tension;group.position.z+=Math.sin(t*63)*.018*tension;group.rotation.z+=Math.sin(t*67)*.055*tension;}
 if(s.exploded){const swallow=e?.type==='blast'?smooth(.025,.22,t-windup):1;size*=1.18*(1-swallow);group.visible=swallow<1;}
 group.scale.setScalar(size);
 if(e?.type==='dance'){const fade=Math.sin(Math.PI*t/3);group.position.y+=Math.abs(Math.sin(t*9))*.28*fade;group.rotation.z+=Math.sin(t*12)*.23*fade;group.rotation.y+=Math.PI*2*t/3;}
}
export function makeSparkles(){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.08,0,0,.08,0,0,0,-.08,0,0,.08,0,0,0,-.08,0,0,.08],3));const material=new T.LineBasicMaterial({color:0xffd45c,transparent:true,opacity:0});const group=new T.Group();group.visible=false;for(let i=0;i<10;i++)group.add(new T.LineSegments(g,material));
 return {group,update(event,anchor,low=false){const active=event?.type==='spark'&&anchor;group.visible=Boolean(active);if(!active)return;const t=event.age;group.position.copy(anchor);material.opacity=Math.sin(Math.PI*t/1.6);group.children.forEach((o,i)=>{o.visible=i<(low?4:event.score>=90?10:6);const a=i*2.4;o.position.set(Math.cos(a)*(.7+t*.1),.35+Math.sin(a*2)*.25+t*.15,Math.sin(a)*.65);o.rotation.set(t,t*2,a);});}};
}

// A tiny shaded-density atlas, generated once. Soft zero-alpha margins prevent
// visible cards/polygon edges; rounded lobes and self-shading give each puff depth.
let atlasPixels;
export function smokeAtlas(){
 const tile=128,width=tile*2;
 if(!atlasPixels){
  atlasPixels=new Uint8Array(width*width*4);
  const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=smooth(0,1,x-a),v=smooth(0,1,y-b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),u),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v);};
  for(let variant=0;variant<4;variant++){
   const lobes=[[0,0,.55]];
   for(let j=0;j<8;j++){const a=j*Math.PI/4+variant*.41,r=.35+.07*Math.sin(j*3+variant);lobes.push([Math.cos(a)*r,Math.sin(a)*r,.30+.09*hash(j,variant+1)]);}
   const density=(x,y)=>{let sum=0;for(const [cx,cy,r] of lobes)sum+=Math.exp(-2.8*((x-cx)**2+(y-cy)**2)/(r*r));return sum;};
   for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
    const px=(x+.5)/tile*2-1,py=(y+.5)/tile*2-1;
    const coarse=noise(px*5+variant*31,py*5+17),fine=noise(px*21+variant*47,py*21+23),d=density(px+(coarse-.5)*.07,py+(fine-.5)*.04);
    const alpha=smooth(.10,.44,d)*(.88+.12*fine)*(1-smooth(.80,.98,Math.hypot(px,py)));
    const nx=(density(px-.025,py)-density(px+.025,py))*4,ny=(density(px,py-.025)-density(px,py+.025))*4,nz=.7,inv=1/Math.hypot(nx,ny,nz);
    const shade=T.MathUtils.clamp(.49+(-nx*.45+ny*.6+nz*.65)*inv*.43+(coarse-.5)*.15+(fine-.5)*.045,.23,.95);
    const at=((y+Math.floor(variant/2)*tile)*width+x+(variant%2)*tile)*4;
    atlasPixels[at]=Math.round(shade*255);atlasPixels[at+1]=Math.round(fine*255);atlasPixels[at+2]=0;atlasPixels[at+3]=Math.round(alpha*255);
   }
  }
 }
 const texture=new T.DataTexture(atlasPixels,width,width,T.RGBAFormat);texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

export const SMOKE_VERTEX=`attribute vec2 puffData;
varying vec2 cloudUV;varying vec2 cloudTile;varying float cloudOpacity;
void main(){cloudUV=uv;cloudTile=vec2(mod(puffData.x,2.),floor(puffData.x/2.));cloudOpacity=puffData.y;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
export const SMOKE_FRAGMENT=`uniform sampler2D cloudMap;uniform float clock;
varying vec2 cloudUV;varying vec2 cloudTile;varying float cloudOpacity;
void main(){
 float edge=sin(cloudUV.x*3.14159)*sin(cloudUV.y*3.14159);
 float phase=clock*.85+cloudTile.x*2.1+cloudTile.y*3.4;
 vec2 flow=vec2(sin(cloudUV.y*12.+phase)+.4*sin(cloudUV.y*23.-phase*.7),cos(cloudUV.x*11.-phase)+.4*sin(cloudUV.x*21.+phase*.6))*.021*edge;
 vec2 uv=clamp(cloudUV+flow,vec2(.004),vec2(.996));
 vec4 tex=texture2D(cloudMap,(uv+cloudTile)*.5);
 float eddy=texture2D(cloudMap,(clamp(uv+vec2(.025*sin(phase),.025*cos(phase)),vec2(.004),vec2(.996))+cloudTile)*.5).g;
 float a=tex.a*cloudOpacity*(.86+.14*eddy);if(a<.004)discard;
 gl_FragColor=vec4(vec3(.235,.245,.25)*(.38+tex.r*.65+eddy*.10),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor.rgb=min(gl_FragColor.rgb,vec3(.67));}`;
export const WAVE_VERTEX=`varying vec2 waveUV;void main(){waveUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const WAVE_FRAGMENT=`uniform float opacity;varying vec2 waveUV;void main(){float r=length(waveUV*2.-1.);float rim=exp(-pow((r-.81)/.045,2.))+.28*exp(-pow((r-.66)/.07,2.));float a=rim*opacity;if(a<.003)discard;gl_FragColor=vec4(vec3(.24,.215,.19),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

// Three overlapping phases: fast ground surge, rolling billows, rising diffuse tail.
// One instanced smoke draw, one pressure ring. No physics, lights or postprocessing.
export function makeBlast(preloadedAtlas=null){
 const group=new T.Group();group.name='soft-smoke-blast';group.visible=false;
 const dummy=new T.Object3D(),spin=new T.Quaternion(),axis=new T.Vector3(0,0,1),direction=new T.Vector3(),relative=new T.Vector3();
 const particles=Array.from({length:48},(_,i)=>({i,position:new T.Vector3(),size:0,stretch:1,alpha:0,depth:0,angle:0}));
 const depthSort=(a,b)=>b.depth-a.depth;
 let smoke=null,wave=null,texture=null,previous=null;
 function release(){if(smoke){smoke.geometry.dispose();smoke.material.dispose();smoke.dispose();wave.geometry.dispose();wave.material.dispose();texture.dispose();group.clear();smoke=wave=texture=null;}previous=null;group.visible=false;}
 function allocate(){
  texture=preloadedAtlas?preloadedAtlas.clone():smokeAtlas();texture.needsUpdate=true;const geometry=new T.PlaneGeometry(1,1);geometry.setAttribute('puffData',new T.InstancedBufferAttribute(new Float32Array(96),2).setUsage(T.DynamicDrawUsage));
  const material=new T.ShaderMaterial({uniforms:{cloudMap:{value:texture},clock:{value:0}},vertexShader:SMOKE_VERTEX,fragmentShader:SMOKE_FRAGMENT,transparent:true,depthWrite:false,depthTest:false});
  smoke=new T.InstancedMesh(geometry,material,48);smoke.instanceMatrix.setUsage(T.DynamicDrawUsage);smoke.frustumCulled=false;smoke.renderOrder=5;
  wave=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:{opacity:{value:0}},vertexShader:WAVE_VERTEX,fragmentShader:WAVE_FRAGMENT,transparent:true,depthWrite:false,side:T.DoubleSide}));wave.rotation.x=-Math.PI/2;wave.renderOrder=4;
  group.add(wave,smoke);
 }
 return {group,dispose:release,update(event,anchor,_low=false,camera=null,reduced=false){
  const windup=event?.windup??BLAST_WINDUP,duration=event?.duration??BLAST_DURATION;
  const live=event?.type==='blast'&&event.age>=windup&&event.age<duration&&anchor;
  if(!live){release();return 0;}
  if(!smoke)allocate();group.visible=true;
  if(previous!==event){group.position.copy(anchor);previous=event;}
  const t=event.age-windup;
  wave.visible=t<.62;wave.scale.setScalar(.25+5.7*(1-Math.exp(-t*8)));wave.position.y=.025+t*.2;wave.material.uniforms.opacity.value=.30*smooth(0,.025,t)*(1-smooth(.12,.62,t));
  smoke.material.uniforms.clock.value=reduced?t*.35:t;
  if(camera)camera.getWorldDirection(direction);else direction.set(0,-.8,-.6);
  for(const p of particles){
   const i=p.i,band=i<16?0:i<36?1:2,j=band===0?i:band===1?i-16:i-36;
   const birth=band===0?(j%3)*.018:band===1?.18+(j%5)*.065:.95+(j%4)*.10;
   const age=Math.max(0,t-birth),life=band===0?2.6:band===1?3.4:3.3;
   const a=j*2.399963+band*.8,swirl=reduced?.35:1,grow=1-Math.exp(-age*(band===0?6.5:band===1?3.3:1.7));
   const roll=age*(.26+(j%3)*.07)*swirl;
   let r,y;
   if(band===0){r=(j<3?j*.16:2.3+(j%3)*.48)*grow;y=.12+(j%3)*.30*grow+age*.22;}
   else if(band===1){r=(.65+(j%4)*.54)*grow+.25*Math.sin(roll*2+a);y=.3+(j%3)*.38+age*(.53+(j%3)*.09);}
   else {r=1.1+(j%4)*.50+age*.12;y=.45+(j%3)*.55+age*.45;}
   p.position.set(Math.cos(a+roll)*r,y,Math.sin(a+roll)*r*.85);
   p.position.x+=Math.sin(age*1.4+a)*age*.16*swirl;p.position.z+=Math.cos(age*1.1+a)*age*.12*swirl;
   p.position.y+=Math.sin(age*1.8+a)*.13*grow*swirl;
   p.size=.08+(band===0?3.0+(j%4)*.2:band===1?2.1+(j%4)*.28:2.4+(j%3)*.4)*grow+age*(band===2?.28:.12);
   p.stretch=1.08+.13*Math.sin(age*1.25+a)*swirl+age*.04;
   p.angle=a*.4+Math.sin(a)*age*(band===0?.16:.31)*swirl;
   p.alpha=t<birth?0:(band===0?.95:band===1?.87:.59)*smooth(0,band===0?.085:.32,age)*(1-smooth(life*.52,life,age))*(1-smooth(3.45,duration-windup,t));
   relative.copy(p.position).add(group.position);p.depth=relative.dot(direction);
  }
  particles.sort(depthSort);let used=0;
  for(const p of particles){if(p.alpha<.004)continue;
   dummy.position.copy(p.position);if(camera)dummy.quaternion.copy(camera.quaternion);else dummy.rotation.set(-.927,0,0);
   spin.setFromAxisAngle(axis,p.angle);dummy.quaternion.multiply(spin);dummy.scale.set(p.size,p.size*p.stretch,1);dummy.updateMatrix();smoke.setMatrixAt(used,dummy.matrix);
   smoke.geometry.attributes.puffData.setXY(used,p.i%4,p.alpha);used++;
  }
  smoke.count=used;smoke.instanceMatrix.needsUpdate=true;smoke.geometry.attributes.puffData.needsUpdate=true;
  return 0; // screen recoil is pixel-based in blast-screen.js, never doubled here.
 }};
}
