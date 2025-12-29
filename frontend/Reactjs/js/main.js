import { apiService } from './services/api.js';
import { MapModule } from './modules/map.js';
import { UIModule } from './modules/ui.js';
import { LOCAL_PLACES } from './database.js';

class AppController {
    constructor() {
        this.map = new MapModule('big-map');
        this.ui = new UIModule();
        this.state = {
            route: [],
            allSuggestions: [],
            isRouting: false,
            userLocation: null // GPS location tracking
        };
        this.init();
    }

    async init() {
        console.log("App đang khởi động...");
        console.log("API Base URL:", apiService.baseUrl);
        console.log("Mock Mode:", apiService.useMock);

        this.setupEventListeners();
        this.setupInputAutocomplete();
        this.setupBudgetSlider(); 
        this.setupRadiusSlider(); 
        
        // Hide panels initially
        const toggleBtn = document.getElementById('toggle-suggestion-btn');
        const panel = document.getElementById('suggestion-panel');
        const detailsPanel = document.getElementById('details-panel');
        
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (panel) panel.classList.remove('is-visible');
        if (detailsPanel) detailsPanel.style.display = 'none';
    
        this.setupMobileUX();
        this.setupMobileQuickSearch(); 

        // 🔥 Get GPS location immediately
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    console.log("📍 Got GPS location:", this.state.userLocation);
                },
                (err) => console.warn("Couldn't get GPS, search will be less accurate.")
            );
        }

        await this.loadInitialData();
    }

    // --- UNIFIED POINT DATA GETTER ---
    async getPointData(input, label) {
        if (!input || !input.value.trim()) return null;

        const inputValue = input.value.trim().toLowerCase();

        // 🔥 PRIORITY 1: Check LOCAL_PLACES database first
        const localMatch = LOCAL_PLACES.find(p =>
            p.name.toLowerCase() === inputValue ||
            inputValue.includes(p.name.toLowerCase())
        );

        if (localMatch) {
            console.log("✅ Matched input with local database:", localMatch.name);
            return {
                ...localMatch,
                id: label + '-' + Date.now() + Math.random()
            };
        }

        // PRIORITY 2: Use dataset coordinates if available
        if (input.dataset.lat && input.dataset.lng) {
            return {
                id: label + '-' + Date.now() + Math.random(),
                name: input.value,
                lat: parseFloat(input.dataset.lat),
                lng: parseFloat(input.dataset.lng),
                address: input.value,
                img: 'https://via.placeholder.com/500x300?text=Smart+Travel',
                desc: 'Địa điểm này chưa có mô tả chi tiết.',
                price: 'Miễn phí'
            };
        }

        // PRIORITY 3: Fetch from API as last resort
        const apiDetails = await apiService.getLocationDetails(input.value);
        return {
            ...apiDetails,
            img: apiDetails.img || 'https://via.placeholder.com/500x300?text=No+Image',
            desc: apiDetails.desc || 'Chưa có mô tả chi tiết.',
            price: apiDetails.price || 'Miễn phí'
        };
    }

        // 🔥 NEW: Lấy GPS ngay lập tức
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    console.log("📍 Đã có tọa độ gốc:", this.state.userLocation);
                },
                (err) => console.warn("Không lấy được GPS, tìm kiếm sẽ kém chính xác.")
            );
        }

        await this.loadInitialData();
    }
    async handleAutoChat(locationName) {
        if (!locationName) return;

        // A. Mở khung chat lên trước
        this.ui.openChatWindow();

        // B. Tạo câu hỏi mẫu
        const question = `Tôi đang muốn tìm hiểu về địa điểm "${locationName}" ở Thành phố Hồ Chí Minh. 
         Hãy đóng vai hướng dẫn viên du lịch, giới thiệu ngắn gọn về lịch sử, cái hay, cái đẹp và các hoạt động thú vị ở đây. 
         Lưu ý: Chỉ cung cấp thông tin, không cần hỏi về lộ trình hay điểm xuất phát.`;

        // C. Hiển thị tin nhắn của người dùng lên màn hình
        this.ui.addChatMessage(question, 'user');

        // D. Hiện hiệu ứng "AI đang soạn tin..."
        if (this.ui.showTypingIndicator) this.ui.showTypingIndicator(true);

        try {
            // E. Gọi API thật để lấy câu trả lời
            const res = await apiService.chat(question);

            // Lấy nội dung trả lời (tùy format API của bạn trả về field nào)
            const aiResponse = res.reply || res.answer || res.message || "Xin lỗi, mình chưa tìm thấy thông tin về nơi này.";

            // F. Hiển thị câu trả lời của AI
            this.ui.addChatMessage(aiResponse, 'ai');

        } catch (err) {
            console.error("Lỗi chat AI:", err);
            this.ui.addChatMessage("Xin lỗi, hệ thống đang bận, vui lòng thử lại sau.", 'ai');
        } finally {
            // Tắt hiệu ứng soạn tin
            if (this.ui.showTypingIndicator) this.ui.showTypingIndicator(false);
        }
    }
    // --- 1. HÀM HIỂN THỊ CHI TIẾT (Dán vào trong Class AppController) ---
    showDetails(loc) {
        const panel = document.getElementById('details-panel');
        const content = document.getElementById('details-content');
        const closeBtn = document.getElementById('close-details-btn');

        if (!panel || !content) return;

        panel.style.setProperty('display', 'flex', 'important');

        content.innerHTML = `
        <img src="${loc.img || 'https://via.placeholder.com/500x300'}" 
             style="width:100%; border-radius:12px; margin-bottom:15px; object-fit:cover; height:200px;">
        
        <h2 style="color:var(--primary-color); margin-bottom:5px;">${loc.name}</h2>
        
        <p style="background:#f5f5f5; padding:10px; border-radius:8px; font-size:0.85rem;">
            <i class="fas fa-map-marker-alt"></i> ${loc.address}
        </p>
        
        <p style="margin-top:15px; line-height:1.6; color:#333;">${loc.desc || 'Thông tin địa điểm đang được cập nhật.'}</p>
        
        <p style="font-weight:700; color:var(--accent-color); margin-top:10px;">Giá: ${loc.price || 'Miễn phí'}</p>
        
        <button onclick="window.App.openChatContext('${loc.name}')" 
                style="width:100%; margin-top:15px; padding:12px; border-radius:10px; border:1px solid var(--primary-color); background:white; color:var(--primary-color); font-weight:600; cursor:pointer;">
            <i class="fas fa-robot"></i> Hỏi AI
        </button>
    `;

        if (closeBtn) {
            closeBtn.onclick = () => {
                panel.style.setProperty('display', 'none', 'important');
            };
        }
    }
    // --- TÌM VÀ SỬA TRONG FILE: js/main.js ---

    async loadInitialData() {
        try {
            const lat = this.state.userLocation?.lat || 10.7769;
            const lng = this.state.userLocation?.lng || 106.6953;
            // Lấy bán kính từ thanh trượt (hoặc mặc định 20km)
            const radius = parseInt(document.getElementById('radius-slider').value) || 20;

            // 1. Lọc tất cả các điểm nằm trong bán kính
            let suggestions = LOCAL_PLACES.filter(place => {
                return this._getDistance(lat, lng, place.lat, place.lng) <= radius;
            });

            // 🔥 GIẢI PHÁP CHỐNG LAG: CHỈ LẤY 10 ĐIỂM TIÊU BIỂU 🔥
            if (suggestions.length > 10) {
                // Mẹo: Xáo trộn ngẫu nhiên danh sách rồi cắt lấy 10 điểm
                // Để mỗi lần F5 bạn sẽ thấy 10 quán khác nhau cho đỡ chán
                suggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 10);
            }

            // Phòng hờ: Nếu xung quanh không có gì (ví dụ đang ở biển), lấy đại 10 điểm đầu tiên trong DB
            if (suggestions.length === 0) {
                suggestions = LOCAL_PLACES.slice(0, 10);
            }

            // 2. Cập nhật dữ liệu vào State
            this.state.allSuggestions = suggestions;

            // 3. Cập nhật giao diện danh sách bên trái
            this.updateSuggestionUI();

            // 4. Vẽ lên bản đồ (Lúc này chỉ vẽ đúng 10 điểm -> Map bao mượt)
            this.map.drawMarkers(this.state.allSuggestions);

        } catch (error) {
            console.error("Error loading initial data:", error);
        }
    }

    // --- HELPER FUNCTIONS ---
    _cleanAddress(name, address) {
        if (!address) return '';
        if (address.toLowerCase().startsWith(name.toLowerCase())) {
            return address.substring(name.length).replace(/^[\s,.-]+/, '');
        }
        return address;
    }

    _getDistance(lat1, lon1, lat2, lon2) {
        if(!lat1 || !lon1 || !lat2 || !lon2) return 99999;
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        return R * c;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- ROUTE MANAGEMENT ---

    // 🔥 ESSENTIAL: Coordinate fetching for VietMap places with ref_id
    async addLocationToRoute(locationData, shouldRefreshMap = true) {
        const exists = this.state.route.find(i => i.id === locationData.id);
        if (exists) {
            console.log("Location already in route:", locationData.name);
            return;
        }

        console.log("Adding location to route:", locationData.name);

        let validLocation = locationData;

        // 🔥 ESSENTIAL: If location needs details (has ref_id but no coords), fetch them
        if (locationData.needsDetails && locationData.ref_id) {
            console.log(`Fetching coordinates for ${locationData.name} using ref_id...`);
            try {
                const details = await apiService.getPlaceDetails(locationData.ref_id);
                validLocation = {
                    ...locationData,
                    ...details,
                    lat: details.lat,
                    lng: details.lng,
                    needsDetails: false
                };
                console.log(`✓ Coordinates fetched: ${details.lat}, ${details.lng}`);
            } catch (err) {
                console.error("Failed to get place details:", err);
                alert(`Không thể lấy tọa độ cho: ${locationData.name}`);
                return;
            }
        } else if (validLocation.lat == null || validLocation.lng == null ||
            isNaN(validLocation.lat) || isNaN(validLocation.lng)) {
            console.warn(`Location ${locationData.name} has invalid coordinates`);
            alert(`Địa điểm "${locationData.name}" không có tọa độ hợp lệ`);
            return;
        }

        this.state.route.push(validLocation);
        this.ui.addStepItem(validLocation, (deletedItem) => {
            this.removeLocation(deletedItem);
        });
        this.updateSuggestionUI();
        if (shouldRefreshMap) {
            await this.refreshMapState();
        }
    }

    removeLocation(itemToRemove) {
        console.log("Removing location from route:", itemToRemove.name);
        this.state.route = this.state.route.filter(item => item.id !== itemToRemove.id);
        this.updateSuggestionUI();
        this.refreshMapState();
    }

    // Trong js/main.js
    async refreshMapState(vehicleType = 'car') {
        this.map.drawMarkers(this.state.route);

        if (this.state.route.length >= 2) {
            const res = await apiService.calculateRoute(this.state.route, vehicleType);

            if (res && res.success) {
                // 1. Vẽ đường xanh nối liền (dùng fullPath)
                const segmentsToDraw = res.segments || [];
                this.map.drawRouteWithSegments(segmentsToDraw);

                // ✅ Vẽ nhãn km/phút xuôi theo đường
                this.map.drawSegmentLabels(segmentsToDraw, vehicleType);
            }
        } else {
            if (this.map.clearRoute) this.map.clearRoute();
        }
    }

    // js/main.js

    // --- FILE: js/main.js ---

    // --- TRONG FILE: js/main.js ---

    updateSuggestionUI() {
        if (!this.ui || !this.ui.renderSuggestionList) return;

        // 1. Xác định tọa độ gốc
        let baseLat = null;
        let baseLng = null;

        if (this.state.route.length > 0) {
            baseLat = this.state.route[0].lat;
            baseLng = this.state.route[0].lng;
        } else if (this.state.userLocation) {
            baseLat = this.state.userLocation.lat;
            baseLng = this.state.userLocation.lng;
        }

        // 2. Tính khoảng cách
        const suggestionsWithDist = this.state.allSuggestions.map(place => {
            let dist = null;
            if (baseLat && baseLng && place.lat && place.lng) {
                dist = this._getDistance(baseLat, baseLng, place.lat, place.lng);
            }
            return { ...place, distance: dist };
        });

        // 3. Sắp xếp: Gần nhất lên đầu
        if (baseLat && baseLng) {
            suggestionsWithDist.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
        }

        // 🔥 THÊM ĐOẠN NÀY: Cắt lấy 10 điểm đầu tiên thôi
        const limitedSuggestions = suggestionsWithDist.slice(0, 10);

        // 4. Lấy danh sách ID đã có trong lộ trình
        const currentRouteIds = this.state.route.map(item => item.id);

        // 5. Truyền danh sách ĐÃ RÚT GỌN sang UI để vẽ
        this.ui.renderSuggestionList(limitedSuggestions, currentRouteIds);

        // 6. Gán lại sự kiện kéo thả
        this._reattachDragEvents();
    }

    _reattachDragEvents() {
        const container = document.getElementById('suggestion-list');
        if (!container) return;

        Array.from(container.children).forEach((card) => {
            const placeId = card.getAttribute('data-id');
            const locationData = this.state.allSuggestions.find(p => String(p.id) === String(placeId));

            if (locationData) {
                // Click to view details
                card.onclick = () => {
                    this.showDetails(locationData);
                };

                // Drag and drop
                card.setAttribute('draggable', 'true');
                card.style.cursor = 'grab';
                card.ondragstart = (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(locationData));
                    card.style.opacity = '0.5';
                };
                card.ondragend = () => card.style.opacity = '1';
            }
        });
    }

    // --- SLIDERS ---
    setupBudgetSlider() {
        const slider1 = document.getElementById("slider-1");
        const slider2 = document.getElementById("slider-2");
        const track = document.getElementById("budget-track");
        if(!slider1 || !slider2 || !track) return;
        
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
            const r1 = document.getElementById("range1");
            const r2 = document.getElementById("range2");
            if(r1) r1.textContent = formatMoney(val1);
            if(r2) r2.textContent = formatMoney(val2);

            const percent1 = (val1 / sliderMaxValue) * 100;
            const percent2 = (val2 / sliderMaxValue) * 100;
            track.style.background = `linear-gradient(to right, #dadce0 ${percent1}%, #2D6A4F ${percent1}%, #2D6A4F ${percent2}%, #dadce0 ${percent2}%)`;
        }
        slider1.addEventListener('input', updateTrack);
        slider2.addEventListener('input', updateTrack);
        updateTrack();
    }

    setupRadiusSlider() {
        const slider = document.getElementById("radius-slider");
        const display = document.getElementById("radius-display");
        const track = document.getElementById("radius-track");
        
        if(!slider || !display) return;

        const updateRadius = () => {
            const val = slider.value;
            display.textContent = val;
            const percent = (val / slider.max) * 100;
            if (track) {
                track.style.background = `linear-gradient(to right, #2D6A4F ${percent}%, #dadce0 ${percent}%)`;
            }
        };

        slider.addEventListener('input', updateRadius);
        updateRadius(); 
    }

    // --- 3. MOBILE SEARCH & AUTOCOMPLETE ---
    // --- TRONG FILE: js/main.js ---

    setupMobileQuickSearch() {
        const popup = document.getElementById('mobile-quick-search');
        const input = document.getElementById('mq-input');
        const list = document.getElementById('mq-results');
        const closeBtn = document.getElementById('mq-close-btn');
        const triggerBtn = document.getElementById('reopen-suggestion-btn');

        if (!popup || !input || !triggerBtn) return;

        triggerBtn.onclick = (e) => {
            e.preventDefault();
            popup.classList.add('active');
            setTimeout(() => input.focus(), 100);
        };

        closeBtn.onclick = () => {
            popup.classList.remove('active');
            input.value = '';
            list.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-size:0.85rem;">Nhập từ khóa để tìm kiếm...</div>';
        };

        let timeout;
        input.addEventListener('input', () => {
            const keyword = input.value.trim();
            if (!keyword) {
                list.innerHTML = '';
                return;
            }

            list.innerHTML = '<div style="padding:15px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tìm...</div>';

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    const results = await this.searchPlaces(keyword);
                    list.innerHTML = '';

                    if (!results || results.length === 0) {
                        list.innerHTML = '<div style="padding:15px; text-align:center;">Không tìm thấy địa điểm.</div>';
                        return;
                    }

                    // 🔥 1. TÍNH TOÁN KHOẢNG CÁCH (Copy logic từ updateSuggestionUI)
                    // Xác định điểm gốc (ưu tiên điểm Khởi hành -> GPS -> Mặc định)
                    const startPoint = this.state.route[0];
                    const baseLat = startPoint ? startPoint.lat : (this.state.userLocation?.lat || 10.7769);
                    const baseLng = startPoint ? startPoint.lng : (this.state.userLocation?.lng || 106.6953);

                    results.forEach(loc => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item'; // Dùng lại class cũ cho đẹp

                        const cleanAddr = loc.address || 'Việt Nam';
                        const icon = loc.desc ? 'fa-star' : 'fa-map-marker-alt';
                        const iconColor = loc.desc ? '#ffc107' : '#666';

                        // 🔥 2. TÍNH KM
                        let distDisplay = '';
                        if (loc.lat && loc.lng) {
                            const d = this._getDistance(baseLat, baseLng, loc.lat, loc.lng);
                            distDisplay = `${d.toFixed(1)} km`;
                        }

                        // 🔥 3. THÊM SỐ KM VÀO HTML (Bên phải cùng)
                        div.innerHTML = `
                            <i class="fas ${icon}" style="color: ${iconColor};"></i>
                            <div class="suggestion-content" style="flex: 1;">
                                <strong>${loc.name}</strong>
                                <small>${cleanAddr}</small>
                            </div>
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-color); margin-left: 10px; white-space: nowrap;">
                                ${distDisplay}
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
                    console.error(err);
                    list.innerHTML = '<div style="padding:15px; text-align:center;">Lỗi kết nối.</div>';
                }
            }, 300);
        });
    }

    setupInputAutocomplete() {
        const routeConfigs = [
            { inputId: 'start-point', listId: 'start-suggestions-list' },
            { inputId: 'end-point', listId: 'end-suggestions-list' }
        ];

        routeConfigs.forEach(cfg => {
            const input = document.getElementById(cfg.inputId);
            const list = document.getElementById(cfg.listId);
            if (!input || !list) return;

            // Show suggestions on focus
            input.addEventListener('focus', () => {
                this.renderAutocompleteResults(input, list, input.value.trim());
            });

            input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renderAutocompleteResults(input, list, input.value.trim());
            });

            // Update on typing
            let timer;
            input.addEventListener('input', (e) => {
                const kw = e.target.value.trim();
                delete input.dataset.lat;
                delete input.dataset.lng;

                clearTimeout(timer);
                timer = setTimeout(() => {
                    this.renderAutocompleteResults(input, list, kw);
                }, 300);
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !list.contains(e.target)) {
                    list.style.display = 'none';
                }
            });
        });
    }

    async searchPlaces(keyword) {
        if (!keyword) return [];
        const searchKey = keyword.toLowerCase().trim();
        
        // Search in LOCAL_PLACES first
        const localResults = LOCAL_PLACES.filter(place => {
            const nameMatch = place.name.toLowerCase().includes(searchKey);
            const addrMatch = place.address.toLowerCase().includes(searchKey);
            return nameMatch || addrMatch;
        });

        // If found in database, return immediately
        if (localResults.length > 0) {
            console.log("✅ Found in local database:", localResults.length);
            return localResults;
        }

        // Otherwise call API
        try {
            const lat = this.state.userLocation?.lat || 10.7769;
            const lng = this.state.userLocation?.lng || 106.6953;
            const apiRes = await apiService.getSuggestions(keyword, lat, lng);
            if (apiRes && Array.isArray(apiRes)) {
                return apiRes;
            }
        } catch (e) { console.warn("API error:", e); }
        return [];
    }

    async renderAutocompleteResults(inputEl, listEl, keyword) {
        listEl.innerHTML = '';
        listEl.style.display = 'block';

        // If empty, show current location + quick picks
        if (!keyword) {
            // Current location option
            const currentLocItem = document.createElement('div');
            currentLocItem.className = 'suggestion-item current-loc';
            currentLocItem.style.background = '#f0f9f4';
            currentLocItem.innerHTML = `
                <i class="fas fa-crosshairs" style="color: var(--primary-color);"></i>
                <div class="suggestion-content">
                    <strong style="color: var(--primary-color);">Sử dụng vị trí hiện tại của tôi</strong>
                </div>`; 
            currentLocItem.onclick = () => this.handleUseCurrentLocation(inputEl, listEl);
            listEl.appendChild(currentLocItem);

            // Quick picks from database
            const quickPicks = LOCAL_PLACES.slice(0, 5); 
            quickPicks.forEach(loc => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <i class="fas fa-star" style="color: #ffc107;"></i>
                    <div class="suggestion-content">
                        <strong>${loc.name}</strong>
                        <small>${loc.address}</small>
                    </div>`;
                item.onclick = () => {
                    inputEl.value = loc.name;
                    inputEl.dataset.lat = loc.lat;
                    inputEl.dataset.lng = loc.lng;
                    listEl.style.display = 'none';
                };
                listEl.appendChild(item);
            });
            return;
        }

        // Search results
        try {
            const results = await this.searchPlaces(keyword);
            if (!results || results.length === 0) {
                listEl.innerHTML = `<div class="suggestion-item" style="cursor:default; color:#888;">Không tìm thấy địa điểm...</div>`; 
                return;
            }
            results.slice(0, 8).forEach(loc => {
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
        } catch (err) { listEl.style.display = 'none'; }
    }

    handleUseCurrentLocation(inputEl, listEl) {
        inputEl.value = "Đang xác định vị trí...";
        if (!navigator.geolocation) { alert("Trình duyệt không hỗ trợ GPS."); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                this.state.userLocation = { lat: latitude, lng: longitude };
                
                inputEl.value = `Vị trí của tôi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                inputEl.dataset.lat = latitude;
                inputEl.dataset.lng = longitude;
                listEl.style.display = 'none';
            },
            (err) => { alert("Không thể lấy vị trí: " + err.message); inputEl.value = ""; }
        );
    }

    setupMobileUX() {
        if (window.innerWidth > 768) return;
        const mapEl = document.getElementById('big-map');
        const panelEl = document.getElementById('control-panel');
        const handBtn = document.getElementById('hand-toggle-btn');
        if (!mapEl || !panelEl) return;
        
        panelEl.classList.add('mobile-expanded');
        mapEl.classList.add('mobile-minimized');
        setTimeout(() => { if(this.map && this.map.map) this.map.map.invalidateSize(); }, 500);
        
        const swapView = () => {
            if (mapEl.classList.contains('mobile-minimized')) {
                mapEl.classList.remove('mobile-minimized'); mapEl.classList.add('mobile-expanded');
                panelEl.classList.remove('mobile-expanded'); panelEl.classList.add('mobile-minimized');
                setTimeout(() => this.map.map.invalidateSize(), 300);
            } else {
                mapEl.classList.remove('mobile-expanded'); mapEl.classList.add('mobile-minimized');
                panelEl.classList.remove('mobile-minimized'); panelEl.classList.add('mobile-expanded');
            }
        };
        
        mapEl.onclick = (e) => { if (mapEl.classList.contains('mobile-minimized')) { e.stopPropagation(); swapView(); } };
        panelEl.onclick = (e) => { if (panelEl.classList.contains('mobile-minimized')) { swapView(); } };
        if (handBtn) { handBtn.onclick = () => { document.body.classList.toggle('left-handed'); if (navigator.vibrate) navigator.vibrate(50); }; }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (this.map) this.map.clearRoute();

        try {
            const startInput = document.getElementById('start-point');
            const endInput = document.getElementById('end-point');
            const radius = parseInt(document.getElementById('radius-slider').value) || 20;
            const minB = parseInt(document.getElementById('slider-1').value) || 0;
            const maxB = parseInt(document.getElementById('slider-2').value) || 5000000;
            const numStops = parseInt(document.getElementById('waypointCount').value) || 0;

            // Get start point
            let p1 = await this.getPointData(startInput, 'start');
            if (!p1) throw new Error("Vui lòng nhập điểm khởi hành");

            // Get end point (or auto-select)
            let p2;
            if (!endInput.value.trim()) {
                console.log("🎲 Auto-selecting destination from dataset...");
                const dbSuggestions = LOCAL_PLACES.filter(place => {
                    const d = this._getDistance(p1.lat, p1.lng, place.lat, place.lng);
                    return d <= radius && place.name !== p1.name;
                });

                if (dbSuggestions.length > 0) {
                    const randomPlace = dbSuggestions[Math.floor(Math.random() * dbSuggestions.length)];
                    p2 = { ...randomPlace, id: 'end-random-' + Date.now() };
                    endInput.value = p2.name;
                } else {
                    throw new Error(`Không tìm thấy điểm đến nào trong database trong bán kính ${radius}km.`);
                }
            } else {
                p2 = await this.getPointData(endInput, 'end');
            }
            if (!p2) throw new Error("Vui lòng chọn điểm đến");

            // Filter valid places
            const validPlaces = LOCAL_PLACES.filter(place => {
                if (place.name === p1.name || place.name === p2.name) return false;
                const d = this._getDistance(p1.lat, p1.lng, place.lat, place.lng);
                if (d > radius) return false;

                const priceValue = parseInt(place.price.replace(/\D/g, '')) || 0;
                if (priceValue > 0 && (priceValue < minB || priceValue > maxB)) return false;

                return true;
            });

            console.log(`🎯 Found ${validPlaces.length} valid places.`);

            const vehicleSelect = document.getElementById('vehicle-type');
            const vehicleType = vehicleSelect ? vehicleSelect.value : 'car';

            // --- 4. TẠO LỘ TRÌNH THÔNG MINH (DYNAMIC CONTEXT - TYPE BASED) ---

            let finalRoute = [p1];
            let currentPoint = p1;

            // A. PHÂN LOẠI DATA
            // Nhóm các điểm vào các bucket để dễ chọn
            const groups = {
                recharge: validPlaces.filter(p => p.type === 'cafe' || p.type === 'food'),
                // Nhóm Explore bao gồm: Tham quan, Khác, Mua sắm (nếu có)
                explore: validPlaces.filter(p => p.type === 'sight' || p.type === 'another' || p.type === 'shopping'),
                // Nhóm Chill: Nightlife
                chill: validPlaces.filter(p => p.type === 'nightlife')
            };

            // Hàm tìm điểm gần nhất (Nearest Neighbor)
            const findNearest = (source, list) => {
                if (!list || list.length === 0) return null;
                const sortedList = [...list].sort((a, b) => {
                    const d1 = this._getDistance(source.lat, source.lng, a.lat, a.lng);
                    const d2 = this._getDistance(source.lat, source.lng, b.lat, b.lng);
                    return d1 - d2;
                });
                return sortedList[0];
            };

            // Hàm thêm điểm & xóa khỏi danh sách chờ
            const addStop = (place, debugTag) => {
                if (!place) return false;
                const stop = { ...place, id: `stop-${debugTag}-${Date.now()}-${Math.random()}` };
                finalRoute.push(stop);
                currentPoint = stop;

                [groups.recharge, groups.explore, groups.chill].forEach(g => {
                    const idx = g.findIndex(p => p.name === place.name);
                    if (idx > -1) g.splice(idx, 1);
                });
                return true;
            };

            // --- B. NHẬN DIỆN NGỮ CẢNH DỰA TRÊN TYPE (LOGIC MỚI) ---

            // 1. Phân tích ĐIỂM ĐI (P1)
            let nextAction = 'explore'; // Mặc định là đi chơi

            if (p1.type === 'transport') {
                // Nếu từ Sân bay/Bến xe/Ga tàu -> Mệt/Đói -> Đi Ăn/Uống
                nextAction = 'recharge';
            }
            else if (p1.type === 'food' || p1.type === 'cafe') {
                // Nếu xuất phát từ quán ăn -> Đã no -> Đi Tham quan
                nextAction = 'explore';
            }
            else if (p1.type === 'hotel') {
                // Nếu từ Khách sạn bước ra -> Đã khỏe -> Đi Tham quan
                nextAction = 'explore';
            }

            // 2. Phân tích ĐIỂM ĐẾN (P2)
            const isDestinationHotel = (p2.type === 'hotel');
            const isDestinationTransport = (p2.type === 'transport');

            // --- C. VÒNG LẶP CHỌN ĐIỂM ---

            for (let i = 0; i < numStops; i++) {
                const isLastStop = (i === numStops - 1);
                let selectedStop = null;
                let actionTaken = '';

                // --- XỬ LÝ ĐIỂM CUỐI CÙNG (Dựa trên loại điểm đến P2) ---
                if (isLastStop) {
                    if (isDestinationHotel) {
                        // Nếu về Khách sạn ngủ -> Điểm cuối nên là Nightlife hoặc Chill nhẹ
                        // (Ưu tiên tìm Chill, nếu ko có thì tìm Explore gần đó)
                        selectedStop = findNearest(currentPoint, groups.chill) || findNearest(currentPoint, groups.explore);
                        actionTaken = 'chill';
                    }
                    else if (isDestinationTransport) {
                        // Nếu ra Sân bay/Bến xe -> Điểm cuối nên là Cafe/Ăn nhẹ để ngồi chờ
                        selectedStop = findNearest(currentPoint, groups.recharge);
                        actionTaken = 'recharge';
                    }
                    else {
                        // Nếu điểm đến là chỗ chơi khác -> Điểm áp chót là nghỉ chân (Recharge)
                        selectedStop = findNearest(currentPoint, groups.recharge);
                        actionTaken = 'recharge';
                    }
                }

                // --- XỬ LÝ CÁC ĐIỂM Ở GIỮA (Nếu chưa phải điểm cuối hoặc chưa tìm được điểm cuối) ---
                if (!selectedStop) {
                    if (nextAction === 'recharge') {
                        selectedStop = findNearest(currentPoint, groups.recharge);
                        actionTaken = 'recharge';
                    } else {
                        selectedStop = findNearest(currentPoint, groups.explore);
                        actionTaken = 'explore';
                    }
                }

                // --- THỰC HIỆN THÊM ĐIỂM ---
                if (addStop(selectedStop, actionTaken)) {
                    // Đảo trạng thái: Ăn xong thì đi Chơi, Chơi xong thì đi Ăn
                    if (actionTaken === 'recharge') nextAction = 'explore';
                    else if (actionTaken === 'explore') nextAction = 'recharge';
                }
                else {
                    // FALLBACK: Nếu tìm loại này không ra, lấy loại kia đi tạm
                    const fallbackStop = findNearest(currentPoint, groups.explore) || findNearest(currentPoint, groups.recharge);
                    if (addStop(fallbackStop, 'fallback')) {
                        if (fallbackStop.type === 'cafe' || fallbackStop.type === 'food') nextAction = 'explore';
                        else nextAction = 'recharge';
                    }
                }
            }

            // --- D. VỀ ĐÍCH ---
            finalRoute.push(p2);

            // Update state and UI
            this.state.route = finalRoute;
            const container = document.getElementById('route-steps-container');
            if (container) container.innerHTML = '';

            finalRoute.forEach(loc => {
                this.ui.addStepItem(loc, (item) => this.removeLocation(item));
            });

            this.navigateToSummary();
            await this.refreshMapState(vehicleType);

        } catch (err) {
            console.error(err);
            alert("Lỗi: " + err.message);
        }
    }

    setupEventListeners() {
        const form = document.getElementById('route-form');
        if (form) form.onsubmit = (e) => this.handleFormSubmit(e);

        // Sidebar search
        const sidebarSearch = document.getElementById('sidebar-search');
        if (sidebarSearch) {
            let t;
            sidebarSearch.oninput = (e) => {
                const kw = e.target.value.trim();
                clearTimeout(t);
                t = setTimeout(async () => {
                    if (!kw) {
                        const lat = this.state.userLocation?.lat || 10.7769;
                        const lng = this.state.userLocation?.lng || 106.6953;
                        const radius = parseInt(document.getElementById('radius-slider').value) || 20;

                        this.state.allSuggestions = LOCAL_PLACES.filter(place =>
                            this._getDistance(lat, lng, place.lat, place.lng) <= radius
                        );
                    } else {
                        this.state.allSuggestions = await this.searchPlaces(kw);
                    }
                    this.updateSuggestionUI();
                }, 300);
            };
        }

        // Add step button
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-step-btn');
            if (btn) {
                e.preventDefault();
                const panel = document.getElementById('suggestion-panel');
                if (panel) {
                    panel.classList.add('is-visible');
                    const toggleBtn = document.getElementById('toggle-suggestion-btn');
                    if (toggleBtn) {
                        toggleBtn.style.display = 'flex';
                        const icon = toggleBtn.querySelector('i');
                        if (icon) icon.className = 'fas fa-chevron-left';
                    }
                    this.updateSuggestionUI();
                }
            }
        });

        // Navigation buttons
        const editBtn = document.getElementById('edit-route-btn');
        if (editBtn) editBtn.onclick = () => this.navigateToBuilder();

        const backBtn = document.getElementById('floating-back-btn');
        if (backBtn) backBtn.onclick = () => this.navigateToBuilder();

        const closeDetailsBtn = document.getElementById('close-details-btn');
        if (closeDetailsBtn) {
            closeDetailsBtn.onclick = () => {
                const detailsPanel = document.getElementById('details-panel');
                if (detailsPanel) detailsPanel.style.setProperty('display', 'none', 'important');
            };
        }

        // 🔥 ESSENTIAL: Chat request event listener
        window.addEventListener('chat-request', (e) => {
            this.openChatContext(e.detail);
        });

        this.setupDragAndDrop();
        this.setupPanelControls();
        this.setupChat();
        // Thay thế đoạn gán addStepBtn cũ bằng đoạn này để chắc chắn 100% ăn click
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-step-btn');
            if (btn) {
                e.preventDefault();
                const panel = document.getElementById('suggestion-panel');
                if (panel) {
                    panel.classList.add('is-visible');
                    const toggleBtn = document.getElementById('toggle-suggestion-btn');
                    if (toggleBtn) {
                        toggleBtn.style.display = 'flex';
                        const icon = toggleBtn.querySelector('i');
                        if (icon) icon.className = 'fas fa-chevron-left';
                    }
                    this.updateSuggestionUI(); // Cập nhật KM ngay khi mở
                }
            }
        });
        window.addEventListener('chat-request', (e) => {
            // e.detail chính là tên địa điểm được gửi từ map.js
            const locationName = e.detail;
            this.handleAutoChat(locationName);
        });
    }

    // --- NAVIGATION ---
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
        if (toggleBtn) { toggleBtn.style.display = 'flex'; if (btnIcon) btnIcon.className = 'fas fa-chevron-left'; }
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
                } catch (err) { console.error("Drop error:", err); }
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
                if (icon) { icon.className = sugPanel.classList.contains('is-visible') ? 'fas fa-chevron-left' : 'fas fa-chevron-right'; }
            };
        }
    }

    setupChat() {
        const floatBtn = document.getElementById('floating-chat-btn');
        const chatWidget = document.getElementById('chat-widget');
        if (!floatBtn || !chatWidget) return;
        // Chỉ set zIndex và display, ĐỪNG set top/left/right/bottom ở đây để CSS tự lo
        Object.assign(floatBtn.style, { zIndex: "99999", position: "fixed", display: "flex" });
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
                
                // Handle location suggestions
                if (res.selected_locations && res.selected_locations.length > 0) {
                    console.log("AI suggested", res.selected_locations.length, "locations");
                    this.state.allSuggestions = res.selected_locations;
                    this.updateSuggestionUI();

                    this.ui.addChatMessage(`
                        <span style="font-size:0.85rem; color:#137333;">
                        <i class="fas fa-check-circle"></i> Tôi đã cập nhật 
                        <strong>${res.selected_locations.length}</strong> gợi ý 
                        mới vào Panel bên phải.
                        </span>
                    `, 'ai');
                }
            } catch (e) { 
                this.ui.addChatMessage("Lỗi kết nối.", 'ai'); 
            } finally { 
                if (this.ui.showTypingIndicator) this.ui.showTypingIndicator(false); 
            }
        };
        
        if (sendBtn) sendBtn.onclick = sendMessage;
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }

    // 🔥 ESSENTIAL: Open chat with context
    openChatContext(contextName) {
        if (!document.body.classList.contains('chat-open')) {
            const floatBtn = document.getElementById('floating-chat-btn');
            if (floatBtn) floatBtn.click();
        }
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = `Gợi ý các địa điểm tương tự như ${contextName}`;
            input.focus();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.App = new AppController(); });