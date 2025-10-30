import React,{useCallback}from'react';
import{useLayoutStore}from'../store/layoutStore';
import{importKLE}from'../utils/importKLE';
import{exportZMK,exportQMK}from'../utils/exportZMK';

export const Toolbar:React.FC=()=>{
  const{setKeys,rotateSelected,keys,unitPitch,viewMode,setViewMode}=useLayoutStore();
  const importFile=(f:File)=>{const r=new FileReader();r.onload=()=>{try{setKeys(importKLE(JSON.parse(r.result as string)));}catch{alert('Invalid KLE JSON');}};r.readAsText(f);};
  const onImport=(e:React.ChangeEvent<HTMLInputElement>)=>{if(e.target.files?.[0])importFile(e.target.files[0]);};
  const onDrop=useCallback((e:React.DragEvent<HTMLDivElement>)=>{e.preventDefault();if(e.dataTransfer.files?.[0])importFile(e.dataTransfer.files[0]);},[]);
  const download=(name:string,data:string,type:string)=>{const blob=new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();};
  return(<div style={{display:'flex',gap:10,padding:10,borderBottom:'1px solid #223'}} onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
    <input type="file" accept=".json" onChange={onImport}/>
    <button onClick={()=>rotateSelected(15)}>Rotate +15°</button>
    <button onClick={()=>download('layout.keymap',exportZMK(keys,unitPitch),'text/plain')}>Export ZMK</button>
    <button onClick={()=>download('layout_qmk.json',JSON.stringify(exportQMK(keys),null,2),'application/json')}>Export QMK</button>
    <button onClick={()=>setViewMode(viewMode==='canvas'?'node':'canvas')}>
      {viewMode==='canvas'?'Show Node Editor':'Show Canvas Editor'}
    </button>
    <span style={{marginLeft:'auto',opacity:0.7}}>💡 KLE JSONをドラッグ＆ドロップでインポート</span>
  </div>);
};
