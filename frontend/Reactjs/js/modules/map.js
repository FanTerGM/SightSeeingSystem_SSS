import { CONFIG } from '../config.js';

export class MapModule {
    constructor(elementId) {
        // 1. Khởi tạo bản đồ
        this.map = L.map(elementId).setView(CONFIG.DEFAULT_COORDS, CONFIG.DEFAULT_ZOOM);

        // 2. Thêm lớp gạch (Tile Layer) từ OpenStreetMap
        L.tileLayer(CONFIG.TILE_LAYER_URL, {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        // 3. Tạo một nhóm Layer để quản lý Marker/Line dễ dàng (xóa 1 lần là sạch)
        this.layerGroup = L.layerGroup().addTo(this.map);
    }

    /**
     * Xóa toàn bộ marker và đường đi cũ trên bản đồ
     */
    clearRoute() {
        this.layerGroup.clearLayers();
    }

    /**
     * Tạo nội dung HTML cho Popup (giống với CSS đã có)
     */
    createPopupContent(data) {
        // Kiểm tra an toàn dữ liệu
        const img = data.img || CONFIG.DEFAULT_IMAGE;
        const temp = data.temp || '--°C';
        const weatherIcon = data.weatherIcon || 'fa-sun';
        const status = data.status || 'Đang cập nhật';

        return `
            <div class="popup-card">
                <div class="popup-header">
                    <div class="ph-left">
                        <div class="ph-title">${data.name} <span class="ph-type">${data.type || 'Địa điểm'}</span></div>
                        <div class="ph-addr"><i class="fas fa-map-marker-alt"></i> ${data.address}</div>
                    </div>
                    <div class="ph-right"><div class="ph-price">${data.price}</div></div>
                </div>
                <div class="popup-body">
                    <div class="pb-visual">
                        <img src="${img}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
                        <div class="weather-badge"><i class="fas ${weatherIcon}"></i> ${temp}</div>
                    </div>
                    <div class="pb-desc">${data.desc || 'Chưa có mô tả.'}</div>
                </div>
                <div class="popup-footer">
                    <button class="popup-btn" style="background:#fff; color:var(--primary-color); border:1px solid var(--primary-color);" 
                        onclick="window.dispatchEvent(new CustomEvent('chat-request', {detail: '${data.name}'}))">
                        <i class="fas fa-robot"></i> Hỏi AI
                    </button>
                    
                    <button class="popup-btn" style="border:1px solid #dadce0;" 
                        onclick="window.App.ui.showDetailsPanel(${JSON.stringify(data).replace(/"/g, '&quot;')})">
                        Chi tiết <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Vẽ danh sách các điểm (Markers) lên bản đồ
     * @param {Array} locations - Danh sách địa điểm
     */
    drawMarkers(locations) {
        this.clearRoute(); // Xóa cái cũ đi trước
        const latLngs = [];

        locations.forEach(loc => {
            // Chỉ vẽ nếu có tọa độ hợp lệ
            if (loc.lat && loc.lng) {
                const marker = L.marker([loc.lat, loc.lng]);
                
                // Gắn Popup
                marker.bindPopup(this.createPopupContent(loc), {
                    maxWidth: 280,
                    minWidth: 260,
                    className: 'custom-leaflet-popup'
                });

                marker.addTo(this.layerGroup);
                latLngs.push([loc.lat, loc.lng]);
            }
        });

        // Tự động Zoom bản đồ để nhìn thấy tất cả các điểm
        if (latLngs.length > 0) {
            this.map.fitBounds(latLngs, { padding: [80, 80], animate: true });
        }
    }

    /**
     * Vẽ đường nối giữa các điểm (Polyline)
     * @param {Array} pathCoords - Mảng chứa các tọa độ [[lat,lng], [lat,lng]...]
     */
    drawPolyline(pathCoords) {
        if (!pathCoords || pathCoords.length < 2) return;

        L.polyline(pathCoords, {
            color: '#2D6A4F', // Màu xanh chủ đạo (khớp style.css)
            weight: 5,
            opacity: 0.8,
            lineCap: 'round'
        }).addTo(this.layerGroup);
    }
}