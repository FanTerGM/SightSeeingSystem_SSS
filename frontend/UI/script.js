// script.js

// --- KHỞI TẠO BẢN ĐỒ ---
var map = L.map('big-map').setView([10.7769, 106.7009], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
var routeLayer = L.layerGroup().addTo(map);

// --- DỮ LIỆU GIẢ LẬP ---
const suggestionsData = [
    { name: 'Dinh Độc Lập', type: 'Di tích', address: '135 Nam Kỳ Khởi Nghĩa, Q1', price: '65.000đ', status: 'Mở cửa', isOpen: true, temp: '32°C', weatherIcon: 'fa-sun', img: 'https://via.placeholder.com/150/2D6A4F/FFFFFF?text=Dinh', desc: 'Di tích lịch sử văn hóa nổi tiếng.' },
    { name: 'Chợ Bến Thành', type: 'Mua sắm', address: 'Đ. Lê Lợi, Q1', price: 'Miễn phí', status: 'Mở cửa', isOpen: true, temp: '33°C', weatherIcon: 'fa-cloud-sun', img: 'https://via.placeholder.com/150/E76F51/FFFFFF?text=Cho', desc: 'Khu chợ biểu tượng của Sài Gòn.' },
    { name: 'Bưu điện TP', type: 'Kiến trúc', address: '02 Công xã Paris, Q1', price: 'Miễn phí', status: 'Đóng cửa', isOpen: false, temp: '31°C', weatherIcon: 'fa-cloud', img: 'https://via.placeholder.com/150/F4A261/FFFFFF?text=BuuDien', desc: 'Kiến trúc Pháp cổ kính tuyệt đẹp.' },
    { name: 'Landmark 81', type: 'Giải trí', address: '720A Điện Biên Phủ, BT', price: '810.000đ', status: 'Mở cửa', isOpen: true, temp: '28°C', weatherIcon: 'fa-wind', img: 'https://via.placeholder.com/150/264653/FFFFFF?text=L81', desc: 'Tòa nhà cao nhất Việt Nam, view đẹp.' }
];

function getDataByName(name) {
    return suggestionsData.find(d => d.name === name) || { name: name, type: 'Địa điểm', address: '...', price: '???', status: 'Mở cửa', isOpen: true, temp: '30°C', weatherIcon: 'fa-sun', img: `https://via.placeholder.com/150?text=${encodeURI(name)}`, desc: 'Thông tin đang cập nhật.' };
}

// --- RENDER GỢI Ý ---
function renderSuggestions() {
    const list = document.getElementById('suggestion-list'); list.innerHTML = "";
    suggestionsData.forEach(item => {
        const el = document.createElement('div');
        el.className = 'l-card';
        el.draggable = true;
        el.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div style="flex:1;">
                <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">${item.name}</h4>
                <p style="margin:2px 0 0 0; font-size:0.75rem; color:var(--text-sec);">${item.address}</p>
            </div>
            <i class="fas fa-grip-vertical" style="color:#ddd;"></i>
        `;
        
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.name);
            e.dataTransfer.effectAllowed = "copy";
            el.style.opacity = "0.5";
            document.getElementById('route-steps-container').classList.add('drag-over');
        });

        el.addEventListener('dragend', () => {
            el.style.opacity = "1";
            document.getElementById('route-steps-container').classList.remove('drag-over');
        });

        el.onclick = () => showDetails(item);
        list.appendChild(el);
    });
}

// --- DRAG & DROP ---
const dropZone = document.getElementById('route-steps-container');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const name = e.dataTransfer.getData('text/plain');
    if (name) { addStep(name); updateMapPreview(); }
});

// --- LOGIC QUẢN LÝ STEPS ---
function addStep(name) {
    const div = document.createElement('div');
    div.className = 'route-step-item';
    div.dataset.name = name;
    div.innerHTML = `
        <div class="step-index"></div>
        <div style="flex:1; font-weight:600; font-size:0.9rem;">${name}</div>
        <i class="fas fa-trash-alt" style="color:#dadce0; cursor:pointer; transition:0.2s;" 
           onmouseover="this.style.color='var(--danger-color)'" 
           onmouseout="this.style.color='#dadce0'"
           onclick="event.stopPropagation(); this.parentElement.remove(); refreshIdx(); updateMapPreview()"></i>
    `;
    div.onclick = () => showDetailsFromPopup(name);
    dropZone.appendChild(div);
    refreshIdx();
}

function refreshIdx() {
    document.querySelectorAll('.step-index').forEach((e, i) => e.innerText = i + 1);
}

// --- PANEL CHI TIẾT ---
function showDetails(data) {
    const p = document.getElementById('details-panel');
    const c = document.getElementById('details-content');
    p.style.display = 'flex';
    c.innerHTML = `
        <img src="${data.img}">
        <h3 style="margin:0; color:var(--primary-color);">${data.name}</h3>
        <div style="display:flex; gap:10px; margin:10px 0;">
            <span style="background:#e6f4ea; color:#137333; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${data.price}</span>
            <span style="background:#fce8e6; color:#c5221f; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${data.status}</span>
        </div>
        <p style="color:#5f6368; line-height:1.6;">${data.desc}</p>
        <p style="font-size:0.9rem;"><strong>Địa chỉ:</strong> ${data.address}</p>
        <button class="primary-btn" onclick="addStep('${data.name}'); updateMapPreview();">Thêm vào lộ trình</button>
    `;
    setTimeout(() => map.invalidateSize(), 300);
}
window.showDetailsFromPopup = function (name) { showDetails(getDataByName(name)); };

// --- XỬ LÝ MAP POPUP ---
function createPopupContent(data) {
    const statusClass = data.isOpen ? 'open' : 'closed';
    return `
        <div class="popup-card">
            <div class="popup-header">
                <div class="ph-left">
                    <div class="ph-title">${data.name} <span class="ph-type">${data.type}</span></div>
                    <div class="ph-addr"><i class="fas fa-map-marker-alt"></i> ${data.address}</div>
                </div>
                <div class="ph-right"><div class="ph-price">${data.price}</div></div>
            </div>
            <div class="popup-body">
                <div class="pb-visual">
                    <img src="${data.img}">
                    <div class="weather-badge"><i class="fas ${data.weatherIcon}"></i> ${data.temp}</div>
                </div>
                <div class="pb-desc">${data.desc}</div>
            </div>
            <div class="popup-footer">
                <button class="popup-btn" style="background:#fff; color:var(--primary-color); border:1px solid var(--primary-color);" onclick="openChatWithContext('${data.name}')"><i class="fas fa-robot"></i> Ask AI</button>
                <button class="popup-btn" style="border:1px solid #dadce0;" onclick="showDetailsFromPopup('${data.name}')">Chi tiết <i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `;
}

function updateMapPreview() {
    const btn = document.getElementById('update-map-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
    btn.disabled = true;

    setTimeout(() => {
        try {
            map.invalidateSize();
            routeLayer.clearLayers();
            const latLngs = [];
            const items = document.querySelectorAll('.route-step-item');
            if (items.length === 0) return;

            items.forEach((item) => {
                let name = item.dataset.name;
                let data = getDataByName(name);
                // Giả lập tọa độ xung quanh Q1 để demo
                let lat = 10.7769 + (Math.random() - 0.5) * 0.04;
                let lng = 106.6954 + (Math.random() - 0.5) * 0.04;
                latLngs.push([lat, lng]);
                L.marker([lat, lng]).addTo(routeLayer)
                    .bindPopup(createPopupContent(data), { maxWidth: 280, minWidth: 260, closeButton: false, className: 'custom-leaflet-popup' });
            });

            if (latLngs.length > 0) {
                L.polyline(latLngs, { color: '#2D6A4F', weight: 5, opacity: 0.8 }).addTo(routeLayer);
                map.fitBounds(latLngs, { padding: [80, 80], animate: true });
            }
        } catch (e) { console.error(e); } 
        finally {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }, 600);
}

// --- DOM EVENTS ---
document.getElementById('route-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('route-builder').style.display = 'none';
    document.getElementById('route-summary').style.display = 'block';
    document.getElementById('suggestion-panel').classList.add('is-visible');
    dropZone.innerHTML = "";
    addStep(document.getElementById('start-point').value);
    addStep(document.getElementById('end-point').value);
});

document.getElementById('edit-route-btn').onclick = () => {
    document.getElementById('route-builder').style.display = 'block';
    document.getElementById('route-summary').style.display = 'none';
    routeLayer.clearLayers();
    document.getElementById('suggestion-panel').classList.remove('is-visible');
    document.getElementById('details-panel').style.display = 'none';
};

document.getElementById('update-map-btn').onclick = updateMapPreview;
document.getElementById('toggle-suggestion-btn').onclick = () => document.getElementById('suggestion-panel').classList.remove('is-visible');
document.getElementById('reopen-suggestion-btn').onclick = () => document.getElementById('suggestion-panel').classList.add('is-visible');
document.getElementById('close-details-btn').onclick = () => document.getElementById('details-panel').style.display = 'none';

// --- CHATBOT ---
const chatWidget = document.getElementById('chat-widget');
const floatBtn = document.getElementById('floating-chat-btn');
floatBtn.onclick = () => {
    document.body.classList.toggle('chat-open');
    const iconComment = floatBtn.querySelector('.fa-comment-alt');
    const iconTimes = floatBtn.querySelector('.fa-times');
    if (document.body.classList.contains('chat-open')) {
        iconComment.style.display = 'none';
        iconTimes.style.display = 'block';
        floatBtn.style.background = '#333';
    } else {
        iconComment.style.display = 'block';
        iconTimes.style.display = 'none';
        floatBtn.style.background = 'var(--accent-color)';
    }
};

window.openChatWithContext = function (name) {
    if (!document.body.classList.contains('chat-open')) floatBtn.click();
    const msgs = document.getElementById('chat-messages');
    msgs.innerHTML += `<div class="message msg-ai" style="background:#fff; padding:12px; margin-top:10px; border-radius: 12px 12px 12px 0; box-shadow: var(--shadow-sm); width: 85%;">Bạn muốn biết thêm gì về <strong>${name}</strong>?</div>`;
    msgs.scrollTop = msgs.scrollHeight;
};

// Khởi chạy render ban đầu
renderSuggestions();