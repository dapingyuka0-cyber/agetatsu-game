import * as T from 'three';
// Rebuilt bread crumb: broad torn fragment with uneven peaks, not a long spike.
export function newCoatingGeometry(id){
 const p=[],indices=[],N=id==='onion'?10:8;
 for(let ring=0;ring<3;ring++)for(let j=0;j<N;j++){
  const a=j/N*Math.PI*2,r=ring===1?1: ring===0?.62:.34;
  const width=id==='chicken'?.74:1;
  p.push(Math.cos(a)*r*(1+.13*Math.sin(j*2.7)),ring===0?0:ring===1?.12+.06*Math.sin(j*2.1):id==='onion'?.48:id==='chicken'?.30:.42,Math.sin(a)*r*width);
 }
 for(let ring=0;ring<2;ring++)for(let j=0;j<N;j++){const a=ring*N+j,b=ring*N+(j+1)%N;indices.push(a,b,a+N,b,b+N,a+N);}
 for(let j=1;j<N-1;j++){indices.push(0,j+1,j);indices.push(2*N,2*N+j,2*N+j+1);}
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function makeShrimpTail(){
 const group=new T.Group();group.position.set(1.17,.015,-.14);
 const mat=new T.MeshPhysicalMaterial({color:'#d94b28',roughness:.31,transmission:.12,thickness:.018,ior:1.36,clearcoat:.22,side:T.DoubleSide});
 // Authored curved outlines of paired uropods and a central telson.
 const outlines=[[[0,0],[.15,-.025],[.43,-.19],[.62,-.26],[.60,-.38],[.39,-.33],[.12,-.09]],[[0,0],[.22,.04],[.49,.17],[.68,.29],[.55,.38],[.29,.25],[.08,.08]],[[0,0],[.16,-.06],[.45,-.07],[.70,-.025],[.73,.015],[.47,.065],[.14,.065]]];
 const rib=new T.MeshStandardMaterial({color:'#ed9b60',roughness:.42});
 for(const outline of outlines){
  const curve=new T.CatmullRomCurve3(outline.map(([x,z])=>new T.Vector3(x,.045*Math.sin(x*4),z)),true,'centripetal');
  const edge=curve.getPoints(56),center=edge.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/edge.length);const pos=[...center.toArray()],idx=[];
  edge.forEach(q=>pos.push(...q.toArray()));for(let i=1;i<edge.length;i++)idx.push(0,i,i+1);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.castShadow=true;group.add(m);
  for(const t of [.22,.36,.5,.64,.78]){const end=curve.getPoint(t),c=new T.QuadraticBezierCurve3(new T.Vector3(.025,.009,0),center.clone().multiplyScalar(.7).add(new T.Vector3(0,.012,0)),end);group.add(new T.Mesh(new T.TubeGeometry(c,12,.002,3,false),rib));}
 }
 return group;
}
