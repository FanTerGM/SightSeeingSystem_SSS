document.addEventListener('DOMContentLoaded', () => {
    // Chỉ chạy logic nếu đang ở trang có bản đồ
    if (!document.getElementById('big-map')) return;

    // --- 1. KHỞI TẠO BẢN ĐỒ ---
    var map = L.map('big-map').setView([10.762622, 106.660172], 13);
    
    // Sửa lỗi URL tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19 
    }).addTo(map);
    
    var routeLayer = L.layerGroup().addTo(map);

    // Kích hoạt các chức năng UI
    if(window.UI) {
        window.UI.initAIChat();
        window.UI.initTogglePanel(map);
    }

    // --- 2. TẠO CÁC Ô ĐIỂM GHÉ (DYNAMIC INPUTS) ---
    const waypointCountInput = document.getElementById('waypointCount');
    if(waypointCountInput) {
        waypointCountInput.addEventListener('input', function () {
            let count = parseInt(this.value) || 0; // Đảm bảo là số
            let box = document.getElementById('waypointContainer');
            box.innerHTML = ""; // Xóa nội dung cũ
            
            // Sửa vòng lặp từ i = count thành i <= count
            for (let i = 1; i <= count; i++) {
                // Sửa lỗi thiếu dấu ngoặc kép trong HTML string
                box.innerHTML += `
                    <div class="waypoint-box">
                        <label><b>Điểm ghé ${i}:</b></label>
                        <div class="input-group">
                            <i class="fas fa-location-dot"></i>
                            <input type="text" class="waypoint-input" placeholder="Nhập tên điểm ghé ${i}">
                        </div>
                        <div class="input-group" style="margin-top: 4px;">
                            <i class="fas fa-hourglass-half"></i>
                            <input type="text" class="waypoint-duration-input" placeholder="Thời gian ghé (VD: 30p)">
                        </div>
                    </div>`;
            }
        });
    }

    // --- 3. XỬ LÝ SUBMIT TÌM ĐƯỜNG ---
    const routeForm = document.getElementById('route-form');
    if(routeForm) {
        routeForm.addEventListener('submit', function (event) {
            event.preventDefault();
            
            // 3.1. Lấy điểm đi và đến (Sửa lỗi thiếu dấu || và ngoặc kép)
            var startPoint = document.getElementById('start-point').value || "Điểm đi";
            var endPoint = document.getElementById('end-point').value || "Điểm đến";
            
            // 3.2. Lấy danh sách các điểm ghé
            var waypointInputs = document.querySelectorAll('.waypoint-input');
            var durationInputs = document.querySelectorAll('.waypoint-duration-input');
            var waypoints = [];

            // Duyệt qua từng ô input
            waypointInputs.forEach((input, index) => {
                let val = input.value.trim();
                // Sửa logic lấy tên
                let name = val !== "" ? val : `Điểm ghé ${index + 1}`;
                let duration = durationInputs[index] ? durationInputs[index].value : "";
                
                // Sửa lỗi object property (thêm dấu :)
                waypoints.push({
                    name: name,
                    duration: duration
                });
            });

            // Gọi hàm vẽ lộ trình
            renderRouteList(startPoint, endPoint, waypoints, routeLayer, map);

            // Chuyển màn hình
            document.getElementById('route-builder').style.display = 'none';
            document.getElementById('route-summary').style.display = 'block';
        });
    }

    // --- 4. HÀM VẼ VÀ HIỂN THỊ DANH SÁCH ---
    function renderRouteList(start, end, waypoints, layer, mapInst) {
        var container = document.getElementById('route-steps-container');
        container.innerHTML = "";
        layer.clearLayers();

        // 4.1. Gộp tất cả thành 1 mảng lộ trình đầy đủ
        let fullRoute = [];
        fullRoute.push({ name: start, type: 'start' });
        
        waypoints.forEach(wp => {
            fullRoute.push({ name: wp.name, type: 'waypoint', duration: wp.duration });
        });
        
        fullRoute.push({ name: end, type: 'end' });

        // 4.2. Tạo tọa độ giả lập
        let routeLatLngs = [];
        let baseLat = 10.7769; 
        let baseLng = 106.6954; 

        fullRoute.forEach((item, index) => {
            let div = document.createElement('div');
            div.className = "route-step-item";
            div.dataset.locationName = item.name;
            // Sửa lỗi arrow function
            div.onclick = (e) => handleStepClick(div, e, mapInst);
            
            // Sửa lỗi ternary operator và string interpolation
            let durationHtml = item.duration ? `<span style="font-size:0.8em; padding-left:42px; opacity:0.8;">Dừng: ${item.duration}</span>` : '';

            div.innerHTML = `
                <div class="input-group" style="margin-top: 10px;">
                    <i style="font-style: normal; font-weight: 600; width: 20px;">${index + 1}.</i>
                    <span class="fake-input">${item.name}</span>
                    ${durationHtml}
                </div>`;
            container.appendChild(div);

            // Tạo tọa độ giả lập
            let offset = index * 0.005; 
            let coord = [baseLat + (Math.random() * 0.002) + offset, baseLng + (Math.random() * 0.002) + offset];
            
            routeLatLngs.push(coord);

            // Vẽ Marker (Sửa logic Popup Title)
            let popupTitle = "";
            if (item.type === 'start') popupTitle = "Điểm đi";
            else if (item.type === 'end') popupTitle = "Điểm đến";
            else popupTitle = "Điểm ghé";
            
            L.marker(coord).addTo(layer).bindPopup(`
                <div class="smart-popup">
                    <h3>${popupTitle}: ${item.name}</h3>
                    ${item.duration ? `<p>Dừng: ${item.duration}</p>` : ''}
                </div>
            `);
        });

        // 4.3. Vẽ đường nối
        if (routeLatLngs.length > 1) {
            L.polyline(routeLatLngs, { color: '#2D6A4F', weight: 5 }).addTo(layer);
            mapInst.fitBounds(routeLatLngs, { padding: [50, 50] });
        }
    }

    // --- 5. XỬ LÝ CLICK CHỌN ---
    window.handleStepClick = function(element, event, mapInst) {
        const errorMsg = document.getElementById('modify-error-message');
        if(errorMsg) errorMsg.style.display = 'none';

        if (!event.ctrlKey && !event.metaKey) {
            document.querySelectorAll('.route-step-item').forEach(step => step.classList.remove('selected'));
        }
        element.classList.toggle('selected');

        const selectedItems = document.querySelectorAll('.route-step-item.selected');
        if(window.UI) window.UI.updateDetailsPanel(selectedItems);
        
        setTimeout(() => mapInst.invalidateSize(), 300);
    };

    // --- 6. CÁC NÚT CHỨC NĂNG ---
    
    // Nút Quay lại
    const backBtn = document.getElementById('edit-route-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('route-builder').style.display = 'block';
            document.getElementById('route-summary').style.display = 'none';
            document.getElementById('details-panel').style.display = 'none';
            document.body.classList.remove('details-panel-visible');
            const errorMsg = document.getElementById('modify-error-message');
            if(errorMsg) errorMsg.style.display = 'none';
        });
    }

    // Nút Sửa lộ trình
    const modifyBtn = document.getElementById('modify-segment-btn');
    if (modifyBtn) {
        modifyBtn.addEventListener('click', function () {
            const selectedItems = document.querySelectorAll('.route-step-item.selected');
            const errorMsg = document.getElementById('modify-error-message');

            if (selectedItems.length === 2) {
                if(errorMsg) errorMsg.style.display = 'none';
                const loc1 = selectedItems[0].dataset.locationName;
                const loc2 = selectedItems[1].dataset.locationName;
                alert(`CHỨC NĂNG SỬA LỘ TRÌNH:\nBạn đang muốn đổi đường đi giữa:\n1. ${loc1}\n2. ${loc2}`);
            } else {
                if(errorMsg) {
                    errorMsg.innerText = "Vui lòng chọn đúng 2 điểm trên lộ trình để sửa đổi.";
                    errorMsg.style.display = 'block';
                }
            }
        });
    }
});