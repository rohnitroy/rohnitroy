import { useEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import Edit from 'react-iconly/dist/Icons/Edit.mjs'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion, useDragControls, useMotionValue, useSpring, useTransform } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger)

const Sun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const Moon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)

// Light-switch click synthesized with Web Audio (no asset). Tune pitch/volume here.
let audioCtx
// Shared context. Browsers keep it suspended until the user clicks/taps once; resume on every use.
function getCtx() {
  audioCtx ??= new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Bubble "bloop": sine sweeping up fast with a quick decay. Slight random pitch so repeats don't sound robotic.
function playBubble() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    const f = 500 + Math.random() * 150
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, t)
    osc.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.06)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005) // volume
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.11)
  } catch {
    // audio unavailable
  }
}

// "Woop": one rising sine swoop. Tune pitch range and length here.
function playWoop() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.13)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02) // volume
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.16)
  } catch {
    // audio unavailable
  }
}

// Keyboard tick: tiny bandpassed noise burst, random pitch per key. One shared buffer.
let keyBuf
function playKey() {
  try {
    const ctx = getCtx()
    if (!keyBuf) {
      const len = Math.floor(ctx.sampleRate * 0.02)
      keyBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = keyBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 6
    }
    const src = ctx.createBufferSource()
    src.buffer = keyBuf
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2500 // lower = thockier, higher = clickier
    bp.Q.value = 1.2
    const gain = ctx.createGain()
    gain.gain.value = 0.35 // volume
    src.connect(bp).connect(gain).connect(ctx.destination)
    src.start()
  } catch {
    // audio unavailable
  }
}

function playSwitch(on) {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime

    // One plastic snap: ~12ms noise transient, low end cut, resonance boosted at `freq`
    const snap = (at, freq, volume) => {
      const len = Math.floor(ctx.sampleRate * 0.012)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 8
      const src = ctx.createBufferSource()
      src.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1200 // cuts the low "knock"
      const ring = ctx.createBiquadFilter()
      ring.type = 'peaking'
      ring.frequency.value = freq
      ring.Q.value = 4
      ring.gain.value = 12
      const gain = ctx.createGain()
      gain.gain.value = volume
      src.connect(hp).connect(ring).connect(gain).connect(ctx.destination)
      src.start(at)
    }

    // Two-stage click: lever flips, then contact snaps
    snap(t, on ? 4200 : 3400, 1.0)
    snap(t + 0.012, on ? 2800 : 2300, 0.7)
  } catch {
    // audio unavailable, theme switch still works
  }
}

// App-style tiles: 24x24, background baked in so they look like macOS dock icons
const LinkedIn = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" fill="#0a66c2" />
    <circle cx="6.5" cy="6.6" r="1.75" fill="#fff" />
    <rect x="5" y="9.5" width="3" height="9.5" fill="#fff" />
    <path d="M10.5 9.5h2.9v1.3c.4-.8 1.5-1.5 3-1.5 3 0 3.6 2 3.6 4.5V19h-3v-4.6c0-1.1 0-2.5-1.6-2.5s-1.9 1.2-1.9 2.4V19h-3z" fill="#fff" />
  </svg>
)

const GitHub = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" fill="#181717" />
    <path
      transform="translate(5 5) scale(0.875)"
      fill="#fff"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
)

// Figma mark (38x57 grid) centered on a dark tile like the macOS app icon
const Figma = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" fill="#1e1e1e" />
    <g transform="translate(7.13 4.7) scale(0.2565)">
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#FF3737" />
      <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19z" fill="#FF7237" />
      <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#874FFF" />
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#00B6FF" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#24CB71" />
    </g>
  </svg>
)

// Plain text, line breaks kept. Source: resume.
const ARCHIVES_TXT = `Archives
Education, projects, certifications & experience

────────────

EDUCATION

Master of Computer Applications (MCA)
Institute of Management and Entrepreneurship Development (BVDU), Pune
July 2024 – June 2026

Bachelor of Computer Applications (BCA)
Institute of Management and Entrepreneurship Development (BVDU), Pune
September 2021 – June 2024

Class X & Class XII (Science)
BK Birla Centre for Education, Pune
January 2017 – July 2021

────────────

PROJECTS

RudraX Aerospace  ·  Aug 2026 – Present
•  I'm working on the design, development and testing of drone and UAV intellectual property (IP).

YaatriAI — AI for Travel & Adventure Planning  ·  Mar 2023 – 2026
Built at AdoSolve InfoTech Pvt. Ltd.
•  An AI platform that helps people plan and optimize vacations and road trips by building travel itineraries.
•  Interface design: figma.com/design/YaatriAI-Interface

────────────

CERTIFICATIONS

•  ACP: Agent Communication Protocol — IBM, Aug 2025
•  No-Code Product Development — Wix Studio, Sep 2024
•  Investment Banking, Financial Markets, Market Research & Business Finance Foundations — Great Learning, Jan 2023
•  Front End Development, HTML — Great Learning, Jul 2022
•  Cloud Computing Service Models — Great Learning, Jun 2021
•  MySQL Database and Graphic Designing with Photoshop — Great Learning, 2020
•  Digital Marketing — Google Digital Garage, May 2020
•  Certified Ethical Hacker (CEH) — EC-Council, May 2019 (expired May 2021)
•  Microsoft Excel 2013 — Microsoft, Apr 2019 (expired Apr 2022)
•  Intermediate Robotics and Functions — SP Robotic Works, Apr 2019

────────────

EXPERIENCE

AI Evangelist — Fluid.Live  ·  Pune
Aug 2025 – Present
•  I advise organizations on AI adoption and data readiness, and delivered 40+ enterprise consultations in 2025.
•  I prototype practical AI workflows, including local offline model stacks with MCP servers and automated short-form ad content pipelines.

Guest Lecturer — Institute of Management and Entrepreneurship Development (BVDU)  ·  Pune
Aug 2026 – Present
•  I teach Theory of Artificial Intelligence to BCA Semester V students.

Co-Founder — AdoSolve InfoTech Pvt. Ltd.  ·  Pune
Dec 2023 – Aug 2026
•  I started a technology and content company that grew into an AI-as-a-Service venture.
•  From 2025, we developed and deployed AI products in partnership with Fluid.Live.

Non-Executive Director — RN Roy Food & Hospitality LLP  ·  Madhya Pradesh
Jun 2023 – Present
•  I provide board-level guidance to a food and hospitality business.

Co-Founder — Digitalite Solutions Co.  ·  Pune
Aug 2019 – Dec 2021
•  I co-founded a creative marketing agency that served 100+ brands in social media and influencer marketing.
•  In 2020, I led one of our largest campaigns, engaging 15,000+ influencers across India for a single client.
`

const ADOSOLVE_TXT = `AdoSolve InfoTech Pvt. Ltd.
Technology & AI-as-a-Service company
Founded December 29, 2023

────────────

ABOUT

I launched AdoSolve in 2023 as a technology and content company. Over time, we grew it into a dedicated AI-as-a-Service (AIaaS) venture.

•  Core offerings — We started by blending tech and content, then evolved into AIaaS.

•  Strategic integrations — By 2025, we were focused on designing, deploying and scaling enterprise AI products alongside collaborators like Fluid.Live.

•  Industry focus — We set out to build the software and enterprise infrastructure needed to support the worldwide AI boom.

────────────

MY ROLE
Co-Founder & Director  ·  Dec 2023 – Aug 2026

I helped establish the firm and steered its shift from a hybrid tech-and-content company into a dedicated AIaaS business.

•  Founding leadership — I was one of the company's initial directors and promoters, alongside Apurva Satish Chatole and Niharbala Roy.

•  Operations — I led our growth framework, building infrastructure to help businesses integrate AI tools. During my time there, we focused on designing, deploying and scaling enterprise AI products.

•  Exit — I stepped down from my day-to-day co-founder role in August 2026 after 2 years and 9 months, and moved full-time into my role as AI Evangelist at Fluid.Live.
`

const ABOUT_FILE = {
  name: 'About.txt',
  typed: true, // types itself out with key sounds
  text: `Hey 👋 I started my journey in 2019.

•  2019 — Co-founded Digitalite Solutions™, a creative marketing agency helping 100+ brands with social media & influencer marketing.

•  2020 — Ran one of my career's largest campaigns at Digitalite Solutions™, with 15,000+ influencers across India for one of our clients.

•  2021–2022 — Built a B2B ecosystem for the retail industry that helped 1,000+ retailers go digital.

•  2023 — Started AdoSolve InfoTech, a tech + content company that became an AI-as-a-Service venture, developing and deploying AI products with Fluid.Live from 2025.

•  2026 — Started MelloMinds LLP, an AI SaaS that helps mental health professionals manage their therapy practice efficiently, with Fort Knox-like security. I also started teaching AI/ML to undergraduate students in Pune.
`,
}

// Phone breakpoint, shared by layout (grid vs dock), windows (full screen) and openWin (one at a time).
// Keep in sync with the @media (max-width: 767px) block in index.css
const phoneMQ = matchMedia('(max-width: 767px)')
function useMobile() {
  const [mobile, setMobile] = useState(phoneMQ.matches)
  useEffect(() => {
    const onChange = (e) => setMobile(e.matches)
    phoneMQ.addEventListener('change', onChange)
    return () => phoneMQ.removeEventListener('change', onChange)
  }, [])
  return mobile
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

// macOS alert: app icon, bold title, message. No action = single blue OK.
// With action = Exit (left) + blue action (right, focused). Enter = focused button, Esc closes
function Alert({ title, text, icon, action, onClose }) {
  const go = () => {
    window.open(action.href, '_blank', 'noopener')
    onClose()
  }
  return (
    <motion.div
      className="mac-alert"
      role="alertdialog"
      aria-label={title}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="alert-icon">{icon}</span>
      <p className="alert-title">{title}</p>
      <p className="alert-text">{text}</p>
      <div className="alert-actions">
        {action && <button className="alert-btn" onClick={onClose}>Exit</button>}
        <button className="alert-btn alert-primary" onClick={action ? go : onClose} autoFocus>
          {action ? action.label : 'OK'}
        </button>
      </div>
    </motion.div>
  )
}

// macOS TextEdit-style window: traffic lights, drag by title bar, Esc / red button closes
// z = stacking order, off = cascade offset (px), onFocus = bring to front
function TextWindow({ file, z, off, onFocus, onClose }) {
  const drag = useDragControls()
  // Phones: full screen (CSS), slide up like iOS, no dragging. Same breakpoint as openWin
  const mobile = useMobile()
  const hidden = mobile ? { y: '100%' } : { opacity: 0, scale: 0.5, y: 200 }
  // Array.from splits by character, so emoji aren't cut in half mid-type
  const chars = useMemo(() => Array.from(file.text), [file.text])
  const [shown, setShown] = useState(() =>
    file.typed && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : chars.length,
  )

  useEffect(() => {
    if (shown >= chars.length) return
    const prev = chars[shown - 1]
    // Speed knobs: base 30-60ms per char, longer pause after sentence end / line break
    const delay = /[.!?]/.test(prev) ? 280 : prev === '\n' ? 160 : 30 + Math.random() * 30
    const id = setTimeout(() => {
      if (chars[shown].trim()) playKey() // sound only for visible chars
      setShown(shown + 1)
    }, delay)
    return () => clearTimeout(id)
  }, [shown, chars])
  return (
    <motion.div
      className="txt-window"
      role="dialog"
      aria-label={file.name}
      // top/left shift the inset box, so margin:auto centers it `off` px down-right (no transform clash with framer)
      style={{ zIndex: z, top: off * 2, left: off * 2 }}
      onPointerDown={onFocus}
      drag={!mobile}
      dragListener={false}
      dragControls={drag}
      dragMomentum={false}
      initial={hidden}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={hidden}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div className="txt-bar" onPointerDown={(e) => drag.start(e)}>
        <div className="traffic">
          <button className="tl tl-close" aria-label="Close" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} />
          {/* ponytail: minimize/zoom are decorative */}
          <span className="tl tl-min" />
          <span className="tl tl-max" />
        </div>
        <span className="txt-title">{file.name}</span>
      </div>
      {/* data-lenis-prevent: let the text scroll natively instead of Lenis scrolling the page */}
      {/* click the text to skip typing */}
      <pre className="txt-body" data-lenis-prevent aria-hidden={file.typed} onClick={() => setShown(chars.length)}>
        {chars.slice(0, shown).join('')}
        {file.typed && <span className="caret" />}
      </pre>
      {file.typed && <p className="sr-only">{file.text}</p>}
    </motion.div>
  )
}

// ponytail: href null = not clickable yet, fill in your URLs / mailto:. null entry = divider
const DOCK = [
  { label: 'Archives', file: { name: 'Archives.txt', text: ARCHIVES_TXT }, icon: <img className="own-shape" src="/icons/finder.png" alt="" draggable="false" /> },
  {
    label: 'Designs & Prototypes',
    alert: { title: 'Coming Soon', text: "Designs & Prototypes isn't ready yet. Check back soon." },
    icon: <Figma />,
  },
  { label: 'AdoSolve', file: { name: 'AdoSolve.txt', text: ADOSOLVE_TXT }, icon: <img src="/icons/ado.png" alt="" draggable="false" style={{ background: '#fff' }} /> },
  {
    label: 'Fluid.Live',
    alert: {
      title: 'Open Fluid.Live?',
      text: "Fluid.Live is where I currently work as an AI Evangelist & Consultant. This will open www.fluid.live in a new tab.",
      action: { label: 'Open', href: 'https://www.fluid.live' },
    },
    // ponytail: padding = how small the logo sits in the tile
    icon: <img src="/icons/fluid.png" alt="" draggable="false" style={{ background: '#fff', padding: '18%' }} />,
  },
  {
    label: 'MelloMinds',
    alert: {
      title: 'Open MelloMinds?',
      text: "I'm the Co-founder & CTO at MelloMinds, an AI SaaS for mental health professionals. This will open www.mellominds.co.in in a new tab.",
      action: { label: 'Open', href: 'https://www.mellominds.co.in' },
    },
    icon: <img src="/icons/mello.png" alt="" draggable="false" />,
  },
  {
    label: 'RudraX Aerospace',
    alert: {
      title: 'Open RudraX Aerospace?',
      text: 'A side quest of mine, working with government and public-sector ventures on IP, testing and development of UAVs and tactical UAV modules. This will open www.rudraxaerospace.com in a new tab.',
      action: { label: 'Open', href: 'https://www.rudraxaerospace.com' },
    },
    icon: <img src="/icons/rudrax.png" alt="" draggable="false" style={{ background: '#fff' }} />,
  },
  null,
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rohnitroy/', icon: <LinkedIn /> },
  { label: 'GitHub', href: 'https://github.com/rohnitroy/', icon: <GitHub /> },
  { label: 'Mail', href: 'mailto:rohnitroy.corp@gmail.com', icon: <img className="own-shape" src="/icons/mail.png" alt="" draggable="false" /> },
]

// Click behavior shared by dock + phone grid: external link, or open a window / alert
function linkProps({ href, file, alert, icon }, onOpen) {
  const opens = file || alert
  return {
    href: href ?? (opens ? '#' : undefined), // '#' keeps window/alert items keyboard-focusable
    onClick: opens ? (e) => { e.preventDefault(); onOpen({ file, alert, icon }) } : undefined,
    target: href?.startsWith('http') ? '_blank' : undefined, // mailto opens mail app, no blank tab
    rel: 'noreferrer',
  }
}

// Phones: iOS home-screen style grid instead of the dock
function AppGrid({ onOpen }) {
  return (
    <nav className="app-grid" aria-label="Links">
      {DOCK.filter(Boolean).map((item) => {
        const props = linkProps(item, onOpen)
        const onClick = (e) => {
          navigator.vibrate?.(8) // Android only
          props.onClick?.(e)
        }
        return (
          <a key={item.label} className="app" {...props} onClick={onClick}>
            <span className="dock-item app-icon">{item.icon}</span>
            <span className="app-label">{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

// macOS-style magnification: icon grows as cursor gets near its center
function DockItem({ label, href, icon, file, alert, onOpen, mouseX, base }) {
  const ref = useRef(null)
  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return x - b.x - b.width / 2
  })
  // Tune: reach (px) and max scale
  const target = useTransform(distance, [-140, 0, 140], [base, base * 1.5, base])
  const size = useSpring(target, { mass: 0.1, stiffness: 170, damping: 14 })
  const onEnter = () => {
    playBubble()
    navigator.vibrate?.(8) // haptic: Android only, iOS/desktop browsers have no web vibration
  }
  return (
    // slot wraps the icon so the label isn't clipped by the icon's overflow:hidden
    <span className="dock-slot">
      <span className="dock-tip" aria-hidden="true">{label}</span>
      <motion.a
        ref={ref}
        className="dock-item"
        {...linkProps({ href, file, alert, icon }, onOpen)}
        aria-label={label}
        style={{ width: size, height: size }}
        onPointerEnter={onEnter}
      >
        {icon}
      </motion.a>
    </span>
  )
}

function Dock({ onOpen }) {
  const mouseX = useMotionValue(Infinity)
  // ponytail: sized once on load so it fits phones, recompute on resize if needed
  const base = Math.min(48, Math.floor((window.innerWidth - 120) / DOCK.length))
  return (
    <motion.nav
      className="dock"
      aria-label="Links"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      style={{ height: base + 16 }}
      initial={{ opacity: 0, y: 24, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {DOCK.map((item, i) =>
        item ? (
          <DockItem key={item.label} {...item} onOpen={onOpen} mouseX={mouseX} base={base} />
        ) : (
          <span key={i} className="dock-divider" />
        ),
      )}
    </motion.nav>
  )
}

export default function App() {
  const gridRef = useRef(null)
  // Initial value comes from the inline script in index.html
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  // Open .txt windows [{ file, z, off }]; highest z is in front. One alert at a time, above all windows.
  const mobile = useMobile()
  const [wins, setWins] = useState([])
  const [alert, setAlert] = useState(null)
  const zTop = useRef(100)
  const front = (name) =>
    setWins((w) => w.map((x) => (x.file.name === name ? { ...x, z: ++zTop.current } : x)))
  const openWin = (file) =>
    setWins((w) => {
      // Phones: one window at a time, the new one replaces the old. Breakpoint knob here.
      if (phoneMQ.matches) return [{ file, z: ++zTop.current, off: 0 }]
      return w.some((x) => x.file.name === file.name)
        ? w.map((x) => (x.file.name === file.name ? { ...x, z: ++zTop.current } : x)) // already open: bring forward
        : [...w, { file, z: ++zTop.current, off: (w.length % 5) * 28 }] // cascade 28px per window
    })
  const closeWin = (name) => setWins((w) => w.filter((x) => x.file.name !== name))
  const onOpen = ({ file, alert, icon }) => (file ? openWin(file) : setAlert({ ...alert, icon }))

  // Esc closes the alert first, else the front window
  useEscape(() => {
    if (alert) return setAlert(null)
    if (!wins.length) return
    closeWin(wins.reduce((a, b) => (b.z > a.z ? b : a)).file.name)
  })

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    playSwitch(next === 'light')
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch {}
    setTheme(next)
  }

  // Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
  useEffect(() => {
    const lenis = new Lenis()
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    // fromTo, not from: StrictMode double-runs effects and from() would capture opacity 0 as the end value
    const tween = gsap.fromTo(gridRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' })
    return () => tween.kill()
  }, [])

  return (
    <>
      <header className="header">
        <motion.nav
          className="pill"
          aria-label="Quick actions"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            className="pill-item"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Moon /> : <Sun />}
          </button>
          <span className="pill-divider" />
          <button className="pill-item pill-text" onClick={() => openWin(ABOUT_FILE)}>about</button>
        </motion.nav>
        <motion.p
          className="hero-tags"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          design &nbsp;•&nbsp; experience &nbsp;•&nbsp; ai
        </motion.p>
      </header>

      <main>
        <section className="section-1">
          <div ref={gridRef} className="grid-bg" aria-hidden="true" />
          <motion.div
            className="hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Real <img> (not a CSS background) so image search can index it. Photo swaps with theme */}
            <div
              className="avatar"
              onPointerEnter={() => {
                playWoop()
                navigator.vibrate?.(10) // Android only
              }}
            >
              <img
                src={theme === 'dark' ? '/avatar-dark.jpg' : '/avatar-light.jpg'}
                alt="Rohnit Roy"
                width="120"
                height="120"
                fetchPriority="high"
                draggable="false"
              />
            </div>
            {/* One h1 so the name is part of the page's main heading */}
            <h1 className="hero-heading">
              <span className="hero-name">
                Hello <span role="img" aria-label="waving hand">👋</span> I'm Rohnit Roy
              </span>{' '}
              <span className="hero-title">
                A multi-disciplinary{' '}
                <span className="title-icon" aria-hidden="true"><Edit set="bulk" primaryColor="currentColor" /></span>
                product designer, building software solutions &amp; modern interfaces.
              </span>
            </h1>
            {mobile && <AppGrid onOpen={onOpen} />}
          </motion.div>
        </section>
      </main>

      {!mobile && <Dock onOpen={onOpen} />}
      <AnimatePresence>
        {wins.map(({ file, z, off }) => (
          <TextWindow
            key={file.name}
            file={file}
            z={z}
            off={off}
            onFocus={() => front(file.name)}
            onClose={() => closeWin(file.name)}
          />
        ))}
        {alert && <Alert key="alert" {...alert} onClose={() => setAlert(null)} />}
      </AnimatePresence>
    </>
  )
}
