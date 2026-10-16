import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Edit from 'react-iconly/dist/Icons/Edit.mjs'
import EditSquare from 'react-iconly/dist/Icons/EditSquare.mjs'
import Image from 'react-iconly/dist/Icons/Image.mjs'
import Image2 from 'react-iconly/dist/Icons/Image2.mjs'
import Category from 'react-iconly/dist/Icons/Category.mjs'
import Graph from 'react-iconly/dist/Icons/Graph.mjs'
import Filter from 'react-iconly/dist/Icons/Filter.mjs'
import Discovery from 'react-iconly/dist/Icons/Discovery.mjs'
import Scan from 'react-iconly/dist/Icons/Scan.mjs'
import Camera from 'react-iconly/dist/Icons/Camera.mjs'
import Video from 'react-iconly/dist/Icons/Video.mjs'
import Paper from 'react-iconly/dist/Icons/Paper.mjs'

const ICONS = [Edit, EditSquare, Image, Image2, Category, Graph, Filter, Discovery, Scan, Camera, Video, Paper]
const DURATION = 6000 // ms for 0 -> 100%
const SWAP = 250 // ms per icon
const FONT_WAIT = 1000 // ms to wait for Urbanist before showing the counter in a fallback font

// Crawlers and link-preview renderers skip the intro so they index/screenshot the real page, not "0%"
const IS_BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|headless/i.test(navigator.userAgent)

// Full-screen intro: design icons cycle in the middle, percentage counts up bottom-right, then calls onDone
function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  const [i, setI] = useState(0)
  const [fontReady, setFontReady] = useState(() => document.fonts?.check('500 120px Urbanist') ?? true)

  useEffect(() => {
    // Timer, not requestAnimationFrame: rAF never fires in some headless/background contexts,
    // which would leave the loader stuck. Progress is read from the clock, so throttling can't skew it.
    const start = performance.now()
    // Reduced motion: keep one icon still, the counter alone shows progress
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setInterval(() => {
      const elapsed = performance.now() - start
      const t = Math.min(1, elapsed / DURATION)
      setPct(Math.floor(t * 100))
      if (!still) setI(Math.floor(elapsed / SWAP) % ICONS.length)
      if (t === 1) {
        clearInterval(id)
        onDone()
      }
    }, 30)
    return () => clearInterval(id)
  }, [onDone])

  useEffect(() => {
    if (fontReady) return
    // Show the counter once Urbanist is in, or after FONT_WAIT if it's slow/blocked
    let live = true
    const show = () => live && setFontReady(true)
    const id = setTimeout(show, FONT_WAIT)
    document.fonts.load('500 120px Urbanist').then(show, show)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [fontReady])

  const Icon = ICONS[i]
  return (
    <motion.div
      className="loader"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Icon set="bulk" primaryColor="currentColor" size={72} />
      <span className="loader-pct" style={fontReady ? undefined : { visibility: 'hidden' }}>{pct}%</span>
    </motion.div>
  )
}

// Children (the site) mount after the loader so their entrance animations play once it fades
export default function Intro({ children }) {
  const [loading, setLoading] = useState(!IS_BOT)
  const done = useCallback(() => setLoading(false), [])
  return (
    <>
      <AnimatePresence>{loading && <Loader key="loader" onDone={done} />}</AnimatePresence>
      {!loading && children}
    </>
  )
}
