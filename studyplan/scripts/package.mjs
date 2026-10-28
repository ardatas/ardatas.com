import {mkdir,cp,writeFile,readdir,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const stage=`artifacts/release-${stamp}`;
await mkdir(`${stage}/studyplan`,{recursive:true});
await cp('dist',`${stage}/studyplan`,{recursive:true});
const html=await readFile(`${stage}/studyplan/index.html`,'utf8');
if(!html.includes('/assets/')||!html.includes('viewport-v2'))throw Error('Build does not target the subdomain root');
const manifest=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())await walk(path);else manifest.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${path.slice(stage.length+1)}`);}}
await walk(`${stage}/studyplan`);
await writeFile(`${stage}/SHA256SUMS.txt`,manifest.join('\n')+'\n');
await cp('docs/DEPLOYMENT.md',`${stage}/DEPLOYMENT.md`);
execFileSync('/usr/bin/zip',['-qr',`../studyplan-${stamp}.zip`,'studyplan','SHA256SUMS.txt','DEPLOYMENT.md'],{cwd:stage});
console.log(`Deployment directory: ${stage}/studyplan\nArchive: artifacts/studyplan-${stamp}.zip`);

await rm('artifacts/studyplan-v2-upload.zip',{force:true});
execFileSync('/usr/bin/zip',['-qr','../artifacts/studyplan-v2-upload.zip','.','-x','.htaccess'],{cwd:'dist'});
console.log('Upload-only archive: artifacts/studyplan-v2-upload.zip (extract into dedicated document root)');
