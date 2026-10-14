"""Encode actual Chrome screencast frames at original wall-clock speed (no interpolation)."""
from pathlib import Path
import bisect, json, math
import cv2
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]/'artifacts/supercar/acceptance'
metadata=[]
for label in ['five-stages','low-speed','high-speed','pause-resume','pause-roll']:
    folder=ROOT/(label+'-frames')
    if not (folder/'timestamps.json').exists():continue
    events=sorted(json.loads((folder/'timestamps.json').read_text()),key=lambda e:e['timestamp'])
    if not events:continue
    times=[e['timestamp'] for e in events];start,end=times[0],times[-1]
    frame=cv2.imread(str(folder/events[0]['file']));h,w=frame.shape[:2]
    target=ROOT/(label+'-web-1x.mp4')
    writer=cv2.VideoWriter(str(target),cv2.VideoWriter_fourcc(*'mp4v'),30,(w,h))
    assert writer.isOpened();previous=-1;contacts=[]
    for i in range(math.ceil((end-start)*30)+1):
        t=i/30;index=max(0,bisect.bisect_right(times,start+t)-1)
        if index!=previous:frame=cv2.imread(str(folder/events[index]['file']));previous=index
        canvas=frame.copy()
        cv2.rectangle(canvas,(0,h-16),(w,h),(20,29,44),-1)
        cv2.putText(canvas,f'WEB / not native | {label} | 1x | {t:.2f}s',(5,h-5),cv2.FONT_HERSHEY_SIMPLEX,.31,(255,255,255),1,cv2.LINE_AA)
        writer.write(canvas)
        if i%30==0:contacts.append((t,Image.fromarray(cv2.cvtColor(canvas,cv2.COLOR_BGR2RGB))))
    writer.release()
    for base in range(0,len(contacts),24):
        sheet=Image.new('RGB',(6*195,4*444),'#142942');d=ImageDraw.Draw(sheet)
        for k,(sec,img) in enumerate(contacts[base:base+24]):
            x=k%6*195;y=k//6*444;sheet.paste(img.resize((195,422)),(x,y+22));d.text((x+6,y+4),f'{sec:.2f}s',fill='white')
        sheet.save(ROOT/f'{label}-contact-{base//24+1}.jpg',quality=88)
    trace=json.loads((ROOT/(label+'-trace.json')).read_text())
    gaps=[s['police']['top']-s['hero']['bottom'] for s in trace]
    meta={'file':target.name,'label':label,'seconds':end-start,'capturedFrames':len(events),'encodedFps':30,
          'platform':'Chrome web mobile emulation, NOT native Android/iOS','speed':1,
          'audioTrack':False,'minimumRenderedPaddedSpriteGapPx':min(gaps),
          'method':'Real CDP screencast pixels; timestamp gaps preserve repeated frames; no interpolation or sped-up simulation.'}
    metadata.append(meta);print(json.dumps(meta))
(ROOT/'videos.json').write_text(json.dumps(metadata,indent=2),'utf-8')
