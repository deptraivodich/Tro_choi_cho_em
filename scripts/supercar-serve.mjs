import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('artifacts/supercar/export');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json',
  '.png':'image/png','.ttf':'font/ttf','.wav':'audio/wav','.css':'text/css','.ico':'image/x-icon'};
http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
    const actual=path.extname(file)?file:path.join(root,'index.html');
    const bytes=await fs.readFile(actual);
    response.writeHead(200,{'Content-Type':types[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch{response.writeHead(404).end();}
}).listen(8093,'127.0.0.1',()=>console.log('Supercar web: http://127.0.0.1:8093/games/terrain-racing'));
