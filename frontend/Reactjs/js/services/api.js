import { CONFIG } from '../config.js';

// --- MOCK DATA (Giữ nguyên) ---
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
        desc: 'Khu chợ biểu tượng của Sài Gòn, nơi bạn có thể tìm thấy mọi thứ.' 
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
        desc: 'Kiến trúc Pháp cổ kính tuyệt đẹp, điểm check-in không thể bỏ qua.' 
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
        desc: 'Tòa nhà cao nhất Việt Nam, đài quan sát view toàn cảnh thành phố.' 
    }
];

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL; 
        this.useMock = CONFIG.USE_MOCK_DATA;
	
	console.log("🛠️ API Service khởi tạo. Chế độ Mock:", this.useMock);
        console.log("🛠️ Mock DB hiện có:", MOCK_DB.length, "địa điểm.");
    }

    _mockDelay(data) {
        return new Promise(resolve => setTimeout(() => resolve(data), CONFIG.MOCK_DELAY));
    }
    
    /**
     * Helper POST request (Đã thêm Auth Header)
     */
    async _apiPost(path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = { 
            "Content-Type": "application/json"
        };
        
        // Thêm Token xác thực nếu có
        if (CONFIG.AUTH_TOKEN) {
            headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`; 
        }

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    }
    
    /**
     * Helper GET request (Đã thêm Auth Header)
     */
    async _apiGet(path) {
        const url = `${this.baseUrl}${path}`;
        const headers = {};
        
        // Thêm Token xác thực nếu có
        if (CONFIG.AUTH_TOKEN) {
            headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`; 
        }

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    }


    // --- ADAPTER: CẦU NỐI GIỮA BACKEND VÀ FRONTEND ---
    _mapApiToApp(item) {
        // Cố gắng lấy tên tiếng Việt nếu có (từ Recommendation API)
        const displayName = item.name_vi || item.name || (item.display_name ? item.display_name.split(',')[0] : 'Địa điểm chưa đặt tên');
        
        // Lấy tọa độ
        const lat = item.coordinates ? item.coordinates.lat : item.lat;
        const lng = item.coordinates ? item.coordinates.lng : item.lon || item.lng;
        
        return {
            id: item.location_id || item.place_id || item.id || Date.now() + Math.random(), 
            name: displayName,
            type: (item.categories && item.categories.length > 0) ? item.categories[0] : 'Địa điểm', // Lấy category đầu tiên
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
        const n = name.toLowerCase();
        if (n.includes('coffee') || n.includes('cafe')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80';
        if (n.includes('chợ') || n.includes('market')) return 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=300&q=80';
        if (n.includes('công viên') || n.includes('park')) return 'https://images.unsplash.com/photo-1496417263034-38ec4f0d665a?auto=format&fit=crop&w=300&q=80';
        return 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=300&q=80'; 
    }

    // --- API 1: TÌM KIẾM (Sử dụng VietMap Search API) ---
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
            
            return data.map(item => this._mapApiToApp(item));

        } catch (error) {
            console.error("Lỗi getSuggestions:", error);
            return MOCK_DB; 
        }
    }

    // --- API 2: CHI TIẾT (Sử dụng VietMap Search API làm proxy) ---
    async getLocationDetails(name) {
        if (this.useMock) {
            const found = MOCK_DB.find(d => d.name === name);
            if (found) return this._mockDelay(found);
            
            return this._mockDelay(this._mapApiToApp({
                name: name,
                display_name: 'Địa điểm Mock ngẫu nhiên',
                lat: 10.77 + Math.random() * 0.01,
                lon: 106.69 + Math.random() * 0.01
            }));
        }

        try {
            const path = `/vietmap/search?query=${encodeURIComponent(name)}`; 
            const data = await this._apiGet(path);
            
            if (data && data.length > 0) {
                return this._mapApiToApp(data[0]);
            }
        } catch (e) {
            console.error("Lỗi getLocationDetails:", e);
        }
        
        return this._mapApiToApp({
            name: name,
            display_name: 'Không tìm thấy địa điểm (API Search không trả về kết quả)',
            lat: 10.7769,
            lon: 106.7009
        });
    }

    // --- API 3: TÍNH LỘ TRÌNH (Sử dụng VietMap Route API) ---
   async calculateRoute(routeList) {
        console.log(`[Route] Tính đường qua ${routeList.length} điểm.`);

        if (!routeList || routeList.length < 2) return null;

        if (this.useMock) {
            const path = [];
            for (let i = 0; i < routeList.length - 1; i++) {
                const current = routeList[i];
                const next = routeList[i+1];
                path.push([current.lat, current.lng]);
                const midLat = (current.lat + next.lat) / 2;
                const midLng = (current.lng + next.lng) / 2;
                path.push([midLat + 0.0002, midLng - 0.0002]); 
            }
            const last = routeList[routeList.length - 1];
            path.push([last.lat, last.lng]);
            return this._mockDelay({
                success: true,
                distance: 'Đang cập nhật...',
                duration: '---',
                path: path
            });
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

            const p0 = routeResult?.paths?.[0];

            return {
                success: true,
                distance: p0?.distance ?? 'N/A',
                duration: p0?.time ?? 'N/A',
                // You must decode polyline if you want an array of coordinates
                path: p0?.points ?? ""
            };

        } catch (error) {
            console.error("Lỗi calculateRoute:", error);
            return null;
        }
    }
    
    // --- API 4: CHATBOT RECOMMENDATION (Mới) ---
    async chatRecommend(message) {
        console.log(`[AI Chat] Request: "${message}"`);
        
        if (this.useMock) {
            return this._mockDelay({
                reply: `Tôi đang ở chế độ Mock. Tôi đã nhận được yêu cầu: "${message}".`,
                selected_locations: MOCK_DB.slice(0, 2) 
            });
        }
        
        try {
            const payload = {
                user_id: 'guest-user-123', 
                message: message
            };
            
            const result = await this._apiPost("/ai/recommend-chat", payload);
            
            const locations = result.selected_locations.map(item => this._mapApiToApp(item));
            
            return {
                reply: result.reply,
                selected_locations: locations
            };
            
        } catch (error) {
            console.error("Lỗi chatRecommend:", error);
            return { 
                reply: "Xin lỗi, tôi không thể kết nối đến Trợ lý AI lúc này.", 
                selected_locations: [] 
            };
        }
    }
}

export const apiService = new ApiService();