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

    // --- SHOW LOCATION DETAILS PANEL ---
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

    async loadInitialData() {
        try {
            const lat = this.state.userLocation?.lat || 10.7769;
            const lng = this.state.userLocation?.lng || 106.6953;
            const radius = parseInt(document.getElementById('radius-slider')?.value) || 20;

            // Load from LOCAL_PLACES filtered by radius
            let suggestions = LOCAL_PLACES.filter(place => {
                return this._getDistance(lat, lng, place.lat, place.lng) <= radius;
            });

            if (suggestions.length === 0) suggestions = LOCAL_PLACES.slice(0, 20);

            this.state.allSuggestions = suggestions;
            this.updateSuggestionUI();
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

    async refreshMapState() {
        console.log("Refreshing map. Route has", this.state.route.length, "locations");
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) this.ui.setLoading(updateBtn, true);

        try {
            // Validate all coordinates
            const validRoute = this.state.route.filter(point => {
                const lat = parseFloat(point.lat);
                const lng = parseFloat(point.lng);
                return !isNaN(lat) && !isNaN(lng);
            });

            if (validRoute.length < this.state.route.length) {
                console.warn(`Some points skipped. Valid: ${validRoute.length}/${this.state.route.length}`);
            }

            // Always draw markers
            this.map.drawMarkers(validRoute);

            // Calculate route if 2+ points
            if (validRoute.length >= 2) {
                console.log("Calculating route between", validRoute.length, "points...");
                const routeResult = await apiService.calculateRoute(validRoute);

                if (routeResult && routeResult.path && routeResult.path.length > 0) {
                    console.log("Route calculated. Path has", routeResult.path.length, "points");
                    this.map.drawPolyline(routeResult.path);
                } else {
                    console.warn("No route path returned from API");
                }
            } else {
                console.log("ℹ Need at least 2 valid locations to calculate route");
                if (this.map.clearPolylineOnly) this.map.clearPolylineOnly();
            }
        } catch (err) {
            console.error("Error refreshing map:", err);
            alert("Không thể tính toán lộ trình. Vui lòng thử lại.");
        } finally {
            if (updateBtn) setTimeout(() => this.ui.setLoading(updateBtn, false), 500);
        }
    }

    updateSuggestionUI() {
        if (!this.ui || !this.ui.renderSuggestionList) return;

        // Calculate distances from starting point
        const startPoint = this.state.route[0];
        const baseLat = startPoint ? startPoint.lat : (this.state.userLocation?.lat || 10.7769);
        const baseLng = startPoint ? startPoint.lng : (this.state.userLocation?.lng || 106.6953);

        const suggestionsWithDist = this.state.allSuggestions.map(place => ({
            ...place,
            distance: this._getDistance(baseLat, baseLng, place.lat, place.lng)
        }));

        // Sort by distance (nearest first)
        suggestionsWithDist.sort((a, b) => a.distance - b.distance);

        const currentRouteIds = this.state.route.map(item => item.id);
        this.ui.renderSuggestionList(suggestionsWithDist, currentRouteIds);

        // Reattach event handlers
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
        const track = document.querySelector(".slider-track");
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

    // --- MOBILE QUICK SEARCH ---
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

            list.innerHTML = '<div style="padding:15px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tìm trong hệ thống...</div>';

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    const results = await this.searchPlaces(keyword);

                    list.innerHTML = '';
                    if (!results || results.length === 0) {
                        list.innerHTML = '<div style="padding:15px; text-align:center;">Không tìm thấy địa điểm phù hợp.</div>';
                        return;
                    }

                    results.forEach(loc => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        const cleanAddr = loc.address || 'Việt Nam';
                        const icon = loc.desc ? 'fa-star' : 'fa-map-marker-alt';
                        const iconColor = loc.desc ? '#ffc107' : '#666';

                        div.innerHTML = `
                            <i class="fas ${icon}" style="color: ${iconColor};"></i>
                            <div class="suggestion-content">
                                <strong>${loc.name}</strong>
                                <small>${cleanAddr}</small>
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
                    list.innerHTML = '<div style="padding:15px; text-align:center;">Lỗi kết nối dữ liệu.</div>';
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

            // Build route with nearest-neighbor algorithm
            let finalRoute = [p1];

            if (numStops > 0 && validPlaces.length > 0) {
                const buckets = {
                    sight: validPlaces.filter(p => p.type === 'sight'),
                    cafe: validPlaces.filter(p => p.type === 'cafe'),
                    food: validPlaces.filter(p => p.type === 'food'),
                    another: validPlaces.filter(p => p.type === 'another')
                };

                const priorityTypes = ['sight', 'cafe', 'food', 'another'];
                let addedCount = 0;
                let lastPoint = p1;

                for (const type of priorityTypes) {
                    if (addedCount >= numStops) break;

                    let items = buckets[type];
                    if (items.length > 0) {
                        // Sort by distance to last point (nearest neighbor)
                        items.sort((a, b) => {
                            const distA = this._getDistance(lastPoint.lat, lastPoint.lng, a.lat, a.lng);
                            const distB = this._getDistance(lastPoint.lat, lastPoint.lng, b.lat, b.lng);
                            return distA - distB;
                        });

                        const stop = items[0];
                        if (!finalRoute.some(r => r.name === stop.name)) {
                            const newStop = { ...stop, id: 'stop-' + addedCount + '-' + Date.now() };
                            finalRoute.push(newStop);
                            lastPoint = newStop;
                            addedCount++;
                        }
                    }
                }
            }

            finalRoute.push(p2);

            // Update state and UI
            this.state.route = finalRoute;
            const container = document.getElementById('route-steps-container');
            if (container) container.innerHTML = '';

            finalRoute.forEach(loc => {
                this.ui.addStepItem(loc, (item) => this.removeLocation(item));
            });

            this.navigateToSummary();
            await this.refreshMapState();

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