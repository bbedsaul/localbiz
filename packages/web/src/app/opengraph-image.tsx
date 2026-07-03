import { ImageResponse } from 'next/og';

export const alt = 'LocalMarket — We handle the internet. You handle the business.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand OG card: the signboard on paper, wordmark, and the slogan.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF6EE',
        }}
      >
        {/* signboard */}
        <div
          style={{
            display: 'flex',
            width: 190,
            height: 148,
            borderRadius: 20,
            background: '#17483B',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(23,72,59,0.28)',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 162,
              height: 120,
              borderRadius: 12,
              border: '4px solid #FAF6EE',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FAF6EE',
              fontSize: 76,
              fontWeight: 700,
            }}
          >
            L<span style={{ color: '#E8A87C' }}>M</span>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 52, fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: '#17483B' }}>Local</span>
          <span style={{ color: '#B3402A' }}>Market</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 34, color: '#26241F' }}>
          We handle the internet. You handle the business.
        </div>
      </div>
    ),
    { ...size },
  );
}
