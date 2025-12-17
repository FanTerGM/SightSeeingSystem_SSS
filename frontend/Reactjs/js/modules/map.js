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

        // 3. Tạo một nhóm Layer để quản lý Marker/Line dễ dàng
        this.layerGroup = L.layerGroup().addTo(this.map);
    }

    /**
     * Xóa toàn bộ marker và đường đi cũ trên bản đồ
     */
    clearRoute() {
        this.layerGroup.clearLayers();
    }

    /**
     * Tạo nội dung HTML cho Popup
     */
    createPopupContent(data) {
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
     * Vẽ danh sách các điểm (Markers) lên bản đồ với số thứ tự
     * @param {Array} locations - Danh sách địa điểm
     */
    drawMarkers(locations) {
        this.clearRoute();
        const latLngs = [];

        locations.forEach((loc, index) => {
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);

            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                // Tạo custom icon với số thứ tự
                const markerIcon = this._createNumberedIcon(index + 1, locations.length);
                
                const marker = L.marker([lat, lng], { icon: markerIcon });

                // Gắn Popup
                marker.bindPopup(this.createPopupContent(loc), {
                    maxWidth: 280,
                    minWidth: 260,
                    className: 'custom-leaflet-popup'
                });

                marker.addTo(this.layerGroup);
                latLngs.push([lat, lng]);
            }
        });

        // Tự động Zoom bản đồ để nhìn thấy tất cả các điểm
        if (latLngs.length > 0) {
            this.map.fitBounds(latLngs, { padding: [80, 80], animate: true });
        }
    }

    /**
     * Tạo icon có số thứ tự cho marker
     * @param {number} number - Số thứ tự
     * @param {number} total - Tổng số điểm
     */
    _createNumberedIcon(number, total) {
        // Màu sắc theo vị trí
        let color = '#E76F51'; // Màu accent (cam) cho điểm giữa
        
        if (number === 1) {
            color = '#2D6A4F'; // Màu xanh primary cho điểm đầu
        } else if (number === total) {
            color = '#C5221F'; // Màu đỏ danger cho điểm cuối
        }

        const iconHtml = `
            <div style="
                background-color: ${color};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">
                ${number}
            </div>
        `;

        return L.divIcon({
            html: iconHtml,
            className: 'custom-numbered-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    }

    /**
     * Vẽ đường nối giữa các điểm (Polyline) với hiệu ứng gradient
     * @param {Array} pathCoords - Mảng chứa các tọa độ [[lat,lng], [lat,lng]...]
     */
    drawPolyline(pathCoords) {
        if (!pathCoords || pathCoords.length < 2) {
            console.warn("Not enough coordinates to draw polyline");
            return;
        }

        console.log("Drawing polyline with", pathCoords.length, "coordinates");

        // Vẽ đường chính
        const polyline = L.polyline(pathCoords, {
            color: '#2D6A4F',
            weight: 5,
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.layerGroup);

        // Thêm viền đường để dễ nhìn hơn
        L.polyline(pathCoords, {
            color: '#FFFFFF',
            weight: 7,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.layerGroup);

        // Đưa polyline xuống dưới markers
        polyline.bringToBack();

        // Thêm mũi tên chỉ hướng (optional - mỗi 10 điểm)
        this._addDirectionArrows(pathCoords);
    }

    /**
     * Thêm mũi tên chỉ hướng trên đường đi
     * @param {Array} pathCoords - Tọa độ đường đi
     */
    _addDirectionArrows(pathCoords) {
        const arrowInterval = Math.max(1, Math.floor(pathCoords.length / 10));
        
        for (let i = arrowInterval; i < pathCoords.length - 1; i += arrowInterval) {
            const start = pathCoords[i];
            const end = pathCoords[i + 1];
            
            // Tính góc giữa 2 điểm
            const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI;
            
            const arrowIcon = L.divIcon({
                html: `<div style="
                    color: #2D6A4F;
                    font-size: 16px;
                    transform: rotate(${angle}deg);
                    text-shadow: 0 0 3px white;
                ">▶</div>`,
                className: 'route-arrow',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            L.marker(start, { icon: arrowIcon }).addTo(this.layerGroup);
        }
    }
}