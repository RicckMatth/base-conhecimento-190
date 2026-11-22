import {randomUUID} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX=/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;
const VALID_TYPES=new Set(['heading','text','label','image','button','shape']);
const err=(message,status=400)=>Object.assign(new Error(message),{status});
let schemaReady;

export function canManageAnnouncements(user){
  return Boolean(user?.role==='admin'&&user?.operational_role==='dev'&&!user?.must_change_password);
}
export async function ensureAnnouncementSchema(pool){
  if(!schemaReady){
    schemaReady=(async()=>{
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_campaigns ("+
        "id uuid PRIMARY KEY,title text NOT NULL,summary text NOT NULL DEFAULT '',layout jsonb NOT NULL,"+
        "revision integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'draft' "+
        "CHECK(status IN ('draft','published','archived')),created_by uuid REFERENCES users(id),"+
        "updated_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),"+
        "updated_at timestamptz NOT NULL DEFAULT now(),last_published_at timestamptz)");
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_publications ("+
        "id uuid PRIMARY KEY,campaign_id uuid NOT NULL REFERENCES announcement_campaigns(id),"+
        "title text NOT NULL,summary text NOT NULL DEFAULT '',layout jsonb NOT NULL,"+
        "published_by uuid REFERENCES users(id),published_at timestamptz NOT NULL DEFAULT now())");
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_home_state ("+
        "singleton smallint PRIMARY KEY CHECK(singleton=1),active_publication_id uuid REFERENCES announcement_publications(id),"+
        "updated_at timestamptz NOT NULL DEFAULT now())");
      await pool.query("INSERT INTO announcement_home_state(singleton) VALUES(1) ON CONFLICT DO NOTHING");
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_notifications ("+
        "id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"+
        "publication_id uuid NOT NULL REFERENCES announcement_publications(id),"+
        "created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,"+
        "UNIQUE(user_id,publication_id))");
      await pool.query("CREATE INDEX IF NOT EXISTS announcement_notifications_user_idx "+
        "ON announcement_notifications(user_id,created_at DESC)");
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_assets ("+
        "id uuid PRIMARY KEY,pathname text NOT NULL UNIQUE,mime text NOT NULL DEFAULT 'image/webp',"+
        "size integer NOT NULL,width integer NOT NULL,height integer NOT NULL,content bytea,created_by uuid REFERENCES users(id),"+
        "created_at timestamptz NOT NULL DEFAULT now())");
      await pool.query('ALTER TABLE announcement_assets ADD COLUMN IF NOT EXISTS content bytea');
      await pool.query("CREATE TABLE IF NOT EXISTS announcement_publication_assets ("+
        "publication_id uuid NOT NULL REFERENCES announcement_publications(id),"+
        "asset_id uuid NOT NULL REFERENCES announcement_assets(id),"+
        "PRIMARY KEY(publication_id,asset_id))");
    })().catch(e=>{schemaReady=null;throw e});
  }
  return schemaReady;
}
const bounded=(v,min,max,fallback)=>{
  const n=Number(v);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const color=(v,fallback)=>typeof v==='string'&&HEX.test(v)?v:fallback;
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export function safeAnnouncementLink(value){
  const raw=str(value,500);
  if(!raw)return '';
  if(raw.startsWith('/')&&!raw.startsWith('//')&&!raw.includes('\\')&&!/[\u0000-\u001f]/.test(raw))return raw;
  try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function validateAnnouncementLayout(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw err('Layout do anúncio inválido.');
  const backdrop=value.background||{};
  const mode=['solid','gradient','image'].includes(backdrop.mode)?backdrop.mode:'gradient';
  const background={
    mode,
    color1:color(backdrop.color1,'#10354b'),
    color2:color(backdrop.color2,'#1d6170'),
    imageId:UUID.test(backdrop.imageId||'')?backdrop.imageId:null,
    overlay:bounded(backdrop.overlay,0,95,30)
  };
  if(mode==='image'&&!background.imageId)throw err('Selecione uma imagem de fundo antes de publicar.');
  if(!Array.isArray(value.elements)||value.elements.length>40)throw err('O anúncio admite até 40 elementos.');
  const ids=new Set();
  const elements=value.elements.map((item,i)=>{
    if(!item||!VALID_TYPES.has(item.type))throw err('Tipo de elemento não permitido.');
    const id=UUID.test(item.id||'')?item.id:randomUUID();
    if(ids.has(id))throw err('Elementos duplicados.');ids.add(id);
    const type=item.type;
    const element={
      id,type,
      x:bounded(item.x,0,96,6), y:bounded(item.y,0,96,12),
      w:bounded(item.w,4,100,40),h:bounded(item.h,5,100,30),
      z:i+1, text:str(item.text,1200),
      color:color(item.color,'#ffffff'),
      bgColor:color(item.bgColor,'#167f90'),
      fontSize:bounded(item.fontSize,11,76,type==='heading'?46:18),
      fontWeight:[400,500,600,700,800,900].includes(Number(item.fontWeight))?Number(item.fontWeight):700,
      align:['left','center','right'].includes(item.align)?item.align:'left',
      radius:bounded(item.radius,0,48,12),
      opacity:bounded(item.opacity,0.1,1,1),
      fit:['cover','contain'].includes(item.fit)?item.fit:'cover',
      imageId:UUID.test(item.imageId||'')?item.imageId:null,
      href:safeAnnouncementLink(item.href)
    };
    if(type==='image'&&!element.imageId)throw err('Adicione uma imagem aos elementos de imagem.');
    if(type==='button'&&item.href&&!element.href)throw err('Link de botão inválido.');
    return element;
  });
  const layout={background,elements};
  if(JSON.stringify(layout).length>38000)throw err('O anúncio excede o limite permitido.');
  return layout;
}
export function assetIdsForLayout(layout){
  const ids=new Set();
  if(layout.background?.mode==='image'&&layout.background.imageId)ids.add(layout.background.imageId);
  for(const element of layout.elements||[])if(element.type==='image'&&element.imageId)ids.add(element.imageId);
  return [...ids];
}
async function ensureAssets(client,layout){
  const ids=assetIdsForLayout(layout);
  if(!ids.length)return ids;
  const found=await client.query('SELECT id FROM announcement_assets WHERE id=ANY($1::uuid[])',[ids]);
  if(found.rows.length!==ids.length)throw err('Uma ou mais imagens não estão disponíveis. Envie novamente os arquivos.',409);
  return ids;
}
async function tx(pool,fn){
  const client=await pool.connect();
  try{await client.query('BEGIN');const out=await fn(client);await client.query('COMMIT');return out;}
  catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
const overviewFields="id,title,summary,status,revision,updated_at,last_published_at,created_at";
export async function announcementHome(pool){
  const r=await pool.query(
    "SELECT p.id,p.title,p.summary,p.layout,p.published_at FROM announcement_home_state h "+
    "LEFT JOIN announcement_publications p ON p.id=h.active_publication_id WHERE h.singleton=1");
  return {active:r.rows[0]?.id?r.rows[0]:null};
}
export async function announcementPublication(pool,id){
  if(!UUID.test(id||''))throw err('Publicação inválida.');
  const r=await pool.query("SELECT id,title,summary,layout,published_at FROM announcement_publications WHERE id=$1",[id]);
  if(!r.rows[0])throw err('Publicação não encontrada.',404);
  return {publication:r.rows[0]};
}
export async function announcementManageList(pool,user){
  if(!canManageAnnouncements(user))throw err('Acesso restrito.',403);
  const [r,home]=await Promise.all([
    pool.query("SELECT "+overviewFields+" FROM announcement_campaigns ORDER BY updated_at DESC LIMIT 80"),
    announcementHome(pool)
  ]);
  return {campaigns:r.rows,active:home.active,assetConfigured:true,assetStorage:process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN?'Vercel Blob':'Neon PostgreSQL'};
}
export async function announcementCampaign(pool,user,id){
  if(!canManageAnnouncements(user))throw err('Acesso restrito.',403);
  if(!UUID.test(id||''))throw err('Anúncio inválido.');
  const r=await pool.query("SELECT * FROM announcement_campaigns WHERE id=$1",[id]);
  if(!r.rows[0])throw err('Anúncio não encontrado.',404);
  return {campaign:r.rows[0]};
}
export async function saveAnnouncement(pool,user,raw,publish=false){
  if(!canManageAnnouncements(user))throw err('Acesso restrito.',403);
  const title=str(raw?.title,120),summary=str(raw?.summary,350);
  if(!title)throw err('Informe o título do anúncio.');
  const layout=validateAnnouncementLayout(raw.layout);
  const id=raw.id||randomUUID();
  if(!UUID.test(id))throw err('Anúncio inválido.');
  const revision=Number(raw.revision)||0;
  return tx(pool,async c=>{
    await c.query("SELECT pg_advisory_xact_lock(hashtext('base190-announcement-publish'))");
    const old=(await c.query('SELECT id,revision,status FROM announcement_campaigns WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(old&&old.revision!==revision)throw err('Esse anúncio foi alterado em outra sessão. Recarregue-o antes de salvar.',409);
    if(!old&&raw.id)throw err('Anúncio não encontrado.',404);
    await ensureAssets(c,layout);
    const campaign=(old?await c.query(
      "UPDATE announcement_campaigns SET title=$2,summary=$3,layout=$4::jsonb,revision=revision+1,"+
      "status=$5,updated_by=$6,updated_at=now() WHERE id=$1 RETURNING *",
      [id,title,summary,JSON.stringify(layout),publish?'published':old.status,user.id]
    ):await c.query(
      "INSERT INTO announcement_campaigns(id,title,summary,layout,created_by,updated_by,status) "+
      "VALUES($1,$2,$3,$4::jsonb,$5,$5,$6) RETURNING *",
      [id,title,summary,JSON.stringify(layout),user.id,publish?'published':'draft']
    )).rows[0];
    let publication=null;
    if(publish){
      const pubId=randomUUID();
      publication=(await c.query(
        "INSERT INTO announcement_publications(id,campaign_id,title,summary,layout,published_by) "+
        "VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING id,title,summary,layout,published_at",
        [pubId,id,title,summary,JSON.stringify(layout),user.id]
      )).rows[0];
      const assets=assetIdsForLayout(layout);
      for(const assetId of assets)await c.query(
        'INSERT INTO announcement_publication_assets(publication_id,asset_id) VALUES($1,$2)',
        [pubId,assetId]);
      await c.query("UPDATE announcement_home_state SET active_publication_id=$1,updated_at=now() WHERE singleton=1",[pubId]);
      await c.query("UPDATE announcement_campaigns SET last_published_at=now() WHERE id=$1",[id]);
      await c.query(
        "INSERT INTO announcement_notifications(id,user_id,publication_id) "+
        "SELECT gen_random_uuid(),u.id,$1 FROM users u WHERE u.active=true",
        [pubId]);
      await c.query("INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)",
        [randomUUID(),user.id,'announcement_published',id]);
    }else{
      await c.query("INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)",
        [randomUUID(),user.id,'announcement_saved',id]);
    }
    return {campaign,publication,message:publish?'Anúncio publicado e notificações distribuídas para os usuários.':'Rascunho salvo.'};
  });
}
export async function restoreDefaultHero(pool,user){
  if(!canManageAnnouncements(user))throw err('Acesso restrito.',403);
  return tx(pool,async c=>{
    await c.query("SELECT pg_advisory_xact_lock(hashtext('base190-announcement-publish'))");
    await c.query("UPDATE announcement_home_state SET active_publication_id=NULL,updated_at=now() WHERE singleton=1");
    await c.query("INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)",[randomUUID(),user.id,'announcement_default_restored','home']);
    return {active:null,message:'Banner padrão restaurado. Publicações anteriores permanecem no histórico.'};
  });
}
export async function userAnnouncementNotifications(pool,user,limit=50){
  const [r,count]=await Promise.all([
    pool.query("SELECT n.id,n.read_at,n.created_at,n.publication_id,p.title,p.summary,p.published_at "+
      "FROM announcement_notifications n JOIN announcement_publications p ON p.id=n.publication_id "+
      "WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT $2",[user.id,Math.min(limit,80)]),
    pool.query("SELECT count(*)::int AS unread FROM announcement_notifications WHERE user_id=$1 AND read_at IS NULL",[user.id])
  ]);
  return {notifications:r.rows,unread:count.rows[0]?.unread||0};
}
export async function markAnnouncementRead(pool,user,notificationId){
  if(!UUID.test(notificationId||''))throw err('Notificação inválida.');
  const r=await pool.query(
    "UPDATE announcement_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING publication_id",
    [notificationId,user.id]);
  if(!r.rows.length)throw err('Notificação não encontrada.',404);
  return {publicationId:r.rows[0].publication_id};
}
export async function markAllAnnouncementsRead(pool,user){
  await pool.query("UPDATE announcement_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL",[user.id]);
  return {ok:true};
}
export async function registerAnnouncementAsset(pool,user,image,storage){
  if(!canManageAnnouncements(user))throw err('Acesso restrito.',403);
  const id=randomUUID(),path='announcements/'+id+'.webp';
  const hasBlob=Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN);
  // Prefer private Blob; on projects without Blob keep compressed WebP in a
  // strictly bounded Neon bytea fallback, so image upload works out of the box.
  if(!hasBlob){
    if(image.data.length>2*1024*1024)throw err('Imagem processada maior que 2 MB. Reduza a imagem para armazenar no Neon.',413);
    const usage=await pool.query(
      "SELECT coalesce(sum(size),0)::bigint AS bytes FROM announcement_assets WHERE content IS NOT NULL");
    if(Number(usage.rows[0]?.bytes||0)+image.data.length>40*1024*1024)
      throw err('Limite de armazenamento de anúncios atingido. Configure o Vercel Blob privado para mais espaço.',507);
    await pool.query(
      "INSERT INTO announcement_assets(id,pathname,mime,size,width,height,content,created_by) "+
      "VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id,'postgres/'+id,image.mime,image.data.length,image.width,image.height,image.data,user.id]);
  }else{
    const blob=await storage.put(path,image.data,{
      access:'private',contentType:image.mime,addRandomSuffix:false,abortSignal:AbortSignal.timeout(15000)
    });
    try{
      await pool.query(
        "INSERT INTO announcement_assets(id,pathname,mime,size,width,height,created_by) "+
        "VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id,blob.pathname,image.mime,image.data.length,image.width,image.height,user.id]);
    }catch(e){await storage.del(blob.pathname).catch(()=>{});throw e;}
  }
  return {id,src:'/api/announcements/assets/'+id,width:image.width,height:image.height};
}
export async function readableAnnouncementAsset(pool,user,id){
  if(!UUID.test(id||''))throw err('Imagem inválida.');
  const row=(await pool.query(
    "SELECT a.* FROM announcement_assets a WHERE a.id=$1 AND ("+
      "EXISTS(SELECT 1 FROM announcement_publication_assets pa WHERE pa.asset_id=a.id) OR "+
      "($2::boolean AND a.created_by=$3))",
    [id,canManageAnnouncements(user),user.id]
  )).rows[0];
  if(!row)throw err('Imagem não encontrada.',404);
  return row;
}
