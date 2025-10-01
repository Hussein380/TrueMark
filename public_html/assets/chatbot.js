(function(){
  const state = {
    open: false,
    history: [], // { role: 'user'|'assistant', content: string }
    sending: false,
  };

  function el(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

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
      '</div>'
    );
    document.body.appendChild(btn);
    document.body.appendChild(win);

    btn.addEventListener('click', toggle);
    win.querySelector('#tmc-close').addEventListener('click', toggle);
    win.querySelector('#tmc-send').addEventListener('click', sendFromInput);
    win.querySelector('#tmc-input').addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') sendFromInput();
    });

    // Greeting
    pushMessage('assistant', 'Hi! I\'m Truemark\'s AI assistant. Ask me about services, portfolio, or booking.');
  }

  function toggle(){
    state.open = !state.open;
    const win = document.querySelector('#tmc-chat-window');
    if (!win) return;
    win.style.display = state.open ? 'flex' : 'none';
    if (state.open) setTimeout(()=>{
      const input = document.querySelector('#tmc-input');
      input && input.focus();
    }, 50);
  }

  function render(){
    const box = document.querySelector('#tmc-messages');
    if (!box) return;
    box.innerHTML = '';
    for (const m of state.history){
      const item = el('<div class="tmc-msg '+m.role+'"><div class="bubble"></div></div>');
      item.querySelector('.bubble').textContent = m.content;
      box.appendChild(item);
    }
    box.scrollTop = box.scrollHeight;
  }

  function pushMessage(role, content){
    state.history.push({ role, content });
    render();
  }

  function setTyping(on){
    const box = document.querySelector('#tmc-messages');
    let elty = document.querySelector('#tmc-typing');
    if (on){
      if (!elty){
        elty = el('<div id="tmc-typing" class="tmc-typing">Assistant is typing...</div>');
        box.appendChild(elty);
      }
    } else {
      if (elty) elty.remove();
    }
    box.scrollTop = box.scrollHeight;
  }

  async function sendFromInput(){
    if (state.sending) return;
    const input = document.querySelector('#tmc-input');
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    pushMessage('user', text);
    await sendToServer();
  }

  async function sendToServer(){
    state.sending = true;
    setTyping(true);
    try {
      const body = {
        model: 'models/gemini-1.5-flash',
        temperature: 0.5,
        companyContext: getCompanyContext(),
        messages: state.history.map(m=>({ role: m.role, content: m.content }))
      };
      const res = await fetch('/api/chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error('Request failed: ' + msg);
      }
      const json = await res.json();
      const reply = json.reply || 'Sorry, I could not generate a response.';
      pushMessage('assistant', reply);
    } catch (err) {
      pushMessage('assistant', 'Error: ' + (err && err.message ? err.message : 'Unknown'));
    } finally {
      setTyping(false);
      state.sending = false;
    }
  }

  function getCompanyContext(){
    // If you create assets/company_facts.txt, backend will include it.
    // Here we also include some inline hints scraped from the page if desired.
    const metaDesc = document.querySelector('meta[name="description"]');
    const title = document.title || '';
    return [
      'SiteTitle: ' + title,
      metaDesc ? ('MetaDescription: ' + metaDesc.getAttribute('content')) : ''
    ].filter(Boolean).join('\n');
  }

  // Initialize
  window.addEventListener('DOMContentLoaded', function(){
    ensureUI();
  });
})();


