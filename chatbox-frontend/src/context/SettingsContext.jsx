import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    // 1. Load từ LocalStorage (Mặc định là 'vi' và 'light')
    const [language, setLanguage] = useState(() => localStorage.getItem('app_lang') || 'vi');
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');

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

    // 5. Hàm dịch (Translate Helper)
    // Cách dùng: t('settings') -> trả về "Cài đặt" hoặc "Settings"
    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <SettingsContext.Provider value={{ language, changeLanguage, theme, toggleTheme, t }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);