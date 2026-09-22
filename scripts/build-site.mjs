import {mkdir,writeFile,readdir,cp,rm,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanPortfolio,serializeCatalog} from './catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const portfolio=path.join(root,'portfolio');const catalog=await scanPortfolio(portfolio);const generated=serializeCatalog(catalog);
if(process.argv.includes('--catalog-only'))await writeFile(path.join(root,'portfolio-catalog.js'),generated);
else{const actualRoot=await realpath(root);const output=path.join(actualRoot,'dist');const existing=await realpath(output).catch(error=>{if(error.code==='ENOENT')return output;throw error;});if(existing!==output||path.dirname(output)!==actualRoot)throw new Error('Unsafe output path');await rm(output,{recursive:true,force:true});await mkdir(output);for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&/\.(html|css|js)$/.test(entry.name))await cp(path.join(root,entry.name),path.join(output,entry.name));for(const directory of ['assets','vendor','portfolio'])await cp(path.join(root,directory),path.join(output,directory),{recursive:true,filter:source=>!source.endsWith('.gitkeep')&&!source.endsWith('.md')});await writeFile(path.join(output,'portfolio-catalog.js'),generated);}
console.log(`Catalog ready: ${catalog.projects.length} videos.`);
