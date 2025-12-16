import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    // 1. Load từ LocalStorage (Mặc định là 'vi' và 'light')
    const [language, setLanguage] = useState(() => localStorage.getItem('app_lang') || 'vi');
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');
    // 2. Load cài đặt Âm thanh (Mới)
    // Mặc định là false để tránh làm phiền nếu chưa cài
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('soundEnabled') === 'true');

    // 2. Hàm thay đổi ngôn ngữ
    const changeLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('app_lang', lang);
    };

    // 3. Hàm thay đổi Theme (Sáng/Tối)
    const toggleTheme = (mode) => {
        setTheme(mode);
        localStorage.setItem('app_theme', mode);

        // Cập nhật attribute cho thẻ <body> để CSS biết
        document.body.setAttribute('data-theme', mode);
    };

    // 4. Khởi tạo Theme khi vào app
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        localStorage.setItem('soundEnabled', newValue);

        // Nếu người dùng BẬT -> Xin quyền thông báo của trình duyệt
        if (newValue) {
            if ("Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        // Có thể phát thử 1 tiếng ting để test
                        playNotificationSound(true);
                    }
                });
            } else {
                // Nếu đã có quyền rồi thì phát thử luôn để user biết đã bật
                playNotificationSound(true);
            }
        }
    };

    // --- HÀM HELPER: PHÁT ÂM THANH ---
    // forcePlay: Dùng để test khi bấm nút bật
    const playNotificationSound = (forcePlay = false) => {
        // Chỉ phát nếu Setting đang BẬT hoặc bị ép buộc (forcePlay)
        if (soundEnabled || forcePlay) {
            try {
                // Đường dẫn file trong thư mục public
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(error => {
                    // Chrome chặn Autoplay nếu user chưa tương tác với trang web
                    console.warn("Trình duyệt chặn phát âm thanh:", error);
                });
            } catch (e) {
                console.error("Lỗi phát âm thanh", e);
            }
        }
    };



    // 5. Hàm dịch (Translate Helper)
    // Cách dùng: t('settings') -> trả về "Cài đặt" hoặc "Settings"
    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <SettingsContext.Provider value={{
            language,
            theme,
            changeLanguage,
            toggleTheme,
            t,
            soundEnabled,
            toggleSound,
            playNotificationSound
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);