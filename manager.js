// Barry Framing — Manager Dashboard v3 (gallery theme, Gemini chat + ticket photo reader)
class BarryManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tickets = []; this.customers = []; this.prices = [];
    this.tab = 'ask'; this.chat = []; this.filters = new Set();
    this.pendingTicket = null; this.brief = null; this.briefLoading = false;
  }

  static get observedAttributes() { return ['tickets', 'customers', 'prices', 'ai-answer', 'save-result', 'scan-result', 'eod-result', 'brief-result', 'table-data', 'cell-result', 'row-result']; }

  attributeChangedCallback(name, _o, val) {
    if (!val) return;
    try {
      if (name === 'tickets') { this.tickets = JSON.parse(val); this.renderStats(); this.renderResults(); const _hc = this.shadowRoot.getElementById('hcount'); if (_hc) _hc.textContent = this.tickets.length + ' orders on file · live daily log'; if (this.tab === 'review') this.renderReview(); }
      if (name === 'customers') { this.customers = JSON.parse(val); this.renderStats(); }
      if (name === 'prices') { this.prices = JSON.parse(val); }
      if (name === 'brief-result') { const _b = JSON.parse(val); this.brief = _b.text; this.briefLoading = false; try { if (_b.text && _b.text.charAt(0) !== '⚠') localStorage.setItem('barryBrief_' + new Date().toISOString().slice(0, 10), _b.text); } catch (e) {} this.renderBriefCard(); }
      if (name === 'ai-answer') {
        const a = JSON.parse(val);
        this.chat = this.chat.filter(m => !m.pending);
        this.chat.push({ role: 'ai', text: a.text });
        this.renderChat();
      }
      if (name === 'save-result') {
        const r = JSON.parse(val);
        const el = this.shadowRoot.getElementById('saveMsg');
        if (el) { el.textContent = r.ok ? '✓ Saved to your CMS' : '⚠ ' + (r.error || 'Save failed'); el.className = r.ok ? 'ok' : 'err'; }
        if (r.ok) { this.pendingTicket = null; const b = this.shadowRoot.getElementById('confirmBanner'); if (b) b.remove(); this.shadowRoot.getElementById('addForm')?.reset(); }
      }
      if (name === 'scan-result') {
        const r = JSON.parse(val);
        this.scanning = false;
        if (r._error) { this.showScanError(r._error + (r._raw ? ': ' + r._raw.slice(0, 200) : '')); return; }
        this.unclearFields = Object.keys(r).filter(k => String(r[k] || '').trim().toUpperCase() === 'UNCLEAR');
        this.unclearFields.forEach(k => { r[k] = ''; });
        this.pendingTicket = r;
        if (this.unclearFields.length) setTimeout(() => this.showUnclearBanner(), 0);
        this.tab = 'add';
        this.syncTabButtons();
        this.renderPane();
      }
      if (name === 'table-data') {
        const r = JSON.parse(val);
        if (r.key !== this.tableKey) return;
        if (r.error) {
          const w = this.shadowRoot.getElementById('tgrid');
          if (w) w.innerHTML = '<div style="padding:18px;color:#e0603a">Could not load: ' + r.error + '</div>';
          return;
        }
        this.tableRows = r.items || [];
        this.paintGrid();
      }
      if (name === 'cell-result') {
        const r = JSON.parse(val);
        const msg = this.shadowRoot.getElementById('tmsg');
        if (msg) { msg.textContent = r.ok ? '\u2713 saved' : '\u26a0 ' + (r.error || 'save failed'); msg.style.color = r.ok ? '#7fb069' : '#e0603a'; }
      }
      if (name === 'row-result') {
        const r = JSON.parse(val);
        const msg = this.shadowRoot.getElementById('tmsg');
        if (msg) { msg.textContent = r.ok ? (r.action === 'add' ? '\u2713 row added' : '\u2713 archived') : '\u26a0 ' + (r.error || 'failed'); msg.style.color = r.ok ? '#7fb069' : '#e0603a'; }
        if (r.ok && r.action === 'add') this.requestTable();
      }
      if (name === 'eod-result') {
        const r = JSON.parse(val);
        const el = this.shadowRoot.getElementById('eodMsg');
        if (el) { el.textContent = r.ok ? '✓ Saved to End of Day — the assistant now knows about today' : '⚠ ' + (r.error || 'Save failed'); el.className = r.ok ? 'ok' : 'err'; }
        if (r.ok) this.shadowRoot.getElementById('eodForm')?.reset();
      }
    } catch (e) { /* ignore */ }
  }

  connectedCallback() { this.render(); }
  emit(t, d) { this.dispatchEvent(new CustomEvent(t, { detail: d })); }
  money(v) { const n = Number(v); return isNaN(n) || v === '' || v == null ? '' : '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

  syncTabButtons() {
    this.shadowRoot.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x.dataset.t === this.tab));
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Inter:wght@400;500;600;700&display=swap');
      :host { display:block; font-family:'Inter',system-ui,sans-serif; color:#e9e6e1; }
      * { box-sizing:border-box; }
      .wrap { max-width:1360px; margin:0 auto; padding:30px 34px 80px; }
      .hdr { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:26px; }
      .eyebrow { font-size:11px; letter-spacing:.32em; color:#c8442c; font-weight:700; text-transform:uppercase; margin-bottom:6px; }
      .eyebrow::before { content:''; display:inline-block; width:26px; height:1px; background:#c8442c; vertical-align:middle; margin-right:10px; }
      h1 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:42px; margin:0; color:#f4f1ec; line-height:1; }
      h1 em { font-style:italic; color:#cdb99a; }
      .hdr-right { text-align:right; font-size:12px; color:#8a857e; line-height:1.7; }
      .hdr-actions { display:flex; align-items:center; gap:20px; }
      .oracle { border:none; cursor:pointer; padding:14px 26px; border-radius:999px; font:700 14.5px 'Inter'; color:#fff; background:linear-gradient(135deg,#e0592f,#b6402a 45%,#7a1f13); box-shadow:0 6px 22px rgba(200,68,44,.45), inset 0 0 0 1px rgba(255,255,255,.08); letter-spacing:.01em; transition:transform .15s, box-shadow .15s; white-space:nowrap; }
      .oracle:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(200,68,44,.62), inset 0 0 0 1px rgba(255,255,255,.16); }
      .oracle .star { display:inline-block; animation:twinkle 2.2s infinite; }
      @keyframes twinkle { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
      .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:28px; }
      .stat { background:linear-gradient(165deg,#1a1815,#100f0d); border:1px solid #2b2823; border-radius:16px; padding:18px 20px; animation:rise .5s ease both; }
      .stat b { display:block; font-size:27px; font-weight:700; color:#f4f1ec; font-variant-numeric:tabular-nums; }
      .stat span { font-size:10.5px; letter-spacing:.18em; text-transform:uppercase; color:#8a857e; }
      .stat.alert b { color:#e2593d; }
      .tabs { display:inline-flex; background:#161512; border:1px solid #2b2823; border-radius:999px; padding:5px; gap:4px; margin-bottom:22px; flex-wrap:wrap; }
      .tabs button { border:none; background:transparent; color:#a49e94; padding:10px 22px; border-radius:999px; font:600 13.5px 'Inter'; cursor:pointer; transition:all .18s; }
      .tabs button:hover { color:#f4f1ec; }
      .tabs button.active { background:linear-gradient(135deg,#b6402a,#8c2317); color:#fff; box-shadow:0 4px 16px rgba(182,64,42,.35); }
      .bar input { width:100%; background:#14130f; border:1px solid #35312a; border-radius:12px; padding:14px 18px; color:#f4f1ec; font-size:14.5px; outline:none; transition:border .2s; }
      .bar input::placeholder { color:#6d6860; }
      .bar input:focus { border-color:#c8442c; box-shadow:0 0 0 3px rgba(200,68,44,.15); }
      .chips { display:flex; gap:8px; flex-wrap:wrap; margin:14px 0 8px; }
      .chip { padding:7px 15px; border-radius:999px; border:1px solid #3a352d; color:#b6b0a6; font-size:12.5px; cursor:pointer; transition:all .15s; user-select:none; }
      .chip:hover { border-color:#c8442c; color:#f4f1ec; }
      .chip.on { background:#c8442c; border-color:#c8442c; color:#fff; }
      .count { font-size:12px; color:#8a857e; margin:10px 2px; }
      .tablecard { background:#12110e; border:1px solid #2b2823; border-radius:16px; overflow:hidden; }
      .scroll { max-height:520px; overflow-y:auto; }
      .scroll::-webkit-scrollbar { width:10px; } .scroll::-webkit-scrollbar-thumb { background:#2b2823; border-radius:5px; }
      table { width:100%; border-collapse:collapse; font-size:13.5px; }
      th { position:sticky; top:0; background:#0b0a08; color:#8a857e; text-align:left; padding:12px 14px; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; z-index:1; }
      td { padding:12px 14px; border-top:1px solid #1e1c18; color:#d9d5cd; vertical-align:top; }
      tr.row { cursor:pointer; transition:background .12s; }
      tr.row:hover { background:#1b1712; }
      td.total { color:#f4f1ec; font-weight:600; font-variant-numeric:tabular-nums; }
      .flag { color:#e2593d; font-weight:700; cursor:help; }
      .pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; }
      .pill.paid { background:rgba(64,140,80,.16); color:#7fc98f; }
      .pill.ordered { background:rgba(200,150,50,.14); color:#d9b36a; }
      .pill.open { background:rgba(150,150,150,.12); color:#a49e94; }
      tr.detail td { background:#0b0a08; color:#b6b0a6; font-size:12.5px; white-space:pre-wrap; border-left:3px solid #c8442c; line-height:1.6; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; }
      .grid label { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#8a857e; display:block; margin-bottom:6px; }
      .grid input, .grid select, .grid textarea { width:100%; background:#14130f; border:1px solid #35312a; border-radius:10px; padding:12px 14px; color:#f4f1ec; font-size:14px; outline:none; font-family:inherit; }
      .grid input:focus, .grid select:focus, .grid textarea:focus { border-color:#c8442c; }
      .full { grid-column:1/-1; }
      .btn { background:linear-gradient(135deg,#b6402a,#8c2317); color:#fff; border:none; padding:14px 34px; border-radius:12px; font:600 14.5px 'Inter'; cursor:pointer; box-shadow:0 4px 16px rgba(182,64,42,.3); transition:transform .12s; }
      .btn:hover { transform:translateY(-1px); }
      .btn.ghost { background:transparent; border:1px solid #3a352d; color:#cdb99a; box-shadow:none; }
      .ok { color:#7fc98f; font-weight:600; margin-left:12px; } .err { color:#e2593d; font-weight:600; margin-left:12px; }
      .banner { background:rgba(205,185,154,.08); border:1px solid #3a352d; border-left:3px solid #cdb99a; border-radius:10px; padding:13px 16px; margin-bottom:16px; font-size:13px; color:#e4d9c6; display:flex; align-items:center; gap:10px; }
      .banner b { color:#cdb99a; }
      .drop { border:2px dashed #3a352d; border-radius:16px; padding:44px 24px; text-align:center; background:#100f0d; transition:all .2s; cursor:pointer; }
      .drop:hover, .drop.over { border-color:#c8442c; background:#14110f; }
      .drop .big { font-family:'Cormorant Garamond',serif; font-size:26px; color:#f4f1ec; margin-bottom:6px; }
      .drop .sub { font-size:13px; color:#8a857e; }
      .drop svg { width:44px; height:44px; stroke:#c8442c; margin-bottom:12px; }
      .preview { margin-top:16px; display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; }
      .preview img { max-width:280px; max-height:340px; border-radius:12px; border:1px solid #2b2823; }
      .scanning { display:flex; align-items:center; gap:12px; color:#cdb99a; font-size:14px; margin-top:16px; }
      .spinner { width:18px; height:18px; border:2px solid #3a352d; border-top-color:#c8442c; border-radius:50%; animation:spin .8s linear infinite; }
      .chatcard { background:#12110e; border:1px solid #2b2823; border-radius:16px; padding:20px; }
      .chatbox { min-height:420px; max-height:600px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding:6px 2px 14px; }
      .msg { max-width:78%; padding:13px 17px; border-radius:16px; font-size:14px; line-height:1.65; white-space:pre-wrap; animation:rise .3s ease both; }
      .msg.user { align-self:flex-end; background:linear-gradient(135deg,#b6402a,#8c2317); color:#fff; border-bottom-right-radius:5px; }
      .msg.ai { align-self:flex-start; background:#1b1916; border:1px solid #2b2823; color:#e4e0d8; border-bottom-left-radius:5px; }
      .dots { display:inline-flex; gap:5px; padding:4px 2px; }
      .dots i { width:7px; height:7px; border-radius:50%; background:#c8442c; animation:blink 1.2s infinite; }
      .dots i:nth-child(2){ animation-delay:.2s } .dots i:nth-child(3){ animation-delay:.4s }
      .askbar { display:flex; gap:10px; margin-top:6px; }
      .askbar input { flex:1; background:#14130f; border:1px solid #35312a; border-radius:12px; padding:16px 20px; color:#f4f1ec; font-size:16px; outline:none; }
      .askbar input:focus { border-color:#c8442c; }
      .sugg { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
      .sugg .chip { font-size:12px; }
      .powered { font-size:11px; color:#6d6860; margin-top:12px; text-align:right; } .powered b { color:#8a857e; }
      .empty { color:#6d6860; text-align:center; padding:40px 0 30px; font-size:13.5px; }
      .actions { margin-top:18px; display:flex; align-items:center; gap:12px; }
      @keyframes rise { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:none;} }
      @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }
      @keyframes spin { to { transform:rotate(360deg);} }
    
    .briefcard{background:linear-gradient(135deg,rgba(224,89,47,.15),rgba(122,31,19,.08));border:1px solid rgba(224,89,47,.35);border-radius:16px;padding:16px 18px;margin-bottom:16px;box-shadow:0 6px 22px rgba(0,0,0,.25);}
    .brief-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
    .brief-title{font-weight:700;font-size:15px;letter-spacing:.02em;color:#f4a06f;}
    .brief-refresh{background:transparent;border:1px solid rgba(224,89,47,.4);color:#f4a06f;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;line-height:1;transition:transform .3s ease,background .2s;}
    .brief-refresh:hover{background:rgba(224,89,47,.18);transform:rotate(90deg);}
    .brief-body{font-size:14px;line-height:1.6;color:#e8e3dd;}
    .brief-load{color:#b9b2a9;font-style:italic;}
    .brief-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
    .qa{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#f0ece6;padding:8px 12px;border-radius:999px;font-size:13px;cursor:pointer;transition:background .18s,border-color .18s,transform .1s;}
    .qa:hover{background:rgba(224,89,47,.22);border-color:rgba(224,89,47,.5);transform:translateY(-1px);}
    
    .get-brief{background:linear-gradient(135deg,#e0592f,#b6402a 55%,#7a1f13);color:#fff;border:none;border-radius:999px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.01em;box-shadow:0 4px 16px rgba(224,89,47,.35);transition:transform .12s,box-shadow .2s;}
    .get-brief:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(224,89,47,.5);}
    .sugg{display:none;}
    
    .revwrap{max-width:100%;}
    .rev-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .rev-title{font-weight:700;font-size:16px;color:#f4a06f;}
    .rev-count{font-size:13px;color:#b9b2a9;}
    .rev-empty{padding:34px;text-align:center;color:#b9b2a9;font-size:15px;}
    .revcard{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;margin-bottom:12px;}
    .rev-top{font-size:14px;color:#f0ece6;}
    .rev-why{display:block;font-size:12px;color:#d9a08c;font-style:italic;margin-top:4px;}
    .rev-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 12px;margin-top:11px;}
    .rev-grid label{display:flex;flex-direction:column;font-size:11px;color:#b9b2a9;gap:3px;text-transform:uppercase;letter-spacing:.03em;}
    .rev-grid input{background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.15);border-radius:7px;padding:8px 9px;color:#f0ece6;font-size:13px;text-transform:none;letter-spacing:0;}
    .rev-grid input:focus{outline:none;border-color:rgba(224,89,47,.6);}
    .rev-wide{grid-column:1 / -1;}
    .rev-items{font-size:12px;color:#9a938a;margin:11px 0 0;}
    .rev-actions{display:flex;justify-content:flex-end;margin-top:12px;}
    .rev-save{background:linear-gradient(135deg,#e0592f,#b6402a 55%,#7a1f13);color:#fff;border:none;border-radius:999px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;}
    .rev-save:hover{filter:brightness(1.08);}
    .rev-save:disabled{opacity:.6;cursor:default;}
    
    .pdfbadge{padding:22px;text-align:center;color:#f4a06f;font-size:15px;background:rgba(224,89,47,.1);border-radius:12px;}
    </style>
    <div class="wrap">
      <div class="hdr">
        <div><div class="eyebrow">Barry Framing · San Antonio</div><h1>Shop <em>Manager</em></h1></div>
        <div class="hdr-actions"><div class="hdr-right"><span id="hcount">Loading…</span><br><span id="hdate"></span></div><button class="oracle" id="oracleBtn"><span class="star">✦</span> Ask Anything</button></div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="tabs">
        <button data-t="ask" class="active">✦ Ask My Info</button>
        <button data-t="scan">📸 Scan Ticket</button>
        <button data-t="add">Add Ticket</button>
        <button data-t="review">🚩 Review</button>
        <button data-t="eod">🌙 End of Day</button>
        <button data-t="site">🌐 Website</button>
        <button data-t="tables">▦ Tables</button>
        <button data-t="search">Search</button>
      </div>
      <div id="pane"></div>
    </div>`;
    this.shadowRoot.getElementById('hdate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    { const _hc = this.shadowRoot.getElementById('hcount'); if (_hc) { const _n = (this.tickets && this.tickets.length) || 0; _hc.textContent = _n ? (_n + ' orders on file · live daily log') : 'Live daily log'; } }
    this.shadowRoot.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.t === 'site') { window.open('https://www.barryframing.com', '_blank'); return; }
      this.tab = b.dataset.t; this.syncTabButtons(); this.renderPane();
    }));
    const ob = this.shadowRoot.getElementById('oracleBtn');
    if (ob) ob.addEventListener('click', () => { this.tab = 'ask'; this.syncTabButtons(); this.renderPane(); this.shadowRoot.getElementById('qq')?.focus(); });
    this.renderStats();
    this.renderPane();
  }

  showUnclearBanner() {
    const pane = this.shadowRoot.getElementById('pane');
    if (!pane || !this.unclearFields || !this.unclearFields.length) return;
    const L = { customerName: 'Customer name', firstName: 'First name', lastName: 'Last name', phone: 'Phone', email: 'Email', dateIn: 'Date in', dueWhen: 'Due', dueDate: 'Due date', binNumber: 'Bin #', ticketNumber: 'Ticket #', subtotal: 'Subtotal', tax: 'Tax', total: 'Total', items: 'Items', notes: 'Notes' };
    const names = this.unclearFields.map(k => L[k] || k);
    const bar = document.createElement('div');
    bar.style.cssText = 'margin:0 0 14px;padding:12px 14px;border:1px solid #e0603a;border-radius:10px;background:rgba(224,96,58,.12);color:#f3d9cf;font-size:13px;line-height:1.5';
    bar.innerHTML = '<b style="display:block;margin-bottom:3px">\u2691 Could not read ' + names.length + ' field' + (names.length > 1 ? 's' : '') + ' clearly</b>Enter ' + (names.length > 1 ? 'these' : 'this') + ' manually before saving: <b>' + names.join(', ') + '</b>';
    pane.insertBefore(bar, pane.firstChild);
    this.unclearFields.forEach(k => {
      const f = pane.querySelector('[name="' + k + '"]');
      if (f) { f.style.borderColor = '#e0603a'; f.placeholder = 'Could not read \u2014 enter manually'; }
    });
  }


  tableDefs() {
    return [
      { key: 'prep', label: 'Prep Lists' },
      { key: 'tickets', label: 'Tickets' },
      { key: 'orders', label: 'Orders' },
      { key: 'customers', label: 'Customers' },
      { key: 'prices', label: 'Price Guide' }
    ];
  }

  gridStyle() {
    return '<style>' +
      '.tbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
      '.tchip{background:#1a1a1a;border:1px solid #333;color:#bbb;padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12px}' +
      '.tchip.on{background:#c9503a;border-color:#c9503a;color:#fff}' +
      '.tctl{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}' +
      '.tctl input{flex:1;min-width:160px;background:#111;border:1px solid #333;color:#eee;padding:6px 10px;border-radius:6px;font-size:12px}' +
      '.tctl button{background:#1a1a1a;border:1px solid #333;color:#ccc;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px}' +
      '.fieldbox{background:#111;border:1px solid #333;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px}' +
      '.fieldbox label{font-size:11px;color:#bbb;display:flex;align-items:center;gap:4px}' +
      ':host{display:block;width:100%}' +
      '.gridwrap{position:relative;overflow:auto;max-height:72vh;border:1px solid #262626;border-radius:8px}' +
      '.rowmenu{color:#6a6a6a;cursor:pointer;text-align:center;font-size:15px;letter-spacing:1px;user-select:none}' +
      '.rowmenu:hover{color:#e0a03a}' +
      'table.gr{border-collapse:collapse;font-size:12px;width:max-content;min-width:100%}' +
      'table.gr th{position:sticky;top:0;background:#161616;color:#999;text-align:left;padding:7px 9px;border-bottom:1px solid #303030;white-space:nowrap;font-weight:500}' +
      'table.gr td{padding:5px 9px;border-bottom:1px solid #1e1e1e;color:#ddd;white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis}' +
      'table.gr td[contenteditable]:focus{outline:2px solid #c9503a;background:#191919;overflow:visible;white-space:normal}' +
      'tr.grp td{background:#141414;color:#e0a03a;font-weight:600;padding:7px 9px}' +
      '.arc{color:#a33;cursor:pointer;font-size:14px}' +
      '#tmsg{font-size:11px;color:#7fb069}' +
      '</style>';
  }

  pushUndo(entry) {
    if (!this.undoStack) this.undoStack = [];
    this.undoStack.push(entry);
    if (this.undoStack.length > 40) this.undoStack.shift();
    const b = this.shadowRoot.getElementById('tundo');
    if (b) { b.disabled = false; b.style.opacity = '1'; }
  }

  doUndo() {
    if (!this.undoStack || !this.undoStack.length) return;
    const e = this.undoStack.pop();
    const row = (this.tableRows || []).find(x => x._id === e.id);
    if (row) row[e.field] = e.old;
    this.emit('save-cell', { key: e.key, id: e.id, field: e.field, value: e.old == null ? '' : String(e.old) });
    this.paintGrid();
    const b = this.shadowRoot.getElementById('tundo');
    if (b && !this.undoStack.length) { b.disabled = true; b.style.opacity = '.45'; }
  }

  viewKey() { return 'barryView_' + this.tableKey; }

  saveView() {
    try {
      localStorage.setItem(this.viewKey(), JSON.stringify({
        hidden: this.hiddenCols[this.tableKey] || {},
        groupBy: this.groupBy || null,
        sortBy: this.sortBy || null,
        sortDir: this.sortDir || 1,
        rules: this.rules || []
      }));
      const m = this.shadowRoot.getElementById('tmsg');
      if (m) { m.textContent = '✓ view saved'; m.style.color = '#7fb069'; }
    } catch (err) { /* storage unavailable */ }
  }

  loadView() {
    try {
      const raw = localStorage.getItem(this.viewKey());
      if (!raw) return false;
      const v = JSON.parse(raw);
      if (!this.hiddenCols) this.hiddenCols = {};
      this.hiddenCols[this.tableKey] = v.hidden || {};
      this.groupBy = v.groupBy || null;
      this.sortBy = v.sortBy || null;
      this.sortDir = v.sortDir || 1;
      this.rules = v.rules || [];
      return true;
    } catch (err) { return false; }
  }

  cmpVals(a, b) {
    const na = parseFloat(a), nb = parseFloat(b);
    const aNum = a !== '' && a != null && !isNaN(na);
    const bNum = b !== '' && b != null && !isNaN(nb);
    if (aNum && bNum) return na - nb;
    const da = Date.parse(a), db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return String(a == null ? '' : a).localeCompare(String(b == null ? '' : b));
  }

  passRules(r) {
    if (!this.rules || !this.rules.length) return true;
    return this.rules.every(rule => {
      const val = String(r[rule.f] == null ? '' : r[rule.f]).toLowerCase();
      const t = String(rule.v || '').toLowerCase();
      if (rule.op === 'is') return val === t;
      if (rule.op === 'not') return val !== t;
      if (rule.op === 'empty') return val === '';
      if (rule.op === 'notempty') return val !== '';
      return val.indexOf(t) >= 0;
    });
  }

  expandRow(id) {
    const r = (this.tableRows || []).find(x => x._id === id);
    if (!r) return;
    const cols = this.gridCols();
    const nm = r.customerName || r.title || r.name || r.customerLastName || 'Record';
    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.76);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px';
    const fields = cols.map(c =>
      '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #232323;align-items:flex-start">' +
      '<div style="width:150px;flex:none;color:#8b8279;font-size:11.5px;text-transform:uppercase;letter-spacing:.4px;padding-top:3px">' + c + '</div>' +
      '<div contenteditable data-ef="' + c + '" style="flex:1;color:#e6ddd4;font-size:13.5px;line-height:1.5;outline:none;padding:3px 6px;border-radius:5px;min-height:20px">' +
      this.fmtVal(r[c], c).replace(/</g, '&lt;') + '</div></div>').join('');
    back.innerHTML = '<div style="background:#141414;border:1px solid #333;border-radius:16px;max-width:640px;width:100%;max-height:84vh;overflow:auto;padding:24px 28px;box-shadow:0 24px 70px rgba(0,0,0,.7)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
      '<div style="font-size:18px;color:#f2e8df;font-weight:600">' + String(nm).replace(/</g, '&lt;') + '</div>' +
      '<button data-x="close" style="background:#242424;border:1px solid #3a3a3a;color:#bbb;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px">×</button></div>' +
      '<div style="font-size:12px;color:#7a7169;margin-bottom:10px">Click any value to edit. Changes save when you click away.</div>' +
      fields + '</div>';
    this.shadowRoot.appendChild(back);
    back.querySelector('[data-x="close"]').onclick = () => { back.remove(); this.paintGrid(); };
    back.onclick = (e) => { if (e.target === back) { back.remove(); this.paintGrid(); } };
    back.querySelectorAll('[data-ef]').forEach(d => {
      d.addEventListener('focus', () => { d.dataset.orig = d.textContent; d.style.background = '#1d1d1d'; });
      d.addEventListener('blur', () => {
        d.style.background = 'none';
        const nv = d.textContent.trim();
        if (nv === (d.dataset.orig || '').trim()) return;
        const f = d.getAttribute('data-ef');
        this.pushUndo({ key: this.tableKey, id: id, field: f, old: r[f] });
        this.emit('save-cell', { key: this.tableKey, id: id, field: f, value: nv });
        r[f] = nv;
      });
    });
  }

  confirmBox(o) {
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.74);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
      back.innerHTML = '<div style="background:#161616;border:1px solid #343434;border-radius:14px;max-width:440px;width:100%;padding:24px 26px;box-shadow:0 24px 70px rgba(0,0,0,.65)">' +
        '<div style="font-size:17px;color:#f2e8df;font-weight:600;margin-bottom:10px">' + o.title + '</div>' +
        '<div style="font-size:13.5px;color:#bdb4ac;line-height:1.65;margin-bottom:12px">' + o.body + '</div>' +
        (o.note ? '<div style="font-size:12.5px;color:#8fd6a0;background:#16241a;border:1px solid #24402c;border-radius:9px;padding:10px 12px;margin-bottom:18px;line-height:1.5">' + o.note + '</div>' : '<div style="height:6px"></div>') +
        '<div style="display:flex;gap:9px;justify-content:flex-end">' +
        '<button data-x="c" style="background:#242424;border:1px solid #3c3c3c;color:#ccc;padding:9px 18px;border-radius:9px;cursor:pointer;font-size:13px">Cancel</button>' +
        '<button data-x="k" style="background:' + (o.danger ? '#b8452f' : '#3a7d44') + ';border:none;color:#fff;padding:9px 18px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600">' + o.ok + '</button>' +
        '</div></div>';
      this.shadowRoot.appendChild(back);
      const close = (v) => { back.remove(); resolve(v); };
      back.querySelector('[data-x="c"]').onclick = () => close(false);
      back.querySelector('[data-x="k"]').onclick = () => close(true);
      back.onclick = (e) => { if (e.target === back) close(false); };
    });
  }

  statusHue(s) {
    const k = String(s || '').toUpperCase();
    if (k.indexOf('COMPLET') >= 0 || k === 'DONE' || k.indexOf('PICKED') >= 0) return ['#1d3b24', '#8fd6a0'];
    if (k.indexOf('CANCEL') >= 0) return ['#3a2020', '#e08f8f'];
    if (k.indexOf('MAT') >= 0) return ['#3b2c14', '#e8b661'];
    if (k.indexOf('GLASS') >= 0) return ['#14313b', '#6fc9de'];
    if (k.indexOf('MOUNT') >= 0) return ['#2c1e3b', '#c19ae8'];
    if (k.indexOf('PAINT') >= 0) return ['#331a3d', '#d79bec'];
    if (k.indexOf('DESIGN') >= 0) return ['#1b2c3d', '#8fb8e8'];
    if (k.indexOf('PROGRESS') >= 0 || k.indexOf('PREP') >= 0) return ['#3b2a14', '#e8a95e'];
    if (k.indexOf('REPAIR') >= 0 || k.indexOf('REFIT') >= 0) return ['#14331f', '#77d69a'];
    if (k.indexOf('FIT') >= 0 || k.indexOf('PREPPED') >= 0) return ['#1e3340', '#7fc4dd'];
    if (k.indexOf('WAIT') >= 0) return ['#332f14', '#ddd06a'];
    if (k.indexOf('CHOP') >= 0 || k.indexOf('JOIN') >= 0) return ['#1c3524', '#82d59b'];
    if (k.indexOf('ORDER') >= 0 || k.indexOf('READY') >= 0) return ['#2a2340', '#a9a2e8'];
    if (k.indexOf('RECEIV') >= 0) return ['#1d3b24', '#8fd6a0'];
    if (k === 'OPEN') return ['#26262b', '#b9b9c4'];
    return ['#242424', '#b0b0b0'];
  }

  pill(v) {
    const t = String(v == null ? '' : v);
    if (!t) return '';
    const c = this.statusHue(t);
    return '<span style="background:' + c[0] + ';color:' + c[1] + ';padding:2px 9px;border-radius:11px;font-size:11px;white-space:nowrap;display:inline-block">' + t.replace(/</g, '&lt;') + '</span>';
  }

  fmtVal(v, col) {
    if (v == null || v === '') return '';
    const s = String(v);
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (iso) return Number(iso[2]) + '/' + Number(iso[3]) + '/' + iso[1].slice(2);
    if (v instanceof Date) return (v.getMonth() + 1) + '/' + v.getDate() + '/' + String(v.getFullYear()).slice(2);
    return s;
  }

  renderRules() {
    const box = this.shadowRoot.getElementById('trb');
    if (!box) return;
    if (!this.rules) this.rules = [];
    const cols = this.gridCols();
    if (!cols.length) { box.innerHTML = '<span style="color:#777;font-size:12px">Load a table first.</span>'; return; }
    const ops = [['contains', 'contains'], ['is', 'is exactly'], ['not', 'is not'], ['empty', 'is empty'], ['notempty', 'is not empty']];
    const rows = this.rules.map((r, i) =>
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">' +
      '<span style="color:#7a7169;font-size:11px;width:34px">' + (i === 0 ? 'Where' : 'and') + '</span>' +
      '<select data-ri="' + i + '" data-rk="f">' + cols.map(c => '<option' + (c === r.f ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
      '<select data-ri="' + i + '" data-rk="op">' + ops.map(o => '<option value="' + o[0] + '"' + (o[0] === r.op ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
      (r.op === 'empty' || r.op === 'notempty' ? '' : '<input data-ri="' + i + '" data-rk="v" value="' + String(r.v || '').replace(/"/g, '&quot;') + '" placeholder="value" style="width:150px">') +
      '<button data-rx="' + i + '" title="Remove" style="color:#e08f8f;padding:4px 9px">✕</button></div>').join('');
    box.innerHTML = rows +
      '<div style="display:flex;gap:6px;margin-top:4px"><button id="traddr">+ Add rule</button>' +
      (this.rules.length ? '<button id="trclr">Clear all</button>' : '') + '</div>';
    box.querySelectorAll('select,input').forEach(el => {
      const h = () => {
        const i = Number(el.getAttribute('data-ri')), k = el.getAttribute('data-rk');
        this.rules[i][k] = el.value;
        if (k === 'op') this.renderRules();
        this.paintGrid();
      };
      el.onchange = h;
      if (el.tagName === 'INPUT') el.oninput = h;
    });
    box.querySelectorAll('[data-rx]').forEach(b => { b.onclick = () => {
      this.rules.splice(Number(b.getAttribute('data-rx')), 1); this.renderRules(); this.paintGrid(); }; });
    const add = box.querySelector('#traddr');
    if (add) add.onclick = () => { this.rules.push({ f: cols[0], op: 'contains', v: '' }); this.renderRules(); this.paintGrid(); };
    const clr = box.querySelector('#trclr');
    if (clr) clr.onclick = () => { this.rules = []; this.renderRules(); this.paintGrid(); };
  }

  renderTables() {
    const pane = this.shadowRoot.getElementById('pane');
    if (!pane) return;
    if (!this.tableKey) this.tableKey = 'prep';
    if (!this.hiddenCols) this.hiddenCols = {};
    const chips = this.tableDefs().map(d =>
      '<button class="tchip' + (d.key === this.tableKey ? ' on' : '') + '" data-tk="' + d.key + '">' + d.label + '</button>').join('');
    pane.innerHTML = this.gridStyle() +
      '<div class="tbar">' + chips + '</div>' +
      '<div class="tctl"><input id="tq" placeholder="Filter rows…">' +
      '<button id="tfields">Fields</button>' +
      '<button id="tfilt">Filter</button>' +
      '<button id="tgrp">Group: ' + (this.groupBy || 'none') + '</button>' +
      '<button id="tadd">+ Add row</button>' +
      '<button id="tundo" style="opacity:.45">\u21b6 Undo</button>' +
      '<button id="tsave">Save view</button>' +
      '<span id="tmsg"></span></div>' +
      '<div id="tfb" class="fieldbox" hidden></div>' +
      '<div id="trb" class="fieldbox" style="display:block" hidden></div>' +
      '<div id="tgrid" class="gridwrap"><div style="padding:18px;color:#777">Loading…</div></div>';
    pane.querySelectorAll('[data-tk]').forEach(b => { b.onclick = () => {
      this.tableKey = b.getAttribute('data-tk'); this.tableRows = null; this.sortBy = null; this.rules = []; this.loadView(); this.renderTables(); this.requestTable(); }; });
    pane.querySelector('#tq').oninput = (e) => { this.tq = e.target.value; this.paintGrid(); };
    pane.querySelector('#tfields').onclick = () => { const fb = pane.querySelector('#tfb'); fb.hidden = !fb.hidden; };
    pane.querySelector('#tfilt').onclick = () => { const rb = pane.querySelector('#trb'); rb.hidden = !rb.hidden; if (!rb.hidden) this.renderRules(); };
    pane.querySelector('#tgrp').onclick = () => {
      const cols = this.gridCols();
      this.groupBy = this.groupBy ? null : (cols.indexOf('status') >= 0 ? 'status' : cols[0]);
      this.renderTables(); this.paintGrid(); };
    pane.querySelector('#tadd').onclick = () => this.emit('add-row', { key: this.tableKey, row: {} });
    pane.querySelector('#tundo').onclick = () => this.doUndo();
    pane.querySelector('#tsave').onclick = () => this.saveView();

    if (this.tableRows) this.paintGrid(); else this.requestTable();
  }

  requestTable() { this.emit('load-table', { key: this.tableKey }); }

  gridCols() {
    const rows = this.tableRows || [];
    if (!rows.length) return [];
    const skip = { _id: 1, _owner: 1, _createdDate: 1, _updatedDate: 1, archived: 1 };
    const seen = {};
    rows.slice(0, 40).forEach(r => Object.keys(r).forEach(k => { if (!skip[k]) seen[k] = 1; }));
    return Object.keys(seen);
  }

  paintGrid() {
    const wrap = this.shadowRoot.getElementById('tgrid');
    if (!wrap) return;
    const all = (this.tableRows || []).filter(r => r.archived !== 'Yes');
    const cols = this.gridCols();
    const hid = this.hiddenCols[this.tableKey] || {};
    const show = cols.filter(c => !hid[c]);
    const fb = this.shadowRoot.getElementById('tfb');
    if (fb) fb.innerHTML = cols.map(c =>
      '<label><input type="checkbox" data-fc="' + c + '"' + (hid[c] ? '' : ' checked') + '>' + c + '</label>').join('');
    if (fb) fb.querySelectorAll('[data-fc]').forEach(cb => { cb.onchange = () => {
      const k = cb.getAttribute('data-fc');
      if (!this.hiddenCols[this.tableKey]) this.hiddenCols[this.tableKey] = {};
      if (cb.checked) delete this.hiddenCols[this.tableKey][k]; else this.hiddenCols[this.tableKey][k] = 1;
      this.paintGrid(); }; });
    const q = (this.tq || '').toLowerCase();
    let rows = all.filter(r => this.passRules(r));
    if (q) rows = rows.filter(r => show.some(c => String(r[c] == null ? '' : r[c]).toLowerCase().indexOf(q) >= 0));
    if (this.sortBy) { const sb = this.sortBy, sd = this.sortDir || 1; rows = rows.slice().sort((a, b) => sd * this.cmpVals(a[sb], b[sb])); }
    const head = '<tr><th></th>' + show.map(c => '<th data-sc="' + c + '" style="cursor:pointer;user-select:none">' + c +
      (this.sortBy === c ? (this.sortDir === 1 ? ' \u25b2' : ' \u25bc') : '') + '</th>').join('') + '</tr>';
    const pills = { status: 1, orderStatus: 1, difficulty: 1, prepStatus: 1 };
    const cell = (r, c) => pills[c]
      ? '<td data-id="' + r._id + '" data-f="' + c + '">' + this.pill(r[c]) + '</td>'
      : '<td contenteditable data-id="' + r._id + '" data-f="' + c + '">' +
        this.fmtVal(r[c], c).replace(/</g, '&lt;') + '</td>';
    const line = (r) => '<tr><td class="rowmenu" data-menu="' + r._id + '" title="Row actions">\u22ef</td>' + show.map(c => cell(r, c)).join('') + '</tr>';
    let body = '';
    if (this.groupBy) {
      const g = {};
      rows.forEach(r => { const k = String(r[this.groupBy] == null || r[this.groupBy] === '' ? '(empty)' : r[this.groupBy]); (g[k] = g[k] || []).push(r); });
      Object.keys(g).sort().forEach(k => {
        body += '<tr class="grp"><td colspan="' + (show.length + 1) + '">' + this.pill(k) + ' &nbsp;<span style="color:#777;font-weight:400">' + g[k].length + '</span></td></tr>';
        body += g[k].map(line).join('');
      });
    } else { body = rows.map(line).join(''); }
    wrap.innerHTML = '<table class="gr"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' ;
    const msg = this.shadowRoot.getElementById('tmsg');
    if (msg) msg.textContent = rows.length + ' of ' + all.length + ' rows';
    wrap.querySelectorAll('td[contenteditable]').forEach(td => {
      td.addEventListener('focus', () => { td.dataset.orig = td.textContent; });
      td.addEventListener('blur', () => {
        const v = td.textContent.trim();
        if (v === (td.dataset.orig || '').trim()) return;
        const rid = td.getAttribute('data-id'), fld = td.getAttribute('data-f');
        const row = (this.tableRows || []).find(x => x._id === rid);
        this.pushUndo({ key: this.tableKey, id: rid, field: fld, old: row ? row[fld] : '' });
        this.emit('save-cell', { key: this.tableKey, id: rid, field: fld, value: v });
        if (row) row[fld] = v;
      });
      td.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); td.blur(); } });
    });
    wrap.querySelectorAll('[data-menu]').forEach(b => { b.onclick = (ev) => {
      ev.stopPropagation();
      const old = wrap.querySelector('.rowpop'); if (old) old.remove();
      const id = b.getAttribute('data-menu');
      const r = (this.tableRows || []).find(x => x._id === id) || {};
      const nm = r.customerName || r.title || r.name || r.customerLastName || 'this row';
      const pop = document.createElement('div');
      pop.className = 'rowpop';
      pop.style.cssText = 'position:absolute;background:#1c1c1c;border:1px solid #3c3c3c;border-radius:9px;padding:4px;z-index:60;box-shadow:0 10px 28px rgba(0,0,0,.55)';
      pop.innerHTML = '<button data-a="open" style="background:none;border:none;color:#cfc6bd;padding:8px 15px;cursor:pointer;font-size:12.5px;white-space:nowrap;text-align:left;width:100%;border-radius:6px">Open full record</button>' +
        '<button data-a="arch" style="background:none;border:none;color:#e39a8c;padding:8px 15px;cursor:pointer;font-size:12.5px;white-space:nowrap;text-align:left;width:100%;border-radius:6px">Archive this row\u2026</button>';
      const br = b.getBoundingClientRect(); const wr = wrap.getBoundingClientRect();
      pop.style.left = (br.left - wr.left + wrap.scrollLeft + 20) + 'px';
      pop.style.top = (br.top - wr.top + wrap.scrollTop + 16) + 'px';
      wrap.appendChild(pop);
      pop.querySelector('[data-a="open"]').onclick = () => { pop.remove(); this.expandRow(id); };
      pop.querySelector('[data-a="arch"]').onclick = async () => {
        pop.remove();
        const ok = await this.confirmBox({
          title: 'Archive this row?',
          body: '<b style="color:#f0e6dd">' + String(nm).replace(/</g, '&lt;') + '</b><br>This row will be hidden from every list, from the totals at the top, and from the daily briefing.',
          note: 'Nothing is deleted. It stays in your database and can be brought back.',
          ok: 'Yes, archive it', danger: true });
        if (!ok) return;
        this.emit('archive-row', { key: this.tableKey, id: id });
        r.archived = 'Yes';
        this.paintGrid();
      };
      setTimeout(() => { document.addEventListener('click', function h() { const p = wrap.querySelector('.rowpop'); if (p) p.remove(); document.removeEventListener('click', h); }); }, 0);
    }; });

    wrap.querySelectorAll('td[data-f]').forEach(td => {
      const f = td.getAttribute('data-f');
      if (!pills[f]) return;
      td.style.cursor = 'pointer';
      td.title = 'Click to change';
      td.onclick = () => {
        if (td.querySelector('select')) return;
        const id = td.getAttribute('data-id');
        const row = (this.tableRows || []).find(x => x._id === id) || {};
        const cur = row[f] == null ? '' : String(row[f]);
        const vals = {};
        (this.tableRows || []).forEach(r => { const v = r[f]; if (v != null && v !== '') vals[String(v)] = 1; });
        const opts = Object.keys(vals).sort();
        if (cur && opts.indexOf(cur) < 0) opts.unshift(cur);
        const sel = document.createElement('select');
        sel.style.cssText = 'background:#1a1a1a;color:#eee;border:1px solid #c9503a;border-radius:10px;padding:3px 6px;font-size:11px;max-width:230px';
        sel.innerHTML = '<option value=""></option>' + opts.map(o =>
          '<option' + (o === cur ? ' selected' : '') + '>' + o.replace(/</g, '&lt;') + '</option>').join('');
        td.innerHTML = '';
        td.appendChild(sel);
        sel.focus();
        let closed = false;
        const done = (commit) => {
          if (closed) return; closed = true;
          const nv = sel.value;
          if (commit && nv !== cur) {
            this.emit('save-cell', { key: this.tableKey, id: id, field: f, value: nv });
            row[f] = nv;
            if (this.groupBy === f) { setTimeout(() => this.paintGrid(), 60); return; }
          }
          td.innerHTML = this.pill(row[f]);
        };
        sel.onchange = () => done(true);
        sel.onblur = () => done(false);
      };
    });

    wrap.querySelectorAll('[data-sc]').forEach(th => { th.onclick = () => {
      const c = th.getAttribute('data-sc');
      if (this.sortBy === c) { this.sortDir = (this.sortDir === 1) ? -1 : 1; }
      else { this.sortBy = c; this.sortDir = 1; }
      this.paintGrid();
    }; });
  }

  renderStats() {
    const el = this.shadowRoot.getElementById('stats');
    if (!el) return;
    const t = this.tickets;
    const revenue = t.reduce((s, x) => s + (Number(x.total) || 0), 0);
    const pd = (s) => {
      const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (!m) return null;
      let y = Number(m[3]); if (y < 100) y += 2000;
      const d = new Date(y, Number(m[1]) - 1, Number(m[2]));
      return isNaN(d.getTime()) ? null : d;
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const wk = new Date(today.getTime() + 7 * 86400000);
    const done = { 'Completed': 1, 'Cancelled': 1, 'Picked Up': 1 };
    const open = t.filter(x => !done[x.status]);
    const active = open.length;
    const dueWeek = open.filter(x => { const d = pd(x.dueDate); return d && d >= today && d <= wk; }).length;
    const overdue = open.filter(x => { const d = pd(x.dueDate); return d && d < today; }).length;
    el.innerHTML = `
      <div class="stat"><b>${t.length}</b><span>Tickets</span></div>
      <div class="stat"><b>${this.money(revenue)}</b><span>Written business</span></div>
      <div class="stat"><b>${this.customers.length}</b><span>Customers</span></div>
      <div class="stat"><b>${active}</b><span>In progress</span></div>
      <div class="stat"><b>${dueWeek}</b><span>Due this week</span></div>
      <div class="stat${overdue ? ' alert' : ''}"><b>${overdue}</b><span>Past due</span></div>`;
  }

  renderReview() {
    const pane = this.shadowRoot.getElementById('pane');
    if (!pane) return;
    const flagged = (this.tickets || []).filter(t => t.needsReview === 'Yes');
    const F = (t, f) => esc(t[f] == null ? '' : String(t[f]));
    pane.innerHTML = `
      <div class="revwrap">
        <div class="rev-head"><span class="rev-title">\u{1F6A9} Review queue</span><span class="rev-count">${flagged.length} ticket${flagged.length === 1 ? '' : 's'} to review</span></div>
        ${flagged.length === 0 ? '<div class="rev-empty">All caught up — nothing needs review right now. \u{1F389}</div>' : ''}
        ${flagged.map(t => `
          <div class="revcard" data-id="${esc(t._id)}">
            <div class="rev-top"><b>#${F(t, 'ticketNumber') || '—'}</b> · ${F(t, 'customerName') || '(no name)'}<span class="rev-why">${F(t, 'reviewNotes') || 'Flagged for review'}</span></div>
            <div class="rev-grid">
              <label>Customer<input data-k="customerName" value="${F(t, 'customerName')}"></label>
              <label>Phone<input data-k="phone" value="${F(t, 'phone')}"></label>
              <label>Date in<input data-k="dateIn" value="${F(t, 'dateIn')}"></label>
              <label>Due<input data-k="dueWhen" value="${F(t, 'dueWhen')}"></label>
              <label>Bin<input data-k="binNumber" value="${F(t, 'binNumber')}"></label>
              <label>Total<input data-k="total" value="${F(t, 'total')}"></label>
              <label class="rev-wide">Notes<input data-k="notes" value="${F(t, 'notes')}"></label>
            </div>
            ${F(t, 'itemsSummary') ? `<div class="rev-items">${F(t, 'itemsSummary')}</div>` : ''}
            <div class="rev-actions"><button class="rev-save">✓ Save & clear flag</button></div>
          </div>`).join('')}
      </div>`;
    pane.querySelectorAll('.rev-save').forEach(btn => btn.addEventListener('click', () => {
      const card = btn.closest('.revcard');
      const ticket = { _id: card.dataset.id, needsReview: '' };
      card.querySelectorAll('input[data-k]').forEach(inp => { ticket[inp.dataset.k] = inp.value; });
      btn.textContent = 'Saving…'; btn.disabled = true;
      this.emit('update-ticket', { ticket });
    }));
  }

  goWide(on) {
    try {
      this.style.width = on ? '100%' : '';
      this.style.maxWidth = on ? 'none' : '';
      let p = this.parentElement, i = 0;
      while (p && i < 3) {
        if (on) { p.style.setProperty('max-width', 'none', 'important'); p.style.setProperty('width', '100%', 'important'); }
        else { p.style.removeProperty('max-width'); p.style.removeProperty('width'); }
        p = p.parentElement; i++;
      }
    } catch (e) { /* layout tweak is best-effort */ }
  }

  renderPane() {
    this.goWide(this.tab === 'tables');
    if (this.tab === 'tables') this.renderTables();
    if (this.tab === 'search') this.renderSearch();
    if (this.tab === 'scan') this.renderScan();
    if (this.tab === 'add') this.renderAdd();
    if (this.tab === 'review') this.renderReview();
    if (this.tab === 'ask') this.renderAsk();
    if (this.tab === 'eod') this.renderEod();
  }

  renderSearch() {
    const pane = this.shadowRoot.getElementById('pane');
    pane.innerHTML = `
      <div class="bar"><input id="q" placeholder="Search a name, phone, ticket #, bin, moulding, description…"></div>
      <div class="chips">
        <span class="chip" data-f="review">⚑ Needs review</span>
        <span class="chip" data-f="pia">Paid in advance</span>
        <span class="chip" data-f="rack">Art on rack</span>
        <span class="chip" data-f="open">Not picked up</span>
      </div>
      <div class="count" id="cnt"></div>
      <div class="tablecard"><div class="scroll"><table>
        <thead><tr><th>Customer</th><th>Phone</th><th>In</th><th>Due</th><th>Bin</th><th>#</th><th>Total</th><th>Status</th></tr></thead>
        <tbody id="rows"></tbody></table></div></div>`;
    this.filters = new Set();
    pane.querySelector('#q').addEventListener('input', () => this.renderResults());
    pane.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
      c.classList.toggle('on');
      c.classList.contains('on') ? this.filters.add(c.dataset.f) : this.filters.delete(c.dataset.f);
      this.renderResults();
    }));
    this.renderResults();
  }

  renderResults() {
    const rowsEl = this.shadowRoot.getElementById('rows');
    if (!rowsEl) return;
    const q = (this.shadowRoot.getElementById('q')?.value || '').toLowerCase().trim();
    const f = this.filters || new Set();
    const list = this.tickets.filter(t => {
      if (q) {
        const hay = [t.customerName, t.phone, t.ticketNumber, t.binNumber, t.itemsSummary, t.items, t.notes, t.email].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.has('review') && t.needsReview !== 'Yes') return false;
      if (f.has('pia') && t.paidInAdvance !== 'Yes') return false;
      if (f.has('rack') && t.artOnRack !== 'Yes') return false;
      if (f.has('open') && /picked|p\/u|delivered/i.test(t.notes || '')) return false;
      return true;
    });
    const cnt = this.shadowRoot.getElementById('cnt');
    if (cnt) cnt.textContent = `${list.length} ticket${list.length === 1 ? '' : 's'}`;
    const pillFor = s => /paid/i.test(s || '') ? 'paid' : /order/i.test(s || '') ? 'ordered' : 'open';
    rowsEl.innerHTML = list.length ? list.slice(0, 300).map(t => `
      <tr class="row">
        <td>${esc(t.customerName)} ${t.needsReview === 'Yes' ? `<span class="flag" title="${esc(t.reviewNotes)}">⚑</span>` : ''}</td>
        <td>${esc(t.phone)}</td><td>${esc(t.dateIn)}</td><td>${esc(t.dueWhen)}</td>
        <td>${esc(t.binNumber)}</td><td>${esc(t.ticketNumber)}</td>
        <td class="total">${this.money(t.total)}</td>
        <td><span class="pill ${pillFor(t.status)}">${esc(t.status || 'Open')}</span></td>
      </tr>
      <tr class="detail" style="display:none"><td colspan="8">${esc(t.items || t.itemsSummary || '')}${t.notes ? '\n\nNotes: ' + esc(t.notes) : ''}${t.reviewNotes ? '\n⚑ Review: ' + esc(t.reviewNotes) : ''}\nSource: ${esc(t.sourceFile)} p.${esc(String(t.sourcePage ?? ''))}</td></tr>`).join('')
      : '<tr><td colspan="8"><div class="empty">No tickets match — try fewer filters.</div></td></tr>';
    rowsEl.querySelectorAll('tr.row').forEach(r => r.addEventListener('click', () => {
      const d = r.nextElementSibling; d.style.display = d.style.display === 'none' ? '' : 'none';
    }));
  }

  renderScan() {
    const pane = this.shadowRoot.getElementById('pane');
    pane.innerHTML = `
      <div class="banner">📸 <span>Snap or upload a photo of a filled-out ticket. Gemini reads it and fills the ticket form for you to review before saving.</span></div>
      <div class="drop" id="drop">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <div class="big">Drop a ticket photo here</div>
        <div class="sub">or click to choose an image · JPG or PNG</div>
      </div>
      <input type="file" id="file" accept="image/*,application/pdf,.pdf" style="display:none">
      <div id="scanArea"></div>`;
    const drop = pane.querySelector('#drop');
    const file = pane.querySelector('#file');
    drop.addEventListener('click', () => file.click());
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) this.handleFile(f); });
    file.addEventListener('change', e => { const f = e.target.files[0]; if (f) this.handleFile(f); });
  }

  async handleFile(file) {
    const area = this.shadowRoot.getElementById('scanArea');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!file.type.startsWith('image/') && !isPdf) { area.innerHTML = '<div class="err" style="margin:16px 0">Please choose an image or PDF file.</div>'; return; }
    let scaled;
    try { scaled = isPdf ? await fileToData(file) : await scaleImage(file); }
    catch (e) { area.innerHTML = '<div class="err" style="margin:16px 0">Could not read that file.</div>'; return; }
    this.scanning = true;
    area.innerHTML = `
      <div class="preview">
        ${scaled.preview ? '<img src="' + scaled.preview + '" alt="ticket">' : '<div class="pdfbadge">📄 PDF ready \u2014 reading\u2026</div>'}
        <div><div class="scanning"><span class="spinner"></span> Reading the ticket with Gemini…</div>
        <div class="sub" style="color:#6d6860;margin-top:8px;max-width:320px">This takes a few seconds. When it's done you'll land on the Add Ticket form with everything filled in to review.</div></div>
      </div>`;
    this.emit('scan-ticket', { data: scaled.base64, mime: scaled.mime });
  }

  showScanError(msg) {
    const area = this.shadowRoot.getElementById('scanArea');
    if (area) area.innerHTML = `<div class="err" style="margin:16px 0">⚠ ${esc(msg)}</div><div class="sub" style="color:#6d6860">Try a clearer, straight-on photo with good lighting.</div>`;
  }

  renderAdd() {
    const pane = this.shadowRoot.getElementById('pane');
    const t = this.pendingTicket || {};
    const v = k => esc(t[k] != null ? String(t[k]) : '');
    const conf = t.confidence != null ? Math.round(Number(t.confidence) * 100) : null;
    pane.innerHTML = `
      ${this.pendingTicket ? `<div class="banner" id="confirmBanner">✨ <span><b>Read from your ticket photo${conf != null ? ` (${conf}% confident)` : ''}.</b> Check each field, fix anything the AI misread, then Save.</span></div>` : ''}
      <div class="tablecard" style="padding:24px">
      <form id="addForm"><div class="grid">
        <div><label>Customer (Last, First)</label><input name="customerName" value="${v('customerName')}" required></div>
        <div><label>Phone</label><input name="phone" value="${v('phone')}"></div>
        <div><label>Email</label><input name="email" type="email" value="${v('email')}"></div>
        <div><label>Date in</label><input name="dateIn" placeholder="7/21/26" value="${v('dateIn')}"></div>
        <div><label>Due</label><input name="dueWhen" placeholder="Xmas / 8/15/26 / ASAP" value="${v('dueWhen')}"></div>
        <div><label>Bin #</label><input name="binNumber" value="${v('binNumber')}"></div>
        <div><label>Ticket #</label><input name="ticketNumber" value="${v('ticketNumber')}"></div>
        <div><label>Subtotal</label><input name="subtotal" type="number" step="0.01" value="${v('subtotal')}"></div>
        <div><label>Tax</label><input name="tax" type="number" step="0.01" value="${v('tax')}"></div>
        <div><label>Total</label><input name="total" type="number" step="0.01" value="${v('total')}"></div>
        <div><label>Status</label><select name="status">${['Open', 'Ordered', 'Ready', 'Picked Up'].map(s => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label>Paid in advance?</label><select name="paidInAdvance"><option value="" ${t.paidInAdvance !== 'Yes' ? 'selected' : ''}></option><option ${t.paidInAdvance === 'Yes' ? 'selected' : ''}>Yes</option></select></div>
        <div class="full"><label>Items — size, moulding, mat, glass, description, price</label><textarea name="items" rows="4">${v('items')}</textarea></div>
        <div class="full"><label>Notes</label><textarea name="notes" rows="2">${v('notes')}</textarea></div>
      </div>
      <div class="actions">
        <button class="btn" type="submit">Save Ticket</button>
        ${this.pendingTicket ? '<button class="btn ghost" type="button" id="clearScan">Clear</button>' : ''}
        <span id="saveMsg"></span>
      </div></form></div>`;
    pane.querySelector('#addForm').addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target).entries());
      const parts = (d.customerName || '').split(',');
      d.lastName = (parts[0] || '').trim(); d.firstName = (parts[1] || '').trim();
      d.itemsSummary = (d.items || '').slice(0, 200);
      d.ticketId = 'manual-' + Date.now();
      d.sourceFile = this.pendingTicket ? 'Ticket photo scan' : 'Manager page';
      this.shadowRoot.getElementById('saveMsg').textContent = 'Saving…';
      this.emit('add-ticket', { ticket: d });
    });
    const clr = pane.querySelector('#clearScan');
    if (clr) clr.addEventListener('click', () => { this.pendingTicket = null; this.renderAdd(); });
  }

  renderEod() {
    const pane = this.shadowRoot.getElementById('pane');
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    pane.innerHTML = `
      <div class="banner">🌙 <span>Type today’s end-of-day update. It saves to your End of Day log and feeds the assistant — so “Ask Anything” always knows the shop’s rhythm.</span></div>
      <div class="tablecard" style="padding:24px">
      <form id="eodForm"><div class="grid">
        <div><label>Date</label><input name="entryDate" value="${esc(today)}"></div>
        <div><label>Who’s writing?</label><select name="author"><option>Amanda</option><option>Jack</option><option>Amanda & Jack</option></select></div>
        <div><label>New tickets</label><input name="newTickets" type="number"></div>
        <div><label>PIA count</label><input name="piaCount" type="number"></div>
        <div><label>PIA $</label><input name="piaAmount" type="number" step="0.01"></div>
        <div><label>Non-PIA count</label><input name="nonPiaCount" type="number"></div>
        <div><label>Pick-ups (P/U)</label><input name="pickups" type="number"></div>
        <div><label>Paid at P/U count</label><input name="paidAtPuCount" type="number"></div>
        <div><label>Paid at P/U $</label><input name="paidAtPuAmount" type="number" step="0.01"></div>
        <div><label>Transactions</label><input name="transactions" type="number"></div>
        <div><label>Day total $</label><input name="dayTotal" type="number" step="0.01"></div>
        <div><label>Weekly total $ (Saturdays)</label><input name="weeklyTotal" type="number" step="0.01"></div>
        <div class="full"><label>The story of the day</label><textarea name="narrative" rows="6" placeholder="Who came in, what you worked on, the wins, the funny moments…"></textarea></div>
      </div>
      <div class="actions"><button class="btn" type="submit">Save End of Day</button><span id="eodMsg"></span></div></form></div>`;
    pane.querySelector('#eodForm').addEventListener('submit', e => {
      e.preventDefault();
      const entry = Object.fromEntries(new FormData(e.target).entries());
      this.shadowRoot.getElementById('eodMsg').textContent = 'Saving…';
      this.emit('save-eod', { entry });
    });
  }

  loadBrief() {
    if (this.brief || this.briefLoading) { this.renderBriefCard(); return; }
    try { const _k = 'barryBrief_' + new Date().toISOString().slice(0, 10); const _c = localStorage.getItem(_k); if (_c) { this.brief = _c; this.renderBriefCard(); return; } } catch (e) {}
    this.renderBriefCard();
  }

  generateBrief() {
    if (this.briefLoading) return;
    this.briefLoading = true;
    this.renderBriefCard();
    this.emit('daily-brief', {});
  }

  renderBriefCard() {
    const body = this.shadowRoot.getElementById('briefBody');
    if (!body) return;
    if (this.brief) { body.innerHTML = esc(this.brief).replace(/\n/g, "<br>"); }
    else if (this.briefLoading) { body.innerHTML = '<span class="brief-load">Pulling your update together…</span>'; }
    else { body.innerHTML = '<button class="get-brief" id="getBrief">☀ Get daily update</button>'; const _gb = body.querySelector('#getBrief'); if (_gb) _gb.addEventListener('click', () => this.generateBrief()); }
  }

  renderAsk() {
    const pane = this.shadowRoot.getElementById('pane');
    pane.innerHTML = `
      <div class="briefcard" id="briefcard">
          <div class="brief-top"><span class="brief-title">☀ Today’s briefing</span><button class="brief-refresh" id="briefRefresh" title="Refresh briefing">↻</button></div>
          <div class="brief-body" id="briefBody"><span class="brief-load">Pulling your update together…</span></div>
          <div class="brief-actions">
            <button class="qa" data-q="How is this week going for us so far compared with the days just before?">📈 This week</button>
            <button class="qa" data-q="Which orders look due or overdue this week?">⏰ Due soon</button>
            <button class="qa" data-q="Which paid-in-advance orders still need to be started?">🎯 PIA to start</button>
            <button class="qa" data-q="What art has been sitting on the rack the longest?">🖼 On the rack</button>
            <button class="qa" data-q="Who are our top 5 customers by total spend?">🏆 Top customers</button>
          </div>
        </div>
      <div class="chatcard">
        <div class="sugg">
          <span class="chip" data-q="Which tickets still have art on the rack?">Art still on the rack?</span>
          <span class="chip" data-q="Who are my top 5 customers by total spent?">Top 5 customers</span>
          <span class="chip" data-q="What would an Elite 2 inch frame at 18x24 with MSM glass cost?">Quote: Elite 18×24</span>
          <span class="chip" data-q="Summarize the Calcagno order.">The Calcagno order</span>
        </div>
        <div class="chatbox" id="chat"></div>
        <div class="askbar">
          <input id="qq" placeholder="Ask anything about your tickets, customers or prices…">
          <button class="btn" id="send">Ask</button>
        </div>
        <div class="powered">Answers generated by <b>Gemini</b> from your live CMS data</div>
      </div>`;
    const send = (text) => {
      const inp = pane.querySelector('#qq');
      const q = (text || inp.value).trim();
      if (!q) return;
      this.chat.push({ role: 'user', text: q });
      this.chat.push({ role: 'ai', text: '', pending: true });
      inp.value = '';
      this.renderChat();
      this.emit('ask-ai', { question: q });
    };
    pane.querySelector('#send').addEventListener('click', () => send());
    pane.querySelector('#qq').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    pane.querySelectorAll('.sugg .chip').forEach(c => c.addEventListener('click', () => send(c.dataset.q)));
    pane.querySelectorAll('.brief-actions .qa').forEach(b => b.addEventListener('click', () => send(b.dataset.q)));
    const _br = pane.querySelector('#briefRefresh'); if (_br) _br.addEventListener('click', () => { try { localStorage.removeItem('barryBrief_' + new Date().toISOString().slice(0, 10)); } catch (e) {} this.brief = null; this.briefLoading = false; this.generateBrief(); });
    this.loadBrief();
    this.renderChat();
  }

  renderChat() {
    const box = this.shadowRoot.getElementById('chat');
    if (!box) return;
    box.innerHTML = this.chat.length
      ? this.chat.map(m => m.pending
        ? `<div class="msg ai"><span class="dots"><i></i><i></i><i></i></span></div>`
        : `<div class="msg ${m.role}">${esc(m.text)}</div>`).join('')
      : '<div class="empty">Ask about any customer, ticket, bin, or price — Gemini reads your whole CMS.</div>';
    box.scrollTop = box.scrollHeight;
  }
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function fileToData(file) {
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return { base64: b64, mime: file.type || 'application/pdf', preview: null };
}

async function scaleImage(file, maxDim = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const url = canvas.toDataURL('image/jpeg', quality);
  return { base64: url.split(',')[1], mime: 'image/jpeg', preview: url };
}

try { customElements.define('barry-manager', BarryManager); } catch (e) { }
try { customElements.define('barry-frame-wall', class extends BarryManager { }); } catch (e) { }
