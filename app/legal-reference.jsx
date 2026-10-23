'use client';
import {useState} from 'react';
import {Icon} from './icons.jsx';
const labels={cp:'Referência no Código Penal',special:'Legislação específica',dependent:'Depende dos fatos',service:'Sem crime definido pelo título'};
export default function LegalReference({legal}){
 const [copied,setCopied]=useState(false),[error,setError]=useState('');
 if(!legal)return null;
 async function copy(){
  const text=['REFERÊNCIA JURÍDICA SUGERIDA',...(legal.references||[]).map(r=>`${r.article} - ${r.law}${r.condition?' ('+r.condition+')':''}`),legal.note,'Conferência das fontes: '+legal.reviewedAt].join('\n');
  try{await navigator.clipboard.writeText(text);setCopied(true);setError('');}catch{setError('Selecione a referência para copiar manualmente.');}
 }
 return <section className="legal-reference" aria-label="Referência jurídica"><header><Icon name="book" size={19}/><h3>Referência jurídica</h3><span className="badge">{labels[legal.status]||'A conferir'}</span></header>
  {legal.references?.length?<ul>{legal.references.map((r,i)=><li key={r.lawId+'-'+i}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.article} · {r.law} <span aria-hidden="true">↗</span></a>{r.condition&&<p>{r.condition}</p>}{['protection','administrative','jurisprudence','mixed'].includes(r.kind)&&<small>{({protection:'Proteção / contexto',administrative:'Referência administrativa',jurisprudence:'Jurisprudência',mixed:'Distinguir hipótese administrativa e penal'})[r.kind]}</small>}</li>)}</ul>:<p>Não há artigo penal específico a atribuir somente com essa descrição.</p>}
  <p className="legal-note">{legal.note}</p><div className="btn-row"><button type="button" className="btn ghost tiny" onClick={copy}>{copied?'Referência copiada':'Copiar referência'}</button><small>Fontes conferidas em {legal.reviewedAt?.split('-').reverse().join('/')}.</small></div>{error&&<small role="status">{error}</small>}
  <small>Referência para consulta. O reconhecimento do texto não confirma os elementos do crime.</small>
 </section>;
}
