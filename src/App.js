import {useState,useRef,useEffect} from 'react';

export default function App(){
  const [msg,setMsg]=useState('');
  const [chat,setChat]=useState([]);
  const box=useRef();

  useEffect(()=>{ if(box.current) box.current.scrollTop=box.current.scrollHeight; },[chat]);

  const send=async()=>{
    if(!msg.trim())return;
    setChat(c=>[...c,{from:'user',text:msg}]);
    const r=await fetch('/.netlify/functions/dialogflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:msg})});
    const d=await r.json();
    setChat(c=>[...c,{from:'bot',text:d.reply||'...'}]);
    setMsg('');
  };

  return (
    <div className="container">
      <div className="header">ScriptBees Assistant</div>
      <div className="chatbox" ref={box}>
        {chat.map((c,i)=>(
          <div key={i} className={'msg '+c.from}>
            <div className="bubble">{c.text}</div>
          </div>
        ))}
      </div>
      <div className="composer">
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}