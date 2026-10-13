from pathlib import Path
from argparse import ArgumentParser
import json, cv2, math, bisect
from PIL import Image, ImageDraw

parser=ArgumentParser(description='Export timestamped race UI screencasts at original speed.')
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'artifacts/race-movement-timing')
parser.add_argument('labels',nargs='*',default=['dice-1','dice-4','dice-6','pause-resume'])
args=parser.parse_args()
root=args.root
metadata=[]
for label in args.labels:
 folder=root/f'{label}-frames'
 events=json.loads((folder/'timestamps.json').read_text())
 events=sorted(events,key=lambda e:e['timestamp'])
 start=events[0]['timestamp']; end=events[-1]['timestamp']; times=[e['timestamp'] for e in events]
 target=root/f'{label}-web-1x.mp4'
 first=cv2.imread(str(folder/events[0]['file'])); h,w=first.shape[:2]
 writer=cv2.VideoWriter(str(target),cv2.VideoWriter_fourcc(*'mp4v'),30,(w,h))
 assert writer.isOpened()
 last_index=-1; frame=first; contact=[]
 for i in range(math.ceil((end-start)*30)+1):
  now=start+i/30; index=max(0,bisect.bisect_right(times,now)-1)
  if index!=last_index:
   frame=cv2.imread(str(folder/events[index]['file']));last_index=index
  canvas=frame.copy()
  cv2.rectangle(canvas,(0,h-18),(w,h),(12,20,22),-1)
  cv2.putText(canvas,f'WEB Chrome | {label} | original clock 1x | {i/30:.2f}s',(8,h-5),cv2.FONT_HERSHEY_SIMPLEX,.34,(255,255,255),1,cv2.LINE_AA)
  writer.write(canvas)
  if i%6==0:contact.append((i/30,Image.fromarray(cv2.cvtColor(canvas,cv2.COLOR_BGR2RGB))))
 writer.release()
 # Every 200ms; all images are real screencast pixels. Repeated video frames
 # preserve the timestamp gaps, with no interpolation or accelerated playback.
 for base in range(0,len(contact),24):
  page=Image.new('RGB',(4*400,6*198),'#101b20');draw=ImageDraw.Draw(page)
  for k,(sec,img) in enumerate(contact[base:base+24]):
   x=(k%4)*400;y=(k//4)*198
   page.paste(img.resize((400,180)),(x,y+18));draw.text((x+5,y+3),f'{sec:.2f}s',fill='white')
  page.save(root/f'{label}-contact-{base//24+1}.jpg',quality=90)
 metadata.append({'label':label,'file':target.name,'durationSeconds':end-start,'capturedFrames':len(events),'outputFps':30,'speed':1,'platform':'Chrome web, not native Android','method':'Screencast timestamps; repeat last frame until next timestamp; no interpolation.'})
 print(label,len(events),round(end-start,3),'seconds')
(root/'videos.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
