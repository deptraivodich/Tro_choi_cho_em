"""Audit supplied handoff and derive exact atlas crops plus an opaque seamless road tile."""
from pathlib import Path
import hashlib, json, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'docs/references/supercar-handoff/Sieu_Xe_DEV_HANDOFF'
OUT = ROOT / 'artifacts/supercar/reference'
DEST = ROOT / 'src/games/terrain-racing/assets'
OUT.mkdir(parents=True, exist_ok=True)
DEST.mkdir(parents=True, exist_ok=True)

inventory = json.loads((REF / '06_verification/file_inventory.json').read_text('utf-8'))
for f in inventory['files']:
    assert hashlib.sha256((REF / f['path']).read_bytes()).hexdigest() == f['sha256'], f['path']
manifest = json.loads((REF / '01_spec/asset_manifest.json').read_text('utf-8'))
for item in manifest['images']:
    image = Image.open(REF / item['path'])
    assert image.size == (item['width'], item['height'])
    shutil.copy2(REF / item['path'], DEST / Path(item['path']).name)
    for frame in item.get('frames', []):
        if 'spare' in frame['name']: continue
        x,y,w,h = frame['source_rect_xywh']
        image.crop((x,y,x+w,y+h)).save(DEST / (frame['name'] + '.png'))
for item in manifest['audio']:
    (DEST / 'audio').mkdir(exist_ok=True)
    shutil.copy2(REF / item['path'], DEST / 'audio' / Path(item['path']).name)
for name in ('game_config.json', 'animation_timing.json', 'asset_manifest.json'):
    shutil.copy2(REF / '01_spec' / name, DEST / name)

# Bake the prototype's 24px additive crossfade into one opaque 936px tile.
# y=0..23 combines the previous tile's tail and the next tile's head.
road = np.array(Image.open(DEST / 'city-road.png').convert('RGB').resize((540,960), Image.Resampling.LANCZOS))
tile = road[:936].copy()
for y in range(24):
    alpha = y / 24
    tile[y] = np.clip(road[y].astype(float)*alpha + road[y+936].astype(float)*(1-alpha),0,255)
Image.fromarray(tile).save(DEST / 'road-tile.png')

def sheet(images, path, columns, size):
    w,h=size
    result=Image.new('RGB',(columns*w,((len(images)+columns-1)//columns)*(h+22)),'#15243a')
    d=ImageDraw.Draw(result)
    for i,(label,img) in enumerate(images):
        x=(i%columns)*w; y=(i//columns)*(h+22)
        result.paste(img.resize(size),(x,y+22));d.text((x+6,y+4),label,fill='white')
    result.save(path)

sheet([(p.name,Image.open(p).convert('RGB')) for p in sorted((REF/'02_mockups').glob('*.png'))],OUT/'mockups.jpg',5,(270,480))
videos=[]
for p in sorted((REF/'04_videos').glob('*.mp4')):
    cap=cv2.VideoCapture(str(p));fps=cap.get(cv2.CAP_PROP_FPS);count=cap.get(cv2.CAP_PROP_FRAME_COUNT)
    seconds=count/fps
    # Samples every 0.5s across ALL three videos, grouped into readable contact sheets.
    frames=[]
    for i in range(int(seconds*2)+1):
        sec=min(i/2,seconds-1/fps);cap.set(cv2.CAP_PROP_POS_MSEC,sec*1000);ok,img=cap.read()
        if ok:frames.append((f'{sec:.2f}s',Image.fromarray(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))))
    for i in range(0,len(frames),24):sheet(frames[i:i+24],OUT/f'{p.stem}-{i//24+1}.jpg',6,(180,320))
    cap.release();videos.append({'file':p.name,'fps':fps,'frames':count,'seconds':seconds})
(OUT/'audit.json').write_text(json.dumps({'inventoryHashes':'all passed','videos':videos,'images':manifest['images']},ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(videos,indent=2))
