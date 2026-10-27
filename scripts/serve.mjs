import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2);
function option(name){const i=args.indexOf(name);return i>=0?args[i+1]:args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);}
const root=fileURLToPath(new URL(args.includes('--dist')?'../dist/':'../',import.meta.url));
const port=Number(option('--port')||process.env.PORT||3000),host=option('--host')||process.env.HOST||'0.0.0.0';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname),base=path.resolve(root);
  if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  const target=pathname.endsWith('/')?path.join(file,'index.html'):file;
  const data=await readFile(target);
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,host,()=>console.log(`Block & Bloom: http://${host}:${port}`));
