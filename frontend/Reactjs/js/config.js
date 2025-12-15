/**
 * CONFIGURATION FILE
 * Cập nhật: Đọc API Key từ biến môi trường (.env) theo hướng dẫn.
 */

export const CONFIG = {
    // --- 1. Cấu hình API ---
    API_BASE_URL: 'http://localhost:8000/api', 
    
    USE_MOCK_DATA: false, 
    MOCK_DELAY: 800, 

    // --- 2. Cấu hình Bản đồ (Leaflet) ---
    DEFAULT_COORDS: [10.7769, 106.7009], 
    DEFAULT_ZOOM: 14,
    TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // --- 3. Cấu hình API Key (ĐỌC TỪ FILE .ENV) ---
    
    // Auth Token: Nếu trong .env có thì lấy, không thì dùng chuỗi rỗng
    AUTH_TOKEN: process.env.AUTH_TOKEN || '', 
    
    // Khóa VietMap: Đọc biến VIETMAP_API_KEY như trong ảnh hướng dẫn
    VIETMAP_KEY_FRONTEND: process.env.VIETMAP_API_KEY, 
    
    // Khóa Gemini: Đọc biến GEMINI_API_KEY như trong ảnh hướng dẫn
    GEMINI_API_KEY: process.env.GEMINI_API_KEY, 
    
    // --- 4. Các cấu hình khác ---
    MAX_SUGGESTIONS: 10,
    DEFAULT_IMAGE: 'https://via.placeholder.com/150?text=No+Image'
};