(function(){
  const state = { open:false, history:[], sending:false };
  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
  function ensureUI(){
    if (document.querySelector('#tmc-chat-button')) return;
    const btn = el('<button id="tmc-chat-button" class="tmc-chat-button left-hero" aria-label="Chat">💬</button>');
    const win = el(
      '<div id="tmc-chat-window" class="tmc-chat-window left-hero" role="dialog" aria-label="Truemark Assistant">\n' +
      '  <div class="tmc-chat-header">\n' +
      '    <span>Truemark Assistant</span>\n' +
      '    <button id="tmc-close" style="background:transparent;border:none;color:#fff;cursor:pointer">✕</button>\n' +
      '  </div>\n' +
      '  <div id="tmc-messages" class="tmc-chat-messages"></div>\n' +
      '  <div class="tmc-chat-input">\n' +
      '    <input id="tmc-input" type="text" placeholder="Ask about TruemarkCreatives..." />\n' +
      '    <button id="tmc-send">Send</button>\n' +
      '  </div>\n' +
      '  <div class="tmc-chat-footer">\n' +
      '    <a href="https://maps.app.goo.gl/qVgCT4foCeezU7oz5?g_st=awb" target="_blank" rel="noopener">📍 View our location on Google Maps</a>\n' +
      '  </div>\n' +
      '</div>'
    );
    document.body.appendChild(btn);
    document.body.appendChild(win);
    btn.addEventListener('click', toggle);
    win.querySelector('#tmc-close').addEventListener('click', toggle);
    win.querySelector('#tmc-send').addEventListener('click', sendFromInput);
    win.querySelector('#tmc-input').addEventListener('keydown', (e)=>{ if (e.key==='Enter') sendFromInput(); });
    pushMessage('assistant', 'Hi! I\'m Truemark\'s AI assistant. Ask me about services, portfolio, or booking.');
  }
  function toggle(){ state.open=!state.open; const win=document.querySelector('#tmc-chat-window'); if(!win) return; win.style.display=state.open?'flex':'none'; if(state.open){ setTimeout(()=>{ const i=document.querySelector('#tmc-input'); i&&i.focus(); },50);} }
  function render(){ const box=document.querySelector('#tmc-messages'); if(!box) return; box.innerHTML=''; state.history.forEach(m=>{ const item=el('<div class="tmc-msg '+m.role+'"><div class="bubble"></div></div>'); item.querySelector('.bubble').textContent=m.content; box.appendChild(item); }); box.scrollTop=box.scrollHeight; }
  function pushMessage(role, content){ state.history.push({role, content}); render(); }
  function setTyping(on){ const box=document.querySelector('#tmc-messages'); let elty=document.querySelector('#tmc-typing'); if(on){ if(!elty){ elty=el('<div id="tmc-typing" class="tmc-typing">Assistant is typing...</div>'); box.appendChild(elty);} } else { if(elty) elty.remove(); } box.scrollTop=box.scrollHeight; }
  async function sendFromInput(){ if(state.sending) return; const input=document.querySelector('#tmc-input'); const text=(input.value||'').trim(); if(!text) return; input.value=''; pushMessage('user', text); await sendToServer(); }
  async function sendToServer(){ state.sending=true; setTyping(true); try { const body={ model:'models/gemini-1.5-flash', temperature:0.5, companyContext:getCompanyContext(), messages: state.history.map(m=>({role:m.role, content:m.content})) }; const res=await fetch('/api/chat.php',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); if(!res.ok){ throw new Error('Request failed: ' + await res.text()); } const json=await res.json(); pushMessage('assistant', json.reply || 'Sorry, I could not generate a response.'); } catch(err){ pushMessage('assistant', 'Error: ' + (err && err.message ? err.message : 'Unknown')); } finally { setTyping(false); state.sending=false; } }
  function getCompanyContext(){ const metaDesc=document.querySelector('meta[name="description"]'); const title=document.title||''; return ['SiteTitle: '+title, metaDesc?('MetaDescription: '+metaDesc.getAttribute('content')):''].filter(Boolean).join('\n'); }
  window.addEventListener('DOMContentLoaded', ensureUI);
})();


