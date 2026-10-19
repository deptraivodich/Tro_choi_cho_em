// Video-only encoding with original capture timestamps. No game assets are edited.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script=fileURLToPath(new URL('./encode-round36-video.py',import.meta.url));
const result=spawnSync('python',[script],{stdio:'inherit',windowsHide:true,timeout:240000});
if(result.error)throw result.error;
process.exitCode=result.status??1;
