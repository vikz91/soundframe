import { ImageResponse } from 'next/og'

export const alt = 'Audioframe - turn audio into video, right in your browser'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 90,
        background: '#F4FBFC',
        color: '#12343B'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginBottom: 48
        }}
      >
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          <rect width="96" height="96" rx="24" fill="#08758B" />
          <rect x="17" y="19" width="62" height="58" rx="10" stroke="#E8FAFD" strokeWidth="4" />
          <path d="M30 43v10m9-18v26m9-32v38m9-27v16m9-12v8" stroke="#E8FAFD" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 64, fontWeight: 700 }}>Audioframe</div>
      </div>
      <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>Turn your audio into video.</div>
      <div style={{ fontSize: 30, color: '#41656D', marginTop: 28 }}>Your sound. Your artwork. Your story.</div>
      <div style={{ fontSize: 22, color: '#41656D', marginTop: 40 }}>Private browser processing · In development</div>
    </div>,
    size
  )
}
