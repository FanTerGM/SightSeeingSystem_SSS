/**
 * CONFIGURATION FILE
 * Lưu trữ các biến môi trường, cài đặt mặc định và cấu hình API.
 */

export const CONFIG = {
    // --- 1. Cấu hình API ---
    // URL của Backend (Khi nào có Server thật thì đổi link này)
    API_BASE_URL: 'https://api.your-backend.com/v1',
    
    // Chế độ giả lập dữ liệu (Mocking)
    // true: Trả về dữ liệu cứng (code trong api.js) - Dùng khi chưa có Backend
    // false: Gọi fetch() tới API_BASE_URL thực sự
    USE_MOCK_DATA: true, 
    
    // Giả lập độ trễ mạng (milliseconds) để test hiệu ứng Loading
    MOCK_DELAY: 800, 

    // --- 2. Cấu hình Bản đồ (Leaflet) ---
    // Tọa độ trung tâm mặc định (TP. Hồ Chí Minh)
    DEFAULT_COORDS: [10.7769, 106.7009], 
    
    // Mức zoom mặc định (1-20)
    DEFAULT_ZOOM: 14,
    
    // Nguồn gạch bản đồ (OpenStreetMap)
    TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // --- 3. Các cấu hình khác ---
    // Số lượng điểm gợi ý tối đa hiển thị
    MAX_SUGGESTIONS: 10,
    
    // Đường dẫn icon/ảnh mặc định nếu ảnh bị lỗi
    DEFAULT_IMAGE: 'https://via.placeholder.com/150?text=No+Image'
};