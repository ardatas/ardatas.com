import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://studyplan.ardatas.com/';
const results=[];
async function walk(dir,prefix='') {for(const file of await readdir(dir,{withFileTypes:true})){const rel=prefix+file.name;if(file.isDirectory())await walk(dir+'/'+file.name,rel+'/');else if(rel!=='.htaccess'){const expected=await readFile(dir+'/'+file.name);const response=await fetch(new URL(rel==='index.html'?'':rel,base),{signal:AbortSignal.timeout(20000)});const received=Buffer.from(await response.arrayBuffer());const hash=b=>createHash('sha256').update(b).digest('hex');if(response.status!==200||hash(expected)!==hash(received))throw Error(`${rel}: status ${response.status}, artifact match ${hash(expected)===hash(received)}`);results.push({file:rel,status:response.status,sha256:hash(received)});}}}
await walk('dist');
const personal=await fetch('https://ardatas.com/',{signal:AbortSignal.timeout(20000)});
if(personal.status!==200)throw Error('Personal homepage returned '+personal.status);
const report={checkedAt:new Date().toISOString(),url:base,files:results,personalHomepageStatus:personal.status};
await writeFile('artifacts/live-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${results.length} live files with exact SHA-256 parity over HTTPS; personal homepage HTTP ${personal.status}.`);
