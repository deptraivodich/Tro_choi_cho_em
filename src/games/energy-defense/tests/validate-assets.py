"""Validate shipped textures and atlas bounds without modifying image pixels."""
from pathlib import Path
import hashlib, json
from PIL import Image

assets=Path(__file__).resolve().parents[1]/'assets'/'round3'
out=Path('artifacts/energy-defense-round3');out.mkdir(parents=True,exist_ok=True)
report={'files':[],'frames':[],'platform':'File validation, not native rendering verification'}
for name in ['enemies-atlas.png','turret-base.png','turret-head.png','citadel.png','ground.webp']:
    path=assets/name;image=Image.open(path);image.load()
    entry={'name':name,'size':list(image.size),'mode':image.mode,'bytes':path.stat().st_size,'rgbaTextureBytesEstimate':image.width*image.height*4,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if path.suffix=='.png':
        assert image.mode=='RGBA',name
        alpha=image.getchannel('A');assert alpha.getextrema()==(0,255),name
        assert all(alpha.crop(rect).getextrema()[1]==0 for rect in [(0,0,image.width,1),(0,image.height-1,image.width,image.height),(0,0,1,image.height),(image.width-1,0,image.width,image.height)]),name+' touches image edge'
        entry['alphaRange']=list(alpha.getextrema())
    report['files'].append(entry)
atlas=Image.open(assets/'enemies-atlas.png')
for row,kind in enumerate(['scout','slime','golem']):
    hashes=[]
    for col in range(4):
        image=atlas.crop((col*256,row*256,(col+1)*256,(row+1)*256));bbox=image.getchannel('A').getbbox();assert bbox
        assert bbox[0]>=8 and bbox[1]>=8 and bbox[2]<=248 and bbox[3]<=230,(kind,col,bbox)
        assert 226<=bbox[3]<=230,(kind,col,'ground pivot drift',bbox)
        digest=hashlib.sha256(image.tobytes()).hexdigest();hashes.append(digest)
        report['frames'].append({'kind':kind,'frame':col,'alphaBounds':list(bbox),'groundPivot':[128,228],'sha256':digest})
    assert len(set(hashes))==4,kind+' has repeated identical frames'
report['totalFileBytes']=sum(x['bytes'] for x in report['files'])
report['rgbaTextureBytesEstimate']=sum(x['rgbaTextureBytesEstimate'] for x in report['files'])
report['passed']=True
(out/'asset-validation.json').write_text(json.dumps(report,indent=2),'utf-8')
print(json.dumps({'passed':True,'frames':len(report['frames']),'fileBytes':report['totalFileBytes'],'rgbaTextureBytesEstimate':report['rgbaTextureBytesEstimate']}))
