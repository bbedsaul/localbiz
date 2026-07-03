import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Apple touch icon — the signboard board only (no bracket).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#17483B',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 132,
            height: 132,
            borderRadius: 20,
            border: '7px solid #FAF6EE',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FAF6EE',
            fontSize: 84,
            fontWeight: 700,
          }}
        >
          L<span style={{ color: '#E8A87C' }}>M</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
