import React from 'react';
import { Select } from 'antd';
import { useSettings } from '../../context/SettingsContext';
import { GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

const LanguageSelector = ({ style }) => {
    const { language, changeLanguage } = useSettings();

    return (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, ...style }}>
            <Select
                value={language}
                onChange={changeLanguage}
                style={{ width: 120 }}
                suffixIcon={<GlobalOutlined />}
                bordered={false} // Cho đẹp, nhìn như text
                dropdownStyle={{ minWidth: 150 }}
            >
                <Option value="vi">
                    <span role="img" aria-label="vi">🇻🇳</span> Tiếng Việt
                </Option>
                <Option value="en">
                    <span role="img" aria-label="en">🇺🇸</span> English
                </Option>
            </Select>
        </div>
    );
};

export default LanguageSelector;