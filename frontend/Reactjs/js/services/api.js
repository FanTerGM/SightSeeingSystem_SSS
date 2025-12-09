import { CONFIG } from '../config.js';

// --- MOCK DATA (Dữ liệu mẫu để test nhanh) ---
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
    // ... Bạn có thể giữ thêm các data mẫu khác ở đây
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

    // --- ADAPTER: CẦU NỐI GIỮA BACKEND VÀ FRONTEND ---
    _mapApiToApp(item) {
        const displayName = item.name || (item.display_name ? item.display_name.split(',')[0] : 'Địa điểm chưa đặt tên');
        
        return {
            id: item.place_id || item.id || Date.now(),
            name: displayName,
            type: item.type || 'Địa điểm', 
            address: item.display_name || item.address || 'Đang cập nhật địa chỉ',
            price: item.price || '---', 
            status: item.status || 'Mở cửa',
            isOpen: true,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon || item.lng), 
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

    // --- API 1: TÌM KIẾM ---
    async getSuggestions(keyword = '') {
        // 1. Chế độ Mock (Nên bật chế độ này trong config.js lúc này)
        if (this.useMock) {
            const results = keyword 
                ? MOCK_DB.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase()))
                : MOCK_DB;
            return this._mockDelay(results);
        }

        // 2. Chế độ thật (Backend của bạn)
        try {
            console.log(`[API] Calling Backend: "${keyword}"`);
            
            // --- CHỖ NÀY ĐỂ BACKEND DEV ĐIỀN CODE VÀO ---
            /*
            const url = `${this.baseUrl}/locations?q=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            return data.map(item => this._mapApiToApp(item));
            */

            // Tạm thời trả về rỗng nếu chưa nối API
            console.warn("Chưa kết nối Backend thật!");
            return [];

        } catch (error) {
            console.error("Lỗi getSuggestions:", error);
            return [];
        }
    }

    // --- API 2: CHI TIẾT ---
    async getLocationDetails(name) {
        if (this.useMock) {
            const found = MOCK_DB.find(d => d.name === name);
            if (found) return this._mockDelay(found);
            
            // Mock Fallback
            return this._mockDelay(this._mapApiToApp({
                name: name,
                display_name: 'Địa điểm Mock ngẫu nhiên',
                lat: 10.77 + Math.random() * 0.01,
                lon: 106.69 + Math.random() * 0.01
            }));
        }

        // --- CHỖ NÀY ĐỂ BACKEND DEV ĐIỀN CODE VÀO ---
        /*
        try {
            const res = await fetch(`${this.baseUrl}/locations/details?name=${encodeURIComponent(name)}`);
            const data = await res.json();
            return this._mapApiToApp(data);
        } catch (e) { console.error(e); }
        */

        console.warn("Chưa kết nối Backend thật!");
        return this._mapApiToApp({
            name: name,
            display_name: 'Không tìm thấy (Backend chưa sẵn sàng)',
            lat: 10.7769,
            lon: 106.7009
        });
    }

    // --- API 3: TÍNH LỘ TRÌNH ---
   async calculateRoute(routeList) {
        console.log(`[Route] Tính đường qua ${routeList.length} điểm.`);

        if (!routeList || routeList.length < 2) return null;

        // --- LOGIC MỚI: NỐI TỪNG ĐIỂM MỘT ---
        const path = [];

        for (let i = 0; i < routeList.length - 1; i++) {
            const current = routeList[i];
            const next = routeList[i+1];

            // 1. Thêm điểm hiện tại vào đường đi
            path.push([current.lat, current.lng]);

            // 2. Tạo điểm trung gian giả lập (để đường trông mềm mại hơn, không thẳng đuột)
            // (Lấy trung điểm giữa 2 vị trí)
            const midLat = (current.lat + next.lat) / 2;
            const midLng = (current.lng + next.lng) / 2;
            
            // Thêm chút nhiễu nhẹ để đường cong (tùy chọn)
            path.push([midLat + 0.0002, midLng - 0.0002]); 
        }

        // 3. Thêm điểm cuối cùng
        const last = routeList[routeList.length - 1];
        path.push([last.lat, last.lng]);

        return this._mockDelay({
            success: true,
            distance: 'Đang cập nhật...',
            duration: '---',
            path: path
        });
    }
}

export const apiService = new ApiService();