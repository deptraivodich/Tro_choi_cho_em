"""Technical packing only; original artwork is preserved in source-art/.

Use --enemies-only to rebuild the atlas/manifest without touching environment art.
"""
from pathlib import Path
from PIL import Image
import json, sys, hashlib
out=Path(__file__).resolve().parent
raw=out/'source-art'
im=Image.open(raw/'enemies.png').convert('RGBA')
atlas=Image.new('RGBA',(1024,768))
rects=[]
for row in range(2):
    crops=[]
    for col in range(4):
        cell=im.crop((col*362,row*362,(col+1)*362,(row+1)*362))
        bbox=cell.getchannel('A').getbbox()
        crops.append(cell.crop(bbox))
        rects.append({'row':row,'column':col,'sourceCellAlphaBounds':bbox})
    factor=min(208/max(x.width for x in crops),208/max(x.height for x in crops))
    for col,crop in enumerate(crops):
        crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
        # Resampling can discard faint outer alpha pixels; trim again so the actual foot stays on the shared pivot.
        crop=crop.crop(crop.getchannel('A').getbbox())
        atlas.alpha_composite(crop,(col*256+128-crop.width//2,row*256+228-crop.height))
# The golem silhouettes cross the old equal-cell boundaries (one arm reaches x=388).
# Use explicit gap boundaries, retaining the original per-row pixel scale.
golem=json.loads((out/'golem-frames.json').read_text('utf-8'))
for col,frame in enumerate(golem['frames']):
    rect=frame['sourceRect'];cell=im.crop(rect)
    visible=cell.getchannel('A').point(lambda a:255 if a>=golem['visibleAlphaThreshold'] else 0)
    bbox=visible.getbbox();pad=golem['fringePadding']
    bounds=(max(0,bbox[0]-pad),max(0,bbox[1]-pad),min(cell.width,bbox[2]+pad),min(cell.height,bbox[3]+pad))
    crop=cell.crop(bounds);factor=golem['scale']
    crop=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
    foot=crop.getchannel('A').point(lambda a:255 if a>=golem['visibleAlphaThreshold'] else 0).getbbox()[3]
    x=col*256+128-round((frame['groundX']-rect[0]-bounds[0])*factor)
    y=512+228-foot
    atlas.alpha_composite(crop,(x,y))
    rects.append({'row':2,'column':col,'sourceRect':rect,'sourceCellAlphaBounds':list(bounds),
                  'sourceGroundX':frame['groundX'],'scale':factor,'visibleFootY':228})
atlas.save(out/'enemies-atlas.png',optimize=True)
manifest={
    'generator':'built-in image_gen; original hand-drawn cartoon artwork',
    'frames':rects,'atlasSize':[1024,768],'cell':256,'groundPivot':[128,228],
    'turretHeadPivot':[256,256],'muzzle':[466,256],'sourceDirectory':'source-art/',
    'sourceEnemySha256':hashlib.sha256((raw/'enemies.png').read_bytes()).hexdigest(),
    'processing':'Original scout/slime packing unchanged. Golem uses explicit full-silhouette source rectangles, 2px antialias fringe, original 208/362 scale and shared ground anchors. No repainting.'
}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
if '--enemies-only' in sys.argv:
    print('Rebuilt enemies only; source and all environment textures unchanged.')
    raise SystemExit(0)
Image.open(raw/'ground.png').resize((1400,880),Image.Resampling.LANCZOS).save(out/'ground.webp',quality=88,method=6)
structures=Image.open(raw/'structures.png').convert('RGBA')
for name,rect in [('turret-base',(0,0,720,724)),('citadel',(1400,0,2172,724))]:
    obj=structures.crop(rect)
    obj=obj.crop(obj.getchannel('A').getbbox())
    obj.thumbnail((448,448),Image.Resampling.LANCZOS)
    obj=obj.crop(obj.getchannel('A').getbbox())
    canvas=Image.new('RGBA',(512,512))
    canvas.alpha_composite(obj,(256-obj.width//2,476-obj.height))
    canvas.save(out/(name+'.png'),optimize=True)
head=structures.crop((720,0,1400,724)).resize((340,362),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512))
canvas.alpha_composite(head,(256-round((925-720)*.5),256-round(360*.5)))
canvas.save(out/'turret-head.png',optimize=True)
print({p.name:p.stat().st_size for p in out.iterdir() if p.suffix in ['.png','.webp']})
