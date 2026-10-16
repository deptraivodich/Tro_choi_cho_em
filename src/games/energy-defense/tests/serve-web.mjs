// Local production-export preview. No application files or dependencies are changed.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
const root=path.resolve(process.env.ENERGY_EXPORT_DIR||'artifacts/energy-defense-round3/web-dist');
const port=Number(process.env.ENERGY_PORT||8097);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try {
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  try{if(!(await stat(file)).isFile())file=path.join(root,'index.html');}catch{file=path.join(root,'index.html');}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(500);res.end('Preview error');}
}).listen(port,'127.0.0.1',()=>console.log('Production preview http://localhost:'+port));
