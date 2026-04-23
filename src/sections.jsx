// ====================================================================
// Sections: About, Work (swipe deck + grid), Experience, Skills, Contact
// ====================================================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SectionHead } from './chrome.jsx';

// ─── About ───────────────────────────────────────────────────────────
export function About({ data }) {
  return (
    <section id="about" data-section="about" data-screen-label="02 About">
      <div className="container">
        <SectionHead index="01" title="About" />

        <div className="about-hero reveal">
          <h2 className="about-hero-text">
            Building the future,
            <span className="about-hero-accent"> one product at a time.</span>
          </h2>
          <div className="about-location reveal">
            <span className="about-location-dot" />
            <span>San Francisco, CA · Originally from Mumbai</span>
          </div>
        </div>

        <div className="about-grid">
          <div className="about-body reveal">
            {data.about.slice(0,2).map((p, i) => <p key={i} className="about-para">{p}</p>)}
          </div>
          <div className="about-body reveal">
            {data.about.slice(2).map((p, i) => <p key={i} className="about-para">{p}</p>)}
          </div>
        </div>

        <div className="about-stats-grid reveal">
          {data.stats.map((s, i) => (
            <div className="stat" key={i} style={{ '--i': i }}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Work — Swipe deck (mobile) + Grid (desktop) ─────────────────────
export function Work({ data, projects, unlocked }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return (
    <section id="work" data-section="work" data-screen-label="03 Work">
      <div className="container">
        <SectionHead index="02" title="Selected Work" sub="Things I've shipped, prototyped, and patent-filed." />

        {isMobile ? (
          <SwipeDeck projects={projects} unlocked={unlocked} />
        ) : (
          <WorkGrid projects={projects} unlocked={unlocked} />
        )}
      </div>
    </section>
  );
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

function SwipeDeck({ projects, unlocked }) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef({ x: 0, y: 0 });

  const list = projects;
  const n = list.length;
  const cur = list[idx % n];

  const next = (dir) => {
    setIdx(i => (i + 1) % n);
    setDrag({ x: 0, y: 0, active: false, flung: dir });
    setTimeout(() => setDrag({ x: 0, y: 0, active: false }), 360);
  };

  const onStart = (e) => {
    const p = e.touches ? e.touches[0] : e;
    startRef.current = { x: p.clientX, y: p.clientY };
    setDrag(d => ({ ...d, active: true }));
  };
  const onMove = (e) => {
    if (!drag.active) return;
    const p = e.touches ? e.touches[0] : e;
    setDrag({ x: p.clientX - startRef.current.x, y: p.clientY - startRef.current.y, active: true });
  };
  const onEnd = () => {
    if (Math.abs(drag.x) > 90) next(drag.x > 0 ? 1 : -1);
    else setDrag({ x: 0, y: 0, active: false });
  };

  return (
    <div className="swipe-stage reveal">
      <div className="swipe-deck">
        {[2, 1].map(off => (
          <div key={`back-${off}`} className="swipe-card swipe-card-back"
               style={{
                 transform: `translateY(${off * 10}px) scale(${1 - off * 0.05})`,
                 opacity: 1 - off * 0.3,
                 zIndex: 10 - off,
               }}
               aria-hidden="true"
          />
        ))}

        <div
          className={`swipe-card swipe-card-top ${drag.flung ? 'swipe-flung' : ''}`}
          style={{
            transform: drag.flung
              ? `translate(${drag.flung * 500}px, 60px) rotate(${drag.flung * 25}deg)`
              : `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${drag.x * 0.05}deg)`,
            transition: drag.active ? 'none' : 'transform 380ms cubic-bezier(.2,.8,.2,1)',
            zIndex: 20,
          }}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={drag.active ? onEnd : undefined}
        >
          <ProjectCardFace p={cur} />
          <div className="swipe-badge swipe-badge-right" style={{ opacity: Math.max(0, drag.x / 120) }}>NEXT</div>
          <div className="swipe-badge swipe-badge-left"  style={{ opacity: Math.max(0, -drag.x / 120) }}>SKIP</div>
        </div>
      </div>

      <div className="swipe-meta">
        <div className="swipe-counter">
          {String((idx % n) + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </div>
        <div className="swipe-hint">← swipe to browse →</div>
      </div>

      <div className="swipe-dots">
        {list.map((_, i) => (
          <span key={i} className={`swipe-dot ${i === idx % n ? 'on' : ''}`} />
        ))}
      </div>

      <div className="swipe-controls">
        <button className="swipe-btn" onClick={() => setIdx(i => (i - 1 + n) % n)} aria-label="Previous">←</button>
        <button className="swipe-btn" onClick={() => next(1)} aria-label="Next">→</button>
      </div>
    </div>
  );
}

function WorkGrid({ projects, unlocked }) {
  const [hov, setHov] = useState(null);
  return (
    <div className="work-grid reveal">
      {projects.map((p, i) => (
        <ProjectCard key={p.id} p={p} big={i === 0} wide={p.id === 'photocloud'} onHover={setHov} hov={hov === p.id} />
      ))}
    </div>
  );
}

function ProjectCard({ p, big, wide, onHover, hov }) {
  return (
    <a
      href={p.url || '#'}
      target={p.url ? '_blank' : undefined}
      rel={p.url ? 'noreferrer' : undefined}
      className={`proj-card ${big ? 'proj-big' : ''} ${wide ? 'proj-wide' : ''} ${p.id === 'secret' ? 'proj-secret' : ''}`}
      style={{ '--accent': p.accent }}
      onMouseEnter={() => onHover && onHover(p.id)}
      onMouseLeave={() => onHover && onHover(null)}
      data-cursor="on"
    >
      <ProjectCardFace p={p} big={big || wide} />
      <div className="proj-glow" aria-hidden />
    </a>
  );
}

function ProjectCardFace({ p, big }) {
  return (
    <div className="proj-face">
      <div className="proj-top">
        <span className="proj-index">{p.index}</span>
        <span className="proj-dot" style={{ background: p.accent }} />
      </div>
      <div className="proj-body">
        <h3 className="proj-title">{p.title}</h3>
        <p className="proj-one">{p.oneLiner}</p>
      </div>
      <div className="proj-tags">
        {p.tags.map(t => <span key={t} className="chip">{t}</span>)}
      </div>
    </div>
  );
}

// ─── Experience ──────────────────────────────────────────────────────
export function Experience({ data }) {
  return (
    <section id="experience" data-section="experience" data-screen-label="04 Experience">
      <div className="container">
        <SectionHead index="03" title="Experience" sub="A decade across engineering, consulting, and product." />

        <div className="exp-list">
          {data.experience.map((e, i) => (
            <article key={i} className="exp-item reveal" style={{ '--i': i }}>
              <div className="exp-period">
                <span className="exp-dot" />
                <span>{e.period}</span>
              </div>
              <div className="exp-content">
                <h3 className="exp-role">{e.role}</h3>
                <div className="exp-company">
                  <span>{e.company}</span>
                  <span className="exp-place">{e.place}</span>
                </div>
                <ul className="exp-bullets">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="exp-meta-stack reveal">
          <EducationPanel data={data} />
          <CertsPanel data={data} />
          <PapersPanel data={data} />
        </div>
      </div>
    </section>
  );
}

function EducationPanel({ data }) {
  return (
    <div className="panel panel-static">
      <div className="panel-title">Education</div>
      <ul className="panel-list">
        {data.education.map((e, i) => (
          <li key={i}>
            <a
              href={e.url || '#'}
              target={e.url ? '_blank' : undefined}
              rel={e.url ? 'noreferrer' : undefined}
              className="panel-row"
              data-cursor="on"
            >
              <div className="panel-row-body">
                <div className="panel-line-a">{e.degree}</div>
                <div className="panel-line-b">{e.school} · {e.period}</div>
              </div>
              <span className="panel-row-arrow">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CertsPanel({ data }) {
  return (
    <div className="panel panel-static">
      <div className="panel-title">Certifications</div>
      <ul className="panel-list">
        {data.certifications.map((c, i) => (
          <li key={i}>
            <a
              href={c.url || '#'}
              target={c.url ? '_blank' : undefined}
              rel={c.url ? 'noreferrer' : undefined}
              className="panel-row"
              data-cursor="on"
              onClick={c.url ? undefined : (e) => e.preventDefault()}
            >
              <div className="panel-row-body">
                <div className="panel-line-a">{c.name}</div>
                <div className="panel-line-b">{c.year}{c.note ? ` · ${c.note}` : ''}</div>
              </div>
              <span className="panel-row-arrow">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PapersPanel({ data }) {
  return (
    <div className="papers-row">
      {data.papers.map((p, i) => (
        <a
          key={i}
          href={p.url || '#'}
          target={p.url ? '_blank' : undefined}
          rel={p.url ? 'noreferrer' : undefined}
          className="panel panel-link-card"
          data-cursor="on"
        >
          <div className="panel-title">Research Paper · {String(i+1).padStart(2,'0')}</div>
          <div className="panel-row-arrow panel-row-arrow-tr">↗</div>
          <ul className="panel-list">
            <li>
              <div className="panel-line-a">{p.title}</div>
              <div className="panel-line-b">{p.pub} · {p.year}</div>
            </li>
          </ul>
        </a>
      ))}
    </div>
  );
}

// ─── Skills ──────────────────────────────────────────────────────────
export function Skills({ data }) {
  return (
    <section id="skills" data-section="skills" data-screen-label="05 Skills">
      <div className="container">
        <SectionHead index="04" title="Technical Arsenal" sub="Tools I reach for, daily." />

        <div className="skills-grid">
          {data.skills.map((s, i) => (
            <div key={s.group} className="skill-block reveal" style={{ '--i': i }}>
              <div className="skill-head">{s.group}</div>
              <div className="skill-chips">
                {s.items.map(it => <span key={it} className="chip skill-chip">{it}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tech Reel (marquee under Skills) ────────────────────────────────
function TechReelEntry({ name, slug }) {
  const [errored, setErrored] = useState(false);
  const showLogo = slug && !errored;
  return (
    <span className={`tech-reel-entry ${showLogo ? 'has-logo' : 'no-logo'}`}>
      {showLogo && (
        <img
          className="tech-reel-logo"
          src={`https://cdn.simpleicons.org/${slug}`}
          alt=""
          draggable="false"
          onError={() => setErrored(true)}
        />
      )}
      <span className="tech-reel-name">{name}</span>
    </span>
  );
}

export function TechReel({ data }) {
  const items = data.techReel || [];
  const [tip, setTip] = useState({ show: false, x: 0, y: 0 });
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div
      className="tech-reel"
      aria-hidden="true"
      onMouseEnter={(e) => setTip({ show: true, x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setTip({ show: true, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTip((t) => ({ ...t, show: false }))}
    >
      <div className="tech-reel-track">
        {loop.map((item, i) => (
          <span key={i} className="tech-reel-item">
            <TechReelEntry name={item.name} slug={item.slug} />
            <span className="tech-reel-sep">◆</span>
          </span>
        ))}
      </div>
      {typeof document !== 'undefined' && createPortal(
        <div
          className={`tech-reel-tip ${tip.show ? 'on' : ''}`}
          style={{ left: tip.x, top: tip.y + 32 }}
        >
          <span className="tech-reel-tip-dot" />
          <span className="tech-reel-tip-text">
            The Stack behind my products, prototypes, and everyday PM work
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Contact icons ───────────────────────────────────────────────────
const IconEmail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.25 2.25h6.844l4.262 5.633 5.888-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const IconYouTube = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);
const IconGitHub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);
const IconPeerlist = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4-4h-2v4h-2v-4H9v-2h6v2z"/>
  </svg>
);
const IconHuggingFace = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="11" r="9"/><circle cx="9" cy="10" r="1.2" fill="white"/><circle cx="15" cy="10" r="1.2" fill="white"/><path d="M8.5 14c.5 1.5 6.5 1.5 7 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M7 6.5c-.5-1 .5-2 1.5-1.5M17 6.5c.5-1-.5-2-1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6"/>
  </svg>
);
const IconResume = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ─── Contact ─────────────────────────────────────────────────────────
export function Contact({ data }) {
  return (
    <section id="contact" data-section="contact" data-screen-label="06 Contact">
      <div className="container">
        <SectionHead index="05" title="Contact" />

        <div className="contact-hero reveal">
          <h2 className="contact-big">
            Let's build<br />
            <span className="contact-accent">something great.</span>
          </h2>
          <p className="contact-sub">
            Always open to new opportunities, product challenges, and how AI can transform your business.
          </p>
        </div>

        <div className="contact-grid reveal">
          {[
            { label:'Email', value:'hello@aakarkale.com', href:`mailto:${data.contact.email}`, icon: <IconEmail /> },
            { label:'LinkedIn', value:'/in/aakarkale', href:data.contact.linkedin, icon: <IconLinkedIn /> },
            { label:'X / Twitter', value:'@aakarkale', href:data.contact.x, icon: <IconX /> },
            { label:'YouTube', value:'@aakarkale', href:'https://www.youtube.com/channel/UCi_Gt1HFpBS5p3TSLlkP6Kw', icon: <IconYouTube /> },
            { label:'GitHub', value:'aakarkale', href:'https://github.com/aakarkale', icon: <IconGitHub /> },
            { label:'Peerlist', value:'aakarkale', href:'https://peerlist.io/aakarkale', icon: <IconPeerlist /> },
            { label:'Hugging Face', value:'aakarkale', href:'https://huggingface.co/aakarkale', icon: <IconHuggingFace /> },
            { label:'Download', value:'Resume · PDF', href:'#', icon: <IconResume />, primary: true },
          ].map((c, i) => (
            <a key={i}
              className={`contact-card contact-card-icon ${c.primary ? 'contact-card-primary' : ''}`}
              href={c.href} target={c.href.startsWith('mailto') || c.href === '#' ? undefined : '_blank'}
              rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
              data-cursor="on"
              onClick={c.href === '#' ? (e) => e.preventDefault() : undefined}
            >
              <div className="ccard-top">
                <div className="contact-card-label">{c.label}</div>
                <div className="ccard-logo">{c.icon}</div>
              </div>
              <div className="contact-card-value">{c.value}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
