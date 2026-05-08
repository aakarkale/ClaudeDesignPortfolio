// ====================================================================
// Easter Eggs v5 — clean rewrite with all updates
// ====================================================================
(function() {

  const getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';

  // ─── Toast ────────────────────────────────────────────────────────
  function showToast(msg, opts = {}) {
    document.querySelectorAll('.ee-toast').forEach(t => t.remove());
    const theme = getTheme();
    const t = document.createElement('div');
    t.className = 'ee-toast';
    t.style.cssText = `
      position:fixed;bottom:90px;left:50%;
      transform:translateX(-50%) translateY(24px);
      max-width:min(480px,88vw);padding:14px 22px;border-radius:100px;
      background:${opts.bg||(theme==='dark'?'#ffdd55':'#dc3728')};
      color:${opts.color||'#000'};
      font:600 13px/1.4 '${theme==='dark'?'DM Sans':'Montserrat'}',sans-serif;
      letter-spacing:.04em;box-shadow:0 16px 48px rgba(0,0,0,.55);
      opacity:0;transition:opacity 320ms,transform 320ms cubic-bezier(.2,.8,.2,1);
      z-index:9990;pointer-events:none;text-align:center;white-space:normal;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
    setTimeout(() => {
      t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(24px)';
      setTimeout(()=>t.remove(), 380);
    }, opts.duration||2600);
  }

  // ─── Confetti burst ───────────────────────────────────────────────
  function confettiBurst(cx, cy, count=60) {
    const theme = getTheme();
    const palette = theme==='dark'
      ? ['#ffdd55','#7373ff','#ff8573','#04c40a','#2995ff','#ff4538','#ff0080','#fff']
      : ['#dc3728','#b4823c','#1e1e1e','#8b0000','#444','#f97316','#7c3aed'];
    for (let i=0; i<count; i++) {
      const el = document.createElement('div');
      const angle = Math.random()*Math.PI*2;
      const speed = 80+Math.random()*240;
      const size = 5+Math.random()*9;
      const tx = Math.cos(angle)*speed, ty = Math.sin(angle)*speed-80;
      const color = palette[Math.floor(Math.random()*palette.length)];
      const rect = Math.random()>0.4;
      const dur = 500+Math.random()*700;
      el.style.cssText = `
        position:fixed;left:${cx}px;top:${cy}px;
        width:${rect?size*.6:size}px;height:${rect?size*1.8:size}px;
        border-radius:${rect?'2px':'50%'};background:${color};
        pointer-events:none;z-index:9989;transform:translate(-50%,-50%);
        transition:transform ${dur}ms cubic-bezier(.2,.8,.2,1),opacity ${dur*.8}ms ${dur*.2}ms ease-out;
      `;
      document.body.appendChild(el);
      requestAnimationFrame(()=>{
        el.style.transform=`translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) rotate(${Math.random()*900}deg)`;
        el.style.opacity='0';
      });
      setTimeout(()=>el.remove(), dur+200);
    }
  }

  // ─── 1. Triple-click hero → glitch scramble ──────────────────────
  function initHeroGlitch() {
    const DARK = '01アカル産品ΩΔ∑≠±×÷░▒▓';
    const LIGHT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ★●◆▲■';
    let clicks=0, timer;
    document.addEventListener('click', e => {
      if (!e.target.closest('.hero-title')) return;
      clicks++; clearTimeout(timer);
      timer = setTimeout(()=>clicks=0, 700);
      if (clicks<3) return;
      clicks=0;
      const el = document.querySelector('.hero-title');
      if (!el) return;
      const theme = getTheme();
      const chars = theme==='dark'?DARK:LIGHT;
      const orig = el.innerHTML;
      let frame=0, MAX=22;
      if (theme==='dark') { el.style.color='#73ff73'; el.style.fontFamily="'Geist',monospace"; }
      else { el.style.color='var(--accent)'; el.style.letterSpacing='0.05em'; }
      const plain = el.innerText.split('');
      const id = setInterval(()=>{
        if (frame>=MAX) { clearInterval(id); el.style.cssText=''; el.innerHTML=orig; return; }
        const p = frame/MAX;
        el.innerText = plain.map(c=>/\s/.test(c)?c:Math.random()<p?c:chars[Math.floor(Math.random()*chars.length)]).join('');
        frame++;
      }, 55);
      showToast(theme==='dark'?'// SYSTEM OVERRIDE':'✦ SCRAMBLE MODE', {duration:1200});
    });
  }

  // ─── 2. Type "yay" → confetti burst ──────────────────────────────
  function initTypeYay() {
    let buf='';
    document.addEventListener('keydown', e=>{
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      buf=(buf+e.key.toLowerCase()).slice(-3);
      if (buf==='yay') {
        buf='';
        confettiBurst(window.innerWidth/2, window.innerHeight*.4, 80);
        showToast('🎉 YAY! You found it!', {duration:2400});
      }
    });
  }

  // ─── 3. Hover "." in hero 5s → small quote box ───────────────────
  function initHeroQuote() {
    const QUOTES = [
      {q:'The only way to do great work is to love what you do.',a:'Steve Jobs'},
      {q:'In the middle of every difficulty lies opportunity.',a:'Albert Einstein'},
      {q:"It does not matter how slowly you go as long as you do not stop.",a:'Confucius'},
      {q:'The future belongs to those who believe in the beauty of their dreams.',a:'Eleanor Roosevelt'},
      {q:'Success is not final, failure is not fatal: it is the courage to continue that counts.',a:'Winston Churchill'},
      {q:"Whether you think you can or you think you can't, you're right.",a:'Henry Ford'},
      {q:"Many of life's failures are people who did not realize how close they were to success when they gave up.",a:'Thomas Edison'},
      {q:'The purpose of our lives is to be happy.',a:'Dalai Lama'},
      {q:"In three words I can sum up everything I've learned about life: it goes on.",a:'Robert Frost'},
      {q:'You only live once, but if you do it right, once is enough.',a:'Mae West'},
      {q:'It always seems impossible until it\'s done.',a:'Nelson Mandela'},
      {q:"Believe you can and you're halfway there.",a:'Theodore Roosevelt'},
      {q:"You miss 100% of the shots you don't take.",a:'Wayne Gretzky'},
      {q:'The secret of getting ahead is getting started.',a:'Mark Twain'},
      {q:'Life is 10% what happens to you and 90% how you react to it.',a:'Charles R. Swindoll'},
      {q:'Do what you can, with what you have, where you are.',a:'Theodore Roosevelt'},
      {q:'The only impossible journey is the one you never begin.',a:'Tony Robbins'},
      {q:'Not everything that is faced can be changed, but nothing can be changed until it is faced.',a:'James Baldwin'},
      {q:'Spread love everywhere you go.',a:'Mother Teresa'},
      {q:'When you reach the end of your rope, tie a knot in it and hang on.',a:'Franklin D. Roosevelt'},
    ];
    let idx = Math.floor(Math.random()*QUOTES.length);

    const showBox = () => {
      if (document.getElementById('quote-box')) return;
      const q = QUOTES[idx%QUOTES.length]; idx++;
      const theme = getTheme();
      const isDark = theme==='dark';
      const accent = isDark?'#ffdd55':'#dc3728';

      // Inject quote-box styles once
      if (!document.getElementById('qbox-style')) {
        const s=document.createElement('style'); s.id='qbox-style';
        s.textContent=`
          @keyframes qb-in{from{opacity:0;transform:translateX(-50%) translateY(28px) scale(.97)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
          @keyframes qb-progress{from{width:0}to{width:100%}}
          @keyframes qb-word{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
          #quote-box .qb-word{display:inline;opacity:0;animation:qb-word 400ms cubic-bezier(.2,.8,.2,1) forwards}
        `;
        document.head.appendChild(s);
      }

      const box = document.createElement('div');
      box.id = 'quote-box';
      box.style.cssText = `
        position:fixed;bottom:36px;left:50%;
        width:min(540px,90vw);
        padding:0;border-radius:22px;
        overflow:hidden;
        box-shadow:0 32px 80px rgba(0,0,0,${isDark?.7:.2}),0 2px 12px rgba(0,0,0,.12);
        z-index:9970;cursor:pointer;
        animation:qb-in 500ms cubic-bezier(.2,.8,.2,1) forwards;
      `;

      // Top accent bar
      const bar = document.createElement('div');
      bar.style.cssText=`height:3px;background:linear-gradient(90deg,${accent},${isDark?'#7373ff':'#b4823c'});width:100%;`;

      // Body
      const body = document.createElement('div');
      body.style.cssText=`
        padding:28px 32px 24px;
        background:${isDark?'rgba(16,16,17,0.98)':'rgba(255,255,255,0.99)'};
        border:1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'};
        border-top:none;
        border-radius:0 0 22px 22px;
        backdrop-filter:blur(24px);
        display:flex;flex-direction:column;gap:16px;
      `;

      // Big open-quote glyph
      const mark = document.createElement('div');
      mark.style.cssText=`font:700 56px/1 Georgia,serif;color:${accent};opacity:.25;margin-bottom:-20px;line-height:.6;`;
      mark.textContent='\u201c';

      // Quote text — word-by-word animated
      const qEl = document.createElement('p');
      qEl.style.cssText=`margin:0;font:${isDark?'400 18px/1.65 "DM Sans"':'500 17px/1.7 "Montserrat"'},sans-serif;color:${isDark?'#f0f0f0':'#151515'};letter-spacing:${isDark?'-0.01em':'0.005em'};`;
      const words = q.q.split(' ');
      words.forEach((w,i)=>{
        const span=document.createElement('span');
        span.className='qb-word';
        span.style.animationDelay=`${120+i*42}ms`;
        span.textContent=(i>0?' ':'')+w;
        qEl.appendChild(span);
      });

      // Divider
      const div = document.createElement('div');
      div.style.cssText=`height:1px;background:${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'};`;

      // Author row
      const authRow = document.createElement('div');
      authRow.style.cssText=`display:flex;align-items:center;gap:10px;`;
      const dot = document.createElement('span');
      dot.style.cssText=`width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;`;
      const auth = document.createElement('span');
      auth.style.cssText=`font:600 12px/1 '${isDark?'Geist':'Montserrat'}',monospace;text-transform:uppercase;letter-spacing:.18em;color:${isDark?'rgba(255,255,255,.45)':'rgba(0,0,0,.45)'};`;
      auth.textContent=q.a;
      authRow.append(dot,auth);

      // Progress bar
      const prog = document.createElement('div');
      prog.style.cssText=`height:2px;background:${isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'};border-radius:2px;overflow:hidden;margin-top:4px;`;
      const progFill = document.createElement('div');
      progFill.style.cssText=`height:100%;background:${accent};opacity:.5;animation:qb-progress 8s linear forwards;`;
      prog.appendChild(progFill);

      body.append(mark, qEl, div, authRow, prog);
      box.append(bar, body);
      document.body.appendChild(box);

      const dismiss = ()=>{
        box.style.animation='none';
        box.style.opacity='0';
        box.style.transform='translateX(-50%) translateY(28px) scale(.97)';
        box.style.transition='all 380ms cubic-bezier(.2,.8,.2,1)';
        setTimeout(()=>box.remove(),400);
      };
      const t = setTimeout(dismiss, 8000);
      box.addEventListener('click',()=>{ clearTimeout(t); dismiss(); });
    };

    const tryInit = () => {
      const dot = document.getElementById('hero-dot');
      if (!dot) return setTimeout(tryInit, 600);
      dot.style.cursor = 'default';
      let hoverTimer, touchTimer;

      dot.addEventListener('mouseenter', ()=>{ hoverTimer = setTimeout(showBox, 5000); });
      dot.addEventListener('mouseleave', ()=>clearTimeout(hoverTimer));

      dot.addEventListener('touchstart', ()=>{ touchTimer = setTimeout(showBox, 800); }, {passive:true});
      dot.addEventListener('touchend',   ()=>clearTimeout(touchTimer));
      dot.addEventListener('touchmove',  ()=>clearTimeout(touchTimer));
    };
    setTimeout(tryInit, 800);
  }

  // ─── 4. Footer "AK." 5× → particle explosion ─────────────────────
  function initFooterSig() {
    let clicks=0, timer;
    document.addEventListener('click', e=>{
      if (!e.target.closest('.footer-sig')) return;
      clicks++; clearTimeout(timer);
      timer = setTimeout(()=>clicks=0, 1400);
      if (clicks<5) return;
      clicks=0;
      [0,120,250].forEach(d=>setTimeout(()=>confettiBurst(e.clientX+(Math.random()-.5)*60, e.clientY+(Math.random()-.5)*60, 40), d));
      showToast('🎊 You found the AK. secret!', {duration:2400});
    });
  }

  // ─── 6. Double-click stat → counter animation ────────────────────
  function initStatCounter() {
    document.addEventListener('dblclick', e=>{
      const stat = e.target.closest('.stat');
      if (!stat) return;
      const numEl = stat.querySelector('.stat-num');
      if (!numEl) return;
      const orig = numEl.textContent.trim();
      const match = orig.match(/[\d.]+/);
      if (!match) return;
      const target=parseFloat(match[0]);
      const pre=orig.slice(0,orig.indexOf(match[0]));
      const suf=orig.slice(orig.indexOf(match[0])+match[0].length);
      const isFloat=match[0].includes('.');
      const FRAMES=34; let frame=0;
      const origBorder=stat.style.borderColor, origTr=stat.style.transform;
      stat.style.cssText += ';border-color:var(--accent) !important;transform:scale(1.1);transition:border-color 200ms,transform 200ms;';
      const id=setInterval(()=>{
        if (frame>=FRAMES) {
          clearInterval(id); numEl.textContent=orig;
          stat.style.borderColor=origBorder; stat.style.transform=origTr;
          return;
        }
        const ease=1-Math.pow(1-frame/FRAMES,3);
        const v=target*ease;
        numEl.textContent=pre+(isFloat?v.toFixed(1):Math.round(v))+suf;
        frame++;
      }, 38);
    });
  }

  // ─── 7. Shake (mobile) → rainbow ripple ──────────────────────────
  function initShake() {
    if (!window.DeviceMotionEvent) return;
    let last={x:0,y:0,z:0}, lastTime=0;
    window.addEventListener('devicemotion', e=>{
      const acc=e.accelerationIncludingGravity; if (!acc) return;
      const now=Date.now(); if (now-lastTime<800) return;
      if (Math.abs(acc.x-last.x)+Math.abs(acc.y-last.y)+Math.abs(acc.z-last.z)>28) {
        lastTime=now;
        const ring=document.createElement('div');
        ring.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:9985;background:conic-gradient(from 0deg,#ff006e,#fb5607,#ffbe0b,#8338ec,#3a86ff,#ff006e);opacity:0;transition:opacity 250ms;mix-blend-mode:${getTheme()==='dark'?'screen':'multiply'};`;
        document.body.appendChild(ring);
        requestAnimationFrame(()=>ring.style.opacity='.35');
        setTimeout(()=>{ ring.style.opacity='0'; setTimeout(()=>ring.remove(),300); },400);
        confettiBurst(window.innerWidth/2,window.innerHeight/2,50);
        showToast('🌈 Rainbow shake!',{duration:1600});
      }
      last={x:acc.x,y:acc.y,z:acc.z};
    });
  }

  // ─── 8. Click all stats in order → achievement ───────────────────
  function initStatAchievement() {
    let seq=[];
    document.addEventListener('click', e=>{
      const stat=e.target.closest('.stat'); if (!stat) { if (!e.target.closest('.about-stats-grid')) { seq=[]; document.querySelectorAll('.stat').forEach(s=>s.style.borderColor=''); } return; }
      const parent=stat.closest('.about-stats-grid'); if (!parent) return;
      const all=[...parent.querySelectorAll('.stat')], idx=all.indexOf(stat);
      if (idx===seq.length) {
        seq.push(idx); stat.style.borderColor='var(--accent)'; stat.style.transition='all 200ms';
        if (seq.length===all.length) {
          seq=[];
          setTimeout(()=>{
            [0,200,350].forEach(d=>setTimeout(()=>confettiBurst(window.innerWidth*(Math.random()*.6+.2),window.innerHeight*.35,50),d));
            showToast('🏆 Achievement: Full Stack Human',{duration:4000});
            all.forEach(s=>s.style.borderColor='');
          },200);
        }
      } else { seq=[]; all.forEach(s=>s.style.borderColor=''); }
    });
  }

  // ─── MOBILE EXCLUSIVE ────────────────────────────────────────────

  // M1. Pinch-in on hero → quote
  function initMobilePinch() {
    let initDist=null;
    document.addEventListener('touchstart', e=>{
      if (e.touches.length===2) { initDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); }
    },{passive:true});
    document.addEventListener('touchmove', e=>{
      if (e.touches.length!==2||initDist===null) return;
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if (d<initDist*.55) { initDist=null; showToast('🔭 Zoom out — the big picture awaits.',{duration:2800,bg:getTheme()==='dark'?'#7373ff':'#1e1e1e',color:'#fff'}); }
    },{passive:true});
    document.addEventListener('touchend', ()=>{ if (!arguments[0]||!arguments[0].touches||arguments[0].touches.length<2) initDist=null; },{passive:true});
  }

  // M2. Fast swipe up on hero → shooting star
  function initMobileSwipeUpStar() {
    let startY=null, triggered=false;
    document.addEventListener('touchstart', e=>{ if (e.touches.length===1) startY=e.touches[0].clientY; },{passive:true});
    document.addEventListener('touchend', e=>{
      if (startY===null||triggered) return;
      const dy=startY-e.changedTouches[0].clientY;
      startY=null;
      if (dy>160&&window.scrollY<100) {
        triggered=true; setTimeout(()=>triggered=false,3000);
        const theme=getTheme();
        for (let i=0;i<3;i++) setTimeout(()=>{
          const star=document.createElement('div');
          const sx=Math.random()*window.innerWidth*.6+window.innerWidth*.2;
          star.style.cssText=`position:fixed;left:${sx}px;bottom:-20px;width:2px;height:${50+Math.random()*60}px;background:linear-gradient(to top,transparent,${theme==='dark'?'#ffdd55':'#dc3728'});border-radius:2px;pointer-events:none;z-index:9987;opacity:0;transition:bottom 800ms cubic-bezier(.2,.8,.2,1),opacity 200ms;box-shadow:0 0 8px ${theme==='dark'?'#ffdd5560':'#dc372860'};transform:rotate(${-10+Math.random()*20}deg);`;
          document.body.appendChild(star);
          requestAnimationFrame(()=>{ star.style.opacity='1'; star.style.bottom=`${window.innerHeight+60}px`; });
          setTimeout(()=>{ star.style.opacity='0'; setTimeout(()=>star.remove(),300); },900);
        }, i*150);
        showToast('⭐ Shoot for the stars!',{duration:2000});
      }
    },{passive:true});
  }

  // M3. Long-press project card → behind the scenes
  function initMobileCardLongPress() {
    const msgs=['🔧 Built with late nights and cold coffee.','💡 This idea came from a shower thought.','🚀 Shipped in a weekend hackathon.','🐛 This one had 47 bugs before launch.','❤️ My personal favorite project.'];
    let pressTimer, pressIdx=0;
    document.addEventListener('touchstart', e=>{
      const card=e.target.closest('.proj-card,.swipe-card-top'); if (!card) return;
      pressTimer=setTimeout(()=>{ const theme=getTheme(); confettiBurst(e.touches[0].clientX,e.touches[0].clientY,30); showToast(msgs[pressIdx++%msgs.length],{duration:3000,bg:theme==='dark'?'#1f1f1f':'#fff',color:theme==='dark'?'#fff':'#000'}); },600);
    },{passive:true});
    ['touchend','touchcancel','touchmove'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(pressTimer),{passive:true}));
  }

  // M4. Swipe right on hero → open to work
  function initMobileSwipeRight() {
    let startX=null;
    document.addEventListener('touchstart', e=>{ if (e.touches.length===1&&window.scrollY<80) startX=e.touches[0].clientX; },{passive:true});
    document.addEventListener('touchend', e=>{
      if (startX===null) return;
      const dx=e.changedTouches[0].clientX-startX; startX=null;
      if (dx>120) showToast('🟢 Open to the right opportunities — say hi!',{duration:3200,bg:'rgb(4,196,10)',color:'#000'});
    },{passive:true});
  }

  // ─── Hover hints — chip follows the cursor while inside an egg region ─
  function initEggHints() {
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

    const HINTS = [
      { sel: '.hero-title',  text: 'Triple-click for a surprise' },
      { sel: '#hero-dot',    text: 'Hover for 5 seconds…' },
      { sel: '.footer-sig',  text: 'Click 5 times' },
      { sel: '.logo-btn',    text: 'Press and hold' },
      { sel: '.stat',        text: 'Double-click for a number trick' },
      { sel: '#work',        text: 'Try: ↑ ↑ ↓ ↓ ← → ← → B A' },
    ];

    const chip = document.createElement('div');
    chip.className = 'egg-hint';
    chip.setAttribute('aria-hidden', 'true');
    chip.innerHTML = '<span class="egg-hint-dot"></span><span class="egg-hint-text"></span>';
    document.body.appendChild(chip);
    const chipText = chip.querySelector('.egg-hint-text');

    let currentEl = null;
    let lastX = 0, lastY = 0;

    const place = (x, y) => {
      // Default: chip below the cursor; flip above if near the viewport bottom
      const flipUp = (y + 90) > window.innerHeight;
      chip.classList.toggle('egg-hint-up', flipUp);
      chip.style.left = x + 'px';
      chip.style.top  = y + 'px';
    };

    const findHit = (target) => {
      for (const h of HINTS) {
        const el = target.closest(h.sel);
        if (el) return { el, text: h.text };
      }
      return null;
    };

    document.addEventListener('mousemove', (e) => {
      lastX = e.clientX; lastY = e.clientY;
      const hit = findHit(e.target);
      if (hit) {
        if (hit.el !== currentEl) {
          currentEl = hit.el;
          chipText.textContent = hit.text;
          chip.classList.add('on');
        }
        place(lastX, lastY);
      } else if (currentEl) {
        currentEl = null;
        chip.classList.remove('on');
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      currentEl = null;
      chip.classList.remove('on');
    });
  }

  // ─── Mount ────────────────────────────────────────────────────────
  window.initEasterEggs = function() {
    initHeroGlitch();
    initTypeYay();
    initHeroQuote();
    initFooterSig();
    initStatCounter();
    initShake();
    initStatAchievement();
    initMobilePinch();
    initMobileSwipeUpStar();
    initMobileCardLongPress();
    initMobileSwipeRight();
    initEggHints();
    window.__confettiBurst = confettiBurst;
    window.__showToast = showToast;
    console.log('%c🥚 11 Easter eggs loaded. Good luck finding them all.','color:#ffdd55;font-size:13px;font-weight:700;background:#0a0a0a;padding:4px 8px;border-radius:4px;');
  };

})();
