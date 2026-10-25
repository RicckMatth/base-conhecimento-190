import Image from '@tiptap/extension-image';
import {Extension,mergeAttributes} from '@tiptap/core';
const width=v=>Math.max(100,Math.min(1200,parseInt(v)||720));
export const DocumentImage=Image.extend({
 addAttributes(){const attrs=this.parent?.()||{};for(const key of ['src','alt','title','width','height'])attrs[key]={...(attrs[key]||{}),parseHTML:el=>{const img=el.tagName==='IMG'?el:el.querySelector('img');const value=img?.getAttribute(key);return key==='width'?width(value):value;}};return {...attrs,caption:{default:'',parseHTML:el=>(el.tagName==='IMG'?el:el.querySelector('img'))?.getAttribute('data-caption')||'',renderHTML:a=>({'data-caption':a.caption})},align:{default:'center',parseHTML:el=>(el.tagName==='IMG'?el:el.querySelector('img'))?.getAttribute('data-align')||'center',renderHTML:a=>({'data-align':a.align})}};},

 parseHTML(){return [{tag:'figure[data-type=doc-image]',getAttrs:el=>{const img=el.querySelector('img');return img?{src:img.getAttribute('src'),alt:img.getAttribute('alt')||'',title:img.getAttribute('title'),width:width(img.getAttribute('width')),caption:img.getAttribute('data-caption')||el.querySelector('figcaption')?.textContent||'',align:img.getAttribute('data-align')||'center'}:false;}},...this.parent()];},
 renderHTML({HTMLAttributes,node}){return ['figure',{'data-type':'doc-image'},['img',mergeAttributes(HTMLAttributes,{width:width(node.attrs.width)})],['figcaption',{},node.attrs.caption||'']];},
 addNodeView(){return ({node,getPos,editor})=>{let current=node;const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),handle=document.createElement('button');figure.dataset.type='doc-image';handle.type='button';handle.className='image-resize-handle';handle.setAttribute('aria-label','Arraste para redimensionar a imagem');handle.textContent='↔';figure.append(img,caption,handle);
 const draw=()=>{img.src=current.attrs.src;img.alt=current.attrs.alt||'';img.title=current.attrs.title||'';img.draggable=false;figure.style.width=width(current.attrs.width)+'px';figure.dataset.align=current.attrs.align||'center';caption.textContent=current.attrs.caption||'';handle.hidden=!editor.isEditable;};draw();
 img.addEventListener('mousedown',()=>{if(editor.isEditable&&typeof getPos()==='number')editor.commands.setNodeSelection(getPos());});
 let startX=0,startWidth=0,resizing=false;
 handle.onpointerdown=e=>{e.preventDefault();if(!editor.isEditable)return;resizing=true;startX=e.clientX;startWidth=figure.getBoundingClientRect().width;handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(resizing)figure.style.width=width(startWidth+e.clientX-startX)+'px';};
 handle.onpointerup=e=>{if(!resizing)return;resizing=false;const value=width(startWidth+e.clientX-startX);const pos=getPos();if(typeof pos==='number')editor.view.dispatch(editor.state.tr.setNodeMarkup(pos,undefined,{...current.attrs,width:value}));};handle.onpointercancel=()=>{resizing=false;draw();};
 return {dom:figure,update(updated){if(updated.type!==current.type)return false;current=updated;draw();return true;},stopEvent:e=>handle.contains(e.target),ignoreMutation:()=>true,destroy(){handle.onpointerdown=null;handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;}};
 };}
});

export const DocumentAnchors=Extension.create({name:'documentAnchors',addGlobalAttributes(){return [{types:['heading'],attributes:{id:{default:null,parseHTML:el=>/^h-[a-z0-9-]+$/.test(el.id)?el.id:null,renderHTML:attrs=>attrs.id?{id:attrs.id}:{}}}}];}});
