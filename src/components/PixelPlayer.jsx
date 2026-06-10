import { useEffect, useState, useRef } from 'react'

const SHOUTS = [
  'PAF PŁOŃSK!',
  'PAF PŁOŃSK!',
  'SIALALALALALA!',
  'WCHODZIMY!!!',
  'PAF DO PRZODU!',
]

export default function PixelPlayer() {
  const [pos, setPos] = useState(-60)
  const [kicking, setKicking] = useState(false)
  const [frame, setFrame] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [flagFrame, setFlagFrame] = useState(0)
  const [shoutIndex, setShoutIndex] = useState(0)
  const [showShout, setShowShout] = useState(false)
  const posRef = useRef(-60)
  const celebratingRef = useRef(false)
  const navbarWidth = useRef(window.innerWidth)

  useEffect(() => {
    navbarWidth.current = window.innerWidth
    const onResize = () => { navbarWidth.current = window.innerWidth }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Klatki biegu
  useEffect(() => {
    const frameInterval = setInterval(() => {
      if (!celebratingRef.current) setFrame(f => (f + 1) % 4)
      else setFlagFrame(f => (f + 1) % 6)
    }, 150)
    return () => clearInterval(frameInterval)
  }, [])

  // Ruch + świętowanie
  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (celebratingRef.current) return

      posRef.current += 2.5
      setPos(posRef.current)

      // Zatrzymaj się — na mobile dalej (po logo), na desktop w 1/3
      const isMobile = navbarWidth.current < 768
      const stopPoint = isMobile
        ? navbarWidth.current * 0.55
        : navbarWidth.current * 0.35
      if (posRef.current >= stopPoint && posRef.current < stopPoint + 5) {
        celebratingRef.current = true
        setCelebrating(true)

        // Pokaż okrzyki jeden po drugim
        let i = 0
        const shoutTimer = setInterval(() => {
          setShoutIndex(i)
          setShowShout(true)
          setTimeout(() => setShowShout(false), 900)
          i++
          if (i >= SHOUTS.length) {
            clearInterval(shoutTimer)
            // Po okrzykach biegnij dalej
            setTimeout(() => {
              celebratingRef.current = false
              setCelebrating(false)
            }, 500)
          }
        }, 1100)
      }

      if (posRef.current > navbarWidth.current + 80) {
        posRef.current = -60
        setPos(-60)
      }
    }, 16)

    return () => clearInterval(moveInterval)
  }, [])

  // Kopnięcia podczas biegu (nie podczas świętowania)
  useEffect(() => {
    const kickInterval = setInterval(() => {
      if (!celebratingRef.current) {
        setKicking(true)
        setTimeout(() => setKicking(false), 350)
      }
    }, 5000)
    return () => clearInterval(kickInterval)
  }, [])

  const legLeft = frame === 0 || frame === 2
  const armLeft = frame === 1 || frame === 3

  // Flaga macha — różne pozycje
  const flagY = flagFrame < 3 ? flagFrame * 2 : (6 - flagFrame) * 2
  const flagWave = flagFrame % 2 === 0

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: pos,
      zIndex: 10,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Krzyk — dymek po prawej stronie piłkarza */}
      {celebrating && showShout && (
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: 44,
          background: 'var(--gold)',
          color: 'var(--black)',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          letterSpacing: 1,
          padding: '5px 10px',
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: '2px 2px 0px #000',
        }}>
          {SHOUTS[shoutIndex]}
          {/* Dymek strzałka w lewo */}
          <div style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid var(--gold)',
          }} />
        </div>
      )}

      {/* Piłkarz SVG */}
      <svg width="40" height="52" viewBox="0 0 20 26" style={{ imageRendering: 'pixelated' }}>

        {/* Flaga podczas świętowania */}
        {celebrating && (
          <>
            {/* Kijek flagi */}
            <rect x="14" y={1 + flagY} width="1" height="8" fill="#888"/>
            {/* Flaga macha */}
            <rect x="15" y={1 + flagY} width="4" height="1" fill="#C0392B"/>
            <rect x="15" y={2 + flagY} width={flagWave ? 5 : 4} height="1" fill="#C0392B"/>
            <rect x="15" y={3 + flagY} width="4" height="1" fill="#F1C40F"/>
            <rect x="15" y={4 + flagY} width={flagWave ? 5 : 4} height="1" fill="#F1C40F"/>
            <rect x="15" y={5 + flagY} width="4" height="1" fill="#C0392B"/>
          </>
        )}

        {/* Głowa */}
        <rect x="6" y="0" width="1" height="1" fill="#3B1F0A"/>
        <rect x="7" y="0" width="6" height="1" fill="#3B1F0A"/>
        <rect x="13" y="0" width="1" height="1" fill="#3B1F0A"/>
        <rect x="5" y="1" width="10" height="5" fill="#F4C07A"/>
        <rect x="5" y="1" width="2" height="2" fill="#3B1F0A"/>
        <rect x="13" y="1" width="2" height="2" fill="#3B1F0A"/>
        {/* Oczy */}
        <rect x="6" y="2" width="2" height="2" fill="#1a1a1a"/>
        <rect x="12" y="2" width="2" height="2" fill="#1a1a1a"/>
        {/* Usta — krzyczące podczas świętowania */}
        {celebrating ? (
          <>
            <rect x="8" y="4" width="4" height="2" fill="#1a1a1a"/>
            <rect x="9" y="4" width="2" height="1" fill="#C0392B"/>
          </>
        ) : (
          <rect x="8" y="4" width="4" height="1" fill="#C0392B"/>
        )}

        {/* Szyja */}
        <rect x="8" y="6" width="4" height="1" fill="#F4C07A"/>

        {/* Koszulka */}
        <rect x="5" y="7" width="10" height="6" fill="#C0392B"/>
        {/* Złoty numer */}
        <rect x="9" y="8" width="2" height="4" fill="#F1C40F"/>
        <rect x="8" y="8" width="4" height="1" fill="#F1C40F"/>
        <rect x="8" y="10" width="4" height="1" fill="#F1C40F"/>

        {/* Ramiona */}
        {celebrating ? (
          <>
            {/* Ręce w górę */}
            <rect x="2" y="5" width="3" height="3" fill="#C0392B"/>
            <rect x="15" y="5" width="3" height="3" fill="#C0392B"/>
            <rect x="2" y="4" width="2" height="2" fill="#F4C07A"/>
            <rect x="16" y="4" width="2" height="2" fill="#F4C07A"/>
          </>
        ) : (
          <>
            <rect x={armLeft ? 2 : 3} y="7" width="3" height="4" fill="#C0392B"/>
            <rect x={armLeft ? 14 : 15} y="7" width="3" height="4" fill="#C0392B"/>
            <rect x={armLeft ? 2 : 3} y="10" width="3" height="2" fill="#F4C07A"/>
            <rect x={armLeft ? 14 : 15} y="10" width="3" height="2" fill="#F4C07A"/>
          </>
        )}

        {/* Spodenki */}
        <rect x="5" y="13" width="10" height="4" fill="#1a1a1a"/>
        <rect x="9" y="13" width="2" height="4" fill="#333"/>

        {/* Nogi */}
        {celebrating ? (
          <>
            {/* Podskoki */}
            <rect x="5" y={flagFrame % 2 === 0 ? 17 : 18} width="4" height="4" fill="#F4C07A"/>
            <rect x="11" y={flagFrame % 2 === 0 ? 18 : 17} width="4" height="4" fill="#F4C07A"/>
            {/* Buty */}
            <rect x="4" y={flagFrame % 2 === 0 ? 20 : 21} width="5" height="2" fill="#1a1a1a"/>
            <rect x="11" y={flagFrame % 2 === 0 ? 21 : 20} width="5" height="2" fill="#1a1a1a"/>
            {/* Skarpety */}
            <rect x="5" y={flagFrame % 2 === 0 ? 17 : 18} width="4" height="2" fill="white"/>
            <rect x="11" y={flagFrame % 2 === 0 ? 18 : 17} width="4" height="2" fill="white"/>
          </>
        ) : kicking ? (
          <>
            <rect x="5" y="17" width="3" height="5" fill="#F4C07A"/>
            <rect x="8" y="18" width="6" height="3" fill="#F4C07A"/>
            <rect x="8" y="17" width="3" height="2" fill="#1a1a1a"/>
            {/* Piłka */}
            <rect x="13" y="17" width="4" height="4" fill="white"/>
            <rect x="14" y="17" width="1" height="1" fill="#1a1a1a"/>
            <rect x="13" y="18" width="1" height="1" fill="#1a1a1a"/>
            <rect x="16" y="18" width="1" height="1" fill="#1a1a1a"/>
            <rect x="14" y="20" width="1" height="1" fill="#1a1a1a"/>
          </>
        ) : (
          <>
            <rect x={legLeft ? 5 : 6} y="17" width="4" height="5" fill="#F4C07A"/>
            <rect x={legLeft ? 11 : 10} y="17" width="4" height="5" fill="#F4C07A"/>
            <rect x={legLeft ? 4 : 5} y="21" width="5" height="2" fill="#1a1a1a"/>
            <rect x={legLeft ? 11 : 10} y="21" width="5" height="2" fill="#1a1a1a"/>
            <rect x={legLeft ? 5 : 6} y="17" width="4" height="2" fill="white"/>
            <rect x={legLeft ? 11 : 10} y="17" width="4" height="2" fill="white"/>
          </>
        )}
      </svg>
    </div>
  )
}
