"""Focused atlas verification/contact sheet. Requires the project's existing Pillow.

Optional --before-atlas PATH checks that scout/slime pixels are unchanged.
"""
from pathlib import Path
from collections import deque
import argparse,hashlib,json
from PIL import Image,ImageDraw
parser=argparse.ArgumentParser();parser.add_argument('--before-atlas');args=parser.parse_args()
assets=Path(__file__).resolve().parents[1]/'assets/round3'
out=Path('artifacts/energy-defense-round32');out.mkdir(parents=True,exist_ok=True)
atlas=Image.open(assets/'enemies-atlas.png').convert('RGBA')
source=Image.open(assets/'source-art/enemies.png').convert('RGBA')
spec=json.loads((assets/'golem-frames.json').read_text('utf-8'))
assert atlas.size==(1024,768)
assert abs(spec['scale']-208/362)<1e-12,'Original golem pixel scale must be preserved'
def components(alpha,threshold=16):
    mask={(x,y) for y in range(alpha.height) for x in range(alpha.width) if alpha.getpixel((x,y))>=threshold}
    result=[]
    while mask:
        seed=mask.pop();todo=deque([seed]);points=[seed]
        while todo:
            x,y=todo.popleft()
            for dx,dy in ((-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)):
                p=(x+dx,y+dy)
                if p in mask:mask.remove(p);points.append(p);todo.append(p)
        if len(points)>=8:
            result.append({'pixels':len(points),'bounds':[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points)+1,max(p[1] for p in points)+1]})
    return result
report={'sourceSha256':hashlib.sha256((assets/'source-art/enemies.png').read_bytes()).hexdigest(),'frames':[]}
sheet=Image.new('RGB',(4*288,304),'#e7e6cc');draw=ImageDraw.Draw(sheet)
for col,frame in enumerate(spec['frames']):
    original=source.crop(frame['sourceRect']);groups=components(original.getchannel('A'))
    significant=[g for g in groups if g['pixels']>=80]
    assert len(significant)==1,(col,'source rectangle must contain one complete golem',significant)
    x0,y0,x1,y1=significant[0]['bounds']
    assert x0>0 and x1<original.width and y0>0 and y1<original.height,(col,'source clips a limb')
    cell=atlas.crop((col*256,512,(col+1)*256,768));alpha=cell.getchannel('A')
    bounds=alpha.getbbox();visible=alpha.point(lambda a:255 if a>=16 else 0).getbbox()
    pieces=components(alpha)
    assert len(pieces)==1,(col,'detached part',pieces)
    assert bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=248 and bounds[3]<=230,(col,'padding',bounds)
    assert visible[3]==228,(col,'visible foot anchor drifts',visible)
    cell.save(out/f'golem-frame-{col}.png')
    tile=Image.new('RGBA',(256,256),'#e7e6cc');tile.alpha_composite(cell)
    sheet.paste(tile.convert('RGB'),(col*288+16,30))
    draw.text((col*288+16,8),f'Frame {col} / original scale 208/362',fill='#183e43')
    draw.line((col*288+16,258,col*288+272,258),fill='#247a74',width=1)
    draw.line((col*288+144,252,col*288+144,264),fill='#247a74',width=1)
    draw.text((col*288+16,282),'foot pivot (128, 228)',fill='#183e43')
    report['frames'].append({'frame':col,'sourceRect':frame['sourceRect'],'alphaBounds':bounds,'visibleBounds':visible,'significantComponents':len(pieces),'groundPivot':[128,228],'scale':spec['scale']})
if args.before_atlas:
    before=Image.open(args.before_atlas).convert('RGBA')
    report['scoutSlimePixelsUnchanged']=before.crop((0,0,1024,512)).tobytes()==atlas.crop((0,0,1024,512)).tobytes()
    assert report['scoutSlimePixelsUnchanged']
sheet.save(out/'golem-walk-contact-sheet.png')
report['passed']=True
(out/'enemy-asset-validation.json').write_text(json.dumps(report,indent=2),'utf-8')
print(json.dumps(report,indent=2))
