import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
export async function staticWeb(){
 const root=path.resolve('artifacts/block-island-lord-round23/web-export'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'};
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const actual=path.extname(file)?file:path.join(root,'index.html'),body=await readFile(actual);res.writeHead(200,{'Content-Type':types[path.extname(actual)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404).end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(ok=>server.close(ok))};
}
