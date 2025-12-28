import { CONFIG } from '../config.js';

// --- MOCK DATA (Giữ nguyên để test khi không có mạng) ---
const MOCK_DB = [
    { id: 1, name: 'Dinh Độc Lập', type: 'Di tích', address: '135 Nam Kỳ Khởi Nghĩa, Q1', price: '65.000đ', status: 'Mở cửa', isOpen: true, lat: 10.7770, lng: 106.6953, temp: '32°C', weatherIcon: 'fa-sun', img: 'https://images.unsplash.com/photo-1592114714621-ccc6cacad26b?auto=format&fit=crop&w=500&q=80', desc: 'Di tích lịch sử văn hóa nổi tiếng.' },
    { id: 2, name: 'Chợ Bến Thành', type: 'Mua sắm', address: 'Đ. Lê Lợi, Q1', price: 'Miễn phí', status: 'Mở cửa', isOpen: true, lat: 10.7725, lng: 106.6980, temp: '33°C', weatherIcon: 'fa-cloud-sun', img: 'https://via.placeholder.com/150/E76F51/FFFFFF?text=Cho', desc: 'Khu chợ biểu tượng của Sài Gòn.' },
    { id: 3, name: 'Bưu điện TP', type: 'Kiến trúc', address: '02 Công xã Paris, Q1', price: 'Miễn phí', status: 'Đóng cửa', isOpen: false, lat: 10.7798, lng: 106.6999, temp: '31°C', weatherIcon: 'fa-cloud', img: 'https://via.placeholder.com/150/F4A261/FFFFFF?text=BuuDien', desc: 'Kiến trúc Pháp cổ kính tuyệt đẹp.' },
    { id: 4, name: 'Landmark 81', type: 'Giải trí', address: '720A Điện Biên Phủ, BT', price: '810.000đ', status: 'Mở cửa', isOpen: true, lat: 10.7950, lng: 106.7218, temp: '28°C', weatherIcon: 'fa-wind', img: 'https://via.placeholder.com/150/264653/FFFFFF?text=L81', desc: 'Tòa nhà cao nhất Việt Nam.' }
];

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.useMock = CONFIG.USE_MOCK_DATA;
        console.log("API Service khởi tạo. Chế độ Mock:", this.useMock);
    }

    _mockDelay(data) {
        return new Promise(resolve => setTimeout(() => resolve(data), CONFIG.MOCK_DELAY));
    }

    // 🔥 FIX LỖI 502: Thêm hàm delay để tránh spam server
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _apiPost(path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = { "Content-Type": "application/json" };
        if (CONFIG.AUTH_TOKEN) headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`;

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
            if (!response.ok) {
                // Log lỗi nhưng không throw để tránh crash app khi 1 segment lỗi
                console.error(`API Error ${response.status} at ${path}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Network error at ${path}:`, error);
            return null;
        }
    }

    async _apiGet(path) {
        const url = `${this.baseUrl}${path}`;
        const headers = {};
        if (CONFIG.AUTH_TOKEN) headers["Authorization"] = `Bearer ${CONFIG.AUTH_TOKEN}`;

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`GET Error at ${path}:`, error);
            return []; // Trả về mảng rỗng để không crash UI
        }
    }

    // --- ADAPTER ---
    _mapApiToApp(item) {
        if (!item) return null;

        // Case 1: VietMap GeoJSON Feature
        if (item.type === "Feature" && item.geometry && Array.isArray(item.geometry.coordinates)) {
            const coords = item.geometry.coordinates;
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            const p = item.properties || {};
            const displayName = p.name || "Địa điểm chưa đặt tên";
            const address = p.label || [p.housenumber, p.street, p.locality, p.county, p.region].filter(Boolean).join(", ") || "Đang cập nhật địa chỉ";

            return {
                id: item.Id || item.id || Date.now() + Math.random(),
                name: displayName,
                type: p.layer || "Địa điểm",
                address,
                price: "---",
                status: "Mở cửa",
                isOpen: true,
                lat, lng,
                temp: "30°C", weatherIcon: "fa-sun",
                img: this._getPlaceImage(displayName, p.layer),
                desc: p.label || "Chưa có mô tả chi tiết."
            };
        }

        // Case 4: Fallback formats
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
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
            needsDetails: (lat == null || lng == null),
            temp: '30°C',
            weatherIcon: 'fa-sun',
            img: item.img || this._getPlaceImage(displayName, item.type),
            desc: item.description || item.display_name || 'Chưa có mô tả chi tiết.'
        };
    }

    _decodeVietmapPolyline(encoded) {
        if (!encoded || typeof encoded !== "string") return [];
        let index = 0, lat = 0, lng = 0, coords = [];
        const len = encoded.length;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

            shift = 0; result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

            coords.push([lat / 1e5, lng / 1e5]);
        }
        return coords;
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
            const results = keyword ? MOCK_DB.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase())) : MOCK_DB;
            return this._mockDelay(results);
        }
        try {
            const path = `/vietmap/autocomplete?text=${encodeURIComponent(keyword)}`;
            const data = await this._apiGet(path);
            const features = (data && data.data && Array.isArray(data.data.features)) ? data.data.features : (Array.isArray(data) ? data : []);
            
            if (!Array.isArray(features) || features.length === 0) return [];

            const filteredFeatures = features.filter(item => {
                if (item.properties && item.properties.layer === 'street') return false;
                if (item.type === 'street') return false;
                return true;
            });
            return filteredFeatures.map(item => this._mapApiToApp(item));
        } catch (error) {
            console.error("Lỗi getSuggestions:", error);
            return [];
        }
    }

    // --- API 2: CHI TIẾT ---
    async getLocationDetails(name) {
        if (this.useMock) {
            const found = MOCK_DB.find(d => d.name === name);
            return this._mockDelay(found || this._mapApiToApp({ name: name, lat: 10.77, lon: 106.69 }));
        }
        try {
            const path = `/vietmap/geocode?address=${encodeURIComponent(name)}`;
            const data = await this._apiGet(path);
            if (Array.isArray(data) && data.length > 0) return this._mapApiToApp(data[0]);
        } catch (e) { console.error("Lỗi getLocationDetails:", e); }
        
        return this._mapApiToApp({ name: name, display_name: 'Không tìm thấy thông tin', lat: 10.7769, lon: 106.7009 });
    }

    // --- API 3: TÍNH LỘ TRÌNH (ĐÃ FIX LỖI 502 & LAG) ---
    async calculateRoute(routeList) {
        if (!routeList || routeList.length < 2) return null;

        if (this.useMock) {
            const path = [];
            routeList.forEach((point, index) => {
                path.push([point.lat, point.lng]);
                if (index < routeList.length - 1) {
                    const next = routeList[index + 1];
                    for (let i = 1; i <= 5; i++) path.push([point.lat + (next.lat - point.lat) * (i / 6), point.lng + (next.lng - point.lng) * (i / 6)]);
                }
            });
            return this._mockDelay({ success: true, distance: `${(routeList.length * 2.5).toFixed(1)} km`, duration: `${routeList.length * 15} phút`, path: path });
        }

        try {
            let fullPath = [];
            let totalDistance = 0;
            let totalDuration = 0;

            // 🔥 FIX: Lặp qua từng đoạn và thêm Delay 200ms
            for (let i = 0; i < routeList.length - 1; i++) {
                const start = routeList[i];
                const end = routeList[i + 1];

                // 🔥 FIX: Kiểm tra tọa độ trùng nhau
                if (Math.abs(start.lat - end.lat) < 0.0001 && Math.abs(start.lng - end.lng) < 0.0001) {
                    console.warn(`Đoạn ${i+1}: Điểm đi và đến trùng nhau, bỏ qua.`);
                    continue; 
                }

                const payload = {
                    start_lat: start.lat, start_lng: start.lng,
                    end_lat: end.lat, end_lng: end.lng,
                    vehicle: "car"
                };

                // Gọi API từng đoạn
                const segmentResult = await this._apiPost("/vietmap/route", payload);
                
                // Nếu 1 đoạn lỗi, bỏ qua và đi tiếp (tránh chết cả app)
                if (!segmentResult) {
                    console.warn(`Đoạn ${i+1} lỗi hoặc không có đường đi.`);
                    continue; 
                }

                const firstRoute = Array.isArray(segmentResult) ? segmentResult[0] : segmentResult;
                const p0 = firstRoute?.paths?.[0];

                if (p0 && p0.points) {
                    const decoded = this._decodeVietmapPolyline(p0.points);
                    if (decoded.length > 0) {
                        // Nối đường đi: Bỏ điểm đầu của đoạn sau để tránh trùng lặp
                        if (fullPath.length > 0) {
                            fullPath = fullPath.concat(decoded.slice(1));
                        } else {
                            fullPath = fullPath.concat(decoded);
                        }
                        totalDistance += (p0.distance || 0);
                        totalDuration += (p0.time || 0);
                    }
                }

                // 🔥 QUAN TRỌNG: Nghỉ 200ms giữa các request để Server thở (Fix lỗi 502)
                await this._sleep(200);
            }

            if (fullPath.length === 0) return null;

            return {
                success: true,
                distance: totalDistance > 0 ? `${(totalDistance / 1000).toFixed(1)} km` : "N/A",
                duration: totalDuration > 0 ? `${Math.round(totalDuration / 60000)} phút` : "N/A",
                path: fullPath
            };

        } catch (error) {
            console.error("Lỗi calculateRoute:", error);
            return null;
        }
    }

    // --- API 4: CHATBOT ---
    async chat(message, userId = null) {
        console.log(`[AI Chat] Request: "${message}"`);
        if (this.useMock) {
            return this._mockDelay({ mode: "chat", reply: `[Mock] Chat-router`, selected_locations: [] });
        }
        try {
            const payload = { message, user_id: userId };
            const data = await this._apiPost("/ai/chat-router", payload);
            return {
                reply: data?.reply ?? "Xin lỗi, server không phản hồi.",
                selected_locations: data?.selected_locations ?? [],
                mode: data?.mode ?? "chat"
            };
        } catch (error) {
            console.error("Lỗi hệ thống Chat:", error);
            return { reply: "Lỗi kết nối server.", selected_locations: [], mode: "chat" };
        }
    }
}

export const apiService = new ApiService();