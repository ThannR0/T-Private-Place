import React from 'react';

const PremiumCoinIcon = ({ size = 28, style = {} }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ verticalAlign: 'middle', ...style }}
    >
        <defs>
            {/* Dùng ID unique để tránh xung đột gradient giữa các icon trên cùng 1 trang */}
            <linearGradient id={`goldGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
            <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <circle cx="50" cy="50" r="45" stroke={`url(#goldGradient-${size})`} strokeWidth="4" fill="rgba(255, 215, 0, 0.1)" />
        <circle cx="50" cy="50" r="38" fill={`url(#goldGradient-${size})`} filter={`url(#glow-${size})`} />
        <path d="M30 35 H70 M50 35 V75" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />
        <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#FFF" strokeWidth="2" opacity="0.6"/>
    </svg>
);

export default PremiumCoinIcon;