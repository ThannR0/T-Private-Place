import React from 'react';
import { Modal, Switch, Select, Typography, Divider, Radio, Space } from 'antd';
import { useSettings } from '../../context/SettingsContext';
import { GlobalOutlined, BulbOutlined, SoundOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

const SettingsModal = ({ visible, onClose }) => {
    const { language, changeLanguage, theme, toggleTheme, t , soundEnabled, toggleSound } = useSettings();


    return (
        <Modal
            title={<Title level={4} style={{ margin: 0 }}>{t('settings')}</Title>}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={400}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* 1. NGÔN NGỮ */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <GlobalOutlined /> <Text strong>{t('language')}</Text>
                    </div>
                    <Select
                        value={language}
                        style={{ width: '100%' }}
                        onChange={changeLanguage}
                    >
                        <Option value="vi">Tiếng Việt 🇻🇳</Option>
                        <Option value="en">English 🇺🇸</Option>
                    </Select>
                </div>

                <Divider style={{ margin: '5px 0' }} />

                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <BulbOutlined /> <Text strong>{t('appearance')}</Text>
                    </div>
                    <Radio.Group
                        value={theme}
                        onChange={(e) => toggleTheme(e.target.value)}
                        buttonStyle="solid"
                        style={{ width: '100%', display: 'flex' }}
                    >
                        <Radio.Button value="light" style={{ flex: 1, textAlign: 'center' }}>
                            ☀️ {t('lightMode')}
                        </Radio.Button>
                        <Radio.Button value="dark" style={{ flex: 1, textAlign: 'center' }}>
                            🌙 {t('darkMode')}
                        </Radio.Button>
                    </Radio.Group>
                </div>

                <Divider style={{ margin: '5px 0' }} />

                {/* 3. ÂM THANH (Gợi ý thêm) */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Space>
                        <SoundOutlined style={{fontSize: 20, color: 'var(--text-secondary)'}}/>
                        <Text strong style={{color: 'var(--text-color)'}}>{t('sound')}</Text>
                    </Space>
                    <Switch
                        checked={soundEnabled}
                        onChange={toggleSound} // Gọi hàm toggleSound khi bấm
                    />
                </div>

            </div>
        </Modal>
    );
};

export default SettingsModal;