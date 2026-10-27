import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await rm(root+'dist',{recursive:true,force:true});await mkdir(root+'dist');
for(const f of ['index.html','favicon.svg','src','vendor'])await cp(root+f,root+'dist/'+f,{recursive:true});
console.log('Built static dist — all assets local, no network dependencies.');
