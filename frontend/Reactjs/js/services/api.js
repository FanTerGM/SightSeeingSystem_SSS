import { CONFIG } from '../config.js';

// --- MOCK DATA ---
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

    // 🔥 Delay helper to prevent 502 errors
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
                console.error(`API Error ${response.status} at ${path}`);
                return null; // Return null instead of throwing
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
            return []; // Return empty array to avoid crashes
        }
    }

    // --- ADAPTER: UNIFIED DATA MAPPING ---
    _mapApiToApp(item) {
        if (!item) return null;

        // 🔥 ESSENTIAL: Case 1 - VietMap autocomplete result with ref_id (NO coordinates yet)
        if (item && item.ref_id && (item.lat == null || item.lng == null)) {
            const displayName = item.name || item.display || "Địa điểm chưa đặt tên";
            const address = item.address || item.display || "Đang cập nhật địa chỉ";
            
            return {
                id: item.ref_id,
                ref_id: item.ref_id, // Store for later fetching
                name: displayName,
                type: item.categories?.[0] || "Địa điểm",
                address,
                price: "---",
                status: "Mở cửa",
                isOpen: true,
                lat: null, // Mark as needing coordinates
                lng: null,
                needsDetails: true, // 🔥 ESSENTIAL FLAG
                temp: "30°C",
                weatherIcon: "fa-sun",
                img: this._getPlaceImage(displayName, item.categories?.[0]),
                desc: item.display || "Chưa có mô tả chi tiết."
            };
        }
        
        // 🔥 ESSENTIAL: Case 2 - VietMap place details response (HAS coordinates)
        if (item && item.lat != null && item.lng != null && !item.type) {
            const displayName = item.name || item.display || "Địa điểm chưa đặt tên";
            const address = item.address || item.display || "Đang cập nhật địa chỉ";
            
            return {
                id: item.ref_id || item.place_id || Date.now() + Math.random(),
                ref_id: item.ref_id || item.place_id,
                name: displayName,
                type: item.categories?.[0] || "Địa điểm",
                address,
                price: "---",
                status: "Mở cửa",
                isOpen: true,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lng),
                needsDetails: false,
                temp: "30°C",
                weatherIcon: "fa-sun",
                img: this._getPlaceImage(displayName, item.categories?.[0]),
                desc: item.display || "Chưa có mô tả chi tiết."
            };
        }

        // Case 3: VietMap GeoJSON Feature
        if (item && item.type === "Feature" && item.geometry && Array.isArray(item.geometry.coordinates)) {
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
                needsDetails: false,
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

    // --- API 1: SEARCH ---
    async getSuggestions(keyword = '', lat = null, lng = null) {
        if (this.useMock) {
            const results = keyword ? MOCK_DB.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase())) : MOCK_DB;
            return this._mockDelay(results);
        }
        try {
            let path = `/vietmap/autocomplete?text=${encodeURIComponent(keyword)}`;
            
            // Add focus point for better location-based results
            if (lat && lng) {
                path += `&focus.point.lat=${lat}&focus.point.lon=${lng}`;
            }

            const data = await this._apiGet(path);
            const features = (data && data.data && Array.isArray(data.data.features)) ? data.data.features : (Array.isArray(data) ? data : []);
            
            if (!Array.isArray(features) || features.length === 0) return [];

            // Basic filtering to remove obvious junk
            const filteredFeatures = features.filter(item => {
                if (item.properties && item.properties.layer === 'venue') return true;
                return true; 
            });
            return filteredFeatures.map(item => this._mapApiToApp(item));
        } catch (error) {
            console.error("Lỗi getSuggestions:", error);
            return [];
        }
    }

    // --- API 2: LOCATION DETAILS ---
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
    // --- API 3: TÍNH LỘ TRÌNH (ĐÃ NÂNG CẤP CHỌN XE) ---
    // --- API 3: TÍNH LỘ TRÌNH (TRẢ VỀ TỪNG ĐOẠN) ---
    // --- FILE: js/services/api.js ---

    async calculateRoute(routeList, vehicleType = 'car') {
        if (!routeList || routeList.length < 2) return null;

        // 1. Map loại xe
        let apiVehicle = "car";
        if (vehicleType === "motorbike") apiVehicle = "motorcycle";
        if (vehicleType === "walking") apiVehicle = "foot";

        // 2. Logic Mock (Giữ nguyên, không lỗi)
        if (this.useMock) {
            const segments = [];
            let fullPath = [];

            for (let i = 0; i < routeList.length - 1; i++) {
                const start = routeList[i];
                const end = routeList[i + 1];
                const segmentPath = [
                    [start.lat, start.lng],
                    [start.lat + (end.lat - start.lat) / 2, start.lng + (end.lng - start.lng) / 2],
                    [end.lat, end.lng]
                ];

                let speed = vehicleType === 'walking' ? 5 : 40;
                const dist = 2.5;
                const time = (dist / speed) * 60;

                segments.push({
                    path: segmentPath,
                    distance: dist * 1000,
                    duration: time * 60000
                });
                fullPath = fullPath.concat(segmentPath);
            }

            return this._mockDelay({
                success: true,
                segments: segments,
                fullPath: fullPath
            });
        }

        // 🔥 PHẦN SỬA LỖI Ở ĐÂY 🔥
        // Khai báo biến TRƯỚC khối try để dùng được ở mọi nơi
        let segments = [];
        let fullPath = [];
        let totalDistance = 0; // ✅ Khai báo ở đây
        let totalDuration = 0; // ✅ Khai báo ở đây

        try {
            for (let i = 0; i < routeList.length - 1; i++) {
                const start = routeList[i];
                const end = routeList[i + 1];

                if (Math.abs(start.lat - end.lat) < 0.0001 && Math.abs(start.lng - end.lng) < 0.0001) continue;

                const payload = {
                    start_lat: start.lat, start_lng: start.lng,
                    end_lat: end.lat, end_lng: end.lng,
                    vehicle: apiVehicle
                };

                const segmentResult = await this._apiPost("/vietmap/route", payload);

                if (!segmentResult) continue;

                const firstRoute = Array.isArray(segmentResult) ? segmentResult[0] : segmentResult;
                const p0 = firstRoute?.paths?.[0];

                if (p0 && p0.points) {
                    const decoded = this._decodeVietmapPolyline(p0.points);
                    if (decoded.length > 0) {
                        // Lưu từng đoạn
                        const segDist = p0.distance || 0;
                        const segTime = p0.time || 0;

                        segments.push({
                            path: decoded,
                            distance: segDist,
                            duration: segTime
                        });

                        // Cộng dồn tổng
                        totalDistance += segDist;
                        totalDuration += segTime;

                        if (fullPath.length > 0) fullPath = fullPath.concat(decoded.slice(1));
                        else fullPath = fullPath.concat(decoded);
                    }
                }
                await this._sleep(200);
            }

            if (segments.length === 0) return null;

            // Trả về kết quả
            return {
                success: true,
                segments: segments,
                fullPath: fullPath,
                distance: totalDistance, // ✅ Biến này giờ đã được định nghĩa
                duration: totalDuration  // ✅ Biến này giờ đã được định nghĩa
            };

        } catch (error) {
            console.error("Lỗi calculateRoute:", error);
            return null;
        }
    }

    // --- API 5: CHATBOT ---
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