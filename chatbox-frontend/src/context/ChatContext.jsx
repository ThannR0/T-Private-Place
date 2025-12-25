import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { message } from 'antd';
import api from '../services/api';
import { getAvatarUrl } from '../utils/common';
import {useSettings} from "./SettingsContext.jsx";

const ChatContext = createContext();

// Helper tính VIP (để dùng trong Context)
const getVipLevelName = (amount) => {
    const total = Number(amount) || 0;
    if (total >= 1000000000) return 'TITANIUM';
    if (total >= 250000000) return 'DIAMOND';
    if (total >= 80000000) return 'PLATINUM';
    if (total >= 15000000) return 'GOLD';
    if (total >= 5000000) return 'SILVER';
    if (total >= 500000) return 'BRONZE';
    return 'MEMBER';
};

export const ChatProvider = ({ children }) => {
    // --- STATE ---
    const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('username'));
    const [currentFullName, setCurrentFullName] = useState(() => localStorage.getItem('fullName'));
    const [currentAvatar, setCurrentAvatar] = useState(() => localStorage.getItem('avatar'));
    const [myStatus, setMyStatus] = useState("ONLINE");


    // // --- STATE TIỀN TỆ & VIP ---
    // const [myBalance, setMyBalance] = useState(0);
    // const [myTotalDeposited, setMyTotalDeposited] = useState(0);


    // State cho sự kiện thăng cấp
    const [celebrationData, setCelebrationData] = useState(null);

    const [messages, setMessages] = useState([]);
    const [recipient, setRecipient] = useState("bot");
    const [users, setUsers] = useState([]);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [feedUpdate, setFeedUpdate] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // --- REFS (Bộ nhớ đệm chống trùng) ---
    const stompClientRef = useRef(null);
    const subscribedGroupsRef = useRef(new Set());
    const processedNotiIdsRef = useRef(new Set());

    // THÊM: Bộ lọc chống trùng cho Feed (Group, Status...)
    const processedFeedIdsRef = useRef(new Set());

    const prevVipLevelRef = useRef('MEMBER');

    const isBot = recipient === 'bot';
    const { t } = useSettings();

// Lấy từ localStorage để không bị về 0 khi vừa F5
    const [myTotalDeposited, setMyTotalDeposited] = useState(() => {
        const saved = localStorage.getItem('totalDeposited');
        return saved ? parseFloat(saved) : 0;
    });

    const [myBalance, setMyBalance] = useState(() => {
        const saved = localStorage.getItem('balance');
        return saved ? parseFloat(saved) : 0;
    });

    // --- 1. XỬ LÝ TIN NHẮN ---
    const processMessage = (msg) => {
        if (msg.fileUrl && !msg.file) {
            return {
                ...msg,
                file: { url: msg.fileUrl, type: msg.fileType || 'file', name: msg.fileName || 'file' }
            };
        }
        return msg;
    };

    const fetchMyProfile = async () => {
        if (!currentUser) return;
        try {
            const res = await api.get('/users/me'); // Gọi API Backend bước 1
            const { balance, totalDeposited, fullName, avatar } = res.data;


            setMyBalance(balance);
            setMyTotalDeposited(totalDeposited);

            // Cập nhật tên/avatar nếu có thay đổi từ Admin
            if (fullName && fullName !== currentFullName) {
                setCurrentFullName(fullName); localStorage.setItem('fullName', fullName);
            }
            if (avatar && avatar !== currentAvatar) {
                setCurrentAvatar(avatar); localStorage.setItem('avatar', avatar);
            }

            // --- CHECK LEVEL UP LOGIC ---
            const newLevel = getVipLevelName(totalDeposited);
            const oldLevel = prevVipLevelRef.current;

            // Nếu Level Mới KHÁC Level Cũ và Level Mới xịn hơn (Logic đơn giản là khác MEMBER)
            // Để chuẩn xác cần so sánh thứ tự, nhưng ở đây check khác nhau là đủ kích hoạt
            if (newLevel !== oldLevel && oldLevel !== 'MEMBER' && newLevel !== 'MEMBER') {
                // Trigger sự kiện chúc mừng (Trừ lần đầu load trang)
                setCelebrationData({ level: newLevel });
            }
            // Cập nhật ref
            prevVipLevelRef.current = newLevel;

        } catch (error) {
            console.error("Lỗi tải thông tin cá nhân:", error);
        }
    };

    const addMessageUnique = (newMsg) => {
        const cleanMsg = processMessage(newMsg);
        setMessages(prev => {
            if (cleanMsg.id && prev.some(m => m.id === cleanMsg.id)) return prev;

            // Check trùng nội dung + thời gian (chặn Echo)
            const isDuplicate = prev.some(m =>
                m.senderId === cleanMsg.senderId &&
                m.content === cleanMsg.content &&
                Math.abs(new Date(m.timestamp).getTime() - new Date(cleanMsg.timestamp).getTime()) < 2000
            );
            if (isDuplicate) return prev;

            return [...prev, cleanMsg];
        });
    };

    const deleteNotification = async (notiId) => {
        try {
            await api.delete(`/notifications/${notiId}`);
            // Cập nhật State ngay lập tức
            setNotifications(prev => prev.filter(n => n.id !== notiId));
            // Tính lại số chưa đọc (nếu tin vừa xóa là tin chưa đọc)
            setUnreadCount(prev => {
                // Logic đơn giản: đếm lại từ list mới
                // Cách nhanh nhất: Trừ 1 nếu > 0 (tạm thời), hoặc để lần sau fetch lại tự đúng.
                return prev > 0 ? prev - 1 : 0;
            });
        } catch (e) { console.error("Lỗi xóa noti", e); }
    };

    const clearAllNotifications = async () => {
        try {
            await api.delete('/notifications'); // Gọi API xóa hết
            setNotifications([]); // Xóa sạch state
            setUnreadCount(0);    // Reset số đỏ về 0
        } catch (e) { console.error("Lỗi xóa all noti", e); }
    };

    // --- 2. TẢI DỮ LIỆU ---
    const fetchUsers = async () => {
        try {
            const [resUsers, resGroups] = await Promise.all([
                api.get('/users'),
                api.get('/groups/my-groups')
            ]);

            const processedUsers = resUsers.data.map(u => ({
                ...u,
                displayName: u.fullName || u.username,
                avatar: getAvatarUrl(u.username, u.fullName, u.avatar),
                status: u.status || 'OFFLINE',
                isGroup: false
            }));

            const processedGroups = resGroups.data.map(g => ({
                username: `GROUP_${g.id}`,
                displayName: g.name,
                avatar: g.avatar || `https://ui-avatars.com/api/?name=${g.name}&background=random`,
                status: 'ONLINE', isGroup: true, realGroupId: g.id
            }));

            const botUser = {
                username: 'bot', displayName: isBot ? t('assistant') : recipient,
                avatar: 'https://robohash.org/bot?set=set1', status: 'ONLINE', isGroup: false
            };

            setUsers([botUser, ...processedGroups, ...processedUsers]);

        } catch (error) {
            console.error("Lỗi tải data:", error);
            if (error.response && error.response.status === 403) await logoutUser();
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get('/chat/history');

            const processedHistory = res.data.map(msg => processMessage(msg));
            setMessages(processedHistory);
        } catch (error) { console.error("Lỗi tải tin nhắn:", error); }
    };

    const refreshGroups = () => { fetchUsers(); };

    // --- 3. SOCKET CONNECT ---
    const subscribeToGroup = (groupId) => {
        if (!stompClientRef.current || !stompClientRef.current.connected) return;
        const topic = `/topic/group/${groupId}`;
        if (subscribedGroupsRef.current.has(topic)) return;

        stompClientRef.current.subscribe(topic, (payload) => {
            const msg = JSON.parse(payload.body);

            //Chặn tin nhắn của chính mình (để không hiện 2 lần) ---
            if (msg.senderId === currentUser) return;
            msg.type = 'GROUP';
            addMessageUnique(msg);
        });
        subscribedGroupsRef.current.add(topic);
    };

    useEffect(() => {
        if (!currentUser) return;

        // Reset các bộ lọc khi login mới
        subscribedGroupsRef.current.clear();
        processedNotiIdsRef.current.clear();
        processedFeedIdsRef.current.clear();

        const client = Stomp.over(() => new SockJS('http://localhost:8081/ws'));
        client.debug = () => {};

        client.connect({}, () => {
            console.log("✅ Socket Connected");
            setIsConnected(true);
            stompClientRef.current = client;

            // 1. Chat riêng
            client.subscribe(`/user/${currentUser}/queue/messages`, (payload) => {
                addMessageUnique(JSON.parse(payload.body));
                const isSoundOn = localStorage.getItem('soundEnabled') === 'true';
                if (isSoundOn) {
                    const audio = new Audio('/sounds/notification.mp3');
                    audio.play().catch(e => {});
                }
            });

            // 2. Status & Feed
            client.subscribe('/topic/status', (payload) => {
                const update = JSON.parse(payload.body);
                setUsers(prev => prev.map(u => u.username === update.username ? { ...u, status: update.status } : u));
            });

            client.subscribe('/topic/feed', (payload) => {
                const data = JSON.parse(payload.body);

                if (!data || !data.type) {
                    return;
                }

                if (data.type === 'MSG_UPDATE') {
                    setMessages(prev => prev.map(m =>
                        m.id === data.msg.id ? { ...m, ...data.msg } : m
                    ));
                    return; // Xử lý xong thì return luôn
                }

                // Nếu tin này đã xử lý rồi (dựa trên eventId) -> Bỏ qua
                if (data.eventId && processedFeedIdsRef.current.has(data.eventId)) {
                    return;
                }
                if (data.eventId) processedFeedIdsRef.current.add(data.eventId);
                // ----------------------------------------------

                try {
                    const data = JSON.parse(payload.body);


                    if (!data || !data.type) return;

                    setFeedUpdate(data);
                } catch (e) {
                    console.warn("Lỗi parse feed socket:", e);
                }

                if (data.type === 'NEW_GROUP_CREATED') {
                    if (data.group.members.includes(currentUser)) fetchUsers();
                }

                if (data.type === 'GROUP_MEMBER_ADDED') {
                    if (data.addedUser === currentUser) {
                        message.info(`Bạn được thêm vào nhóm: ${data.groupName}`);
                        fetchUsers();
                        fetchMessages();
                    }
                }

                if (data.type === 'USER_UPDATE') {
                    setUsers(prev => prev.map(u => {
                        if (u.username === data.username) {
                            return { ...u, displayName: data.newFullName || u.displayName, avatar: data.newAvatar || u.avatar };
                        }
                        return u;
                    }));
                    if (data.username === currentUser) {
                        if (data.newFullName) { setCurrentFullName(data.newFullName); localStorage.setItem('fullName', data.newFullName); }
                        if (data.newAvatar) { setCurrentAvatar(data.newAvatar); localStorage.setItem('avatar', data.newAvatar); }
                    }
                }
                if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                    setPosts(prev => prev.map(p =>
                        String(p.id) === String(feedUpdate.postId)
                            ? { ...p, reactions: feedUpdate.reactions, likeCount: feedUpdate.likeCount }
                            : p
                    ));
                }

            });

            // 3. Notification (Cũng lọc trùng)
            client.subscribe(`/user/${currentUser}/queue/notifications`, (payload) => {
                const newNoti = JSON.parse(payload.body);
                if (!newNoti) return;
                if (processedNotiIdsRef.current.has(newNoti.id)) return;
                processedNotiIdsRef.current.add(newNoti.id);
                setNotifications(prev => [newNoti, ...prev]);
                setUnreadCount(prev => prev + 1);
                const isSoundOn = localStorage.getItem('soundEnabled') === 'true';
                if (isSoundOn) {
                    try {
                        // Phát âm thanh
                        const audio = new Audio('/sounds/notification.mp3');
                        audio.play().catch(err => console.log("Audio play failed:", err));
                    } catch (e) {
                        console.error("Sound error", e);
                    }
                }
                message.info(newNoti.content);
            });

            client.subscribe(`/user/${currentUser}/queue/levelup`, (payload) => {
                try {
                    const data = JSON.parse(payload.body);
                    console.log("🎉 SỰ KIỆN LÊN CẤP:", data);

                    if (data && data.level) {
                        // 1. Kích hoạt Modal pháo hoa
                        setCelebrationData({ level: data.level });

                        // 2. Cập nhật ngay lại số tiền và cấp độ mới nhất từ server
                        fetchMyTotalDeposited();
                        fetchMyBalance();

                        // 3. Hiện thông báo nhỏ góc màn hình
                        message.success({
                            content: `Chúc mừng! Bạn đã thăng hạng ${data.level}`,
                            duration: 5,
                            style: { marginTop: '10vh' }
                        });

                        // 4. Phát âm thanh (nếu có file)
                        const audio = new Audio('/sounds/levelup.mp3');
                        audio.play().catch(e => {});
                    }
                } catch (e) {
                    console.error("Lỗi socket levelup:", e);
                }
            });

        }, (err) => {
            setIsConnected(false);
            subscribedGroupsRef.current.clear();
        });

        return () => {
            if (client && client.connected) client.disconnect();
            setIsConnected(false);
        };
    }, [currentUser]);

    // Tự động sub nhóm
    useEffect(() => {
        if (isConnected && stompClientRef.current && users.length > 0) {
            users.filter(u => u.isGroup).forEach(g => subscribeToGroup(g.realGroupId));
        }
    }, [users, isConnected]);

    // --- 4. GỬI TIN ---
    const sendMessage = async (content, fileData = null) => {
        if (!stompClientRef.current || !isConnected) return message.error("Mất kết nối!");
        let uploadedFileUrl = null, uploadedFileType = null, uploadedFileName = null;

        if (fileData && fileData.fileObject) {
            try {
                const formData = new FormData();
                formData.append('file', fileData.fileObject);
                const res = await api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                uploadedFileUrl = res.data.url;
                uploadedFileType = res.data.type;
                uploadedFileName = res.data.name;
            } catch (error) { return message.error("Lỗi gửi file!"); }
        }

        const isGroupChat = recipient.startsWith("GROUP_");
        let finalRecipientId = recipient;
        if (isGroupChat) {
            const targetGroup = users.find(u => u.username === recipient);
            finalRecipientId = targetGroup ? targetGroup.realGroupId : recipient.replace("GROUP_", "");
        }

        const chatMessage = {
            senderId: currentUser, recipientId: finalRecipientId,
            content, timestamp: new Date().toISOString(),
            fileUrl: uploadedFileUrl, fileType: uploadedFileType, fileName: uploadedFileName,
            type: isGroupChat ? 'GROUP' : 'CHAT'
        };

        try {
            const dest = isGroupChat ? "/app/chat.group" : "/app/chat";
            stompClientRef.current.send(dest, {}, JSON.stringify(chatMessage));

            // Optimistic UI: Hiện tin nhắn ngay (Chỉ lần này là tin nhắn được thêm)
            const localMsg = processMessage({
                ...chatMessage,
                file: fileData ? { url: uploadedFileUrl, name: uploadedFileName, type: uploadedFileType } : null
            });
            addMessageUnique(localMsg);

        } catch (e) { message.error("Gửi tin lỗi!"); }
    };

    const markOneRead = async (notificationId) => {
        // 1. Cập nhật giao diện ngay lập tức (cho mượt)
        setNotifications(prev => prev.map(noti => {
            if (noti.id === notificationId && !noti.read) {
                // Nếu tìm thấy và chưa đọc -> Đánh dấu đã đọc
                return { ...noti, read: true };
            }
            return noti;
        }));

        // 2. Giảm số lượng chưa đọc đi 1 (nếu > 0)
        // Lưu ý: Phải kiểm tra xem tin đó trước đấy đã đọc chưa để tránh trừ nhầm
        const targetNoti = notifications.find(n => n.id === notificationId);
        if (targetNoti && !targetNoti.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        // 3. Gọi Backend để lưu lại (Backend xử lý ngầm)
        try {
            await api.put(`/notifications/${notificationId}/read`);
        } catch (error) {
            console.error("Lỗi đánh dấu đã đọc:", error);
        }
    };

    const loginUser = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        const name = data.fullName || data.username;
        const balance = data.balance || 0;
        setMyBalance(balance);

        const total = data.totalDeposited || 0;
        setMyTotalDeposited(total);
        localStorage.setItem('totalDeposited', total);
        localStorage.setItem('balance', balance);
        localStorage.setItem('fullName', name);
        localStorage.setItem('avatar', data.avatar || "");
        setCurrentUser(data.username);
        setCurrentFullName(name);
        setCurrentAvatar(data.avatar || "");
        setMyStatus("ONLINE");
        fetchUsers();
        fetchMessages();
    };

    const fetchMyBalance = async () => {
        if (!currentUser) return;
        try {
            // Gọi API lấy thông tin user hiện tại
            // Lưu ý: Backend cần có API trả về user detail kèm balance
            const res = await api.get(`/users/${currentUser}`);
            if (res.data && res.data.balance !== undefined) {
                setMyBalance(res.data.balance);
                localStorage.setItem('balance', res.data.balance);
            }
        } catch (error) {
            console.error("Lỗi cập nhật số dư", error);
        }
    };

    const fetchMyTotalDeposited = async () => {
        if (!currentUser) return;
        try {
            // 👇 ĐỔI THÀNH '/users/me' ĐỂ LẤY CHÍNH XÁC SỐ TIỀN NẠP
            const res = await api.get('/users/me');

            // Backend thường trả về totalDeposited (có 'ed') hoặc totalDeposit
            const val = res.data.totalDeposited !== undefined ? res.data.totalDeposited : res.data.totalDeposit;

            if (val !== undefined) {
                setMyTotalDeposited(val);
                localStorage.setItem('totalDeposited', val); // Lưu đúng key
            }
        } catch (error) {
            console.error("Lỗi cập nhật tổng nạp", error);
        }
    };
    const logoutUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try { await api.post('/auth/logout', {}, { headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) { /* empty */ }
        }
        if (stompClientRef.current) stompClientRef.current.deactivate();

        ['token', 'username', 'fullName', 'avatar'].forEach(key => localStorage.removeItem(key));
        setCurrentUser(null); setCurrentFullName(null); setCurrentAvatar(null);
        setMyStatus("OFFLINE"); setMessages([]); setNotifications([]);
        setRecipient("bot");
        setIsConnected(false);
        subscribedGroupsRef.current.clear(); processedNotiIdsRef.current.clear(); processedFeedIdsRef.current.clear();
    };

    const updateUserStatus = async (s) => {
        setMyStatus(s);
        setUsers(prev => prev.map(u => u.username === currentUser ? { ...u, status: s } : u));
        try { await api.post('/users/status', { status: s }); } catch (e) {}
    };

    const getUserAvatar = (target) => {
        if (!target) return 'https://via.placeholder.com/150';
        if (target === 'bot') return 'https://robohash.org/bot?set=set1';
        if (target === currentUser) return getAvatarUrl(currentUser, currentFullName, currentAvatar);
        const u = users.find(x => x.username === target);
        return u ? u.avatar : getAvatarUrl(target, target, null);
    };

    const markNotificationsRead = async () => {
        if (unreadCount > 0) {
            try { await api.put('/notifications/read'); setUnreadCount(0); setNotifications(prev => prev.map(n => ({...n, read: true}))); } catch (e) {}
        }
    };
    const leaveGroup = async (groupId) => {
        try {
            await api.post(`/groups/${groupId}/leave`);
            setUsers(prev => prev.filter(u => !(u.isGroup && u.realGroupId === groupId)));
            if (recipient.startsWith("GROUP_") && recipient.includes(String(groupId))) setRecipient("bot");
            message.success("Đã rời nhóm thành công.");
        } catch (error) { message.error("Không thể rời nhóm."); }
    };

    useEffect(() => {
        if (currentUser) {
            fetchMyTotalDeposited();
            fetchMyBalance();
            fetchUsers();
            fetchMessages();
            api.get('/notifications').then(res => {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            }).catch(e => {});
        }
    }, [currentUser]);

    const value = {
        messages, recipient, setRecipient, sendMessage,
        currentUser, currentFullName, currentAvatar, setCurrentAvatar,
        isConnected, loginUser, logoutUser,
        users, getUserAvatar, refreshGroups, leaveGroup,
        myStatus, updateUserStatus, notifications, unreadCount, markNotificationsRead, feedUpdate, fetchMessages, fetchUsers,
        deleteNotification, clearAllNotifications, markOneRead, setCurrentUser, myBalance, fetchMyBalance, myTotalDeposited, fetchMyProfile, fetchMyTotalDeposited,
        celebrationData,
        setCelebrationData
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
export const useChat = () => useContext(ChatContext);