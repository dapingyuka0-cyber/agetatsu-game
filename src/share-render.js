import * as T from 'three';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {servingFit} from './churro-layout.js';
import {foodParts} from './food.js';

// Reuse the actual visible meshes/materials. Only cloned Object3D transforms change;
// no regeneration, state update, RNG, animation, score or sound is run for sharing.
export function shareComposition({views,batch,selected,standardPlate,cafePlate,garnish,rack,counter,environment,environmentIntensity}){
 const id=selected.id,gyoza=id==='gyoza',sweet=['churros','bread'].includes(id);
 const scene=new T.Scene();scene.background=new T.Color('#d8b68b');scene.environment=environment;scene.environmentIntensity=environmentIntensity;
 const content=new T.Group(),foods=new T.Group();scene.add(content);content.add(foods);
 const vessel=(gyoza?rack:sweet?cafePlate:standardPlate).clone(true);vessel.visible=true;
 // Assets are kept in their authored kitchen coordinates, then recentered together.
 const anchor=gyoza?new T.Vector3(3.5,0,-1.2):new T.Vector3(3.5,0,1.65);
 vessel.position.sub(anchor);content.add(vessel);
 if(!gyoza&&!sweet){const decoration=garnish.clone(true);decoration.visible=true;decoration.position.sub(anchor);content.add(decoration);}
 for(let i=0;i<views.length;i++){
  const state=batch.pieces[i];if(state.exploded||state.stage!==(gyoza?'drain':'plate'))continue;
  const model=views[i].model.group.clone(true);model.visible=true;
  model.rotation.set(id==='bread'?state.flips*Math.PI:0,gyoza?0:-.08,0);model.scale.setScalar(state.giant?3:1);
  if(id==='churros'){
   const fit=servingFit(state.craft.path);model.scale.setScalar(fit.scale);
   const center=new T.Vector3(fit.x,0,fit.z).applyQuaternion(model.quaternion).multiplyScalar(fit.scale);
   model.position.set(-center.x,-.045,-center.z);
  }else{
   const c=views.length>1?foodParts(id)[i]:{x:0,z:0};
   model.position.set((gyoza?0:-.15)+c.x,gyoza?.38:.4,(gyoza?0:.1)+c.z*(gyoza?.75:.8));
  }
  foods.add(model);
 }
 if(!foods.children.length)throw new Error('完成した料理の描画を取得できませんでした。');
 if(counter){const table=counter.clone(true);table.position.sub(anchor);scene.add(table);}
 const sun=new T.DirectionalLight(0xffedca,2.7);sun.position.set(-4,9,-2);scene.add(sun,new T.HemisphereLight(0xf9f8e9,0x997558,.55));
 // A local contact shadow pass only during export; the live light/shadow map is untouched.
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.normalBias=.025;
 content.updateMatrixWorld(true);
 const bounds=visibleBounds(content);
 const camera=fitShareCamera(bounds,id==='churros',1080/760,content);
 return {scene,camera,content,foods,dispose(){sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});scene.clear();}};
}
export function visibleBounds(root){
 const bounds=new T.Box3();root.updateWorldMatrix(true,true);
 root.traverseVisible(o=>{if(!o.isMesh||o.isInstancedMesh&&o.count===0)return;
  if(o.isInstancedMesh){o.computeBoundingBox();bounds.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}
  else{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}
 });return bounds;
}
export function fitShareCamera(bounds,top,aspect,content=null){
 const center=bounds.getCenter(new T.Vector3()),camera=new T.OrthographicCamera(-1,1,1,-1,.1,80);
 camera.position.copy(center).add(top?new T.Vector3(0,12,.8):new T.Vector3(.5,8,8));camera.lookAt(center);camera.updateMatrixWorld(true);
 const projected=new T.Box3();for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 if(content){
  projected.makeEmpty();const p=new T.Vector3(),matrix=new T.Matrix4(),instance=new T.Matrix4();
  content.traverseVisible(o=>{if(!o.isMesh||o.isInstancedMesh&&o.count===0)return;
   const g=o.geometry,base=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);
   if(o.isInstancedMesh){if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);matrix.multiplyMatrices(base,instance);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])projected.expandByPoint(p.set(x,y,z).applyMatrix4(matrix));}}
   else for(let i=0;i<g.attributes.position.count;i++)projected.expandByPoint(p.fromBufferAttribute(g.attributes.position,i).applyMatrix4(base));
  });
 }
 const center2=projected.getCenter(new T.Vector3());
 const size=projected.getSize(new T.Vector3()),height=Math.max(size.y,size.x/aspect)*1.12;
 camera.left=center2.x-height*aspect/2;camera.right=center2.x+height*aspect/2;camera.top=center2.y+height/2;camera.bottom=center2.y-height/2;camera.updateProjectionMatrix();return camera;
}
// Render to a linear HDR buffer, then use Three's standard display transform once.
// Reading a plain render target directly would skip ACES/sRGB in Three r170.
export function captureRender(renderer,scene,camera,width=1080,height=760){
 if(renderer.getContext?.()?.isContextLost?.())throw new Error('3D描画が一時停止しています。一度閉じて、もう一度お試しください。');
 const oldTarget=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 const linear=new T.WebGLRenderTarget(width,height,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,samples:Math.min(4,renderer.capabilities.maxSamples||0)});
 const output=new T.WebGLRenderTarget(width,height,{depthBuffer:false}),pass=new OutputPass();
 try{
  renderer.setScissorTest(false);renderer.autoClear=true;renderer.setRenderTarget(linear);renderer.render(scene,camera);pass.render(renderer,output,linear);
  const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(output,0,0,width,height,pixels);
  let min=255,max=0,opaque=0;for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/256/4)*4)){const v=(pixels[i]+pixels[i+1]+pixels[i+2])/3;min=Math.min(min,v);max=Math.max(max,v);if(pixels[i+3]>100)opaque++;}if(!opaque||max-min<3)throw new Error('3D画像を取得できませんでした。一度閉じて、もう一度お試しください。');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('画像用キャンバスを開始できませんでした。');
  const data=ctx.createImageData(width,height);for(let y=0;y<height;y++)data.data.set(pixels.subarray(y*width*4,(y+1)*width*4),(height-y-1)*width*4);ctx.putImageData(data,0,0);return canvas;
 }finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;linear.dispose();output.dispose();pass.dispose();}
}
