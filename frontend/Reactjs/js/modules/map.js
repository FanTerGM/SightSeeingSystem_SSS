import { CONFIG } from '../config.js';

export class MapModule {
    constructor(elementId) {
        this.map = L.map(elementId).setView(CONFIG.DEFAULT_COORDS, CONFIG.DEFAULT_ZOOM);

        L.tileLayer(CONFIG.TILE_LAYER_URL, {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        this.layerGroup = L.layerGroup().addTo(this.map);
        this.currentMarkers = [];
        this.routePolylines = [];
        this.segmentLabels = [];
    }

    // --- 1. CẤU HÌNH ICON THEO LOẠI ---
    _getIconConfig(type) {
        switch (type) {
            case 'hotel':
                return { color: '#9c27b0', icon: 'fa-bed' }; // Tím - Giường
            case 'transport':
                return { color: '#007bff', icon: 'fa-plane' }; // Xanh dương - Máy bay
            case 'food':
                return { color: '#e91e63', icon: 'fa-utensils' }; // Hồng - Dao nĩa
            case 'cafe':
                return { color: '#795548', icon: 'fa-mug-hot' }; // Nâu - Cafe
            case 'sight':
                return { color: '#4caf50', icon: 'fa-camera' }; // Xanh lá - Máy ảnh
            case 'nightlife':
                return { color: '#673ab7', icon: 'fa-glass-martini-alt' }; // Tím đậm - Ly rượu
            case 'shopping':
                return { color: '#ff9800', icon: 'fa-shopping-bag' }; // Cam - Túi đồ
            default:
                return { color: '#666666', icon: 'fa-map-marker-alt' }; // Xám - Mặc định
        }
    }

    // --- 2. VẼ ĐIỂM (MARKERS) ---
    drawMarkers(locations) {
        console.log('📍 [MAP] Drawing markers...');

        // Xóa marker cũ nhưng GIỮ LẠI đường đi (để không bị mất lộ trình khi vẽ lại điểm)
        this.currentMarkers.forEach(m => this.layerGroup.removeLayer(m.marker));
        this.currentMarkers = [];

        const uniqueLocations = [];
        const seenIds = new Set();

        locations.forEach((loc) => {
            if (seenIds.has(loc.id) || !loc.lat || !loc.lng) return;
            seenIds.add(loc.id);
            uniqueLocations.push(loc);
        });

        const latLngs = [];

        uniqueLocations.forEach((loc) => {
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);

            // Lấy cấu hình màu và icon
            const config = this._getIconConfig(loc.type);

            // Tạo Icon Custom
            const customIcon = L.divIcon({
                className: '',
                html: `
                    <div class="custom-map-icon" style="
                        background-color: ${config.color}; 
                        width: 32px; height: 32px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                        display: flex; justify-content: center; align-items: center;
                    ">
                        <i class="fas ${config.icon}" style="color: #fff; font-size: 14px;"></i>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([lat, lng], {
                icon: customIcon,
                zIndexOffset: 1000
            });

            marker.bindPopup(this.createPopupContent(loc), {
                maxWidth: 280,
                minWidth: 260,
                className: 'custom-leaflet-popup'
            });

            // Sự kiện click vào marker
            marker.on('click', () => {
                if (window.app) window.app.addLocationToRoute(loc);
            });

            marker.addTo(this.layerGroup);
            this.currentMarkers.push({ marker, location: loc });
            latLngs.push([lat, lng]);
        });

        // Chỉ zoom nếu chưa có đường đi (để tránh giật hình khi đang xem lộ trình)
        if (latLngs.length > 0 && this.routePolylines.length === 0) {
            this.map.fitBounds(latLngs, { padding: [80, 80], animate: true, maxZoom: 15 });
        }
    }

    // --- 3. NỘI DUNG POPUP ---
    createPopupContent(data) {
        const img = data.img || CONFIG.DEFAULT_IMAGE;
        const temp = data.temp || '--°C';
        const weatherIcon = data.weatherIcon || 'fa-sun';
        const safeData = JSON.stringify(data).replace(/"/g, '&quot;');

        return `
            <div class="modern-popup">
                <div class="mp-image">
                    <img src="${img}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
                    <div class="mp-overlay"></div>
                    <div class="mp-badge-weather">
                        <i class="fas ${weatherIcon}" style="color: #E76F51;"></i> ${temp}
                    </div>
                    <div class="mp-badge-price">
                        ${data.price || 'Miễn phí'}
                    </div>
                </div>

                <div class="mp-content">
                    <h3 class="mp-title">${data.name}</h3>
                    <div class="mp-address">
                        <i class="fas fa-map-marker-alt" style="color: #EA4335; margin-top:3px;"></i>
                        <span>${data.address || 'Đang cập nhật địa chỉ...'}</span>
                    </div>

                    <div class="mp-actions">
                        <button class="mp-btn mp-btn-chat" 
                            onclick="window.dispatchEvent(new CustomEvent('chat-request', {detail: '${data.name}'}))">
                            <i class="fas fa-robot"></i> Hỏi AI
                        </button>
                        
                        <button class="mp-btn mp-btn-detail" 
                            onclick="window.App.ui.showDetailsPanel(${safeData})">
                            Chi tiết <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- 4. VẼ ĐƯỜNG ĐI ĐA SẮC ---
    drawRouteWithSegments(segments) {
        if (!segments || segments.length === 0) return;

        // Xóa đường cũ
        this.routePolylines.forEach(line => this.map.removeLayer(line));
        this.routePolylines = [];

        let allLatLngs = [];

        segments.forEach((seg, index) => {
            if (!seg.path || seg.path.length < 2) return;

            // Xoay vòng màu sắc
            const color = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8E24AA'][index % 5];

            const polyline = L.polyline(seg.path, {
                color: color,
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'route-line-segment'
            }).addTo(this.layerGroup);

            // Hiệu ứng Hover
            polyline.on('mouseover', (e) => {
                e.target.setStyle({ weight: 10, opacity: 1 });
                e.target.bringToFront();
            });

            polyline.on('mouseout', (e) => {
                e.target.setStyle({ weight: 6, opacity: 0.8 });
            });

            this.routePolylines.push(polyline);
            allLatLngs = allLatLngs.concat(seg.path);
        });

        // Vẽ mũi tên & Zoom
        this._addDirectionArrows(allLatLngs);
        if (allLatLngs.length > 0) {
            this.map.fitBounds(allLatLngs, { padding: [50, 50] });
        }
    }

    // --- 5. VẼ NHÃN XOAY THEO ĐƯỜNG ---
    drawSegmentLabels(segments, vehicleType) {
        // Xóa nhãn cũ
        if (this.segmentLabels) {
            this.segmentLabels.forEach(label => this.map.removeLayer(label));
        }
        this.segmentLabels = [];

        let iconClass = vehicleType === 'walking' ? 'fa-walking' : (vehicleType === 'motorbike' ? 'fa-motorcycle' : 'fa-car');

        segments.forEach(seg => {
            if (!seg.path || seg.path.length < 2) return;

            const midIdx = Math.floor(seg.path.length / 2);
            const p1 = seg.path[midIdx];
            const p2 = seg.path[midIdx + 1] || seg.path[midIdx - 1];

            // Tính góc xoay
            const point1 = this.map.latLngToContainerPoint(L.latLng(p1[0], p1[1]));
            const point2 = this.map.latLngToContainerPoint(L.latLng(p2[0], p2[1]));
            let angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;

            // Giữ chữ luôn xuôi chiều đọc
            if (angle > 90 || angle < -90) angle += 180;

            const km = (seg.distance / 1000).toFixed(1);
            const min = Math.round(seg.duration / 60000);

            const labelHtml = `
            <div class="route-label-container" style="transform: rotate(${angle}deg) translateY(-20px);">
                <div class="route-label-content">
                    <i class="fas ${iconClass}"></i> ${km}km • ${min}p
                </div>
            </div>`;

            const labelMarker = L.marker([p1[0], p1[1]], {
                icon: L.divIcon({ className: 'custom-rotated-label', html: labelHtml, iconSize: [0, 0] }),
                interactive: false
            }).addTo(this.layerGroup);

            this.segmentLabels.push(labelMarker);
        });
    }

    // --- 6. VẼ MŨI TÊN CHỈ HƯỚNG ---
    _addDirectionArrows(pathCoords) {
        const totalPoints = pathCoords.length;
        if (totalPoints < 2) return;

        const targetArrowCount = 25;
        const step = Math.max(5, Math.floor(totalPoints / targetArrowCount));
        const lookAhead = Math.max(3, Math.floor(step / 2));

        for (let i = step; i < totalPoints - lookAhead; i += step) {
            const start = pathCoords[i];
            const end = pathCoords[i + lookAhead];

            const dy = end[0] - start[0];
            const dx = end[1] - start[1];
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const cssRotation = -angle; // Đảo chiều cho đúng CSS

            const arrowIcon = L.divIcon({
                html: `<div style="
                    color: #FFFFFF; font-size: 13px;
                    transform: rotate(${cssRotation}deg);
                    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));
                    display: flex; justify-content: center; align-items: center;
                    width: 100%; height: 100%;
                ">➤</div>`,
                className: 'route-arrow',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            L.marker(start, {
                icon: arrowIcon,
                zIndexOffset: 500,
                interactive: false
            }).addTo(this.layerGroup);
        }
    }

    // --- 7. DỌN DẸP BẢN ĐỒ ---
    clearRoute() {
        this.layerGroup.clearLayers();
        this.currentMarkers = [];

        if (this.routePolylines) {
            this.routePolylines.forEach(l => this.map.removeLayer(l));
            this.routePolylines = [];
        }

        if (this.segmentLabels) {
            this.segmentLabels.forEach(l => this.map.removeLayer(l));
            this.segmentLabels = [];
        }
    }
}