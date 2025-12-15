import { CONFIG } from '../config.js';

// --- MOCK DATA (Giữ nguyên để test) ---
const MOCK_DB = [
    { 
        id: 1, 
        name: 'Dinh Độc Lập', 
        type: 'Di tích', 
        address: '135 Nam Kỳ Khởi Nghĩa, Q1', 
        price: '65.000đ', 
        status: 'Mở cửa', 
        isOpen: true,
        lat: 10.7770, 
        lng: 106.6953, 
        temp: '32°C', 
        weatherIcon: 'fa-sun',
        img: 'https://images.unsplash.com/photo-1592114714621-ccc6cacad26b?auto=format&fit=crop&w=500&q=80', 
        desc: 'Di tích lịch sử văn hóa nổi tiếng.' 
    },
    { 
        id: 2, 
        name: 'Chợ Bến Thành', 
        type: 'Mua sắm', 
        address: 'Đ. Lê Lợi, Q1', 
        price: 'Miễn phí', 
        status: 'Mở cửa', 
        isOpen: true,
        lat: 10.7725, 
        lng: 106.6980, 
        temp: '33°C', 
        weatherIcon: 'fa-cloud-sun',
        img: 'https://via.placeholder.com/150/E76F51/FFFFFF?text=Cho', 
        desc: 'Khu chợ biểu tượng của Sài Gòn.' 
    },
    { 
        id: 3, 
        name: 'Bưu điện TP', 
        type: 'Kiến trúc', 
        address: '02 Công xã Paris, Q1', 
        price: 'Miễn phí', 
        status: 'Đóng cửa', 
        isOpen: false,
        lat: 10.7798, 
        lng: 106.6999, 
        temp: '31°C', 
        weatherIcon: 'fa-cloud',
        img: 'https://via.placeholder.com/150/F4A261/FFFFFF?text=BuuDien', 
        desc: 'Kiến trúc Pháp cổ kính tuyệt đẹp.' 
    },
    { 
        id: 4, 
        name: 'Landmark 81', 
        type: 'Giải trí', 
        address: '720A Điện Biên Phủ, BT', 
        price: '810.000đ', 
        status: 'Mở cửa', 
        isOpen: true,
        lat: 10.7950, 
        lng: 106.7218, 
        temp: '28°C', 
        weatherIcon: 'fa-wind',
        img: 'https://via.placeholder.com/150/264653/FFFFFF?text=L81', 
        desc: 'Tòa nhà cao nhất Việt Nam.' 
    }
];

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL; 
        this.useMock = CONFIG.USE_MOCK_DATA;
        
        console.log("🛠️ API Service khởi tạo. Chế độ Mock:", this.useMock);
    }

    _mockDelay(data) {
        return new Promise(resolve => setTimeout(() => resolve(data), CONFIG.MOCK_DELAY));
    }
    
    /**
     * Helper POST request
     */
    async _apiPost(path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = { 
            "Content-Type": "application/json"
        };
        
        if (CONFIG.AUTH_TOKEN) {
            headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`; 
        }

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            // Đọc text lỗi để dễ debug nếu server trả HTML thay vì JSON
            const errText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errText}`);
        }
        return await response.json();
    }
    
    /**
     * Helper GET request
     */
    async _apiGet(path) {
        const url = `${this.baseUrl}${path}`;
        const headers = {};
        
        if (CONFIG.AUTH_TOKEN) {
            headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`; 
        }

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    }

    // --- ADAPTER: CẦU NỐI DỮ LIỆU ---
    _mapApiToApp(item) {
        const displayName = item.name_vi || item.name || (item.display_name ? item.display_name.split(',')[0] : 'Địa điểm chưa đặt tên');
        
        const lat = item.coordinates ? item.coordinates.lat : item.lat;
        const lng = item.coordinates ? item.coordinates.lng : item.lon || item.lng;
        
        return {
            id: item.location_id || item.place_id || item.id || Date.now() + Math.random(), 
            name: displayName,
            type: (item.categories && item.categories.length > 0) ? item.categories[0] : 'Địa điểm',
            address: item.address || item.district || 'Đang cập nhật địa chỉ',
            price: item.price || '---', 
            status: item.status || 'Mở cửa',
            isOpen: true,
            lat: parseFloat(lat),
            lng: parseFloat(lng), 
            temp: '30°C', 
            weatherIcon: 'fa-sun', 
            img: item.img || this._getPlaceImage(displayName, item.type),
            desc: item.description || item.display_name || 'Chưa có mô tả chi tiết.'
        };
    }

    _getPlaceImage(name, type) {
        const n = (name || '').toLowerCase();
        if (n.includes('coffee') || n.includes('cafe')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80';
        if (n.includes('chợ') || n.includes('market')) return 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=300&q=80';
        if (n.includes('công viên') || n.includes('park')) return 'https://images.unsplash.com/photo-1496417263034-38ec4f0d665a?auto=format&fit=crop&w=300&q=80';
        return 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=300&q=80'; 
    }

    // --- API 1: TÌM KIẾM ---
    async getSuggestions(keyword = '') {
        if (this.useMock) {
            const results = keyword 
                ? MOCK_DB.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()))
                : MOCK_DB;
            return this._mockDelay(results);
        }

        try {
            console.log(`[API] Calling VietMap Search: "${keyword}"`);
            const path = `/vietmap/search?query=${encodeURIComponent(keyword)}`; 
            const data = await this._apiGet(path);
            
            // [AN TOÀN] Kiểm tra data phải là mảng mới map, nếu không sẽ crash app
            if (Array.isArray(data)) {
                return data.map(item => this._mapApiToApp(item));
            } else {
                console.warn("API Search trả về dữ liệu không đúng định dạng:", data);
                return [];
            }

        } catch (error) {
            console.error("Lỗi getSuggestions:", error);
            return []; // Trả về rỗng thay vì Mock để biết là lỗi thật
        }
    }

    // --- API 2: CHI TIẾT ---
    async getLocationDetails(name) {
        if (this.useMock) {
            const found = MOCK_DB.find(d => d.name === name);
            if (found) return this._mockDelay(found);
            return this._mockDelay(this._mapApiToApp({ name: name, lat: 10.77, lon: 106.69 }));
        }

        try {
            const path = `/vietmap/search?query=${encodeURIComponent(name)}`; 
            const data = await this._apiGet(path);
            
            if (Array.isArray(data) && data.length > 0) {
                return this._mapApiToApp(data[0]);
            }
        } catch (e) {
            console.error("Lỗi getLocationDetails:", e);
        }
        
        // Trả về dữ liệu giả nếu không tìm thấy để không crash map
        return this._mapApiToApp({
            name: name,
            display_name: 'Không tìm thấy thông tin',
            lat: 10.7769,
            lon: 106.7009
        });
    }

    // --- API 3: TÍNH LỘ TRÌNH ---
   async calculateRoute(routeList) {
        if (!routeList || routeList.length < 2) return null;

        if (this.useMock) {
            // Mock logic cũ...
            const path = [];
            const start = routeList[0];
            const end = routeList[routeList.length - 1];
            path.push([start.lat, start.lng]);
            path.push([(start.lat + end.lat)/2, (start.lng + end.lng)/2]);
            path.push([end.lat, end.lng]);
            return this._mockDelay({ success: true, distance: 'Mock Dist', duration: 'Mock Time', path: path });
        }
        
        try {
            const start = routeList[0];
            const end = routeList[routeList.length - 1];
            
            const payload = {
                start_lat: start.lat,
                start_lng: start.lng,
                end_lat: end.lat,
                end_lng: end.lng,
                vehicle: "car"
            };
            
            const routeResult = await this._apiPost("/vietmap/route", payload); 
            // Nếu API trả về mảng (nhiều routes), lấy cái đầu tiên
            const firstRoute = Array.isArray(routeResult) ? routeResult[0] : routeResult;

            return {
                success: true,
                distance: firstRoute?.distance || 'N/A', 
                duration: firstRoute?.duration || 'N/A',
                path: routeResult.path || [] // Đảm bảo key path đúng với response backend
            };

        } catch (error) {
            console.error("Lỗi calculateRoute:", error);
            return null;
        }
    }
    
    // --- API 4: CHATBOT (Tách /chat và /parse) ---
    async chatRecommend(message) {
        console.log(`[AI Chat] Request: "${message}"`);
        
        if (this.useMock) {
            return this._mockDelay({
                reply: `[Mock] Đang gọi 2 API /chat và /parse...`,
                selected_locations: [] 
            });
        }
        
        try {
            // [LOGIC] Chỉ gửi question, không thêm context vị trí theo yêu cầu
            const payload = { question: message };

            // Gọi song song 2 API để tối ưu tốc độ
            const [chatRes, parseRes] = await Promise.allSettled([
                this._apiPost("/chat", payload),  // Lấy text
                this._apiPost("/parse", payload)  // Lấy địa điểm
            ]);

            // 1. Xử lý Text trả lời
            let finalReply = "Xin lỗi, server không phản hồi.";
            if (chatRes.status === 'fulfilled') {
                const data = chatRes.value;
                // Fallback các key phổ biến
                finalReply = data.answer || data.result || data.reply || (typeof data === 'string' ? data : JSON.stringify(data));
            } else {
                console.error("Lỗi API /chat:", chatRes.reason);
            }

            // 2. Xử lý Địa điểm
            let finalLocations = [];
            if (parseRes.status === 'fulfilled') {
                const data = parseRes.value;
                // Tìm mảng địa điểm trong response
                const rawList = data.locations || data.places || (Array.isArray(data) ? data : []);
                
                if (Array.isArray(rawList)) {
                    finalLocations = rawList.map(item => this._mapApiToApp(item));
                }
            } else {
                console.warn("API /parse lỗi hoặc không tìm thấy địa điểm:", parseRes.reason);
            }

            return {
                reply: finalReply,
                selected_locations: finalLocations
            };
            
        } catch (error) {
            console.error("Lỗi hệ thống Chat:", error);
            return { 
                reply: "Xin lỗi, hiện tại tôi không thể kết nối tới server.", 
                selected_locations: [] 
            };
        }
    }
}

export const apiService = new ApiService();