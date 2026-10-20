import {FOOD_RAMP as R} from './cooking-look.js';
import * as T from 'three';
import {foodMaps} from './food-assets.js';
const noiseGLSL=`float fnHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float fnNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(fnHash(i),fnHash(i+vec3(1,0,0)),f.x),mix(fnHash(i+vec3(0,1,0)),fnHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(fnHash(i+vec3(0,0,1)),fnHash(i+vec3(1,0,1)),f.x),mix(fnHash(i+vec3(0,1,1)),fnHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 foodLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}`;
export function foodMaterial(id,uniforms,crumb=false){
 const wet=['squid','onion'].includes(id)&&!crumb;
 const mat=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.55,metalness:0,clearcoat:crumb?.04:.10,clearcoatRoughness:.34,transmission:wet?.001:0,thickness:id==='onion'?.035:.12,ior:1.36,side:T.DoubleSide});
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms,foodMaps[id]);
  shader.vertexShader=`varying vec3 vFood;varying vec2 foodUV;varying float foodRegion;attribute float region;\n`+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vFood=position;foodUV=uv;foodRegion=region;
   #ifdef USE_INSTANCING
    vFood=(instanceMatrix*vec4(position,1.)).xyz;
   #endif`);
  shader.fragmentShader=`varying vec3 vFood;varying vec2 foodUV;varying float foodRegion;
   uniform float prepLevel;uniform float heatA;uniform float heatB;uniform float damage;uniform float oiliness;
   uniform sampler2D rawMap;uniform sampler2D reliefMap;uniform sampler2D surfaceMap;
   ${noiseGLSL}\n`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 raw=foodLinear(texture2D(rawMap,foodUV).rgb);
   ${id==='chicken'?'raw=mix(raw,foodLinear(vec3(.94,.75,.56)),foodRegion*.78);':''}
   ${id==='onion'?'raw*=1.-foodRegion*.10;if(foodRegion>.05&&fnNoise(vFood*55.)<clamp((prepLevel-1.5)/1.2,0.,1.))discard;':''}
   float variation=fnNoise(vFood*vec3(19.,25.,17.));float broad=fnNoise(vFood*5.);
   float coverage=clamp(fnNoise(vFood*11.)*.55+(vFood.x+1.6)*.14,.05,.95);
   float flourCover=smoothstep(coverage*.7,coverage*.7+.30,prepLevel);
   float eggCover=smoothstep(1.+coverage*.6,1.35+coverage*.6,prepLevel);
   float crumbCover=smoothstep(2.+coverage*.55,2.4+coverage*.55,prepLevel);
   vec3 flour=foodLinear(vec3(.88,.84,.72)),egg=foodLinear(vec3(.87,.62,.19));
   vec3 coating=foodLinear(mix(vec3(.76,.61,.38),vec3(.95,.86,.64),variation));
   vec3 base=mix(raw,flour,flourCover*.62);base=mix(base,mix(raw,egg,.60),eggCover);base=mix(base,coating,crumbCover*.96);
   ${id==='chicken'?`base=mix(raw,raw*foodLinear(vec3(.92,.76,.61)),clamp(prepLevel/1.5,0.,1.)*.65);float starch=clamp((prepLevel-1.5)/1.5,0.,1.)*smoothstep(.22,.80,variation);base=mix(base,flour,starch*.84);`:''}
   ${id==='onion'?`base=mix(raw,flour,flourCover*.38);base=mix(base,foodLinear(vec3(.91,.78,.47)),clamp((prepLevel-1.5)/1.5,0.,1.)*.86);`:''}
   ${['fries','bread'].includes(id)?'base=raw;':''}
   ${id==='bread'?'base=mix(raw,foodLinear(vec3(.94,.86,.68)),.65);base*=.97+.06*variation;':''}
   ${crumb?'base=coating;':''}
   float heat=mix(heatA,heatB,smoothstep(-.10,.10,vFood.y))*(.78+variation*.28+broad*.18);
   ${id==='fries'?'heat*=1.+smoothstep(.035,.07,abs(vFood.y))*.15;':''}
   vec3 gold=foodLinear(mix(vec3(.78,.46,.13),vec3(.99,.76,.32),variation*.7+broad*.3));
   ${id==='chicken'?'gold=foodLinear(mix(vec3(.65,.34,.09),vec3(.94,.64,.24),variation));':''}
   base=mix(base,gold,smoothstep(${R.goldStart},${R.goldFull},heat));base=mix(base,foodLinear(mix(vec3(.23,.085,.022),vec3(.47,.22,.065),variation)),smoothstep(${R.brownStart},${R.brownFull},heat));base=mix(base,foodLinear(vec3(.045,.03,.018)),smoothstep(${R.blackStart},${R.blackFull},heat));
   diffuseColor.rgb*=base;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float wetness=clamp(prepLevel-1.,0.,1.)*(1.-clamp(prepLevel-2.,0.,1.));
   float surfaceRough=texture2D(surfaceMap,foodUV).r;
   roughnessFactor=clamp(mix(surfaceRough,.86,clamp(prepLevel,0.,1.))-.56*wetness-oiliness*.10+min(heatA,heatB)*.04,.20,.92);
   ${['fries','bread'].includes(id)?'roughnessFactor=clamp(surfaceRough-oiliness*.08+min(heatA,heatB)*.06,.24,.92);':''}
   ${crumb?'roughnessFactor=clamp(.78-oiliness*.12,.55,.90);':''}`);
  if(!crumb)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 dp1=dFdx(-vViewPosition),dp2=dFdy(-vViewPosition);vec2 duv1=dFdx(foodUV),duv2=dFdy(foodUV);
   vec3 dp2perp=cross(dp2,normal),dp1perp=cross(normal,dp1);
   vec3 tangent=dp2perp*duv1.x+dp1perp*duv2.x,bitangent=dp2perp*duv1.y+dp1perp*duv2.y;
   float invmax=inversesqrt(max(max(dot(tangent,tangent),dot(bitangent,bitangent)),.00000001));
   vec3 mapN=texture2D(reliefMap,foodUV).xyz*2.-1.;mapN.xy*=${id==='bread'?'.82':'mix(.55,.16,clamp(prepLevel/3.,0.,1.))'};
   normal=normalize(tangent*invmax*mapN.x+bitangent*invmax*mapN.y+normal*mapN.z);`);
 };
 mat.customProgramCacheKey=()=>id+(crumb?'-crumb-asset8':'-body-asset8');
 return mat;
}
