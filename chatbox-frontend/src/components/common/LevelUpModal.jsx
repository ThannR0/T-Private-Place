import React, { useEffect, useRef } from 'react';
import { Modal, Button, Typography } from 'antd';
import { TrophyFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const LevelUpModal = ({ visible, onClose, newLevel, levelInfo }) => {
    const canvasRef = useRef(null);

    // Logic vẽ pháo hoa (Canvas)
    useEffect(() => {
        if (!visible) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let particles = [];

        const random = (min, max) => Math.random() * (max - min) + min;

        const createFirework = (x, y) => {
            const count = 100; // Số lượng hạt
            for (let i = 0; i < count; i++) {
                particles.push({
                    x, y,
                    vx: Math.cos(i * 2 * Math.PI / count) * random(2, 5),
                    vy: Math.sin(i * 2 * Math.PI / count) * random(2, 5),
                    alpha: 1, color: `hsl(${random(0, 360)}, 100%, 50%)`
                });
            }
        };

        const loop = () => {
            if (!visible) return;
            requestAnimationFrame(loop);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            // Tự động bắn pháo hoa ngẫu nhiên
            if (Math.random() < 0.05) createFirework(random(0, width), random(0, height / 2));

            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= 0.01;
                ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
                if (p.alpha <= 0) particles.splice(i, 1);
            }
        };
        loop();
    }, [visible]);

    if (!visible) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
            {/* Lớp Canvas Pháo hoa */}
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

            {/* Modal Thông báo */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'rgba(20, 20, 20, 0.9)', padding: '40px', borderRadius: '20px',
                textAlign: 'center', pointerEvents: 'auto', border: `2px solid ${levelInfo?.color || '#FFD700'}`,
                boxShadow: `0 0 50px ${levelInfo?.color || '#FFD700'}`, backdropFilter: 'blur(10px)',
                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <div style={{ fontSize: 80, marginBottom: 10 }}>{levelInfo?.icon || '🏆'}</div>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>CHÚC MỪNG!</Title>
                <Text style={{ color: '#ccc', fontSize: 16 }}>Bạn đã thăng cấp thành viên</Text>

                <div style={{ margin: '20px 0' }}>
                    <span style={{
                        fontSize: 32, fontWeight: '900', color: levelInfo?.color || '#fff',
                        textShadow: '0 0 10px rgba(255,255,255,0.5)', letterSpacing: 2
                    }}>
                        {newLevel}
                    </span>
                </div>

                <Button type="primary" size="large" onClick={onClose}
                        style={{ background: `linear-gradient(45deg, ${levelInfo?.color}, #fff)`, border: 'none', color: '#000', fontWeight: 'bold', padding: '0 40px' }}>
                    TUYỆT VỜI
                </Button>
            </div>
            <style>{`@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`}</style>
        </div>
    );
};

export default LevelUpModal;