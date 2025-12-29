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
    }

    clearRoute() {
        console.log('🗑️ [MAP] Xóa tất cả markers và polyline cũ');
        this.layerGroup.clearLayers();
        this.currentMarkers = [];
    }

    createPopupContent(data) {
        const img = data.img || CONFIG.DEFAULT_IMAGE;
        const temp = data.temp || '--°C';
        const weatherIcon = data.weatherIcon || 'fa-sun';
        
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

    drawMarkers(locations) {
        console.log('📍 [MAP] === BẮT ĐẦU VẼ MARKERS ===');
        const uniqueLocations = [];
        const seenIds = new Set();
        
        locations.forEach((loc) => {
            if (seenIds.has(loc.id) || !loc.lat || !loc.lng) return;
            seenIds.add(loc.id);
            uniqueLocations.push(loc);
        });
        
        this.clearRoute();
        const latLngs = [];

        uniqueLocations.forEach((loc, index) => {
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);
            const markerIcon = this._createNumberedIcon(index + 1, uniqueLocations.length);
            
            const marker = L.marker([lat, lng], { 
                icon: markerIcon,
                zIndexOffset: 1000 + (uniqueLocations.length - index) 
            });

            marker.bindPopup(this.createPopupContent(loc), {
                maxWidth: 280,
                minWidth: 260,
                className: 'custom-leaflet-popup'
            });

            marker.addTo(this.layerGroup);
            this.currentMarkers.push({ marker, location: loc, index: index + 1 });
            latLngs.push([lat, lng]);
        });

        if (latLngs.length > 0) {
            this.map.fitBounds(latLngs, { padding: [80, 80], animate: true, maxZoom: 15 });
        }
    }

    _createNumberedIcon(number, total) {
        let color = '#E76F51'; 
        if (number === 1) color = '#2D6A4F'; 
        else if (number === total) color = '#C5221F'; 

        const iconHtml = `
            <div style="
                background-color: ${color};
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 3px solid #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 16px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                position: relative;
                z-index: ${1000 + total - number};
            ">
                ${number}
            </div>
        `;

        return L.divIcon({
            html: iconHtml,
            className: 'custom-numbered-marker',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
        });
    }

    drawPolyline(pathCoords) {
        if (!pathCoords || pathCoords.length < 2) return;

        const borderLine = L.polyline(pathCoords, {
            color: '#FFFFFF',
            weight: 9, 
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.layerGroup);
        
        const mainLine = L.polyline(pathCoords, {
            color: '#4285F4',
            weight: 6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.layerGroup);

        borderLine.bringToBack();
        mainLine.bringToBack();

        this._addDirectionArrows(pathCoords);
    }

    /**
     * 🔥 LOGIC MŨI TÊN ĐÃ ĐƯỢC SỬA LỖI XOAY NGƯỢC 🔥
     */
    _addDirectionArrows(pathCoords) {
        const totalPoints = pathCoords.length;
        if (totalPoints < 2) return;

        // Chỉ vẽ khoảng 20-30 mũi tên để không bị rối mắt
        const targetArrowCount = 25; 
        
        // Tính bước nhảy: Ít nhất cách 5 điểm mới vẽ (cho đoạn ngắn), 
        // còn đoạn dài thì chia đều theo tỷ lệ
        const step = Math.max(5, Math.floor(totalPoints / targetArrowCount));

        // Nhìn xa hơn để lấy hướng chung, tránh bị xoay lung tung ở khúc cua
        const lookAhead = Math.max(3, Math.floor(step / 2));

        for (let i = step; i < totalPoints - lookAhead; i += step) {
            const start = pathCoords[i];
            const end = pathCoords[i + lookAhead];
            
            const dy = end[0] - start[0];
            const dx = end[1] - start[1];
            
            // Tính góc toán học (CCW từ hướng Đông)
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // 🔥 QUAN TRỌNG: Thêm dấu "-" trước angle để đảo ngược chiều xoay cho đúng với CSS
            // Icon ➤ mặc định hướng phải (0 độ). 
            // Nếu đi lên Bắc (90 độ toán học), ta cần xoay CSS -90 độ để nó ngóc đầu lên.
            const cssRotation = -angle;

            const arrowIcon = L.divIcon({
                html: `<div style="
                    color: #FFFFFF;
                    font-size: 13px;
                    transform: rotate(${cssRotation}deg); /* ✅ Đã sửa logic xoay */
                    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    height: 100%;
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
}