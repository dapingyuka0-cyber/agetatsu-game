"""Offline authored cage / anatomical texture baker. No v0.7 mesh is imported.
UV: horizontal = longitudinal position, vertical = section perimeter.
Outputs editable cage definitions, baked meshes and per-food PBR maps.
"""
from pathlib import Path
import json, math, io, os
import numpy as np
from scipy.interpolate import CubicSpline, PchipInterpolator
from scipy.ndimage import gaussian_filter
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/assets/foods'; OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau; U,V=88,48; S=512
# Hand-authored longitudinal stations: x, centerY, centerZ, halfWidth, top, bottom.
CAGES={
 'pork':[[-1.18,0,-.12,.01,.01,.01],[-1.12,0,-.09,.26,.12,.10],[-.88,0,-.04,.47,.19,.14],[-.44,.015,.04,.60,.22,.16],[0,0,.08,.62,.21,.17],[.40,.005,.10,.61,.19,.15],[.78,-.01,.02,.52,.16,.12],[1.03,-.02,-.06,.31,.13,.10],[1.12,-.02,-.10,.01,.01,.01]],
 'chicken':[[-.49,0,-.04,.01,.01,.01],[-.43,.015,.02,.25,.20,.18],[-.28,.02,.04,.40,.32,.25],[-.10,-.01,-.02,.37,.27,.24],[.04,.015,.035,.43,.38,.28],[.21,-.02,.0,.35,.30,.24],[.37,.01,-.04,.28,.25,.17],[.48,0,-.03,.01,.01,.01]],
 'shrimp':[[-1.28,0,-.17,.01,.01,.01],[-1.16,.01,-.10,.25,.23,.20],[-.88,.02,.04,.31,.26,.22],[-.54,.01,.17,.29,.25,.22],[-.16,0,.23,.25,.22,.19],[.22,0,.22,.21,.19,.16],[.57,0,.14,.17,.155,.13],[.88,.01,.01,.11,.11,.09],[1.20,.015,-.14,.045,.055,.04]],
 'fries':[[-1,0,-.04,.87,.85,.83],[-.96,0,-.04,1,1,1],[-.65,.015,-.02,1.01,1,.96],[-.15,0,.02,1.03,.98,1],[.30,.02,.06,.96,1.02,.98],[.76,.02,.02,.88,.93,.96],[.97,.015,-.03,.78,.84,.90],[1,.015,-.03,.65,.71,.78]],
 'pumpkin':[[-.82,0,0,.01,.01,.01],[-.73,0,-.02,.35,.21,.19],[-.48,.01,.02,.62,.33,.26],[-.12,0,0,.73,.36,.28],[.22,0,.01,.70,.34,.27],[.56,-.01,-.03,.56,.28,.23],[.77,0,-.02,.29,.17,.16],[.84,0,0,.01,.01,.01]],
 'potato':[[-1.04,0,0,.01,.01,.01],[-.94,0,.01,.29,.17,.14],[-.65,.01,-.02,.50,.25,.20],[-.2,0,.02,.58,.26,.21],[.24,.005,.01,.57,.25,.22],[.65,0,-.02,.49,.23,.19],[.94,-.01,.01,.25,.14,.13],[1.04,0,0,.01,.01,.01]],
 'bread':[[-1.12,0,0,.01,.01,.01],[-1.04,0,-.01,.24,.20,.13],[-.78,.01,0,.43,.39,.24],[-.38,.015,.015,.49,.46,.25],[.05,.02,.01,.51,.48,.24],[.50,0,-.01,.46,.42,.24],[.88,-.01,0,.35,.30,.18],[1.08,0,0,.16,.13,.09],[1.13,0,0,.01,.01,.01]]}
# 12-point explicit closed outlines. Each ring is relaxed differently, not a torus.
RINGS={
 'squid':[[-.43,.02],[-.36,-.24],[-.15,-.34],[.11,-.32],[.33,-.23],[.43,-.02],[.30,.21],[.08,.32],[-.12,.29],[-.29,.22],[-.39,.16],[-.44,.09]],
 'onion':[[-.43,0],[-.38,-.23],[-.21,-.39],[.02,-.43],[.25,-.37],[.42,-.17],[.45,.08],[.33,.30],[.12,.42],[-.12,.43],[-.34,.29],[-.43,.13]]}
def section(a,flat):
 # Superellipse is only the cage section; sculpted stations determine the silhouette.
 return np.sign(np.cos(a))*abs(np.cos(a))**flat,np.sign(np.sin(a))*abs(np.sin(a))**flat
def mesh(id,variant=0):
 U,V=(40,20) if id=='fries' else (64,32)
 uv=[];p=[]
 if id in RINGS:
  outline=np.array(RINGS[id]);outline=np.vstack([outline,outline[0]])
  curve=CubicSpline(np.linspace(0,1,len(outline)),outline,bc_type='periodic')
 else:
  stations=np.array(CAGES[id]);interp=PchipInterpolator(np.linspace(0,1,len(stations)),stations,axis=0)
 for i in range(U+1):
  u=i/U
  for j in range(V+1):
   v=j/V;a=v*TAU
   if id in RINGS:
    c=curve(u);t=curve(u,1);n=np.array([-t[1],t[0]]);n/=np.linalg.norm(n)
    # Outline orientation is positive: outward normal is reversed.
    n=-n
    wall=(.081 if id=='squid' else .036)*(1+.16*math.sin(u*TAU*2+variant))
    q,h=section(a,.40 if id=='squid' else .24)
    x,z=c+n*wall*q; y=h*(.117 if id=='squid' else .130)
    y+=.023*math.sin(u*TAU*2+variant) if id=='squid' else .007*math.sin(u*TAU*3)
    x*=1+variant*.015;z*=1-variant*.055
   else:
    x,cy,cz,w,top,bottom=interp(u);flat={'fries':.10,'pork':.23,'chicken':.63,'potato':.36,'pumpkin':.43,'bread':.78,'shrimp':.88}[id]
    q,h=section(a,flat);z=cz+w*q;y=cy+h*(top if h>0 else bottom)
    if id=='pork':
     # Fat rim has its own raised lip; small incision on the shoulder.
     y+=.028*math.exp(-((v-.075)/.055)**2)*math.sin(math.pi*u)
     z-=.028*math.exp(-((u-.78)/.045)**2)*max(0,q)
    if id=='chicken':
     # Fold clefts with two unequal meat lobes, matched to texture fascia.
     fold=math.exp(-((u-.43-.09*math.sin(a*2))/.045)**2)
     y-=.080*fold*max(0,h);z+=.035*math.sin(u*15+a*3+variant)*math.sin(math.pi*u)
     y-=.025*math.exp(-((u-.72+.025*math.sin(a*3))/.025)**2)*max(0,h)
     y+=.025*math.sin(a*5+u*9+variant)*math.sin(math.pi*u)
    if id=='shrimp':
     groove=sum(math.exp(-((u-k)/.012)**2) for k in [.22,.35,.48,.61,.74,.86])
     y*=1-.075*groove;z=cz+(z-cz)*(1-.075*groove)
    if id in ['pumpkin','potato']:
     d=.012*math.sin(u*57+a*17)+.012*math.sin(u*31-a*11)
     y+=d*math.sin(math.pi*u);z+=d*.65
    if id=='bread':
     y-=.016*math.exp(-((v-.52)/.04)**2)*math.sin(math.pi*u)
     y+=.004*math.sin(u*63+a*21)*math.sin(math.pi*u)
   p.append([round(x,6),round(y,6),round(z,6)]);uv.append([u,v])
 indices=[]
 for i in range(U):
  for j in range(V):
   a=i*(V+1)+j;b=a+V+1;indices.extend([a,b,a+1,b,b+1,a+1])
 # Correct ring orientation compared with longitudinal solids.
 if id in RINGS:
  for k in range(0,len(indices),3):indices[k+1],indices[k+2]=indices[k+2],indices[k+1]
 # Flat end caps with their own vertices/normals. In particular, no hollow fries.
 if id not in RINGS:
  for end in [0,U]:
   edge=np.array(p[end*(V+1):(end+1)*(V+1)]);center=edge[:-1].mean(axis=0)
   offset=len(p);p.append(center.tolist());uv.append([end/U,.25])
   for q in edge:p.append(q);uv.append([end/U,.25])
   for j in range(V):
    tri=[offset,offset+j+1,offset+j+2]
    if end==U:tri[1],tri[2]=tri[2],tri[1]
    indices.extend(tri)
  p=[np.asarray(q).tolist() for q in p]
 regions=[0]*len(p)
 # Separate onion lamellae: independent closed strips, visible at the cut edge.
 if id=='onion':
  base=np.array(p)
  for layer in [1,2]:
   offset=len(p)
   for i in range(U+1):
    c=curve(i/U);t=curve(i/U,1);n=np.array([t[1],-t[0]]);n/=np.linalg.norm(n)
    for j in range(V+1):
     a=j/V*TAU;rr=-.043-layer*.024+.010*np.sign(np.cos(a))*abs(np.cos(a))**.24
     x,z=c+n*rr;y=.124*np.sign(np.sin(a))*abs(np.sin(a))**.24+.006*math.sin(i/U*TAU*3+layer)
     p.append([round(x,6),round(y,6),round(z*(1-variant*.055),6)]);uv.append([i/U,j/V]);regions.append(layer*.15)
   for i in range(U):
    for j in range(V):
     a=offset+i*(V+1)+j;b=a+V+1;indices.extend([a,a+1,b,b,a+1,b+1])
 # A thin, lifted skin/fascia flap follows chicken's sculpted fold, with a rolled rim.
 if id=='chicken':
  base=np.array(p);offset=len(p);A,B=32,10
  for i in range(A+1):
   uu=.18+i/A*.54
   for j in range(B+1):
    vv=.10+j/B*.12+.035*math.sin(uu*11+variant)
    ii=min(U-1,int(uu*U));jj=min(V-1,int(vv*V));fu=uu*U-ii;fv=vv*V-jj
    q=(base[ii*(V+1)+jj]*(1-fv)+base[ii*(V+1)+jj+1]*fv)*(1-fu)+(base[(ii+1)*(V+1)+jj]*(1-fv)+base[(ii+1)*(V+1)+jj+1]*fv)*fu
    q[1]+=.010+.027*math.sin(math.pi*i/A)*math.sin(math.pi*j/B)+.015*(j/B)**6
    p.append(np.round(q,6).tolist());uv.append([uu,vv]);regions.append(1)
  for i in range(A):
   for j in range(B):
    a=offset+i*(B+1)+j;b=a+B+1;indices.extend([a,b,a+1,b,b+1,a+1])
 return {'positions':p,'uv':uv,'indices':indices,'regions':regions,'U':U,'V':V,'surfaceCount':(U+1)*(V+1)}

def texture(id):
 rng=np.random.default_rng(101+list(CAGES.keys()).index(id) if id in CAGES else 901+(id=='onion'))
 yy,xx=np.mgrid[0:S,0:S];u=xx/(S-1);v=yy/(S-1)
 grain=rng.random((S,S));broad=gaussian_filter(grain,12);broad=(broad-broad.min())/(broad.max()-broad.min())
 fine=gaussian_filter(grain,1);top=np.maximum(0,np.sin(v*TAU))
 col=np.zeros((S,S,3));h=np.zeros((S,S));rough=np.full((S,S),.5)
 def mix(a,b,m):return np.array(a)[None,None,:]*(1-m[:,:,None])+np.array(b)[None,None,:]*m[:,:,None]
 if id=='pork':
  col=mix([175,75,80],[226,139,139],.25+.55*broad)
  fat=np.clip((np.cos(v*TAU)-(.74+.10*np.sin(u*9)))*12,0,1)
  fascia=np.exp(-((u-.70-.075*np.sin(v*9))/.009)**2)
  fiber=np.sin(u*340+np.sin(v*23)*7+broad*11)*.5+.5
  marbling=np.clip((gaussian_filter(grain,2)-.56)*16,0,1)*.40
  marbling=np.maximum(marbling,np.exp(-((u-.29-.06*np.sin(v*11)-.035*np.sin(v*28))/.006)**2)*.4)
  mask=np.maximum(fat,np.maximum(fascia,marbling))
  col=col*(1-mask[:,:,None])+np.array([244,220,202])*mask[:,:,None]
  col*=.94+.06*fiber[:,:,None];h=.2*fiber+.50*mask;rough=.37-.12*mask+.05*broad
 elif id=='chicken':
  col=mix([175,87,88],[231,157,143],broad*.85)
  crease=np.exp(-((u-.43-.09*np.sin(v*TAU*2))/.033)**2)
  skin=np.clip((np.sin(u*12+np.sin(v*8))+.55*np.cos(v*TAU)-1.02)*3,0,1)
  membrane=np.exp(-((u-.67-.09*np.sin(v*11))/.012)**2)
  col*=1-.21*crease[:,:,None];m=np.maximum(skin,membrane*.8)
  col=col*(1-m[:,:,None])+np.array([241,199,158])*m[:,:,None]
  fiber=.5+.5*np.sin(u*290+v*55+np.sin(v*17)*5+broad*10);col*=.94+.06*fiber[:,:,None];h=.24*fiber+.24*skin-.6*crease
  rough=.31+.08*broad-.10*membrane
 elif id=='squid':
  col=mix([222,206,190],[247,235,218],broad*.6+.2)
  # Remnant skin only on irregular outer wall, not painted over the cut faces.
  outer=np.clip((np.cos(v*TAU)-.80)*7,0,1)*np.clip((np.sin(u*14)+.5)*2,0,1)
  speckles=(grain>.91)*(.45+.55*broad)
  m=outer*(.15+.70*speckles);col=col*(1-m[:,:,None])+np.array([130,64,62])*m[:,:,None]
  h=.055*np.sin(u*290)+.07*grain;rough=.23+.08*broad
 elif id=='onion':
  col=mix([216,221,177],[244,237,209],.38+.57*broad)
  cut=np.abs(np.sin(v*TAU));layers=(.5+.5*np.cos(np.cos(v*TAU)*12))**10*cut
  col*=1-.12*layers[:,:,None];fiber=(.5+.5*np.sin(u*480+np.sin(v*11)*.4))**14
  h=.12*fiber+.18*layers;rough=.30+.10*broad
 elif id=='fries':
  col=mix([225,199,119],[249,229,163],.28+.60*broad)
  # Skin along one long face, with natural remnants on bevels.
  skin=np.clip((np.cos(v*TAU)-(.72+.12*np.sin(u*8)))*7,0,1)
  spots=np.clip((grain-.80)*5,0,1);skincol=mix([140,97,39],[194,151,73],broad)
  skincol*=1-.48*spots[:,:,None];col=col*(1-skin[:,:,None])+skincol*skin[:,:,None]
  h=.10*fine+.25*skin*spots;rough=.49+.19*skin+.05*broad
 elif id in ['pumpkin','potato']:
  col=mix([201,111,13],[245,178,37],broad) if id=='pumpkin' else mix([211,191,142],[244,226,185],broad)
  bits=np.clip((gaussian_filter(grain,.7)-.66)*9,0,1)
  col=col*(1-bits[:,:,None])+np.array([75,89,31] if id=='pumpkin' else [115,80,46])*bits[:,:,None]
  h=(fine-.5)*2+bits*.2;rough=.85+.08*fine
 elif id=='bread':
  crown=np.clip((np.sin(v*TAU)+.08)*4,0,1)
  crust=mix([160,83,25],[201,127,48],.25+.65*broad)
  col=np.array([230,202,151])*(1-crown[:,:,None])+crust*crown[:,:,None]
  pores=np.clip((grain-.90)*10,0,1);col*=1-.13*pores[:,:,None];h=fine*.15-pores*.28;rough=.78+.1*fine
 else:
  col=mix([218,179,157],[241,217,191],broad)
  segment=np.zeros_like(u)
  for k in [.22,.35,.48,.61,.74,.86]:segment+=np.exp(-((u-k)/.010)**2)
  col=col*(1-segment[:,:,None]*.24)+np.array([196,125,108])*segment[:,:,None]*.24
  h=-segment*.35+fine*.1;rough=.29+.09*broad
 dx=np.gradient(h,axis=1)*3;dy=np.gradient(h,axis=0)*3
 normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
 for name,data in [('base',np.clip(col,0,255).astype('uint8')),('normal',np.uint8(np.clip((normal*.5+.5)*255,0,255))),('roughness',np.uint8(np.clip(rough*255,0,255)))]:
  buffer=io.BytesIO();Image.fromarray(data).save(buffer,format='PNG',optimize=True)
  target=OUT/f'{id}-{name}.png';payload=buffer.getvalue()
  with target.open('wb') as handle:handle.write(payload);handle.flush();os.fsync(handle.fileno())
  Image.open(io.BytesIO(target.read_bytes())).verify()

assets={}
for id in ['shrimp','pork','pumpkin','potato','squid','onion','chicken','fries','bread']:
 assets[id]=[mesh(id,k) for k in range(3 if id in ['squid','onion','chicken'] else 1)];texture(id)
(OUT/'meshes.json').write_text(json.dumps(assets,separators=(',',':')))
(OUT/'cages.json').write_text(json.dumps({'longitudinal':CAGES,'outlines':RINGS},indent=2))
print('Baked 9 mesh families, 27 PBR maps; no old model reused.')
