/**
 * MAIN CONTROLLER - Đã gộp đầy đủ tính năng: Toggle Map & Floating Back Button
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
        console.log("🚀 App đang khởi động...");
        this.setupEventListeners();
        await this.loadInitialData();
    }

    async loadInitialData() {
        try {
            // Tải dữ liệu gợi ý ban đầu (ví dụ: tất cả locations)
            this.state.allSuggestions = await apiService.getSuggestions(); 
            this.updateSuggestionUI();
        } catch (error) {
            console.error("Lỗi tải data:", error);
        }
    }

    updateSuggestionUI() {
        const currentRouteIds = this.state.route.map(item => item.id);
        this.ui.renderSuggestionList(this.state.allSuggestions, currentRouteIds);
    }

    // --- QUẢN LÝ LỘ TRÌNH (Giữ nguyên) ---
    addLocationToRoute(locationData, shouldRefreshMap = true) {
        const exists = this.state.route.find(i => i.id === locationData.id);
        if (exists) return; 

        this.state.route.push(locationData);
        this.ui.addStepItem(locationData, (deletedItem) => {
            this.removeLocation(deletedItem); 
        });
        this.updateSuggestionUI();
        if (shouldRefreshMap) {
            this.refreshMapState();
        }
    }

    removeLocation(locationData) {
        this.state.route = this.state.route.filter(item => item.id !== locationData.id);
        this.updateSuggestionUI();
        this.refreshMapState();
    }

    async refreshMapState() {
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) this.ui.setLoading(updateBtn, true);

        try {
            this.map.drawMarkers(this.state.route);
            if (this.state.route.length >= 2) {
                const routeResult = await apiService.calculateRoute(this.state.route);
                if (routeResult && routeResult.path) {
                    this.map.drawPolyline(routeResult.path);
                }
            }
        } catch (err) {
            console.error("Lỗi cập nhật bản đồ:", err);
        } finally {
            if (updateBtn) setTimeout(() => this.ui.setLoading(updateBtn, false), 500);
        }
    }

    // --- XỬ LÝ SỰ KIỆN (Giữ nguyên phần lớn) ---
    setupEventListeners() {
        // 1. Form Submit
        const form = document.getElementById('route-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 2. Drag & Drop
        this.setupDragAndDrop();

        // 3. Nút "Chỉnh sửa lại" (Nút cũ ở dưới đáy - Dành cho PC)
        const editBtn = document.getElementById('edit-route-btn');
        if(editBtn) {
            editBtn.onclick = () => {
                this.ui.navigateTo('builder');
                this.map.clearRoute(); 
                this.state.route = []; 
                document.getElementById('route-steps-container').innerHTML = '';
                this.updateSuggestionUI();
            };
        }

        // --- 4. NÚT QUAY LẠI NỔI (FLOATING BACK BUTTON) ---
        const floatingBackBtn = document.getElementById('floating-back-btn');
        if (floatingBackBtn) {
            floatingBackBtn.onclick = () => {
                this.ui.navigateTo('builder');
                
                if (document.body.classList.contains('full-map')) {
                    document.getElementById('mobile-map-toggle').click();
                }
            };
        }

        // 5. Nút Toggle Map (Mũi tên mở rộng bản đồ - Góc phải dưới)
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
        
        // 6. Cập nhật map khi resize (quan trọng cho mobile transition)
        const observer = new MutationObserver(() => {
             setTimeout(() => { this.map.map.invalidateSize(); }, 350);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // 7. Các nút chức năng khác (Giữ nguyên)
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) updateBtn.onclick = () => this.refreshMapState();
        
        this.setupPanelControls();
        this.setupChat(); // <-- Đã được sửa logic
        
        window.addEventListener('chat-request', (e) => {
            this.openChatContext(e.detail);
        });

        const searchInput = document.querySelector('.search-box-wrapper input');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(async () => {
                    const keyword = e.target.value;
                    this.state.allSuggestions = await apiService.getSuggestions(keyword);
                    this.updateSuggestionUI();
                }, 500); 
            });
        }
    }

   async handleFormSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
        submitBtn.disabled = true;

        try {
            const startName = document.getElementById('start-point').value;
            const endName = document.getElementById('end-point').value;
            // 1. Lấy số lượng điểm ghé từ input
            const waypointCount = parseInt(document.getElementById('waypointCount').value) || 0;

            const [startData, endData] = await Promise.all([
                apiService.getLocationDetails(startName),
                apiService.getLocationDetails(endName)
            ]);

            // Reset lộ trình hiện tại
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
            alert("Có lỗi khi tìm địa điểm. Vui lòng thử lại!");
            console.error(err);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('route-steps-container');
        if(!dropZone) return;

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

    // --- LOGIC CHAT MỚI ---
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
            
            // 1. Thêm tin nhắn của user
            this.ui.addChatMessage(txt, 'user');
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            this.ui.showTypingIndicator(true);

            try {
                // 2. Gọi API Chatbot mới
                const chatResult = await apiService.chat(txt);
                
                // 3. Hiển thị phản hồi từ AI
                this.ui.addChatMessage(chatResult.reply, 'ai');
                
                // 4. Nếu AI có gợi ý địa điểm, cập nhật danh sách gợi ý
                if (chatResult.selected_locations && chatResult.selected_locations.length > 0) {
                    // Cập nhật state với gợi ý mới và refresh UI
                    this.state.allSuggestions = chatResult.selected_locations; 
                    this.updateSuggestionUI();
                    
                    // Thêm thông báo nhẹ cho user biết
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
        // Gửi tin nhắn tự động vào chat
        document.getElementById('chat-input').value = `Gợi ý các địa điểm tương tự như ${contextName}`;
        // (Tùy chọn: Gọi sendMessage() tự động hoặc chờ user nhấn Enter)
        // document.getElementById('send-msg-btn').click();
    }
}

const app = new AppController();
window.App = app;