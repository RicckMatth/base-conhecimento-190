// Local SVG symbols: consistent 24 px grid, no font or external request.
const paths={
 home:'m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 book:'M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2m0-15c3-3 7-3 10-2v15c-4-1-7 0-10 2V6',
 brain:'M9 18H7a4 4 0 0 1-3-7 4 4 0 0 1 4-6 4 4 0 0 1 4-3v20a4 4 0 0 1-4-4m7 0h2a4 4 0 0 0 3-7 4 4 0 0 0-4-6 4 4 0 0 0-4-3m-5 8h2m6 0h2M7 14h2m6 0h2',
 link:'m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
 edit:'m15 4 5 5M4 16 16 4a3 3 0 0 1 4 4L8 20l-5 1Z',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',
 settings:'M4 7h16M4 17h16M8 4v6m8 4v6',
 audit:'M9 4H5v17h14V4h-4M9 2h6v5H9ZM8 12h8m-8 4h5',
 logout:'M9 3H3v18h6m5-14 5 5-5 5m-7-5h14',
 shield:'m12 3 9 4v5c0 5-9 10-9 10S3 17 3 12V7Zm-4 9 3 3 5-6',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
 moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
 arrow:'M4 12h16m-6-6 6 6-6 6',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
 plus:'M12 4v16M4 12h16',
 car:'m5 6-3 7v6h3v-3h14v3h3v-6l-3-7ZM2 12h20M6 13v1m12-1v1',
 leaf:'M20 3C5 1 1 8 5 16s17 4 15-13ZM4 21 15 10',
 pulse:'M2 12h5l3-8 4 16 3-8h5',
 lock:'M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4m-4 5v2',
 building:'M4 21V3h12v18m0-11h5v11M1 21h22M8 7h4m-4 4h4m-4 4h4',
 phone:'m5 3 4 4-2 3a16 16 0 0 0 7 7l3-2 4 4c-2 5-8 3-13-2S1 5 5 3Z'
};
export function Icon({name='shield',size=20,...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]||paths.shield}/></svg>}
export const categoryIcon=category=>({'Pessoas':'users','Proteção':'shield','Patrimônio':'building','Trânsito':'car','Meio ambiente':'leaf','Emergência':'pulse','Ordem pública':'shield','Atendimento':'phone'}[category]||'book');
