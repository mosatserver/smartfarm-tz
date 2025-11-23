// WeatherIcon.jsx
const iconStyles = {
  width: 64,
  height: 64,
  marginBottom: 8,
};

const WeatherIcon = ({ code }) => {
  switch (code) {
    case 0:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="12" fill="#FFD93B" />
          <g stroke="#FFD93B" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: "32px 32px", animation: "rotateRays 6s linear infinite" }}>
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) * (Math.PI / 180);
              const x1 = 32 + 18 * Math.cos(angle);
              const y1 = 32 + 18 * Math.sin(angle);
              const x2 = 32 + 26 * Math.cos(angle);
              const y2 = 32 + 26 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
          <style>{`
            @keyframes rotateRays {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </svg>
      );
    case 1:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="22" cy="22" r="10" fill="#FFD93B" />
          <ellipse cx="40" cy="36" rx="14" ry="10" fill="#cbd5e1" />
          <ellipse cx="34" cy="38" rx="14" ry="10" fill="#f1f5f9" style={{ animation: "floatCloud 6s ease-in-out infinite" }} />
          <style>{`
            @keyframes floatCloud {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
          `}</style>
        </svg>
      );
    case 3:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#cbd5e1">
          <ellipse cx="22" cy="32" rx="14" ry="10" />
          <ellipse cx="40" cy="36" rx="18" ry="12" />
          <ellipse cx="30" cy="40" rx="14" ry="10" fill="#94a3b8" style={{ animation: "floatCloud 8s ease-in-out infinite" }} />
          <style>{`
            @keyframes floatCloud {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
          `}</style>
        </svg>
      );
    case 61:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="28" rx="20" ry="14" fill="#94a3b8" />
          <g fill="#3b82f6">
            {[16, 24, 32, 40, 48].map((x, i) => (
              <ellipse
                key={i}
                cx={x}
                cy="50"
                rx="3"
                ry="7"
                style={{ animation: `raindropFall ${(0.6 + i * 0.2)}s ease-in-out infinite`, transformOrigin: "center bottom" }}
              />
            ))}
          </g>
          <style>{`
            @keyframes raindropFall {
              0%, 100% { transform: translateY(0); opacity: 1; }
              50% { transform: translateY(10px); opacity: 0.6; }
            }
          `}</style>
        </svg>
      );
    case 95:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="28" rx="20" ry="14" fill="#64748b" />
          <polygon
            points="28,38 38,38 32,52 40,52 24,68 28,50 20,50"
            fill="#facc15"
            style={{ animation: "flash 1.2s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes flash {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          `}</style>
        </svg>
      );
    default:
      return (
        <svg style={iconStyles} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#fff">
          <text x="10" y="35" fontSize="24" fill="white">❓</text>
        </svg>
      );
  }
};

export default WeatherIcon;
