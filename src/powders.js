import * as T from 'three';
export const POWDERS={sugar:{name:'砂糖',color:'#fff9e8',size:.010},cocoa:{name:'ココア',color:'#542d18',size:.0065},kinako:{name:'きな粉',color:'#d5ae63',size:.007},matcha:{name:'抹茶',color:'#71833a',size:.0065}};
// Fixed GPU budgets; repeated pours reuse particles and deepen the deposited coating.
export function makePowders(surface){
 const group=new T.Group(),layers={},dummy=new T.Object3D();let seed=61821;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(const [id,p] of Object.entries(POWDERS)){
  const mesh=new T.InstancedMesh(new T.IcosahedronGeometry(p.size,0),new T.MeshStandardMaterial({color:p.color,roughness:id==='sugar'?.70:.96}),5200);
  mesh.frustumCulled=false;mesh.count=0;const sites=[];
  for(let i=0;i<5200;i++){const u=.01+rand()*.98,v=.002+rand()*.496,point=surface(u,v);point.y+=p.size*.7;sites.push(point);dummy.position.copy(point);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(.6+rand()*.9,.45+rand()*.6,.6+rand()*.9);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  const dust=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial());
  // Conformal powder film fills gaps between fine grains; geometric samples follow the bread.
  const positions=[],indices=[],U=64,V=32;
  for(let u=0;u<=U;u++)for(let v=0;v<=V;v++){const q=surface(.005+u/U*.99,.001+v/V*.498);q.y+=.004+Object.keys(layers).length*.001;positions.push(q.x,q.y,q.z);}
  for(let u=0;u<U;u++)for(let v=0;v<V;v++){const a=u*(V+1)+v,b=a+V+1;indices.push(a,b,a+1,b,b+1,a+1);}
  dust.geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));dust.geometry.setIndex(indices);dust.geometry.computeVertexNormals();dust.material.dispose();
  const coverage={value:0};dust.material=new T.MeshStandardMaterial({color:p.color,roughness:.98,side:T.DoubleSide});
  dust.material.onBeforeCompile=s=>{s.uniforms.powderCover=coverage;s.vertexShader='varying vec3 powderPos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npowderPos=position;');s.fragmentShader='varying vec3 powderPos;uniform float powderCover;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grainDust=fract(sin(dot(floor(powderPos.xz*310.),vec2(12.9898,78.233))+${(Object.keys(layers).length*19.73).toFixed(2)})*43758.5453);if(grainDust>powderCover)discard;diffuseColor.rgb*=.88+grainDust*.20;`);};
  dust.material.customProgramCacheKey=()=>`powder-${id}`;
  dust.visible=false;group.add(dust);
  const falling=new T.InstancedMesh(mesh.geometry,mesh.material,220);falling.frustumCulled=false;falling.count=0;group.add(falling);
  const spills=new T.InstancedMesh(mesh.geometry,mesh.material,1000);spills.frustumCulled=false;spills.count=0;group.add(spills);
  for(let i=0;i<1000;i++){const a=rand()*Math.PI*2,r=.58+rand()*.70;dummy.position.set(Math.cos(a)*r,-.39+rand()*.005,Math.sin(a)*r*.8);dummy.scale.setScalar(.7+rand());dummy.updateMatrix();spills.setMatrixAt(i,dummy.matrix);}spills.instanceMatrix.needsUpdate=true;
  layers[id]={mesh,dust,coverage,falling,spills,sites,seen:0,shown:0,pulse:0};
 }
 function update(s,dt){
  for(const [id,l] of Object.entries(layers)){
   const amount=s.toppings?.[id]||(id==='sugar'?s.sugar||0:0);
   if(s.snapshot){l.seen=amount;l.shown=amount;l.pulse=0;}
   if(amount>l.seen){l.pulse=1.1;l.seen=amount;}l.pulse=Math.max(0,l.pulse-dt);
   l.shown+=(amount-l.shown)*(1-Math.exp(-dt*4));
   const density=1-Math.exp(-l.shown*.48);l.mesh.count=Math.floor(5200*density);l.dust.visible=l.shown>.02;l.coverage.value=Math.min(.93,density*(id==='sugar'?.62:.94));l.spills.count=Math.floor(1000*(1-Math.exp(-l.shown*.20)));
   l.falling.count=l.pulse>0?220:0;
   for(let i=0;i<l.falling.count;i++){const phase=((1.1-l.pulse)*1.6+i*.618)%1,target=l.sites[(i*23+Math.floor(amount)*17)%l.sites.length];dummy.position.copy(target);dummy.position.y+=(1-phase)*1.15;dummy.position.x+=Math.sin(i*7)*(1-phase)*.07;
    if(i%4===0){dummy.position.z+=.60;dummy.position.y=.9-phase*1.33;}dummy.scale.setScalar(id==='sugar'?1.1:.85);dummy.updateMatrix();l.falling.setMatrixAt(i,dummy.matrix);}l.falling.instanceMatrix.needsUpdate=true;
  }
 }
 return {group,layers,update};
}
