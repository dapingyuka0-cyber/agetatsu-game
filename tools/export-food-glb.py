"""Export the newly baked raw bodies as editable glTF 2.0 / GLB assets.
Runtime uses the same mesh JSON for synchronous creation and cooking deformation.
"""
from pathlib import Path
import json,struct,numpy as np
ROOT=Path(__file__).resolve().parents[1];DIR=ROOT/'src/assets/foods';OUT=ROOT/'models';OUT.mkdir(exist_ok=True)
families=json.loads((DIR/'meshes.json').read_text())
for name,variants in families.items():
 m=variants[0];p=np.array(m['positions'],dtype='<f4');uv=np.array(m['uv'],dtype='<f4');faces=np.array(m['indices'],dtype='<u4').reshape(-1,3)
 normals=np.zeros_like(p);a=p[faces[:,1]]-p[faces[:,0]];b=p[faces[:,2]]-p[faces[:,0]];n=np.cross(a,b)
 for j in range(3):np.add.at(normals,faces[:,j],n)
 length=np.linalg.norm(normals,axis=1,keepdims=True);normals/=np.maximum(length,1e-10)
 binary=bytearray();views=[]
 def add(data,target=None):
  while len(binary)%4:binary.append(0)
  offset=len(binary);binary.extend(data);v={'buffer':0,'byteOffset':offset,'byteLength':len(data)}
  if target:v['target']=target
  views.append(v);return len(views)-1
 accessors=[]
 for data,typ,target in [(p,'VEC3',34962),(normals,'VEC3',34962),(uv,'VEC2',34962),(faces.ravel(),'SCALAR',34963)]:
  index=add(data.tobytes(),target);item={'bufferView':index,'componentType':5125 if typ=='SCALAR' else 5126,'count':len(data),'type':typ}
  if len(accessors)==0:item.update(min=p.min(axis=0).tolist(),max=p.max(axis=0).tolist())
  accessors.append(item)
 images=[]
 for suffix in ['base','normal','roughness']:images.append({'bufferView':add((DIR/f'{name}-{suffix}.png').read_bytes()),'mimeType':'image/png'})
 doc={'asset':{'version':'2.0','generator':'AgeMaster authored cage and PBR baker v0.8'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':name}],
 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0}]}],
 'materials':[{'name':name+' raw','doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicRoughnessTexture':{'index':2},'metallicFactor':0,'roughnessFactor':1},'normalTexture':{'index':1,'scale':.55}}],
 'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':10497}], 'textures':[{'sampler':0,'source':i} for i in range(3)],'images':images,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
 data=json.dumps(doc,separators=(',',':')).encode();data+=b' '*((-len(data))%4);binary+=b'\0'*((-len(binary))%4)
 payload=struct.pack('<III',0x46546c67,2,12+8+len(data)+8+len(binary))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary
 (OUT/(name+'.glb')).write_bytes(payload)
 print(name,len(p),'vertices',len(payload),'GLB bytes')
