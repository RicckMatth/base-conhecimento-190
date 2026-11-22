// Dados de navegação mantidos fora do render para manter a transição previsível.
export const NAVIGATION_TABS = Object.freeze([
  'home','docs','catalog','chat','floor','operations','quality','access',
  'announcements','editor','rules','audit','detail'
]);
export const NAVIGATION_LABELS = Object.freeze({
  home:'Visão geral',
  docs:'Base de conhecimento',
  catalog:'Catálogo de naturezas',
  chat:'Chat 190',
  floor:'Gestão de piso',
  operations:'Pausas e folgas',
  quality:'Qualidade',
  access:'Acessos e cargos',
  announcements:'Estúdio de anúncios',
  editor:'Editor de textos',
  rules:'Regras do assistente',
  audit:'Auditoria',
  detail:'Detalhes da natureza'
});
export const NAVIGATION_ICONS = Object.freeze({
  home:'home',docs:'book',catalog:'book',chat:'brain',floor:'shield',
  operations:'calendar',quality:'audit',access:'users',
  announcements:'megaphone',editor:'edit',rules:'settings',audit:'audit',
  detail:'book'
});
export function tabLabel(key) {
  return NAVIGATION_LABELS[key] || 'Centro 190';
}
export function tabIcon(key) {
  return NAVIGATION_ICONS[key] || 'shield';
}
export function safeNavigationTarget(requested,allowed,fallback='home') {
  const normalized=requested==='brain'?'chat':requested;
  if(normalized==='detail'&&allowed.includes('catalog'))return 'detail';
  if(allowed.includes(normalized))return normalized;
  return allowed.includes(fallback)?fallback:(allowed[0]||'home');
}
export function tabDirection(from,to) {
  const a=NAVIGATION_TABS.indexOf(from),b=NAVIGATION_TABS.indexOf(to);
  return a>=0&&b>=0&&b<a?'back':'forward';
}
export function tabMotionTiming(reduced=false) {
  return reduced?{exit:0,enter:0,indicator:0}:{exit:135,enter:355,indicator:220};
}
