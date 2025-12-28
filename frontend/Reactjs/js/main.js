import { apiService } from './services/api.js';
import { MapModule } from './modules/map.js';
import { UIModule } from './modules/ui.js';

class AppController {
    constructor() {
        this.map = new MapModule('big-map');
        this.ui = new UIModule();
        this.state = {
            route: [],
            allSuggestions: [],
            isRouting: false
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupInputAutocomplete();
        this.setupBudgetSlider(); 
        
        // Ẩn các bảng phụ khi mới vào
        const toggleBtn = document.getElementById('toggle-suggestion-btn');
        const panel = document.getElementById('suggestion-panel');
        const detailsPanel = document.getElementById('details-panel');
        
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (panel) panel.classList.remove('is-visible');
        if (detailsPanel) detailsPanel.style.display = 'none';
    
        this.setupMobileUX();
        this.setupMobileQuickSearch(); 

        await this.loadInitialData();
    }
    
    async loadInitialData() {
        try {
            this.state.allSuggestions = await apiService.getSuggestions('Dinh Độc Lập');
            if (typeof this.updateSuggestionUI === 'function') {
                this.updateSuggestionUI();
            }
            this.map.drawMarkers(this.state.allSuggestions);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
    }

    // --- HÀM HỖ TRỢ LỌC ĐỊA CHỈ TRÙNG ---
    _cleanAddress(name, address) {
        if (!address) return '';
        // Nếu địa chỉ bắt đầu bằng tên địa điểm, cắt bỏ phần tên đó đi
        if (address.toLowerCase().startsWith(name.toLowerCase())) {
            // Cắt bỏ và xóa các ký tự thừa như dấu phẩy, khoảng trắng ở đầu
            return address.substring(name.length).replace(/^[\s,.-]+/, '');
        }
        return address;
    }

    // --- 1. QUẢN LÝ LỘ TRÌNH (CORE LOGIC) ---

    addLocationToRoute(loc, refresh = true) {
        if (!loc || !loc.lat) return;
        this.state.route.push(loc);
        this.ui.addStepItem(loc, (item) => this.removeLocation(item));
        if (refresh) this.refreshMapState();
    }

    removeLocation(itemToRemove) {
        console.log("🗑️ Đang xóa điểm:", itemToRemove.name);
        this.state.route = this.state.route.filter(item => item.id !== itemToRemove.id);
        this.updateSuggestionUI();
        this.refreshMapState();
    }

    async refreshMapState() {
        this.map.drawMarkers(this.state.route);
        if (this.state.route.length >= 2) {
            const res = await apiService.calculateRoute(this.state.route);
            if (res && res.path) this.map.drawPolyline(res.path);
        } else {
            // Nếu map có hàm clearPolylineOnly thì gọi, không thì thôi (tránh lỗi)
            if (this.map.clearPolylineOnly) this.map.clearPolylineOnly();
        }
    }

    updateSuggestionUI() {
        if (!this.ui || !this.ui.renderSuggestionList) return;
        const currentRouteIds = this.state.route.map(item => item.id);
        this.ui.renderSuggestionList(this.state.allSuggestions, currentRouteIds);
        this._reattachDragEvents();
    }

    _reattachDragEvents() {
        const container = document.getElementById('suggestion-list');
        if (!container) return;
        const items = Array.from(container.children);

        items.forEach((item, index) => {
            const locationData = this.state.allSuggestions[index];
            if (!locationData) return;

            item.setAttribute('draggable', 'true');
            item.style.cursor = 'grab';
            item.ondragstart = (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(locationData));
                e.dataTransfer.effectAllowed = 'copy';
            };
        });
    }

    // --- 2. CÁC THIẾT LẬP UI KHÁC ---
    setupBudgetSlider() {
        const slider1 = document.getElementById("slider-1");
        const slider2 = document.getElementById("slider-2");
        const range1 = document.getElementById("range1");
        const range2 = document.getElementById("range2");
        const track = document.querySelector(".slider-track");
        
        if(!slider1 || !slider2) return;

        const minGap = 500000;
        const sliderMaxValue = parseInt(slider1.max);

        const formatMoney = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + "tr";
            if (num >= 1000) return (num / 1000).toFixed(0) + "k";
            return num + "đ";
        };

        const updateTrack = (e) => {
            let val1 = parseInt(slider1.value);
            let val2 = parseInt(slider2.value);

            if (val2 - val1 <= minGap) {
                if (e && e.target === slider1) slider1.value = val2 - minGap;
                else slider2.value = val1 + minGap;
            }
            
            val1 = parseInt(slider1.value);
            val2 = parseInt(slider2.value);
            
            range1.textContent = formatMoney(val1);
            range2.textContent = formatMoney(val2);

            const percent1 = (val1 / sliderMaxValue) * 100;
            const percent2 = (val2 / sliderMaxValue) * 100;
            if(track) {
                track.style.background = `linear-gradient(to right, #dadce0 ${percent1}%, #2D6A4F ${percent1}%, #2D6A4F ${percent2}%, #dadce0 ${percent2}%)`;
            }
        }

        slider1.addEventListener('input', updateTrack);
        slider2.addEventListener('input', updateTrack);
        updateTrack();
    }

    // --- 3. POPUP TÌM KIẾM MOBILE (ĐÃ LÀM ĐẸP) ---
    setupMobileQuickSearch() {
        const popup = document.getElementById('mobile-quick-search');
        const input = document.getElementById('mq-input');
        const list = document.getElementById('mq-results');
        const closeBtn = document.getElementById('mq-close-btn');
        const triggerBtn = document.getElementById('reopen-suggestion-btn'); 

        if (!popup || !input || !triggerBtn) return;

        triggerBtn.onclick = (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault(); 
                popup.classList.add('active'); 
                setTimeout(() => input.focus(), 100); 
            } else {
                const panel = document.getElementById('suggestion-panel');
                if (panel) panel.classList.add('is-visible');
            }
        };

        closeBtn.onclick = () => {
            popup.classList.remove('active');
            input.value = ''; 
            list.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-size:0.85rem;">Nhập từ khóa để tìm kiếm...</div>';
        };

        let timeout;
        input.addEventListener('input', () => {
            const keyword = input.value.trim();
            if(keyword) {
                list.innerHTML = '<div style="padding:15px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tìm...</div>';
            } else {
                list.innerHTML = '';
                return;
            }
            
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    const results = await apiService.getSuggestions(keyword);
                    list.innerHTML = ''; 
                    
                    if (!results || results.length === 0) {
                        list.innerHTML = '<div style="padding:15px; text-align:center;">Không tìm thấy.</div>';
                        return;
                    }

                    results.forEach(loc => {
                        const div = document.createElement('div');
                        // Dùng class suggestion-item để ăn theo CSS đẹp mới thêm
                        div.className = 'suggestion-item'; 
                        
                        const cleanAddr = this._cleanAddress(loc.name, loc.address);

                        div.innerHTML = `
                            <i class="fas fa-map-marker-alt"></i>
                            <div class="suggestion-content">
                                <strong>${loc.name}</strong>
                                <small>${cleanAddr || 'Không có địa chỉ cụ thể'}</small>
                            </div>
                        `;
                        
                        div.onclick = () => {
                            this.addLocationToRoute(loc); 
                            popup.classList.remove('active'); 
                            input.value = ''; 
                            list.innerHTML = '';
                        };
                        list.appendChild(div);
                    });

                } catch (err) {
                    list.innerHTML = '<div style="padding:15px; text-align:center;">Lỗi kết nối.</div>';
                }
            }, 300); 
        });
    }

    // --- 4. DROPDOWN AUTOCOMPLETE (ĐÃ LÀM ĐẸP) ---
    setupInputAutocomplete() {
        const routeConfigs = [
            { inputId: 'start-point', listId: 'start-suggestions-list' },
            { inputId: 'end-point', listId: 'end-suggestions-list' }
        ];

        routeConfigs.forEach(cfg => {
            const input = document.getElementById(cfg.inputId);
            const list = document.getElementById(cfg.listId);
            if (!input || !list) return;

            input.addEventListener('focus', () => this.renderAutocompleteResults(input, list, input.value.trim()));

            let timer;
            input.addEventListener('input', (e) => {
                delete input.dataset.lat;
                delete input.dataset.lng;
                clearTimeout(timer);
                timer = setTimeout(() => this.renderAutocompleteResults(input, list, e.target.value.trim()), 300);
            });
        });

        const sidebarSearch = document.getElementById('sidebar-search');
        if (sidebarSearch) {
            let sidebarTimer;
            sidebarSearch.addEventListener('input', (e) => {
                const keyword = e.target.value.trim();
                clearTimeout(sidebarTimer);

                sidebarTimer = setTimeout(async () => {
                    try {
                        const query = keyword || 'Dinh Độc Lập';
                        const results = await apiService.getSuggestions(query);
                        this.state.allSuggestions = results || [];

                        if (this.ui && this.ui.renderSuggestionList) {
                            this.updateSuggestionUI();
                        }
                        if (this.map) {
                            this.map.drawMarkers(this.state.allSuggestions);
                        }
                    } catch (err) {
                        console.error("Lỗi tìm kiếm Sidebar:", err);
                    }
                }, 400);
            });
        }
    }

    async renderAutocompleteResults(inputEl, listEl, keyword) {
        listEl.innerHTML = '';
        listEl.style.display = 'block';

        if (!keyword) {
            const item = document.createElement('div');
            item.className = 'suggestion-item current-loc';
            // Cập nhật HTML đẹp
            item.innerHTML = `
                <i class="fas fa-crosshairs"></i> 
                <div class="suggestion-content">
                    <strong>Vị trí hiện tại của tôi</strong>
                </div>`; 
            item.onclick = () => this.handleUseCurrentLocation(inputEl, listEl);
            listEl.appendChild(item);
            return;
        }

        try {
            const results = await apiService.getSuggestions(keyword);
            if (!results || results.length === 0) {
                listEl.innerHTML = `<div class="suggestion-item" style="cursor:default">Không tìm thấy địa điểm...</div>`;
                return;
            }

            results.forEach(loc => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                
                const cleanAddr = this._cleanAddress(loc.name, loc.address);

                item.innerHTML = `
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="suggestion-content">
                        <strong>${loc.name}</strong>
                        <small>${cleanAddr || 'Việt Nam'}</small>
                    </div>`;
                    
                item.onclick = () => {
                    inputEl.value = loc.name;
                    inputEl.dataset.lat = loc.lat;
                    inputEl.dataset.lng = loc.lng;
                    listEl.style.display = 'none';
                };
                listEl.appendChild(item);
            });
        } catch (err) {
            listEl.style.display = 'none';
        }
    }

    handleUseCurrentLocation(inputEl, listEl) {
        inputEl.value = "Đang xác định vị trí...";
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ GPS.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                inputEl.value = `Vị trí của tôi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                inputEl.dataset.lat = latitude;
                inputEl.dataset.lng = longitude;
                listEl.style.display = 'none';
            },
            (err) => {
                alert("Không thể lấy vị trí: " + err.message);
                inputEl.value = "";
            }
        );
    }

    // --- 5. LOGIC UX MOBILE THÔNG MINH ---
    setupMobileUX() {
        if (window.innerWidth > 768) return;

        const mapEl = document.getElementById('big-map');
        const panelEl = document.getElementById('control-panel');
        const handBtn = document.getElementById('hand-toggle-btn');
        const body = document.body;

        if (!mapEl || !panelEl) return;

        panelEl.classList.add('mobile-expanded');
        mapEl.classList.add('mobile-minimized');

        setTimeout(() => { if(this.map && this.map.map) this.map.map.invalidateSize(); }, 500);

        const swapView = () => {
            if (mapEl.classList.contains('mobile-minimized')) {
                mapEl.classList.remove('mobile-minimized');
                mapEl.classList.add('mobile-expanded');
                
                panelEl.classList.remove('mobile-expanded');
                panelEl.classList.add('mobile-minimized');
                
                setTimeout(() => this.map.map.invalidateSize(), 300);
            } 
            else {
                mapEl.classList.remove('mobile-expanded');
                mapEl.classList.add('mobile-minimized');
                
                panelEl.classList.remove('mobile-minimized');
                panelEl.classList.add('mobile-expanded');
            }
        };

        mapEl.onclick = (e) => {
            if (mapEl.classList.contains('mobile-minimized')) {
                e.stopPropagation(); 
                swapView();
            }
        };

        panelEl.onclick = (e) => {
            if (panelEl.classList.contains('mobile-minimized')) {
                swapView();
            }
        };

        if (handBtn) {
            handBtn.onclick = () => {
                body.classList.toggle('left-handed');
                if (navigator.vibrate) navigator.vibrate(50);
            };
        }
    }

    // --- 6. XỬ LÝ FORM ---
    async handleFormSubmit(e) {
        e.preventDefault();
        if (this.map) this.map.clearRoute();

        const startInput = document.getElementById('start-point');
        const endInput = document.getElementById('end-point');
        const countInput = document.getElementById('waypointCount');
        const vehicleInput = document.getElementById('vehicle-type');
        
        const s1 = document.getElementById('slider-1');
        const s2 = document.getElementById('slider-2');
        const budget = (s1 && s2) ? `${s1.value}-${s2.value}` : 'standard';
        
        const numStops = countInput ? parseInt(countInput.value) || 0 : 0;
        const vehicle = vehicleInput ? vehicleInput.value : 'car';

        const getPointData = async (input, label) => {
            if (input.dataset.lat && input.dataset.lng) {
                return {
                    id: label + '-' + Date.now() + Math.random(),
                    name: input.value,
                    lat: parseFloat(input.dataset.lat),
                    lng: parseFloat(input.dataset.lng)
                };
            }
            return await apiService.getLocationDetails(input.value);
        };

        const getCurrentPos = () => {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) return reject(new Error("Trình duyệt không hỗ trợ GPS."));
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    err => reject(new Error("Không lấy được vị trí: " + err.message))
                );
            });
        };

        try {
            let p1, p2;

            if (!startInput.value.trim()) {
                startInput.value = "Đang lấy vị trí...";
                const pos = await getCurrentPos();
                p1 = { id: 'start-curr-' + Date.now(), name: 'Vị trí của tôi', lat: pos.lat, lng: pos.lng };
                startInput.value = p1.name;
                startInput.dataset.lat = p1.lat;
                startInput.dataset.lng = p1.lng;
            } else {
                p1 = await getPointData(startInput, 'start');
            }

            if (!endInput.value.trim()) {
                endInput.value = "Đang chọn điểm đến ngẫu nhiên...";
                const suggestions = await apiService.getSuggestions('Du lịch');
                if (!suggestions || suggestions.length === 0) throw new Error("Không tìm thấy địa điểm gợi ý.");
                const candidates = suggestions.filter(s => s.name !== p1.name);
                if (candidates.length === 0) throw new Error("Không tìm thấy điểm đến phù hợp.");
                const randomDest = candidates[Math.floor(Math.random() * candidates.length)];
                p2 = { ...randomDest, id: 'end-random-' + Date.now() };
                endInput.value = p2.name;
                endInput.dataset.lat = p2.lat;
                endInput.dataset.lng = p2.lng;
            } else {
                p2 = await getPointData(endInput, 'end');
            }

            const payload = {
                start: p1,
                end: p2,
                preferences: { vehicle, budget, num_stops: numStops }
            };
            console.log("🚀 Payload gửi đi:", payload);

            this.state.route = [];
            const container = document.getElementById('route-steps-container');
            if (container) container.innerHTML = '';

            this.addLocationToRoute(p1, false);

            if (numStops > 0) {
                let suggestions = await apiService.getSuggestions('Du lịch'); 
                if (suggestions && suggestions.length > 0) {
                    suggestions = suggestions.filter(s => s.name !== p1.name && s.name !== p2.name);
                    const selectedStops = suggestions.slice(0, numStops);
                    selectedStops.forEach((stop, idx) => {
                        this.addLocationToRoute({
                            ...stop,
                            id: 'stop-' + idx + '-' + Date.now()
                        }, false);
                    });
                }
            }

            this.addLocationToRoute(p2, false);
            this.navigateToSummary();
            await this.refreshMapState();

        } catch (err) {
            console.error(err);
            if (startInput.value === "Đang lấy vị trí...") startInput.value = "";
            if (endInput.value === "Đang chọn điểm đến ngẫu nhiên...") endInput.value = "";
            alert("Lỗi: " + err.message);
        }
    }

    // --- 7. SỰ KIỆN & ĐIỀU HƯỚNG ---
    setupEventListeners() {
        const form = document.getElementById('route-form');
        if (form) form.onsubmit = (e) => this.handleFormSubmit(e);

        const editBtn = document.getElementById('edit-route-btn');
        if (editBtn) editBtn.onclick = () => this.navigateToBuilder();
        
        const backBtn = document.getElementById('floating-back-btn');
        if (backBtn) backBtn.onclick = () => this.navigateToBuilder();
        
        // Nút đóng bảng chi tiết (cho Mobile)
        const closeDetailsBtn = document.getElementById('close-details-btn');
        if (closeDetailsBtn) {
            closeDetailsBtn.onclick = () => {
                const detailsPanel = document.getElementById('details-panel');
                if (detailsPanel) detailsPanel.style.setProperty('display', 'none', 'important');
            };
        }
        
        this.setupDragAndDrop();
        this.setupPanelControls();
        this.setupChat();
    }

    navigateToBuilder() {
        document.getElementById('route-builder').style.display = 'block';
        document.getElementById('route-summary').style.display = 'none';
        const panel = document.getElementById('suggestion-panel');
        const toggleBtn = document.getElementById('toggle-suggestion-btn');
        if (panel) panel.classList.remove('is-visible');
        if (toggleBtn) toggleBtn.style.display = 'none';
    }

    navigateToSummary() {
        document.getElementById('route-builder').style.display = 'none';
        document.getElementById('route-summary').style.display = 'block';
        const panel = document.getElementById('suggestion-panel');
        const toggleBtn = document.getElementById('toggle-suggestion-btn');
        const btnIcon = toggleBtn ? toggleBtn.querySelector('i') : null;
        if (panel) panel.classList.add('is-visible'); 
        if (toggleBtn) {
            toggleBtn.style.display = 'flex'; 
            if (btnIcon) btnIcon.className = 'fas fa-chevron-left';
        }
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('route-steps-container');
        if (!dropZone) return;
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.backgroundColor = '#e8f0fe'; dropZone.style.border = '2px dashed #1a73e8'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.backgroundColor = ''; dropZone.style.border = ''; });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); dropZone.style.backgroundColor = ''; dropZone.style.border = '';
            const rawData = e.dataTransfer.getData('application/json');
            if (rawData) {
                try {
                    const locationData = JSON.parse(rawData);
                    this.addLocationToRoute({ ...locationData, id: 'drag-' + Date.now() + Math.random() });
                } catch (err) { console.error("Lỗi drop:", err); }
            }
        });
    }

    setupPanelControls() {
        const sugPanel = document.getElementById('suggestion-panel');
        const toggleBtn = document.getElementById('toggle-suggestion-btn');
        if (toggleBtn && sugPanel) {
            toggleBtn.onclick = () => {
                sugPanel.classList.toggle('is-visible');
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = sugPanel.classList.contains('is-visible') ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
                }
            };
        }
    }

    setupChat() {
        const floatBtn = document.getElementById('floating-chat-btn');
        const chatWidget = document.getElementById('chat-widget');
        if (!floatBtn || !chatWidget) return;
        Object.assign(floatBtn.style, { zIndex: "99999", position: "fixed", bottom: "30px", right: "20px", display: "flex" });
        Object.assign(chatWidget.style, { zIndex: "99999", position: "fixed", bottom: "90px", right: "20px", backgroundColor: "white" });
        floatBtn.onclick = (e) => {
            e.preventDefault();
            const isHidden = chatWidget.style.display === 'none' || chatWidget.style.display === '';
            if (isHidden) {
                chatWidget.style.display = 'flex';
                floatBtn.querySelector('.fa-comment-alt').style.display = 'none';
                floatBtn.querySelector('.fa-times').style.display = 'block';
                setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
            } else {
                chatWidget.style.display = 'none';
                floatBtn.querySelector('.fa-comment-alt').style.display = 'block';
                floatBtn.querySelector('.fa-times').style.display = 'none';
            }
        };
        const sendBtn = document.getElementById('send-msg-btn');
        const input = document.getElementById('chat-input');
        const sendMessage = async () => {
            const txt = input.value.trim();
            if (!txt) return;
            this.ui.addChatMessage(txt, 'user');
            input.value = '';
            if (this.ui.showTypingIndicator) this.ui.showTypingIndicator(true);
            try {
                const res = await apiService.chat(txt); 
                const aiResponse = res.reply || res.answer || "Không có phản hồi.";
                this.ui.addChatMessage(aiResponse, 'ai');
            } catch (e) { this.ui.addChatMessage("Lỗi kết nối.", 'ai'); } 
            finally { if (this.ui.showTypingIndicator) this.ui.showTypingIndicator(false); }
        };
        if (sendBtn) sendBtn.onclick = sendMessage;
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }
}

document.addEventListener('DOMContentLoaded', () => { window.App = new AppController(); });