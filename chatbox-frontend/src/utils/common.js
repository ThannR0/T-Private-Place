// Hàm tạo màu nền ngẫu nhiên cho đẹp (Private - dùng nội bộ)
const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

// 1. LOGIC TẠO AVATAR
export const getAvatarUrl = (username, fullName, avatarUrlFromDB) => {
    // Ưu tiên 1: Ảnh thật từ DB
    if (avatarUrlFromDB && avatarUrlFromDB.trim() !== "") {
        return avatarUrlFromDB;
    }

    // Ưu tiên 2: Tạo ảnh chữ cái (UI Avatars)
    const bgColor = stringToColor(username || "User").substring(1);
    const nameDisplay = fullName ? fullName : username;

    // Dùng encodeURIComponent để xử lý tên có dấu tiếng Việt
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameDisplay)}&background=${bgColor}&color=fff&size=128&bold=true`;
};

// 2. LOGIC LẤY MÀU TRẠNG THÁI (Cái bạn đang thiếu)
export const getStatusColor = (status) => {
    switch (status) {
        case 'ONLINE': return '#52c41a'; // Xanh lá (Sáng hơn màu mặc định)
        case 'BUSY': return '#ff4d4f';   // Đỏ
        case 'OFFLINE': return '#d9d9d9'; // Xám
        default: return '#d9d9d9';
    }
};