import * as T from 'three';
// A small static ceramic dish; no textures, animation or extra render passes.
export function makeChurroPlate(){
 const group=new T.Group(),cream=new T.MeshStandardMaterial({color:0xffefd5,roughness:.30}),mint=new T.MeshStandardMaterial({color:0xb8d8ca,roughness:.28}),pink=new T.MeshStandardMaterial({color:0xe8b9bd,roughness:.30});
 const base=new T.Mesh(new T.CylinderGeometry(1.69,1.52,.10,64),cream);base.receiveShadow=true;group.add(base);
 for(const [r,t,y,m] of [[1.61,.065,.065,mint],[1.47,.018,.061,pink]]){const ring=new T.Mesh(new T.TorusGeometry(r,t,8,64),m);ring.rotation.x=-Math.PI/2;ring.position.y=y;group.add(ring);}
 const dots=new T.InstancedMesh(new T.CircleGeometry(.026,8),pink,24),dummy=new T.Object3D();
 for(let i=0;i<24;i++){const a=i*Math.PI/12;dummy.position.set(Math.cos(a)*1.54,.056,Math.sin(a)*1.54);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();dots.setMatrixAt(i,dummy.matrix);}group.add(dots);
 return group;
}
export function disposeChurroPlate(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
