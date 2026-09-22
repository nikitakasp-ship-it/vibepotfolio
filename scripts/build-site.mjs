import {mkdir,writeFile,readdir,cp,rm,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanPortfolio,serializeCatalog} from './catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog = await scanPortfolio(path.join(root,'portfolio'));
const source = serializeCatalog(catalog);
if(process.argv.includes('--catalog-only')) {
  await writeFile(path.join(root,'portfolio-catalog.js'),source);
} else {
  const output = path.join(await realpath(root),'dist');
  const existing = await realpath(output).catch(error=>{if(error.code==='ENOENT')return output;throw error;});
  if(existing !== output || path.dirname(output) !== await realpath(root)) throw new Error('Unsafe output path');
  await rm(output,{recursive:true,force:true});
  await mkdir(output);
  for(const entry of await readdir(root,{withFileTypes:true})) {
    if(entry.isFile() && /\.(html|css|js)$/.test(entry.name)) await cp(path.join(root,entry.name),path.join(output,entry.name));
  }
  for(const directory of ['assets','vendor','portfolio']) await cp(path.join(root,directory),path.join(output,directory),{recursive:true,filter:source=>!source.endsWith('.gitkeep')&&!source.endsWith('.md')});
  await writeFile(path.join(output,'portfolio-catalog.js'),source);
}
console.log(`Catalog ready: ${catalog.projects.length} videos.`);
