import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ImmoTest — Analysez votre achat immobilier en 10 secondes'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
          <div
            style={{
              background: '#4f46e5',
              borderRadius: '24px',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '40px' }}>🏠</div>
          </div>
          <div
            style={{
              fontSize: '80px',
              fontWeight: '800',
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}
          >
            ImmoTest
          </div>
          <div
            style={{
              fontSize: '30px',
              color: '#a5b4fc',
              textAlign: 'center',
              maxWidth: '780px',
              lineHeight: 1.3,
            }}
          >
            Analysez votre achat immobilier en 10 secondes
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {['DVF officiel', 'Score 0–100', '1ère analyse gratuite'].map((label) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '10px 22px',
                  color: '#cbd5e1',
                  fontSize: '18px',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
