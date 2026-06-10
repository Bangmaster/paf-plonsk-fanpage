import { useEffect, useState } from 'react'

export default function PixelPlayer() {
  const [pos, setPos] = useState(-60)
  const [kicking, setKicking] = useState(false)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    // Animacja biegu — zmiana klatek
    const frameInterval = setInterval(() => {
      setFrame(f => (f + 1) % 4)
    }, 150)

    // Ruch poziomy
    const moveInterval = setInterval(() => {
      setPos(p => {
        if (p > window.innerWidth + 60) return -60
        return p + 2.5
      })
    }, 16)

    // Co jakiś czas kopnięcie
    const kickInterval = setInterval(() => {
      setKicking(true)
      setTimeout(() => setKicking(false), 400)
    }, 4000)

    return () => {
      clearInterval(frameInterval)
      clearInterval(moveInterval)
      clearInterval(kickInterval)
    }
  }, [])

  // Pixel art piłkarz 8-bit (SVG)
  const legLeft = frame === 0 || frame === 2
  const armLeft = frame === 1 || frame === 3

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: pos,
      width: 32,
      height: 48,
      imageRendering: 'pixelated',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <svg width="32" height="48" viewBox="0 0 16 24" style={{ imageRendering: 'pixelated' }}>
        {/* Głowa */}
        <rect x="5" y="0" width="6" height="1" fill="#F4C07A"/>
        <rect x="4" y="1" width="8" height="4" fill="#F4C07A"/>
        <rect x="5" y="5" width="6" height="1" fill="#F4C07A"/>
        {/* Włosy */}
        <rect x="4" y="0" width="8" height="2" fill="#3B1F0A"/>
        <rect x="4" y="1" width="1" height="1" fill="#3B1F0A"/>
        <rect x="11" y="1" width="1" height="1" fill="#3B1F0A"/>
        {/* Oczy */}
        <rect x="6" y="2" width="1" height="1" fill="#1a1a1a"/>
        <rect x="9" y="2" width="1" height="1" fill="#1a1a1a"/>
        {/* Usta */}
        <rect x="7" y="4" width="2" height="1" fill="#C0392B"/>
        {/* Szyja */}
        <rect x="7" y="6" width="2" height="1" fill="#F4C07A"/>
        {/* Koszulka czerwona PAF */}
        <rect x="4" y="7" width="8" height="6" fill="#C0392B"/>
        {/* Numer na koszulce */}
        <rect x="7" y="8" width="1" height="3" fill="#F1C40F"/>
        <rect x="7" y="8" width="2" height="1" fill="#F1C40F"/>
        <rect x="7" y="9" width="2" height="1" fill="#F1C40F"/>
        <rect x="7" y="10" width="2" height="1" fill="#F1C40F"/>
        {/* Ramiona */}
        <rect x={armLeft ? 2 : 3} y="7" width="2" height="3" fill="#C0392B"/>
        <rect x={armLeft ? 12 : 11} y="7" width="2" height="3" fill="#C0392B"/>
        {/* Ręce */}
        <rect x={armLeft ? 2 : 3} y="10" width="2" height="2" fill="#F4C07A"/>
        <rect x={armLeft ? 12 : 11} y="10" width="2" height="2" fill="#F4C07A"/>
        {/* Spodenki czarne */}
        <rect x="4" y="13" width="8" height="3" fill="#1a1a1a"/>
        {/* Nogi */}
        {kicking ? (
          <>
            {/* Kopnięcie */}
            <rect x="4" y="16" width="2" height="4" fill="#F4C07A"/>
            <rect x="6" y="17" width="5" height="2" fill="#F4C07A"/>
            <rect x="6" y="16" width="2" height="2" fill="#1a1a1a"/>
            <rect x="9" y="16" width="3" height="3" fill="white"/>
            <rect x="10" y="16" width="1" height="1" fill="#1a1a1a"/>
            <rect x="9" y="17" width="1" height="1" fill="#1a1a1a"/>
            <rect x="11" y="17" width="1" height="1" fill="#1a1a1a"/>
            <rect x="10" y="18" width="1" height="1" fill="#1a1a1a"/>
          </>
        ) : (
          <>
            {/* Bieg */}
            <rect x={legLeft ? 4 : 5} y="16" width="3" height="4" fill="#F4C07A"/>
            <rect x={legLeft ? 9 : 8} y="16" width="3" height="4" fill="#F4C07A"/>
            {/* Buty */}
            <rect x={legLeft ? 3 : 4} y="19" width="4" height="2" fill="#1a1a1a"/>
            <rect x={legLeft ? 9 : 8} y="19" width="4" height="2" fill="#1a1a1a"/>
            {/* Skarpety białe */}
            <rect x={legLeft ? 4 : 5} y="17" width="3" height="2" fill="white"/>
            <rect x={legLeft ? 9 : 8} y="17" width="3" height="2" fill="white"/>
          </>
        )}
      </svg>
    </div>
  )
}
