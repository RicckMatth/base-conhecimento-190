'use client';
import {useRef} from 'react';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const fmt=n=>Math.round(n*10)/10;
const src=id=>'/api/announcements/assets/'+id;
function ElementContent({element,editable}){
  if(element.type==='image')
    return element.imageId?<img src={src(element.imageId)} alt={element.text||'Imagem do anúncio'} draggable={false}
      style={{height:'100%',width:'100%',objectFit:element.fit||'cover',borderRadius:element.radius}}/>:
      <span>Selecione uma imagem</span>;
  if(element.type==='shape')return null;
  const content=<span className="ann-layer-text">{element.text||'Seu texto aqui'}</span>;
  if(element.type==='button'&&!editable&&element.href)
    return <a className="ann-layer-action" href={element.href}
      target={element.href.startsWith('http')?'_blank':undefined}
      rel={element.href.startsWith('http')?'noopener noreferrer':undefined}>{content}</a>;
  return content;
}
export default function AnnouncementCanvas({layout,editable=false,selectedId=null,onSelect=()=>{},onChange=()=>{},mobile=false,title='Anúncio'}){
  const stage=useRef(null),drag=useRef(null);
  const bg=layout?.background||{mode:'gradient',color1:'#10354b',color2:'#1d6170'};
  const background=bg.mode==='image'&&bg.imageId
    ? {backgroundImage:'linear-gradient(rgba(8,22,32,'+(Number(bg.overlay)||0)/100+'),rgba(8,22,32,'+(Number(bg.overlay)||0)/100+')), url("'+src(bg.imageId)+'")',backgroundSize:'cover',backgroundPosition:'center'}
    : bg.mode==='solid'?{backgroundColor:bg.color1}:{background:'linear-gradient(115deg,'+bg.color1+','+bg.color2+')'};
  function pointerDown(e,element){
    if(!editable||e.button!==0)return;
    e.preventDefault();
    const rect=stage.current?.getBoundingClientRect();
    if(!rect)return;
    const resize=Boolean(e.target.closest('.ann-resize-handle'));
    drag.current={id:element.id,x:e.clientX,y:e.clientY,from:{...element},width:rect.width,height:rect.height,resize};
    onSelect(element.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e){
    const d=drag.current;
    if(!d||!editable)return;
    e.preventDefault();
    const dx=(e.clientX-d.x)/d.width*100,dy=(e.clientY-d.y)/d.height*100;
    if(d.resize){
      const w=fmt(clamp(d.from.w+dx,5,100-d.from.x));
      const h=fmt(clamp(d.from.h+dy,6,100-d.from.y));
      onChange(d.id,{w,h});
    }else{
      onChange(d.id,{
        x:fmt(clamp(d.from.x+dx,0,100-d.from.w)),
        y:fmt(clamp(d.from.y+dy,0,100-d.from.h))
      });
    }
  }
  function keyMove(e,element){
    if(!editable||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();
    const step=e.shiftKey?2:0.5;
    let x=element.x,y=element.y;
    if(e.key==='ArrowRight')x+=step;
    if(e.key==='ArrowLeft')x-=step;
    if(e.key==='ArrowDown')y+=step;
    if(e.key==='ArrowUp')y-=step;
    onChange(element.id,{x:fmt(clamp(x,0,100-element.w)),y:fmt(clamp(y,0,100-element.h))});
  }
  return <div
    ref={stage}
    role={editable?'group':'region'}
    aria-label={editable?'Área editável: arraste elementos e use as setas para movê-los':title}
    className={'ann-stage'+(editable?' is-editing':'')+(mobile?' is-mobile':'')}
    style={background}>
    <div className="ann-stage-decor" aria-hidden="true"/>
    {(layout?.elements||[]).map((element,index)=>{
      const selected=editable&&selectedId===element.id;
      const style={
        '--ann-x':String(element.x)+'%',
        '--ann-y':String(element.y)+'%',
        '--ann-w':String(element.w)+'%',
        '--ann-h':String(element.h)+'%',
        '--ann-z':element.z||index+1,
        color:element.color,
        fontSize:element.fontSize,
        fontWeight:element.fontWeight,
        textAlign:element.align||'left',
        borderRadius:element.radius,
        opacity:element.opacity,
        backgroundColor:['button','label','shape'].includes(element.type)?element.bgColor:'transparent',
        justifyContent:element.align==='center'?'center':element.align==='right'?'flex-end':'flex-start'
      };
      return <div key={element.id} tabIndex={editable?0:undefined}
        role={editable?'button':undefined}
        aria-label={editable?element.type+': '+(element.text||'elemento')+'; use as setas para mover':undefined}
        className={'ann-layer ann-layer-'+element.type+(selected?' is-selected':'')}
        style={style}
        onPointerDown={e=>pointerDown(e,element)}
        onPointerMove={pointerMove}
        onPointerUp={()=>{drag.current=null;}}
        onPointerCancel={()=>{drag.current=null;}}
        onKeyDown={e=>keyMove(e,element)}
        onClick={editable?()=>onSelect(element.id):undefined}>
        <ElementContent element={element} editable={editable}/>
        {selected&&<span className="ann-resize-handle" aria-label="Arrastar para redimensionar" title="Arraste para redimensionar"/>}
      </div>;
    })}
    {editable&&!(layout?.elements||[]).length&&
      <div className="ann-empty-canvas">Adicione um título, imagem, texto ou botão para começar.</div>}
  </div>;
}
