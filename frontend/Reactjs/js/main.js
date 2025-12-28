/**
 * MAIN CONTROLLER - Improved version with better error handling
 */

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
        console.log("App đang khởi động...");
        console.log("API Base URL:", apiService.baseUrl);
        console.log("Mock Mode:", apiService.useMock);

        this.setupEventListeners();
        await this.loadInitialData();
    }

    async loadInitialData() {
        try {
            console.log("Loading initial suggestions...");

            // Strategy 1: Try searching with keyword
            console.log("Attempting API call with keyword: 'Dinh Độc Lập'");
            this.state.allSuggestions = await apiService.getSuggestions('Dinh Độc Lập');

            console.log("API Response received");
            console.log("Number of suggestions:", this.state.allSuggestions.length);

            // If API returns no results, try without keyword
            if (this.state.allSuggestions.length === 0) {
                console.warn("No results with keyword, trying empty search...");
                this.state.allSuggestions = await apiService.getSuggestions('');
            }

            // If still no results, fall back to mock
            // if (this.state.allSuggestions.length === 0) {
            //     console.warn("No results from API. Falling back to mock data...");
            //     apiService.useMock = true;
            //     this.state.allSuggestions = await apiService.getSuggestions();
            //     console.log("Mock data loaded:", this.state.allSuggestions.length, "items");
            // }

            // Update UI
            this.updateSuggestionUI();
            console.log("Drawing", this.state.allSuggestions.length, "markers on map...");
            this.map.drawMarkers(this.state.allSuggestions);
            console.log("Initialization complete!");

        } catch (error) {
            console.error("Error loading data:", error);
            console.error("Error details:", error.message);
            console.error("Stack trace:", error.stack);

            // Ultimate fallback to mock data
            console.log("Activating emergency fallback to mock data...");
            apiService.useMock = true;

            try {
                this.state.allSuggestions = await apiService.getSuggestions();
                console.log("Mock data loaded successfully:", this.state.allSuggestions.length, "items");
                this.updateSuggestionUI();
                this.map.drawMarkers(this.state.allSuggestions);
            } catch (mockError) {
                console.error("Even mock data failed! This should never happen:", mockError);
                alert("Có lỗi nghiêm trọng khi khởi động ứng dụng. Vui lòng kiểm tra console.");
            }
        }
    }

    updateSuggestionUI() {
        const currentRouteIds = this.state.route.map(item => item.id);
        console.log("Updating suggestion UI. Excluding", currentRouteIds.length, "IDs");
        this.ui.renderSuggestionList(this.state.allSuggestions, currentRouteIds);
    }

    // --- QUẢN LÝ LỘ TRÌNH ---
    async addLocationToRoute(locationData, shouldRefreshMap = true) {
        const exists = this.state.route.find(i => i.id === locationData.id);
        if (exists) {
            console.log("Location already in route:", locationData.name);
            return;
        }

        console.log("Adding location to route:", locationData.name);

        // If location needs coordinates, fetch them using ref_id
        let validLocation = locationData;

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
    removeLocation(locationData) {
        console.log("Removing location from route:", locationData.name);
        this.state.route = this.state.route.filter(item => item.id !== locationData.id);
        this.updateSuggestionUI();
        this.refreshMapState();
    }

    async refreshMapState() {
        console.log("Refreshing map. Route has", this.state.route.length, "locations");
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) this.ui.setLoading(updateBtn, true);

        try {
            // VALIDATION: Check all route points have valid coordinates
            console.log("Validating route coordinates...");
            const validRoute = [];

            for (let i = 0; i < this.state.route.length; i++) {
                const point = this.state.route[i];
                console.log(`Checking point ${i}: ${point.name}`);
                console.log(`  Original lat=${point.lat}, lng=${point.lng}`);

                // Try to get valid coordinates
                let lat = point.lat;
                let lng = point.lng;

                // If coordinates are missing or NaN, try to fetch them
                if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                    console.warn(`  Point ${i} has invalid coordinates, fetching details...`);

                    try {
                        const details = await apiService.getLocationDetails(point.name);
                        lat = details.lat;
                        lng = details.lng;

                        // Update the original object
                        point.lat = lat;
                        point.lng = lng;

                        console.log(`  ✓ Fetched coordinates: lat=${lat}, lng=${lng}`);
                    } catch (err) {
                        console.error(`  ✗ Failed to fetch coordinates for ${point.name}:`, err);
                        alert(`Không thể lấy tọa độ cho: ${point.name}`);
                        continue; // Skip this point
                    }
                }

                // Ensure coordinates are numbers
                lat = parseFloat(lat);
                lng = parseFloat(lng);

                if (isNaN(lat) || isNaN(lng)) {
                    console.error(`  ✗ Invalid coordinates even after fetch: lat=${lat}, lng=${lng}`);
                    continue; // Skip this point
                }

                // Add to valid route with guaranteed numeric coordinates
                validRoute.push({
                    ...point,
                    lat: lat,
                    lng: lng
                });

                console.log(`  ✓ Point ${i} validated: ${point.name} (${lat}, ${lng})`);
            }

            if (validRoute.length < this.state.route.length) {
                console.warn(`Some points were skipped. Valid: ${validRoute.length}/${this.state.route.length}`);
            }

            // Always draw markers for valid route points
            this.map.drawMarkers(validRoute);
            console.log("Markers drawn for", validRoute.length, "locations");

            // Calculate route if we have 2+ valid locations
            if (validRoute.length >= 2) {
                console.log("Calculating route between", validRoute.length, "points...");
                console.log("Route points:", validRoute.map(p => `${p.name} (${p.lat}, ${p.lng})`));

                const routeResult = await apiService.calculateRoute(validRoute);

                if (routeResult && routeResult.path && routeResult.path.length > 0) {
                    console.log("Route calculated. Path has", routeResult.path.length, "points");
                    console.log("Distance:", routeResult.distance, "| Duration:", routeResult.duration);
                    this.map.drawPolyline(routeResult.path);
                } else {
                    console.warn("No route path returned from API");
                }
            } else {
                console.log("ℹ Need at least 2 valid locations to calculate route");
                if (validRoute.length < 2 && this.state.route.length >= 2) {
                    alert("Một số địa điểm không có tọa độ hợp lệ. Vui lòng kiểm tra lại.");
                }
            }
        } catch (err) {
            console.error("Error refreshing map:", err);
            alert("Không thể tính toán lộ trình. Vui lòng thử lại.");
        } finally {
            if (updateBtn) setTimeout(() => this.ui.setLoading(updateBtn, false), 500);
        }
    }

    // --- XỬ LÝ SỰ KIỆN ---
    setupEventListeners() {
        // 1. Form Submit
        const form = document.getElementById('route-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 2. Drag & Drop
        this.setupDragAndDrop();

        // 3. Nút "Chỉnh sửa lại"
        const editBtn = document.getElementById('edit-route-btn');
        if (editBtn) {
            editBtn.onclick = () => {
                console.log("↩Returning to builder view");
                this.ui.navigateTo('builder');
                this.map.clearRoute();
                this.state.route = [];
                document.getElementById('route-steps-container').innerHTML = '';
                this.updateSuggestionUI();
            };
        }

        // 4. FLOATING BACK BUTTON
        const floatingBackBtn = document.getElementById('floating-back-btn');
        if (floatingBackBtn) {
            floatingBackBtn.onclick = () => {
                this.ui.navigateTo('builder');
                if (document.body.classList.contains('full-map')) {
                    document.getElementById('mobile-map-toggle').click();
                }
            };
        }

        // 5. Toggle Map Button
        const toggleBtn = document.getElementById('mobile-map-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                document.body.classList.toggle('full-map');
                const isFull = document.body.classList.contains('full-map');
                toggleBtn.innerHTML = isFull
                    ? '<i class="fas fa-compress-arrows-alt"></i>'
                    : '<i class="fas fa-expand-arrows-alt"></i>';
                setTimeout(() => { this.map.map.invalidateSize(); }, 350);
            };
        }

        // 6. Map resize observer
        const observer = new MutationObserver(() => {
            setTimeout(() => { this.map.map.invalidateSize(); }, 350);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // 7. Other buttons
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) updateBtn.onclick = () => this.refreshMapState();

        this.setupPanelControls();
        this.setupChat();

        window.addEventListener('chat-request', (e) => {
            this.openChatContext(e.detail);
        });

        // 8. Search input with debounce
        const searchInput = document.querySelector('.search-box-wrapper input');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                const keyword = e.target.value.trim();
                console.log("🔍 Search keyword:", keyword || "(empty)");

                timeout = setTimeout(async () => {
                    try {
                        this.state.allSuggestions = await apiService.getSuggestions(keyword);
                        console.log("Search results:", this.state.allSuggestions.length);
                        this.updateSuggestionUI();
                    } catch (error) {
                        console.error("Search error:", error);
                    }
                }, 500);
            });
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        console.log("Form submitted");

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
        submitBtn.disabled = true;

        try {
            const startName = document.getElementById('start-point').value;
            const endName = document.getElementById('end-point').value;

            if (!startName || !endName) {
                alert("Vui lòng nhập đầy đủ điểm đi và điểm đến!");
                return;
            }

            console.log("Looking up locations:", { start: startName, end: endName });
            // 1. Lấy số lượng điểm ghé từ input
            const waypointCount = parseInt(document.getElementById('waypointCount').value) || 0;

            const [startData, endData] = await Promise.all([
                apiService.getLocationDetails(startName),
                apiService.getLocationDetails(endName)
            ]);

            console.log("Found locations:", {
                start: `${startData.name} (${startData.lat}, ${startData.lng})`,
                end: `${endData.name} (${endData.lat}, ${endData.lng})`
            });

            this.state.route = [];
            document.getElementById('route-steps-container').innerHTML = '';

            // 2. Thêm điểm xuất phát
            this.addLocationToRoute(startData, false);

            // 3. LOGIC XỬ LÝ ĐIỂM GHÉ (WAYPOINTS)
            if (waypointCount > 0 && this.state.allSuggestions.length > 0) {
                // Lọc bỏ điểm trùng với điểm đi/đến để tránh trùng lặp
                const availablePoints = this.state.allSuggestions.filter(item =>
                    item.id !== startData.id && item.id !== endData.id
                );

                // Xáo trộn danh sách ngẫu nhiên (hoặc bạn có thể sort theo rating/khoảng cách nếu có data)
                const shuffled = availablePoints.sort(() => 0.5 - Math.random());

                // Lấy n điểm đầu tiên
                const selectedWaypoints = shuffled.slice(0, waypointCount);

                // Thêm từng điểm vào lộ trình
                selectedWaypoints.forEach(point => {
                    this.addLocationToRoute(point, false);
                });

                // Thông báo nhỏ (tuỳ chọn)
                if (selectedWaypoints.length < waypointCount) {
                    console.warn(`Chỉ tìm thấy ${selectedWaypoints.length} điểm phù hợp thay vì ${waypointCount}`);
                }
            }

            // 4. Thêm điểm kết thúc
            this.addLocationToRoute(endData, false);

            this.ui.navigateTo('summary');
            await this.refreshMapState();

        } catch (err) {
            console.error("Form submission error:", err);
            alert("Có lỗi khi tìm địa điểm. Vui lòng kiểm tra tên địa điểm và thử lại!");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('route-steps-container');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const rawData = e.dataTransfer.getData('application/json');
            if (rawData) {
                const data = JSON.parse(rawData);
                console.log("Dropped location:", data.name);
                this.addLocationToRoute(data);
            }
        });
    }

    setupPanelControls() {
        document.getElementById('toggle-suggestion-btn').onclick = () =>
            document.getElementById('suggestion-panel').classList.remove('is-visible');

        document.getElementById('reopen-suggestion-btn').onclick = () =>
            document.getElementById('suggestion-panel').classList.add('is-visible');

        document.getElementById('close-details-btn').onclick = () =>
            document.getElementById('details-panel').style.display = 'none';
    }

    setupChat() {
        const floatBtn = document.getElementById('floating-chat-btn');
        const sendBtn = document.getElementById('send-msg-btn');
        const input = document.getElementById('chat-input');

        floatBtn.onclick = () => {
            document.body.classList.toggle('chat-open');
            const isOpen = document.body.classList.contains('chat-open');
            floatBtn.querySelector('.fa-comment-alt').style.display = isOpen ? 'none' : 'block';
            floatBtn.querySelector('.fa-times').style.display = isOpen ? 'block' : 'none';
        };

        const sendMessage = async () => {
            const txt = input.value.trim();
            if (!txt) return;

            console.log("Sending chat message:", txt);

            this.ui.addChatMessage(txt, 'user');
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            this.ui.showTypingIndicator(true);

            try {
                const chatResult = await apiService.chat(txt);
                console.log("AI response:", chatResult);

                this.ui.addChatMessage(chatResult.reply, 'ai');

                if (chatResult.selected_locations && chatResult.selected_locations.length > 0) {
                    console.log("AI suggested", chatResult.selected_locations.length, "locations");
                    this.state.allSuggestions = chatResult.selected_locations;
                    this.updateSuggestionUI();

                    this.ui.addChatMessage(`
                        <span style="font-size:0.85rem; color:#137333;">
                        <i class="fas fa-check-circle"></i> Tôi đã cập nhật 
                        <strong>${chatResult.selected_locations.length}</strong> gợi ý 
                        mới vào Panel bên phải.
                        </span>
                    `, 'ai');
                }

            } catch (error) {
                this.ui.addChatMessage("Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.", 'ai');
                console.error("Chatbot Error:", error);
            } finally {
                this.ui.showTypingIndicator(false);
                input.disabled = false;
                sendBtn.disabled = false;
                input.focus();
            }
        };

        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }

    openChatContext(contextName) {
        if (!document.body.classList.contains('chat-open')) {
            document.getElementById('floating-chat-btn').click();
        }
        document.getElementById('chat-input').value = `Gợi ý các địa điểm tương tự như ${contextName}`;
    }
}

const app = new AppController();
window.App = app;