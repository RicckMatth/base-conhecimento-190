import {fetchLaw} from '../lib/juridico/ingestion.js';
import {SOURCES} from '../lib/juridico/sources.js';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('legal-source-check',{recursive:true});const report=[];
for(const code of process.argv.slice(2).length?process.argv.slice(2):Object.keys(SOURCES)){
 try{const doc=await fetchLaw(code);await writeFile('legal-source-check/'+code+'.html',doc.html);report.push({code,source:doc.source.url,retrievedAt:doc.retrievedAt,hash:doc.hash,articles:doc.articles.length,warnings:doc.warnings,status:'captured-not-reviewed'});}catch(e){report.push({code,status:'failed',error:e.message});}
 console.log(JSON.stringify(report.at(-1)));
}await writeFile('legal-source-check/report.json',JSON.stringify(report,null,2));
