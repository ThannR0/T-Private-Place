import React from 'react';

/**
 * AppLogo Component - Phiên bản nâng cấp
 * @param {number} size - Kích thước logo (px)
 * @param {boolean} showText - Hiển thị tên text bên cạnh (dùng cho Header)
 * @param {string} variant - 'default' (Màu tím) hoặc 'white' (Trắng cho nền tối)
 */
const AppLogo = ({ size = 40, showText = false, variant = 'default' }) => {

    // Cấu hình màu sắc dựa trên variant
    const isWhite = variant === 'white';

    // Màu gradient nền logo
    const gradientId = isWhite ? "whiteGradient" : "purpleGradient";
    const startColor = isWhite ? "rgba(255, 255, 255, 0.25)" : "#6600cc";
    const endColor   = isWhite ? "rgba(255, 255, 255, 0.1)"  : "#9933ff";

    // Màu chữ và viền
    const textColor  = isWhite ? "#ffffff" : "#ffffff";
    const strokeColor = isWhite ? "rgba(255,255,255,0.5)" : "none";

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
            {/* PHẦN BIỂU TƯỢNG (SVG) */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: isWhite ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none' }}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={startColor} />
                        <stop offset="100%" stopColor={endColor} />
                    </linearGradient>
                </defs>

                {/* Khung nền */}
                <rect
                    x="5" y="5"
                    width="90" height="90"
                    rx="24"
                    fill={`url(#${gradientId})`}
                    stroke={strokeColor}
                    strokeWidth="2"
                />

                {/* Dấu chấm trạng thái */}
                <circle
                    cx="76" cy="24" r="8"
                    fill={isWhite ? "#fff" : "#52c41a"}
                    stroke={isWhite ? "transparent" : "#fff"}
                    strokeWidth="2"
                />

                {/* Chữ T */}
                <text
                    x="50%"
                    y="55%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill={textColor}
                    fontSize="60"
                    fontFamily="Arial, sans-serif"
                    fontWeight="900"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}
                >
                    T
                </text>
            </svg>

            {/* PHẦN TÊN APP (Chỉ hiện khi cần) */}
            {showText && (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                    <span style={{
                        fontSize: size * 0.45,
                        fontWeight: '800',
                        color: isWhite ? '#fff' : '#396045',
                        letterSpacing: '-0.5px'
                    }}>
                        Private Place
                    </span>
                </div>
            )}
        </div>
    );
};

export default AppLogo;