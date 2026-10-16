import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import Loader from './Loader.jsx'

// App mounts after the loader so its entrance animations play once the loader fades
function Root() {
  const [loading, setLoading] = useState(true)
  const done = useCallback(() => setLoading(false), [])
  return (
    <>
      <AnimatePresence>{loading && <Loader key="loader" onDone={done} />}</AnimatePresence>
      {!loading && <App />}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
    <Analytics />
  </StrictMode>,
)
