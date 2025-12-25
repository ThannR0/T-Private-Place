import React, { useEffect, useRef } from 'react';
import { Modal, Button, Typography, Progress, Card, Tag } from 'antd';
import { TrophyFilled, StarFilled, GiftOutlined, ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Cấu hình Level (Dùng chung logic hiển thị)
const VIP_LEVELS = [
    { name: 'MEMBER', min: 0, color: '#595959', reward: 'Tính năng cơ bản', icon: '👤' },
    { name: 'BRONZE', min: 500000, color: '#CD7F32', reward: 'Giảm 3% phí', icon: '🥉' },
    { name: 'SILVER', min: 5000000, color: '#757575', reward: 'Giảm 5% phí', icon: '🛡️' },
    { name: 'GOLD', min: 15000000, color: '#DAA520', reward: 'Giảm 10% phí', icon: '👑' },
    { name: 'PLATINUM', min: 80000000, color: '#2F4F4F', reward: 'Giảm 15% phí', icon: '💠' },
    { name: 'DIAMOND', min: 250000000, color: '#00BFFF', reward: 'Giảm 25% phí', icon: '💎' },
    { name: 'TITANIUM', min: 1000000000, color: '#722ed1', reward: 'Giảm 35% phí', icon: '⚛️' }
];

const LevelUpModal = ({ visible, onClose, newLevel, currentTotalDeposit }) => {
    const canvasRef = useRef(null);

    // 1. Tìm thông tin Level hiện tại và kế tiếp
    const currentLevelObj = VIP_LEVELS.find(l => l.name === newLevel) || VIP_LEVELS[0];
    const currentIndex = VIP_LEVELS.indexOf(currentLevelObj);
    const nextLevelObj = VIP_LEVELS[currentIndex + 1];

    // 2. Tính % tiến độ
    let percent = 100;
    let nextGap = 0;
    if (nextLevelObj) {
        const gap = nextLevelObj.min - currentLevelObj.min;
        const achieved = currentTotalDeposit - currentLevelObj.min;
        percent = Math.floor((achieved / gap) * 100);
        nextGap = nextLevelObj.min - currentTotalDeposit;
        if(percent > 100) percent = 100;
        if(percent < 0) percent = 0;
    }

    // 3. Hiệu ứng pháo hoa
    useEffect(() => {
        if (!visible) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let particles = [];

        const random = (min, max) => Math.random() * (max - min) + min;

        const createFirework = (x, y, color) => {
            const count = 80;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = random(2, 6);
                particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1,
                    color: color || `hsl(${random(0, 360)}, 100%, 50%)`,
                    decay: random(0.015, 0.03)
                });
            }
        };

        const loop = () => {
            if (!visible) return;
            requestAnimationFrame(loop);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Tạo vệt mờ
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            // Tự động bắn
            if (Math.random() < 0.08) {
                createFirework(random(100, width - 100), random(100, height / 2), currentLevelObj.color);
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= p.decay;
                ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
                if (p.alpha <= 0) particles.splice(i, 1);
            }
        };
        loop();

        // Phát âm thanh nếu muốn (Tùy chọn)
        // const audio = new Audio('/sounds/cheer.mp3'); audio.play().catch(()=>{});

    }, [visible, currentLevelObj]);

    if (!visible) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
            {/* Lớp nền tối mờ */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />

            {/* Canvas Pháo hoa */}
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

            {/* Hộp Thông Báo Chính */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 500, maxWidth: '90%',
                background: '#fff', borderRadius: 24, padding: 5,
                boxShadow: `0 0 80px ${currentLevelObj.color}80`, // Glow theo màu rank
                animation: 'zoomIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
            }}>
                <div style={{
                    background: `linear-gradient(135deg, ${currentLevelObj.color}15, #fff)`,
                    borderRadius: 20, padding: '30px 20px', textAlign: 'center', border: `2px solid ${currentLevelObj.color}`
                }}>

                    {/* Icon Rank */}
                    <div style={{ marginBottom: 15, animation: 'bounce 2s infinite' }}>
                        <div style={{
                            width: 100, height: 100, margin: '0 auto',
                            background: currentLevelObj.color, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 50, color: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                        }}>
                            {currentLevelObj.icon}
                        </div>
                    </div>

                    <Title level={2} style={{ margin: 0, color: currentLevelObj.color, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {newLevel}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>Chúc mừng bạn đã thăng hạng!</Text>

                    <DividerLine color={currentLevelObj.color} />

                    {/* Phần thưởng */}
                    <div style={{ background: '#fff', padding: 15, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#faad14', fontSize: 16, fontWeight: 'bold' }}>
                            <GiftOutlined /> PHẦN THƯỞNG ĐÃ MỞ KHÓA
                        </div>
                        <div style={{ marginTop: 5, fontSize: 18, color: '#333' }}>
                            {currentLevelObj.reward}
                        </div>
                        <Tag color="success" style={{ marginTop: 5 }}>Đã cộng vào ví Voucher</Tag>
                    </div>

                    {/* Tiến độ tiếp theo */}
                    {nextLevelObj ? (
                        <div style={{ textAlign: 'left', marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: '#888' }}>
                                <span>Tiếp theo: <strong>{nextLevelObj.name}</strong></span>
                                <span>{percent}%</span>
                            </div>
                            <Progress
                                percent={percent}
                                strokeColor={{ '0%': currentLevelObj.color, '100%': nextLevelObj.color }}
                                trailColor="#f0f0f0"
                                showInfo={false}
                                strokeWidth={10}
                            />
                            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#888' }}>
                                Nạp thêm <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{nextGap.toLocaleString()} đ</span> để thăng hạng
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: 20, color: '#faad14', fontWeight: 'bold' }}>
                            <StarFilled /> BẠN ĐÃ ĐẠT CẤP ĐỘ TỐI ĐA!
                        </div>
                    )}

                    <Button
                        type="primary" shape="round" size="large" onClick={onClose}
                        style={{
                            background: `linear-gradient(90deg, ${currentLevelObj.color}, #333)`,
                            border: 'none', padding: '0 50px', height: 50, fontSize: 18, fontWeight: 'bold',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                        }}
                    >
                        TUYỆT VỜI
                    </Button>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes zoomIn { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>
        </div>
    );
};

const DividerLine = ({ color }) => (
    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${color}40)` }} />
        <div style={{ margin: '0 10px', color: color }}><StarFilled style={{fontSize: 10}} /></div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${color}40)` }} />
    </div>
);

export default LevelUpModal;