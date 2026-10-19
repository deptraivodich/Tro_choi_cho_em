"""Technical crop/packing only; artwork was created with the built-in imagegen tool.
Requires Pillow locally, not at app runtime. Preserve alpha; never paint over art.
Source crops were inspected at full resolution before defining these rectangles.
"""
from pathlib import Path
import argparse, json
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
OUT = Path(__file__).resolve().parent
parser.add_argument('--source-dir', type=Path, default=OUT/'source-art')
SOURCE = parser.parse_args().source_dir
FILES = {
    'enemies': 'enemy-sheet-source.png',
    'turret': 'crystal-turret-source.png',
    'citadel': 'citadel-source.png',
    'environment': 'valley-source.png',
}
RECTS = [
    [(14,11,327,330),(376,23,320,321),(728,17,319,327),(1104,10,324,317)],
    [(37,365,308,324),(400,419,310,270),(781,374,301,306),(1141,363,292,301)],
    [(13,703,365,353),(408,733,309,323),(756,706,326,351),(1109,704,325,347)],
]
OUT.mkdir(parents=True, exist_ok=True)
original = Image.open(SOURCE / FILES['enemies']).convert('RGBA')
atlas = Image.new('RGBA', (1024,768))
for row, rects in enumerate(RECTS):
    factor = min(208 / max(r[2] for r in rects), 208 / max(r[3] for r in rects))
    for col, (x,y,w,h) in enumerate(rects):
        frame = original.crop((x-4,y-4,x+w+4,y+h+4))
        frame = frame.resize((round(frame.width*factor),round(frame.height*factor)),Image.Resampling.LANCZOS)
        atlas.alpha_composite(frame,(col*256+128-frame.width//2,row*256+224-frame.height))
atlas.save(OUT/'enemies-atlas.png',optimize=True)

turret = Image.open(SOURCE/FILES['turret']).convert('RGBA')
base = turret.crop((10,211,878,736))
base.thumbnail((448,400),Image.Resampling.LANCZOS)
canvas = Image.new('RGBA',(512,512));canvas.alpha_composite(base,(256-base.width//2,448-base.height));canvas.save(OUT/'turret-base.png',optimize=True)
head = turret.crop((887,151,1765,736))
factor=.36
head=head.resize((round(head.width*factor),round(head.height*factor)),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512))
canvas.alpha_composite(head,(round(256-(1125-887)*factor),round(256-(432-151)*factor)))
canvas.save(OUT/'turret-head.png',optimize=True)

citadel=Image.open(SOURCE/FILES['citadel']).convert('RGBA').crop((96,2,1169,1236))
citadel.thumbnail((460,476),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512));canvas.alpha_composite(citadel,(256-citadel.width//2,488-citadel.height));canvas.save(OUT/'citadel.png',optimize=True)
environment=Image.open(SOURCE/FILES['environment']).convert('RGB').resize((1400,880),Image.Resampling.LANCZOS)
environment.save(OUT/'valley.webp',quality=88,method=6)

manifest={'generator':'Built-in image_gen tool; original commissioned generation, no downloaded third-party art',
 'atlas':{'file':'enemies-atlas.png','width':1024,'height':768,'cell':256,'columns':4,'rows':['scout','slime','golem'],'groundPivot':[128,224],'frameCount':4,'sourceRectsXYWH':RECTS},
 'turret':{'baseGroundPivot':[256,448],'headPivot':[256,256],'headMuzzle':[465,251]},
 'citadel':{'groundPivot':[256,488]},'sourceFiles':FILES,
 'sourceDirectory':'source-art/','processing':'Alpha-preserving crop, uniform per-character scaling and atlas packing; no generative repaint or background removal.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),'utf-8')
print(json.dumps({p.name:p.stat().st_size for p in OUT.glob('*') if p.suffix in ['.png','.webp']}))
