import { Icon } from './icons.jsx';

export default function StartupScreen({phase='session'}){
 const catalog=phase==='catalog';
 return <main className="startup-screen" aria-busy="true" aria-label="Inicialização da CIJ 190">
  <div className="startup-grid" aria-hidden="true"/>
  <header className="startup-header"><div className="startup-brand"><span>190</span><div><b>BASE DE CONHECIMENTO</b><small>APOIO AO ATENDIMENTO</small></div></div><span className="startup-secure"><Icon name="lock" size={14}/> Ambiente protegido</span></header>
  <section className="startup-center">
   <div className="startup-emblem" aria-hidden="true"><span className="startup-orbit"/><span className="startup-orbit inner"/><div className="startup-shield"><Icon name="shield" size={51}/></div><span className="startup-emblem-dot"/></div>
   <span className="startup-eyebrow">CENTRAL DE CONHECIMENTO · 190</span>
   <h1>Preparando seu<br/><span>ambiente de trabalho.</span></h1>
   <p className="startup-description">Conhecimento organizado para apoiar<br className="startup-break"/> cada atendimento.</p>
   <div className="startup-progress-card">
    <div className="startup-status" role="status" aria-live="polite"><span className="startup-spinner" aria-hidden="true"/><span>{catalog?'Carregando a base de conhecimento…':'Iniciando conexão segura…'}</span></div>
    <div className="startup-track" aria-hidden="true"><span/></div>
    <div className="startup-steps" aria-hidden="true"><span className={catalog?'complete':'current'}><i>{catalog?'✓':'01'}</i> Validar sessão</span><span className={catalog?'current':''}><i>02</i> Preparar consultas</span></div>
   </div>
  </section>
  <footer className="startup-footer"><span><Icon name="shield" size={14}/> Acesso individual e autorizado</span><span>BASE 190</span></footer>
 </main>;
}
