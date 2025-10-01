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
    pushMessage('assistant', 'Hi! I\'m Truemark\'s assistant. Ask me about services, pricing, process, or contact.');
  }

  function toggle(){
    state.open = !state.open;
    const win = document.querySelector('#tmc-chat-window');
    if (!win) return;
    win.style.display = state.open ? 'flex' : 'none';
    if (state.open){ setTimeout(()=>{ const i=document.querySelector('#tmc-input'); i&&i.focus(); },50); }
  }

  function render(){
    const box = document.querySelector('#tmc-messages');
    if (!box) return;
    box.innerHTML = '';
    state.history.forEach(m=>{
      const item = el('<div class="tmc-msg '+m.role+'"><div class="bubble"></div></div>');
      const bubble = item.querySelector('.bubble');
      if (m.role === 'assistant') {
        // Assistant messages can include trusted inline HTML (e.g., links)
        bubble.innerHTML = m.content;
      } else {
        bubble.textContent = m.content;
      }
      box.appendChild(item);
    });
    box.scrollTop = box.scrollHeight;
  }

  function pushMessage(role, content){ state.history.push({ role, content }); render(); }

  function setTyping(on){
    const box = document.querySelector('#tmc-messages');
    let elty = document.querySelector('#tmc-typing');
    if (on){
      if (!elty){ elty = el('<div id="tmc-typing" class="tmc-typing">Assistant is typing...</div>'); box.appendChild(elty); }
    } else {
      if (elty) elty.remove();
    }
    box.scrollTop = box.scrollHeight;
  }

  async function sendFromInput(){
    if (state.sending) return;
    const input = document.querySelector('#tmc-input');
    const text = (input.value||'').trim();
    if (!text) return;
    input.value = '';
    pushMessage('user', text);
    await answerFromFaq(text);
  }

  async function fetchFaq(){
    if (window.__tmcFaq) return window.__tmcFaq;
    try {
      const res = await fetch('/assets/faq.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load FAQs');
      const data = await res.json();
      window.__tmcFaq = data;
      return data;
    } catch(e){
      return [];
    }
  }

  function normalize(text){
    return (text||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  function scoreMatch(query, candidate){
    const q = normalize(query);
    const c = normalize(candidate);
    if (!q || !c) return 0;
    let score = 0;
    if (c.includes(q)) score += q.length * 2;
    const qTokens = new Set(q.split(' '));
    const cTokens = new Set(c.split(' '));
    let overlap = 0; qTokens.forEach(t=>{ if (cTokens.has(t)) overlap++; });
    score += overlap * 3;
    if (c.startsWith(q)) score += 5;
    return score;
  }

  async function answerFromFaq(userText){
    state.sending = true; setTyping(true);
    try {
      const faqs = await fetchFaq();
      if (!faqs.length){ pushMessage('assistant', 'I couldn\'t load FAQs. Please try again later.'); return; }
      let best=null, bestScore=-1;
      for (const item of faqs){
        const s = Math.max(scoreMatch(userText, item.q), scoreMatch(userText, item.a));
        if (s > bestScore){ bestScore = s; best = item; }
      }
      if (best && bestScore >= 3){
        pushMessage('assistant', best.a);
      } else {
        const suggestions = faqs.slice(0,4).map(i=>`• ${i.q}`).join('\n');
        pushMessage('assistant', `I may have missed that. Here are quick options:\n${suggestions}`);
      }
    } catch(err){
      pushMessage('assistant', 'Error answering from FAQs.');
    } finally { setTyping(false); state.sending=false; }
  }

  window.addEventListener('DOMContentLoaded', ensureUI);
})();


