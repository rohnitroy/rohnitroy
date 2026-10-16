import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

// Full-screen intro: design icons cycle in the middle, percentage counts up bottom-right, then calls onDone
export default function Loader({ onDone }) {
  const [pct, setPct] = useState(0)
  const [i, setI] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION)
      setPct(Math.floor(t * 100))
      setI(Math.floor((now - start) / SWAP) % ICONS.length)
      if (t < 1) raf = requestAnimationFrame(tick)
      else onDone()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])

  const Icon = ICONS[i]
  return (
    <motion.div
      className="loader"
      role="progressbar"
      aria-label="Loading"
      aria-valuenow={pct}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Icon set="bulk" primaryColor="currentColor" size={72} />
      <span className="loader-pct">{pct}%</span>
    </motion.div>
  )
}
