import{Ar as e,B as t,Cr as n,O as r,Zn as i,ar as a,cr as o,dr as s,er as c,fr as l,gr as u,hr as d,ir as f,nr as p,or as ee,pr as te,un as ne,ut as re,wr as m}from"./index-BJS8BCu9.js";import{t as h}from"./html2canvas-Ddd_xmSw.js";import{t as ie}from"./SealMomentModal-UVVdZE2K.js";var g=e(m(),1),_=e(re(),1),v=e=>Math.max(0,Math.min(100,e));function ae(e,t){let n=(e??``).toLowerCase().trim();return/(reflekt|reflect|reflektion|reflection)/i.test(n)?`#22c55e`:/(purify|purification|purifikation)/i.test(n)?`#3b82f6`:/dream/i.test(n)?`#7c3aed`:/(ignite|ignition)/i.test(n)?`#ff3b30`:/(integrate|integration)/i.test(n)?`#ff8a00`:/(solar\s*plexus)/i.test(n)?`#ffd600`:t}var oe=({dateISO:e,onDateChange:t,secondsLeft:n,eternalPercent:r,eternalColor:i=`#8beaff`,eternalArkLabel:a=`Eternal Ark`})=>{let o=(0,g.useMemo)(()=>v(r),[r]),s=(0,g.useMemo)(()=>ae(a,i),[a,i]),c={"--eternal-bar":s,"--pulse":`var(--kai-pulse, var(--pulse-dur, 5236ms))`},l=(0,g.useMemo)(()=>({"--fill":(o/100).toFixed(6)}),[o]),u=(0,g.useRef)(null),d=(0,g.useRef)(void 0),f=(0,g.useRef)(null),p=(0,g.useRef)(null);return(0,g.useEffect)(()=>()=>{f.current!==null&&window.clearTimeout(f.current),p.current!==null&&window.cancelAnimationFrame(p.current),u.current&&u.current.classList.remove(`is-boom`),f.current=null,p.current=null},[]),(0,g.useEffect)(()=>{let e=typeof window<`u`&&typeof window.matchMedia==`function`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;if(typeof n!=`number`||e){d.current=n;return}let t=u.current,r=d.current;t&&typeof r==`number`&&n-r>1.2&&(t.classList.remove(`is-boom`),p.current!==null&&window.cancelAnimationFrame(p.current),p.current=window.requestAnimationFrame(()=>{t.classList.add(`is-boom`)}),f.current!==null&&window.clearTimeout(f.current),f.current=window.setTimeout(()=>{t.classList.remove(`is-boom`),f.current=null},420)),d.current=n},[n]),(0,_.jsxs)(`div`,{className:`sigil-scope`,style:c,children:[(0,_.jsx)(`h3`,{className:`sigil-title`,children:`Kairos Sigil-Glyph Inhaler`}),(0,_.jsx)(`div`,{className:`sigil-ribbon`,"aria-hidden":`true`}),(0,_.jsx)(`div`,{className:`input-row sigil-row`,children:(0,_.jsxs)(`label`,{className:`sigil-label`,children:[(0,_.jsx)(`span`,{className:`sigil-label__text`,children:`Select moment:`}),`\xA0`,(0,_.jsx)(`input`,{className:`sigil-input`,type:`datetime-local`,value:e,onChange:t})]})}),(0,_.jsx)(`div`,{className:`sigil-bars`,role:`group`,"aria-label":`Day progress`,children:(0,_.jsxs)(`div`,{className:`sigil-bar`,children:[(0,_.jsxs)(`div`,{className:`sigil-bar__head`,children:[(0,_.jsxs)(`span`,{className:`sigil-bar__label`,children:[`Unfoldment`,a?` — ${a}`:``]}),(0,_.jsxs)(`span`,{className:`sigil-bar__pct`,"aria-hidden":`true`,children:[o.toFixed(2),`%`]})]}),(0,_.jsx)(`div`,{className:`sigil-bar__track`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":+o.toFixed(2),role:`progressbar`,"aria-label":`Eternal day ${a||``}`,children:(0,_.jsx)(`div`,{ref:u,className:`sigil-bar__fill sigil-bar__fill--eternal`,style:l})})]})}),(0,_.jsx)(`style`,{children:`
        .sigil-ribbon {
          height: 1px;
          margin: .35rem 0 .85rem 0;
          background: linear-gradient(90deg, rgba(255,255,255,.00), rgba(255,255,255,.22), rgba(255,255,255,.00));
          background-size: 200% 100%;
          animation: sigilRibbonBreath var(--pulse) ease-in-out infinite;
          animation-delay: var(--pulse-offset, 0ms);
          filter: drop-shadow(0 0 8px rgba(139,234,255,.12));
        }

        .sigil-bars { display: grid; gap: .6rem; margin-top: .65rem; }

        .sigil-bar__head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: .28rem;
        }
        .sigil-bar__label { font-size: .86rem; letter-spacing: .01em; color: rgba(255,255,255,.88); }
        .sigil-bar__pct   { font-size: .82rem; color: rgba(255,255,255,.66); font-variant-numeric: tabular-nums; }

        .sigil-bar__track {
          position: relative; height: 12px; border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
          border: 1px solid rgba(139,234,255,.22);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 6px 16px -8px rgba(0,0,0,.45);
          overflow: hidden;
        }

        .sigil-bar__fill {
          position: absolute; inset: 0 auto 0 0; width: 100%;
          transform-origin: left center;
          transform: scaleX(var(--fill, 0));
          transition: transform .45s cubic-bezier(.22,.61,.36,1);
          will-change: transform, filter;
        }

        .sigil-bar__fill--eternal {
          background:
            radial-gradient(120% 100% at 0% 50%, rgba(255,255,255,.18), transparent 60%) padding-box,
            linear-gradient(90deg,
              color-mix(in oklab, var(--eternal-bar, #8beaff) 92%, white 0%),
              var(--eternal-bar, #8beaff)) border-box;
          filter: drop-shadow(0 0 14px color-mix(in oklab, var(--eternal-bar, #8beaff) 55%, transparent 45%))
                  drop-shadow(0 0 22px color-mix(in oklab, var(--eternal-bar, #8beaff) 35%, transparent 65%));
          animation: barGlow var(--pulse) ease-in-out infinite;
          animation-delay: var(--pulse-offset, 0ms);
        }

        .sigil-bar__fill--eternal::after {
          content: "";
          position: absolute;
          right: -6px;
          top: 50%;
          translate: 0 -50%;
          width: 12px; height: 12px;
          border-radius: 50%;
          background:
            radial-gradient(closest-side, var(--eternal-bar, #8beaff), rgba(255,255,255,.85), transparent 75%);
          filter:
            drop-shadow(0 0 10px color-mix(in oklab, var(--eternal-bar, #8beaff) 85%, transparent 15%))
            drop-shadow(0 0 16px color-mix(in oklab, var(--eternal-bar, #8beaff) 60%, transparent 40%));
          opacity: .95;
          pointer-events: none;
        }

        .sigil-bar__fill--eternal.is-boom {
          animation: barGlow var(--pulse) ease-in-out infinite, explodeFlash 420ms cubic-bezier(.18,.6,.2,1) 1;
          animation-delay: var(--pulse-offset, 0ms), 0ms;
          filter:
            drop-shadow(0 0 22px color-mix(in oklab, var(--eternal-bar, #8beaff) 85%, transparent 15%))
            drop-shadow(0 0 36px color-mix(in oklab, var(--eternal-bar, #8beaff) 65%, transparent 35%));
        }

        .sigil-bar__fill--eternal.is-boom::before {
          content: "";
          position: absolute;
          right: -8px;
          top: 50%;
          translate: 0 -50%;
          width: 10px; height: 10px;
          border-radius: 999px;
          background: radial-gradient(closest-side, white, var(--eternal-bar, #8beaff) 60%, transparent 70%);
          opacity: .95;
          pointer-events: none;
          animation: sparkBurst 420ms cubic-bezier(.18,.6,.2,1) 1;
        }

        @keyframes barGlow {
          0%   { filter: drop-shadow(0 0 10px color-mix(in oklab, var(--eternal-bar, #8beaff) 45%, transparent))
                          drop-shadow(0 0 18px color-mix(in oklab, var(--eternal-bar, #8beaff) 25%, transparent)); }
          50%  { filter: drop-shadow(0 0 18px color-mix(in oklab, var(--eternal-bar, #8beaff) 70%, transparent))
                          drop-shadow(0 0 28px color-mix(in oklab, var(--eternal-bar, #8beaff) 40%, transparent)); }
          100% { filter: drop-shadow(0 0 10px color-mix(in oklab, var(--eternal-bar, #8beaff) 45%, transparent))
                          drop-shadow(0 0 18px color-mix(in oklab, var(--eternal-bar, #8beaff) 25%, transparent)); }
        }

        @keyframes explodeFlash {
          0%   { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); transform: scaleX(var(--fill)) scaleY(1); }
          14%  { box-shadow: inset 0 0 0 2px rgba(255,255,255,.25); transform: scaleX(var(--fill)) scaleY(1.18); }
          28%  { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); transform: scaleX(var(--fill)) scaleY(1.06); }
          100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); transform: scaleX(var(--fill)) scaleY(1); }
        }

        @keyframes sparkBurst {
          0%   { opacity: .98; transform: scale(1);   filter: blur(0);   }
          40%  { opacity: .85; transform: scale(2.6); filter: blur(.5px);}
          100% { opacity: 0;   transform: scale(4.2); filter: blur(1px); }
        }

        @keyframes sigilRibbonBreath {
          0% { background-position: 0% 0%; opacity: .8; }
          50% { background-position: 100% 0%; opacity: 1; }
          100% { background-position: 0% 0%; opacity: .8; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sigil-bar__fill--eternal,
          .sigil-ribbon { animation: none !important; }
          .sigil-bar__fill--eternal.is-boom,
          .sigil-bar__fill--eternal.is-boom::before { animation: none !important; }
          .sigil-bar__fill { transition: none !important; }
        }
      `})]})},se=e(n(),1),ce=e(h(),1),le=e(t(),1),y=1000000n,b=BigInt(2**53-1),ue=e=>String(e).padStart(2,`0`),x=e=>e>b?2**53-1:e<-b?-(2**53-1):Number(e),de=e=>e<0n?-e:e,S=(e,t)=>{if(t===0n)return 0n;let n=e%t;return n>=0n?n:n+t},C=(e,t)=>{let n=e/t;return e%t===0n||e>=0n?n:n-1n},w=e=>e<0n?0n:e,T=(e,t)=>{let n=e<0n?-e:e,r=t<0n?-t:t;for(;r!==0n;){let e=n%r;n=r,r=e}return n},fe=(()=>{let e=T(p,y);return e===0n?0n:p/e})(),pe=e=>e.trim().replace(/^(\d+):(\d+)/,(e,t,n)=>`${+t}:${String(n).padStart(2,`0`)}`).replace(/D\s*(\d+)/,(e,t)=>`D${+t}`),me=e=>{try{let t=o(e);return new Date(x(t)).toISOString()}catch{return``}};function he(e){let t=e.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);if(!t)return null;let n=Number(t[1]),r=Number(t[2])-1,i=Number(t[3]),a=Number(t[4]),o=Number(t[5]),s=Number(t[6]??`0`),c=String(t[7]??`0`).padEnd(3,`0`),l=Number(c),u=new Date(n,r,i,a,o,s,l);return Number.isNaN(u.getTime())?null:u}function ge(e,t){let n=Number.isFinite(t)?Math.max(1,Math.min(11,Math.floor(t))):1;try{let t=u(e.toISOString(),n),r=t?new Date(t):e;return Number.isNaN(r.getTime())?e:r}catch{return e}}var E=()=>typeof performance<`u`&&typeof performance.now==`function`?performance.timeOrigin+performance.now():Date.now(),_e=e=>typeof e==`object`&&!!e,D=(e,t)=>{let n=e[t];return typeof n==`string`?n:void 0},O=(e,t)=>{let n=e[t];return typeof n==`number`&&Number.isFinite(n)?n:void 0},k=(e,t)=>{let n=e[t];return _e(n)?n:void 0},ve=(e,t)=>{let n=e[t];if(typeof n==`string`)return Object.prototype.hasOwnProperty.call(c,n)?n:void 0},ye=e=>typeof e==`number`&&Number.isFinite(e)?String(e):typeof e==`bigint`?e.toString():typeof e==`string`?e:``;function be(e,t){let n=(0,g.useCallback)(()=>{try{let e=o(C(t(),y)+1n)-BigInt(Math.floor(E())),n=x(e<0n?0n:e);return Math.max(0,Math.min(f,n))/1e3}catch{return f/1e3}},[t]),[r,i]=(0,g.useState)(()=>e?n():f/1e3),a=(0,g.useRef)(null),s=(0,g.useRef)(null);return(0,g.useEffect)(()=>{if(a.current!==null&&(cancelAnimationFrame(a.current),a.current=null),s.current!==null&&(window.clearInterval(s.current),s.current=null),!e)return;typeof document<`u`&&document.documentElement&&document.documentElement.style.setProperty(`--kai-pulse`,`${f}ms`);let t=()=>{i(n()),a.current=requestAnimationFrame(t)};i(n()),a.current=requestAnimationFrame(t);let r=()=>{document.visibilityState===`hidden`?(a.current!==null&&(cancelAnimationFrame(a.current),a.current=null),s.current===null&&(s.current=window.setInterval(()=>{i(n())},33))):(s.current!==null&&(window.clearInterval(s.current),s.current=null),a.current!==null&&(cancelAnimationFrame(a.current),a.current=null),i(n()),a.current=requestAnimationFrame(t))};return document.addEventListener(`visibilitychange`,r),()=>{document.removeEventListener(`visibilitychange`,r),a.current!==null&&cancelAnimationFrame(a.current),s.current!==null&&window.clearInterval(s.current),a.current=null,s.current=null}},[e,n]),e?r:null}var A=()=>{try{return globalThis.crypto?.subtle}catch{return}},xe=async e=>{let t=new TextEncoder().encode(e),n=A();if(n)try{let e=await n.digest(`SHA-256`,t);return Array.from(new Uint8Array(e)).map(e=>e.toString(16).padStart(2,`0`)).join(``)}catch{}let r=2166136261;for(let e=0;e<t.length;e++)r^=t[e]??0,r=Math.imul(r,16777619);return(r>>>0).toString(16).padStart(8,`0`)},j={"Ignition Ark":`#ff0024`,"Integration Ark":`#ff6f00`,"Harmonization Ark":`#ffd600`,"Reflection Ark":`#00c853`,"Purification Ark":`#00b0ff`,"Dream Ark":`#c186ff`,"Ignite Ark":`#ff0024`,"Integrate Ark":`#ff6f00`,"Harmonize Ark":`#ffd600`,"Reflekt Ark":`#00c853`,"Purifikation Ark":`#00b0ff`},Se=e=>{if(!e)return`#ffd600`;let t=e.trim(),n=t.replace(/\s*ark$/i,` Ark`);return j[t]??j[n]??`#ffd600`},Ce=()=>(0,_.jsx)(`style`,{children:`
    .sigil-modal { position: relative; isolation: isolate; }

    .sigil-modal .close-btn {
      z-index: 99999 !important;
      pointer-events: auto;
      touch-action: manipulation;
    }
    .sigil-modal .close-btn svg { pointer-events: none; }

    .modal-bottom-spacer { height: clamp(96px, 14vh, 140px); }

    .mint-dock{
      position: sticky;
      bottom: max(10px, env(safe-area-inset-bottom));
      z-index: 6;

      display: grid;
      place-items: center;
      width: fit-content;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      background: transparent;
      border: 0;
      box-shadow: none;

      contain: layout paint style;
      -webkit-transform: translateZ(0);
              transform: translateZ(0);
    }

    .mint-dock > *{
      width: auto;
      max-width: 100%;
      flex: 0 0 auto;
    }

    .mint-dock button,
    .mint-dock a{
      display: inline-flex;
    }
  `}),we=()=>(0,_.jsxs)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":!0,className:`close-icon`,children:[(0,_.jsx)(`line`,{x1:`4`,y1:`4`,x2:`20`,y2:`20`,stroke:`currentColor`,strokeWidth:`2`}),(0,_.jsx)(`line`,{x1:`20`,y1:`4`,x2:`4`,y2:`20`,stroke:`currentColor`,strokeWidth:`2`}),(0,_.jsx)(`circle`,{cx:`12`,cy:`12`,r:`10`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.2`,opacity:`.25`})]}),Te=()=>(0,_.jsxs)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:[(0,_.jsx)(`circle`,{cx:`12`,cy:`12`,r:`9.5`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.4`}),(0,_.jsx)(`path`,{d:`M12 6v6l3.5 3.5`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.8`,strokeLinecap:`round`,strokeLinejoin:`round`}),(0,_.jsx)(`path`,{d:`M8.2 15.8l2.1-2.1`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.6`,strokeLinecap:`round`})]}),M=`http://www.w3.org/2000/svg`;function N(e){e.getAttribute(`xmlns`)||e.setAttribute(`xmlns`,M),e.getAttribute(`xmlns:xlink`)||e.setAttribute(`xmlns:xlink`,`http://www.w3.org/1999/xlink`)}function P(e){let t=e.ownerDocument||document,n=e.querySelector(`metadata`);if(n)return n;let r=t.createElementNS(M,`metadata`);return e.insertBefore(r,e.firstChild),r}function F(e){let t=e.ownerDocument||document,n=e.querySelector(`desc`);if(n)return n;let r=t.createElementNS(M,`desc`),i=e.querySelector(`metadata`);return i&&i.nextSibling?e.insertBefore(r,i.nextSibling):e.insertBefore(r,e.firstChild),r}function Ee(e,t){N(e);let n=P(e);n.textContent=JSON.stringify(t);let r=F(e);r.textContent=typeof t==`object`&&t?(()=>{let e=t,n=typeof e.pulse==`number`?e.pulse:void 0,r=typeof e.pulseExact==`string`?e.pulseExact:void 0,i=typeof e.beat==`number`?e.beat:void 0,a=typeof e.stepIndex==`number`?e.stepIndex:void 0,o=typeof e.chakraDay==`string`?e.chakraDay:void 0;return`KaiSigil — pulse:${r??n??`?`} beat:${i??`?`} step:${a??`?`} chakra:${o??`?`}`})():`KaiSigil — exported`;let i=new XMLSerializer().serializeToString(e);return i.startsWith(`<?xml`)?i:`<?xml version="1.0" encoding="UTF-8"?>\n${i}`}async function De(e){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch{}try{let t=document.createElement(`textarea`);t.value=e,t.setAttribute(`readonly`,`true`),t.style.position=`fixed`,t.style.left=`-9999px`,t.style.top=`0`,document.body.appendChild(t),t.select();let n=document.execCommand(`copy`);return document.body.removeChild(t),n}catch{return!1}}var Oe=e=>{e.catch(()=>{})},ke=f/1e3,Ae=Array.from({length:11},(e,t)=>{let n=(t*ke).toFixed(3);return`Breath ${t+1} — ${n}s`}),je=({onClose:e})=>{let t=(0,g.useMemo)(()=>s(),[]),n=(0,g.useRef)(0n),i=(0,g.useRef)(!1),a=(0,g.useRef)(0),u=(0,g.useCallback)(()=>{try{return te(new Date)}catch{return 0n}},[]),re=(0,g.useCallback)(()=>{let e=null;try{e=t.nowMicroPulses()}catch{e=null}if(typeof e==`bigint`)return e;if(typeof e==`number`&&Number.isFinite(e))return BigInt(Math.trunc(e));if(typeof e==`string`&&/^\d+$/.test(e))try{return BigInt(e)}catch{return null}return null},[t]),m=(0,g.useCallback)(()=>{let e=re();if(e===null)return u();let t=E();if(!i.current||t-a.current>2e3){let r=u()-e,o=2n*y;n.current=de(r)<=o?0n:r,i.current=!0,a.current=t}return e+n.current},[u,re]),h=(0,g.useCallback)(()=>{try{return w(C(m(),y))}catch{return 0n}},[m]),v=(0,g.useRef)(null);v.current===null&&(v.current=h());let ae=v.current??0n,[T,A]=(0,g.useState)(`live`),[j,M]=(0,g.useState)(``),[N,P]=(0,g.useState)(1),[F,ke]=(0,g.useState)(()=>ae),[je,Me]=(0,g.useState)(()=>ae.toString()),Ne=(0,g.useRef)(!1),[I,Pe]=(0,g.useState)(null),[Fe,Ie]=(0,g.useState)(!0),[Le,Re]=(0,g.useState)(!1),[ze,Be]=(0,g.useState)(``),[Ve,He]=(0,g.useState)(``),[L,Ue]=(0,g.useState)(``),[We,Ge]=(0,g.useState)(!1),R=(0,g.useRef)(null),z=(0,g.useRef)(null),Ke=(0,g.useRef)(null),B=(0,g.useRef)(null),qe=(0,g.useRef)(0),Je=(0,g.useMemo)(()=>{try{return F.toLocaleString()}catch{return F.toString()}},[F]),Ye=(0,g.useCallback)(()=>{try{let e=S(m(),y),t=Number(e),n=Math.max(0,Math.min(f,Math.round(t*f/1e6))),r=document.documentElement;r.style.setProperty(`--pulse-dur`,`${f}ms`),r.style.setProperty(`--pulse-offset`,`-${n}ms`);let i=z.current;i&&(i.style.setProperty(`--pulse-dur`,`${f}ms`),i.style.setProperty(`--pulse-offset`,`-${n}ms`))}catch{}},[m]),V=(0,g.useCallback)((e,t=!0)=>{let n=w(e);ke(n),t&&!Ne.current&&Me(n.toString()),typeof document<`u`&&Ye()},[Ye]);(0,g.useEffect)(()=>{let e=e=>{let t=R.current;if(!t)return;let n=e.target;n instanceof Node&&t.contains(n)&&(z.current?.contains(n)||e.stopPropagation())},t=[`click`,`mousedown`,`touchstart`],n={passive:!0};t.forEach(t=>document.addEventListener(t,e,n));let r=e=>{e.key===`Escape`&&R.current&&e.stopPropagation()};return window.addEventListener(`keydown`,r,!0),()=>{t.forEach(t=>document.removeEventListener(t,e,n)),window.removeEventListener(`keydown`,r,!0)}},[]),(0,g.useEffect)(()=>{T===`live`&&V(h(),!0)},[T,V,h]);let H=(0,g.useCallback)(()=>{B.current!==null&&(window.clearTimeout(B.current),B.current=null)},[]),U=(0,g.useCallback)(()=>{H();let e=()=>{let e=x(o(C(m(),y)+1n));qe.current=e;let n=Math.max(0,e-E());B.current=window.setTimeout(t,n)},t=()=>{let n=E(),r=qe.current;if(n<r){B.current=window.setTimeout(t,Math.max(0,r-n));return}V(h(),!0),e()};V(h(),!0),e()},[V,H,h,m]);(0,g.useEffect)(()=>{if(T!==`live`)return;U();let e=()=>{document.visibilityState===`visible`&&T===`live`&&U()};return document.addEventListener(`visibilitychange`,e),window.addEventListener(`focus`,e),()=>{document.removeEventListener(`visibilitychange`,e),window.removeEventListener(`focus`,e),H()}},[T,U,H]);let W=be(T===`live`,m),Xe=(0,g.useCallback)(()=>{A(`live`),M(``),P(1),V(h(),!0),U()},[V,h,U]),Ze=e=>{let t=(e.target.value??``).replace(/[^\d]/g,``);if(Me(t),t)try{let e=w(BigInt(t));A(`static-pulse`),M(``),P(1),V(e,!1),H()}catch{}},Qe=(0,g.useCallback)((e,t)=>{let n=he(e);if(!n)return;let r=w(C(te(ge(n,t)),y));A(`static-date`),H(),V(r,!0)},[V,H]),$e=e=>{let t=e.target.value;if(M(t),!t){P(1),Xe();return}Qe(t,N)},et=e=>{let t=Number(e.target.value);P(t),j&&Qe(j,t)},tt=()=>{let e=R.current?.querySelector(`.sigil-modal`);e&&(e.classList.remove(`flash-now`),e.offsetWidth,e.classList.add(`flash-now`)),Xe()},G=(0,g.useMemo)(()=>{let{beat:e,stepIndex:t,percentIntoStep:n}=l(F*y);return{beat:e,stepIndex:t,stepPct:d(n)}},[F]),K=(0,g.useMemo)(()=>{if(!I)return`Root`;let e=ve(I,`harmonicDay`);return e?c[e]:`Root`},[I]),q=(0,g.useMemo)(()=>{try{let e=S(F*y,p)*100000000n/p;return Number(e)/1e6}catch{return 0}},[F]),nt=(0,g.useMemo)(()=>{try{if(!I)return q;let e=D(I,`solar_day_start_iso`);if(!e)return q;let t=F*y-te(e),n=(t<0n?0n:t)*100000000n/p,r=Number(n)/1e6;return r<0?0:r>100?100:r}catch{return q}},[I,F,q]);(0,g.useEffect)(()=>{let e=!1;return(async()=>{try{let t=await ee(o(F)),n=_e(t)?t:null;e||Pe(n)}catch{e||Pe(null)}})(),()=>{e=!0}},[F]);let rt=`${G.beat}:${ue(G.stepIndex)}`,J=I?D(I,`chakraStepString`):void 0,it=J||rt,at=I?O(I,`dayOfMonth`):void 0,Y=I?O(I,`eternalMonthIndex`):void 0,ot=pe(J&&typeof at==`number`&&typeof Y==`number`?`${J} — D${at}/M${Y+1}`:it),X=I?D(I,`eternalChakraArc`)??`Harmonization Ark`:`Harmonization Ark`,st=Se(X),Z=e=>Oe(De(e)),ct=e=>Z(JSON.stringify(e,null,2)),lt=(0,g.useMemo)(()=>{try{if(F<=b)return Number(F);if(fe<=0n)return 0;let e=S(F,fe);return Number(e)}catch{return 0}},[F]),ut=()=>document.querySelector(`#sigil-export svg`),dt=e=>{let t=ut();return t?Ee(t,e):null},ft=e=>{let t=dt(e);return t?new Blob([t],{type:`image/svg+xml;charset=utf-8`}):null},pt=async()=>{let e=document.getElementById(`sigil-export`);if(!e)return null;let t=await(0,ce.default)(e,{background:void 0,backgroundColor:null}),n=await new Promise(e=>t.toBlob(t=>e(t),`image/png`));if(n)return n;let r=t.toDataURL(`image/png`).split(`,`)[1]??``,i=atob(r),a=new ArrayBuffer(i.length),o=new Uint8Array(a);for(let e=0;e<i.length;e++)o[e]=i.charCodeAt(e);return new Blob([a],{type:`image/png`})},mt=e=>{let t=Number.isFinite(G.stepIndex)?Math.max(0,Math.min(Math.trunc(G.stepIndex),43)):0,n=Number.isFinite(G.beat)?Math.max(0,Math.min(Math.trunc(G.beat),35)):0;return{pulse:x(F),beat:n,stepIndex:t,chakraDay:K,stepsPerBeat:44,canonicalHash:e,exportedAt:me(F),expiresAtPulse:(F+11n).toString(),pulseExact:F.toString()}},ht=async()=>{let e=(F<=b?L:``).toLowerCase();if(!e){let t=ut();e=(await xe(((t?new XMLSerializer().serializeToString(t):``)||`no-svg`)+`|pulseExact=${F.toString()}|beat=${G.beat}|step=${G.stepIndex}|chakra=${K}`)).toLowerCase()}let t=mt(e),n=ne(e,t);He(e),Be(n),Re(!0)},gt=async()=>{let e=mt((F<=b&&L?String(L).toLowerCase():``)||(await xe(`pulseExact=${F.toString()}|beat=${G.beat}|step=${G.stepIndex}|chakra=${K}`)).toLowerCase()),[t,n]=await Promise.all([ft(e),pt()]);if(!t||!n)return;let r=F.toString(),i=r.length>80?`${r.slice(0,40)}_${r.slice(-20)}`:r,a=new le.default;a.file(`sigil_${i}.svg`,t),a.file(`sigil_${i}.png`,n);let o={...e,overlays:{qr:!1,eternalPulseBar:!1}};a.file(`sigil_${i}.manifest.json`,JSON.stringify(o,null,2));let s=await a.generateAsync({type:`blob`}),c=URL.createObjectURL(s),l=document.createElement(`a`);l.href=c,l.download=`sigil_${i}.zip`,document.body.appendChild(l),l.click(),l.remove(),requestAnimationFrame(()=>URL.revokeObjectURL(c))},_t=()=>e(),vt=(0,g.useMemo)(()=>I?D(I,`eternalSeal`)??D(I,`seal`)??``:``,[I]),yt=(0,g.useMemo)(()=>I?ve(I,`harmonicDay`)||ye(I.harmonicDay):``,[I]),bt=(0,g.useMemo)(()=>I?D(I,`eternalMonth`)??``:``,[I]),xt=(0,g.useMemo)(()=>I?D(I,`eternalYearName`)??``:``,[I]),St=(0,g.useMemo)(()=>I?D(I,`kaiTurahPhrase`)??``:``,[I]),Ct=I?O(I,`kaiPulseEternal`):void 0,wt=I?O(I,`kaiPulseToday`):void 0,Q=I?k(I,`chakraStep`):void 0,$=I?k(I,`chakraBeat`):void 0,Tt=Q?O(Q,`stepIndex`):void 0,Et=Q?O(Q,`percentIntoStep`):void 0,Dt=$?O($,`beatIndex`):void 0,Ot=$?O($,`pulsesIntoBeat`):void 0,kt=I?O(I,`weekIndex`):void 0,At=I?D(I,`weekName`)??``:``,jt=(()=>{let e=I?k(I,`harmonicWeekProgress`):void 0;return e?O(e,`percent`):void 0})(),Mt=(()=>{let e=I?k(I,`eternalMonthProgress`):void 0;return e?O(e,`percent`):void 0})(),Nt=(()=>{let e=I?k(I,`harmonicYearProgress`):void 0;return e?O(e,`percent`):void 0})(),Pt=I?O(I,`phiSpiralLevel`):void 0,Ft=I?D(I,`kaiMomentSummary`)??``:``,It=I?D(I,`compressed_summary`)??``:``;return(0,se.createPortal)((0,_.jsxs)(_.Fragment,{children:[(0,_.jsx)(Ce,{}),(0,_.jsx)(`div`,{ref:R,role:`dialog`,"aria-modal":`true`,className:`sigil-modal-overlay`,onMouseDown:e=>{e.target===e.currentTarget&&e.stopPropagation()},onClick:e=>{e.target===e.currentTarget&&e.stopPropagation()},onTouchStart:e=>{e.target===e.currentTarget&&e.stopPropagation()},onKeyDown:e=>e.key===`Escape`&&e.stopPropagation(),children:(0,_.jsxs)(`div`,{className:`sigil-modal`,onMouseDown:e=>e.stopPropagation(),onClick:e=>e.stopPropagation(),onTouchStart:e=>e.stopPropagation(),children:[(0,_.jsx)(`button`,{ref:z,"aria-label":`Close`,className:`close-btn`,onClick:_t,children:(0,_.jsx)(we,{})}),(0,_.jsx)(oe,{dateISO:j,onDateChange:$e,secondsLeft:T===`live`?W??void 0:void 0,solarPercent:nt,eternalPercent:q,solarColor:`#ffd600`,eternalColor:st,eternalArkLabel:X}),T!==`live`&&(0,_.jsxs)(_.Fragment,{children:[j&&(0,_.jsxs)(`label`,{style:{marginLeft:`12px`},className:`sigil-label`,children:[(0,_.jsx)(`span`,{className:`sigil-label__text`,children:`Breath within minute`}),`\xA0`,(0,_.jsx)(`select`,{value:N,onChange:et,children:Ae.map((e,t)=>(0,_.jsx)(`option`,{value:t+1,children:e},e))})]}),(0,_.jsx)(`button`,{className:`now-btn`,onClick:tt,children:`Now`})]}),T===`live`&&W!==null&&(0,_.jsxs)(`p`,{className:`countdown`,children:[`next pulse in `,(0,_.jsx)(`strong`,{children:W.toFixed(3)}),`s`]}),(0,_.jsxs)(`div`,{className:`sigil-pulse-row`,children:[(0,_.jsxs)(`label`,{className:`sigil-label sigil-pulse-label`,children:[(0,_.jsx)(`span`,{className:`sigil-label__text`,children:`Pulse`}),(0,_.jsx)(`input`,{className:`sigil-input sigil-pulse-input`,type:`text`,inputMode:`numeric`,value:je,onFocus:()=>{Ne.current=!0},onBlur:()=>{Ne.current=!1,Me(F.toString())},onChange:Ze,"aria-label":`Pulse`,placeholder:`Enter pulse`})]}),(0,_.jsx)(`span`,{className:`sigil-live-chip ${T===`live`?`is-live`:`is-static`}`,"aria-live":`polite`,children:T===`live`?`LIVE`:`STATIC`})]}),(0,_.jsxs)(`div`,{id:`sigil-export`,style:{position:`relative`,width:240,margin:`16px auto`},children:[(0,_.jsx)(r,{ref:Ke,pulse:lt,beat:G.beat,stepIndex:G.stepIndex,stepPct:G.stepPct,chakraDay:K,size:240,hashMode:`deterministic`,origin:``,onReady:e=>{let t=e.hash?String(e.hash).toLowerCase():``;t&&Ue(t)}}),(0,_.jsx)(`span`,{className:`pulse-tag`,children:Je})]}),(0,_.jsxs)(`div`,{className:`sigil-meta-block`,children:[(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Kairos:`}),`\xA0`,it,(0,_.jsx)(`button`,{className:`copy-btn`,onClick:()=>Z(it),children:`💠`})]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Kairos/Date:`}),`\xA0`,ot,(0,_.jsx)(`button`,{className:`copy-btn`,onClick:()=>Z(ot),children:`💠`})]}),I&&(0,_.jsxs)(_.Fragment,{children:[(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Seal:`}),`\xA0`,vt,(0,_.jsx)(`button`,{className:`copy-btn`,onClick:()=>Z(vt),children:`💠`})]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Day:`}),` `,yt]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Month:`}),` `,bt]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Arc:`}),` `,X]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Year:`}),` `,xt]}),(0,_.jsxs)(`p`,{children:[(0,_.jsx)(`strong`,{children:`Kai-Turah:`}),`\xA0`,St,(0,_.jsx)(`button`,{className:`copy-btn`,onClick:()=>Z(St),children:`💠`})]})]})]}),I&&(0,_.jsxs)(`details`,{className:`rich-data`,open:We,onToggle:e=>Ge(e.currentTarget.open),children:[(0,_.jsx)(`summary`,{children:`Memory`}),(0,_.jsxs)(`div`,{className:`rich-grid`,children:[(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`pulseExact`}),(0,_.jsx)(`span`,{children:F.toString()})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`kaiPulseEternal`}),(0,_.jsx)(`span`,{children:(Ct??0).toLocaleString()})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`kaiPulseToday`}),(0,_.jsx)(`span`,{children:wt??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`chakraStepString`}),(0,_.jsx)(`span`,{children:J??``})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`chakraStep.stepIndex`}),(0,_.jsx)(`span`,{children:Tt??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`chakraStep.percentIntoStep`}),(0,_.jsxs)(`span`,{children:[((Et??0)*100).toFixed(2),`%`]})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`chakraBeat.beatIndex`}),(0,_.jsx)(`span`,{children:Dt??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`chakraBeat.pulsesIntoBeat`}),(0,_.jsx)(`span`,{children:Ot??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`weekIndex`}),(0,_.jsx)(`span`,{children:kt??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`weekName`}),(0,_.jsx)(`span`,{children:At})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`dayOfMonth`}),(0,_.jsx)(`span`,{children:at??0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`eternalMonthIndex`}),(0,_.jsx)(`span`,{children:typeof Y==`number`?Y+1:0})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`harmonicWeekProgress.percent`}),(0,_.jsxs)(`span`,{children:[((jt??0)*100).toFixed(2),`%`]})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`eternalMonthProgress.percent`}),(0,_.jsxs)(`span`,{children:[((Mt??0)*100).toFixed(2),`%`]})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`harmonicYearProgress.percent`}),(0,_.jsxs)(`span`,{children:[((Nt??0)*100).toFixed(2),`%`]})]}),(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`code`,{children:`phiSpiralLevel`}),(0,_.jsx)(`span`,{children:Pt??0})]}),(0,_.jsxs)(`div`,{className:`span-2`,children:[(0,_.jsx)(`code`,{children:`kaiMomentSummary`}),(0,_.jsx)(`span`,{children:Ft})]}),(0,_.jsxs)(`div`,{className:`span-2`,children:[(0,_.jsx)(`code`,{children:`compressed_summary`}),(0,_.jsx)(`span`,{children:It})]}),(0,_.jsxs)(`div`,{className:`span-2`,children:[(0,_.jsx)(`code`,{children:`eternalSeal`}),(0,_.jsx)(`span`,{className:`truncate`,children:vt})]})]}),(0,_.jsx)(`div`,{className:`rich-actions`,children:(0,_.jsx)(`button`,{onClick:()=>ct(I),children:`Remember JSON`})})]}),(0,_.jsx)(`div`,{className:`modal-bottom-spacer`,"aria-hidden":`true`}),(0,_.jsx)(`div`,{className:`mint-dock`,children:(0,_.jsxs)(`button`,{className:`mint-btn`,type:`button`,"aria-label":`Mint this moment`,title:`Mint this moment`,onClick:ht,children:[(0,_.jsx)(`span`,{className:`mint-btn__icon`,"aria-hidden":`true`,children:Fe?(0,_.jsx)(`img`,{src:`/assets/seal.svg`,alt:``,loading:`eager`,decoding:`async`,onError:()=>Ie(!1)}):(0,_.jsx)(Te,{})}),(0,_.jsxs)(`span`,{className:`mint-btn__text`,children:[(0,_.jsx)(`span`,{className:`mint-btn__title`,children:`MINT ΦKey`}),(0,_.jsxs)(`span`,{className:`mint-btn__sub`,children:[`☤KAI `,Je]})]})]})})]})}),(0,_.jsx)(ie,{open:Le,url:ze,hash:Ve,onClose:()=>Re(!1),onDownloadZip:gt})]}),document.body)};export{je as t};