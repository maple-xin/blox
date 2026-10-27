import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const key=relative=>'bb/'+relative.replaceAll(path.sep,'/');
const pending=['src/main.js'],modules=new Map();
while(pending.length){
 const relative=pending.shift();if(modules.has(relative))continue;
 const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))throw new Error('Module outside project');
 let source=await readFile(file,'utf8');
 source=source.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+|three)\2/g,(_,prefix,quote,spec)=>{
  const dep=spec==='three'?'vendor/three.module.js':path.relative(root,path.resolve(path.dirname(file),spec));
  if(!pending.includes(dep)&&!modules.has(dep))pending.push(dep);
  return prefix+quote+key(dep)+quote;
 });
 modules.set(relative,source);
}
const imports=Object.fromEntries([...modules].map(([name,code])=>[key(name),'data:text/javascript;base64,'+Buffer.from(code).toString('base64')]));
let css=await readFile(root+'src/scene.css','utf8')+'\n'+await readFile(root+'src/ui.css','utf8');
const refs=[...css.matchAll(/url\(\s*(['"]?)(\.\/assets\/[^)'"\s]+)\1\s*\)/g)];
for(const [,quote,ref]of refs){const bytes=await readFile(root+'src/'+ref);const ext=path.extname(ref);const mime={'.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[ext]||'application/octet-stream';css=css.replaceAll(ref,'data:'+mime+';base64,'+bytes.toString('base64'));}
let html=await readFile(root+'index.html','utf8');
html=html.replace(/<link rel="stylesheet"[^>]*>/g,'').replace(/<script type="importmap">[\s\S]*?<\/script>/,'');
html=html.replace(/<script type="module"[^>]*><\/script>/,()=>'<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module">import "'+key('src/main.js')+'";</script>');
html=html.replace('</head>','<style>'+css+'</style></head>');
const favicon=await readFile(root+'favicon.svg','utf8');html=html.replace('href="./favicon.svg"','href="data:image/svg+xml,'+encodeURIComponent(favicon)+'"');
const notices=await readFile(root+'vendor/LICENSE','utf8')+'\n\n'+await readFile(root+'src/assets/fonts/OFL-Xiaolai.txt','utf8');
html=html.replace('</head>',()=>'<'+ '!'+ '-- Embedded software/font licenses\n'+notices.replace(/--/g,'—')+'\n--'+ '></head>');
await writeFile(root+'Block-and-Bloom_Play.html',html);
await writeFile(root+'artifacts/module-manifest.json',JSON.stringify({entry:'src/main.js',modules:[...modules.keys()],standalone:'Block-and-Bloom_Play.html'},null,2));
console.log('Standalone ready: Block-and-Bloom_Play.html · '+modules.size+' embedded modules · '+Buffer.byteLength(html)+' bytes');
