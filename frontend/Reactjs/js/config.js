/**
 * CONFIGURATION FILE
 * Lưu trữ các biến môi trường, cài đặt mặc định và cấu hình API.
 */

export const CONFIG = {
    // --- 1. Cấu hình API ---
    // URL của Backend 
    API_BASE_URL: 'http://localhost:8000/api', 
    
    // Đã chuyển sang FALSE để gọi API thật
    USE_MOCK_DATA: false, 
    
    // Giả lập độ trễ mạng (milliseconds) 
    MOCK_DELAY: 800, 

    // --- 2. Cấu hình Bản đồ (Leaflet) ---
    DEFAULT_COORDS: [10.7769, 106.7009], 
    DEFAULT_ZOOM: 14,
    TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // --- 3. Cấu hình API Key MỚI (ĐÃ CẬP NHẬT) ---
    // Auth Token để xác thực người dùng (dùng trong Header)
    AUTH_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.USER_DEFAULT_TOKEN', 
    
    // Khóa VietMap (Dù Backend dùng, vẫn lưu trữ ở đây cho đầy đủ)
    VIETMAP_KEY_FRONTEND: '6849680e1e7687ac6c73bf5a30b5a2e9e18f44e5d340c746', 
    
    // Khóa Gemini (Dùng cho các cuộc gọi AI)
    GEMINI_API_KEY: 'AIzaSyA3_Ww8Eg_qnPqaYq0pcyn1O15eVKPRG8w', 
    
    // --- 4. Các cấu hình khác ---
    MAX_SUGGESTIONS: 10,
    DEFAULT_IMAGE: 'https://via.placeholder.com/150?text=No+Image'
};