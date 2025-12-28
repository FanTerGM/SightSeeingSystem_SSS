/**
 * CONFIGURATION FILE
 * Cập nhật: Đọc API Key từ biến môi trường (.env) theo hướng dẫn.
 */
const ENV = window.__ENV || {};

export const CONFIG = {
    // --- 1. Cấu hình API ---
    API_BASE_URL: 'http://localhost:8000/api', 
    
    USE_MOCK_DATA: false, 
    MOCK_DELAY: 800, 

    // --- 2. Cấu hình Bản đồ (Leaflet) ---
    DEFAULT_COORDS: [10.7769, 106.7009], 
    DEFAULT_ZOOM: 14,
    TILE_LAYER_URL: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    
    // --- 3. Cấu hình API Key (ĐỌC TỪ FILE .ENV) ---
    VIETMAP_KEY_FRONTEND: ENV.VIETMAP_API_KEY || "",
    GEMINI_API_KEY: ENV.GEMINI_API_KEY || "",
    AUTH_TOKEN: ENV.AUTH_TOKEN || "",
    // --- 4. Các cấu hình khác ---
    MAX_SUGGESTIONS: 10,
    DEFAULT_IMAGE: 'https://via.placeholder.com/150?text=No+Image'
};