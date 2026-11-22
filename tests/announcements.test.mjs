import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {
  validateAnnouncementLayout,assetIdsForLayout,safeAnnouncementLink,canManageAnnouncements,
  ensureAnnouncementSchema,saveAnnouncement,announcementHome,announcementPublication,
  userAnnouncementNotifications,markAnnouncementRead,restoreDefaultHero,registerAnnouncementAsset,readableAnnouncementAsset
} from '../lib/announcements.js';

const admin={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'admin',operational_role:'dev',must_change_password:false};
const user={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',role:'user',operational_role:'attendant'};
const disabled={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',role:'user',operational_role:'attendant'};
const itemId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const validLayout={
 background:{mode:'gradient',color1:'#102f45',color2:'#246a79',overlay:35},
 elements:[
   {id:itemId,type:'heading',x:7,y:20,w:55,h:25,text:'Aviso operacional',color:'#ffffff',fontSize:40,fontWeight:900},
   {type:'button',x:7,y:70,w:20,h:12,text:'Consultar',href:'/catalog',bgColor:'#2aabc3'}
 ]
};
test('somente o administrador Dev pode publicar anúncios',()=>{
 assert.equal(canManageAnnouncements(admin),true);
 assert.equal(canManageAnnouncements({...admin,role:'user'}),false);
 assert.equal(canManageAnnouncements({...admin,operational_role:'coordinator'}),false);
 assert.equal(canManageAnnouncements({...admin,must_change_password:true}),false);
});
test('layout só aceita blocos suportados e valores seguros',()=>{
 const layout=validateAnnouncementLayout(validLayout);
 assert.equal(layout.elements.length,2);
 assert.equal(layout.background.color1,'#102f45');
 assert.equal(layout.elements[0].text,'Aviso operacional');
 assert.ok(layout.elements[1].id);
 assert.equal(assetIdsForLayout(layout).length,0);
 assert.throws(()=>validateAnnouncementLayout({background:{},elements:[{type:'script'}]}));
 assert.throws(()=>validateAnnouncementLayout({background:{mode:'image'},elements:[]}));
 assert.throws(()=>validateAnnouncementLayout({elements:new Array(41).fill({type:'text'})}));
 const clamped=validateAnnouncementLayout({elements:[{type:'text',x:-200,y:800,w:500,h:0,text:'X',color:'red'}]});
 assert.equal(clamped.elements[0].x,0);
 assert.equal(clamped.elements[0].w,100);
 assert.equal(clamped.elements[0].color,'#ffffff');
});
test('links de anúncios bloqueiam javascript, data e open redirect por //',()=>{
 assert.equal(safeAnnouncementLink('javascript:alert(1)'),'');
 assert.equal(safeAnnouncementLink('data:text/html,payload'),'');
 assert.equal(safeAnnouncementLink('//malicious.example/'),'');
 assert.equal(safeAnnouncementLink('/catalog'),'/catalog');
 assert.equal(safeAnnouncementLink('https://example.org/news'),'https://example.org/news');
});
test('publicar cria versão imutável e notificação persistente por usuário ativo',async()=>{
 const pg=new PGlite();
 const db={
  query:(...args)=>pg.query(...args),
  connect:async()=>({query:(...args)=>pg.query(...args),release:()=>{}})
 };
 try{
  await pg.exec("CREATE TABLE users(id uuid PRIMARY KEY,active boolean NOT NULL DEFAULT true)");
  await pg.exec("CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid REFERENCES users(id),action text NOT NULL,target text,at timestamptz DEFAULT now())");
  await pg.query('INSERT INTO users(id,active) VALUES($1,true),($2,true),($3,false)',[admin.id,user.id,disabled.id]);
  await ensureAnnouncementSchema(db);
  // Image uploads still work without a Vercel Blob store: compressed bytes
  // fall back to private Neon storage, visible to everyone only after publishing.
  const uploaded=await registerAnnouncementAsset(db,admin,{
    data:Buffer.alloc(512,7),mime:'image/webp',width:40,height:40
  },{put:()=>{throw Error('Unexpected Blob upload');},del:async()=>{}});
  assert.ok(uploaded.id);
  await assert.rejects(readableAnnouncementAsset(db,user,uploaded.id),e=>e.status===404);
  const first=await saveAnnouncement(db,admin,{title:'Atualização 190',summary:'Confira as novidades',layout:validLayout},true);
  assert.ok(first.publication.id);
  const active=await announcementHome(db);
  assert.equal(active.active.title,'Atualização 190');
  const userNotifications=await userAnnouncementNotifications(db,user);
  assert.equal(userNotifications.unread,1);
  assert.equal(userNotifications.notifications.length,1);
  const disabledNotifications=await userAnnouncementNotifications(db,disabled);
  assert.equal(disabledNotifications.unread,0);
  await markAnnouncementRead(db,user,userNotifications.notifications[0].id);
  assert.equal((await userAnnouncementNotifications(db,user)).unread,0);
  const updatedLayout=structuredClone(validLayout);
  updatedLayout.elements[0].text='Texto novo';
  updatedLayout.elements.push({type:'image',imageId:uploaded.id,x:70,y:12,w:25,h:65,text:'Imagem'});
  const second=await saveAnnouncement(db,admin,{id:first.campaign.id,revision:first.campaign.revision,
    title:'Aviso revisado',summary:'Novos detalhes',layout:updatedLayout},true);
  const visibleAsset=await readableAnnouncementAsset(db,user,uploaded.id);
  assert.equal(visibleAsset.content.length,512);
  assert.equal(assetIdsForLayout(second.publication.layout)[0],uploaded.id);
  assert.notEqual(second.publication.id,first.publication.id);
  assert.equal((await userAnnouncementNotifications(db,user)).unread,1);
  const old=await announcementPublication(db,first.publication.id);
  assert.equal(old.publication.layout.elements[0].text,'Aviso operacional');
  const restored=await restoreDefaultHero(db,admin);
  assert.equal(restored.active,null);
  assert.equal((await announcementHome(db)).active,null);
  assert.equal((await announcementPublication(db,second.publication.id)).publication.title,'Aviso revisado');
  await assert.rejects(saveAnnouncement(db,user,{title:'Não autorizado',layout:validLayout},true),e=>e.status===403);
 }finally{await pg.close();}
});
test('a página inicial conserva o banner original e o atalho de anúncios',()=>{
 const src=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(src,/Clareza para cada atendimento/);
 assert.match(src,/AnnouncementCanvas/);
 assert.match(src,/AnnouncementNotifications/);
 assert.match(src,/Anúncios/);
 assert.match(src,/Voltar ao anúncio atual/);
});
