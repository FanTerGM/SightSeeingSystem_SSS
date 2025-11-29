/**
 * MAIN CONTROLLER
 * "Bộ não" điều khiển toàn bộ ứng dụng.
 */

import { apiService } from './services/api.js';
import { MapModule } from './modules/map.js';
import { UIModule } from './modules/ui.js';

class AppController {
    constructor() {
        // 1. Khởi tạo các Module con
        this.map = new MapModule('big-map');
        this.ui = new UIModule();

        // 2. Quản lý State (Trạng thái dữ liệu)
        this.state = {
            route: [],          // Danh sách các điểm đang có trong lộ trình (cột bên trái)
            allSuggestions: [], // Danh sách tất cả gợi ý lấy từ API (cột bên phải)
            isRouting: false 
        };

        // 3. Chạy ứng dụng
        this.init();
    }

    async init() {
        console.log("🚀 App đang khởi động...");
        
        // Cài đặt lắng nghe sự kiện (Click, Submit, Drag...)
        this.setupEventListeners();
        
        // Tải dữ liệu ban đầu
        await this.loadInitialData();
    }

    // --- A. DATA & API ---

    async loadInitialData() {
        try {
            // Gọi API lấy danh sách gợi ý gốc
            this.state.allSuggestions = await apiService.getSuggestions();
            
            // Cập nhật giao diện (Có lọc những điểm đã chọn)
            this.updateSuggestionUI();
        } catch (error) {
            console.error("Lỗi tải data:", error);
        }
    }

    /**
     * HÀM MỚI: Cập nhật danh sách gợi ý
     * Tự động ẩn những điểm đã có trong lộ trình (this.state.route)
     */
    updateSuggestionUI() {
        // 1. Lấy danh sách ID của các điểm đang nằm trong lộ trình
        const currentRouteIds = this.state.route.map(item => item.id);
        
        // 2. Gọi UI để render, truyền vào danh sách 'đen' (cần ẩn đi)
        this.ui.renderSuggestionList(this.state.allSuggestions, currentRouteIds);
    }

    // --- B. QUẢN LÝ LỘ TRÌNH (CORE LOGIC) ---

    /**
     * Thêm một địa điểm vào lộ trình
     */
    addLocationToRoute(locationData, shouldRefreshMap = true) {
        // Kiểm tra xem điểm này đã có trong lộ trình chưa
        const exists = this.state.route.find(i => i.id === locationData.id);
        if (exists) return; // Nếu có rồi thì thôi, không thêm nữa

        // 1. Cập nhật State: Thêm vào mảng route
        this.state.route.push(locationData);

        // 2. Cập nhật UI: Thêm thẻ vào cột bên trái
        this.ui.addStepItem(locationData, (deletedItem) => {
            this.removeLocation(deletedItem); // Callback khi bấm nút xóa
        });

        // 3. QUAN TRỌNG: Cập nhật lại danh sách gợi ý để ẩn điểm vừa chọn đi
        this.updateSuggestionUI();

        // 4. Vẽ lại bản đồ
        if (shouldRefreshMap) {
            this.refreshMapState();
        }
    }

    /**
     * Xóa địa điểm khỏi lộ trình
     */
    removeLocation(locationData) {
        // 1. Lọc bỏ item khỏi mảng state
        this.state.route = this.state.route.filter(item => item.id !== locationData.id);
        
        // 2. QUAN TRỌNG: Cập nhật lại danh sách gợi ý để hiện lại điểm vừa xóa
        this.updateSuggestionUI();
        
        // 3. Vẽ lại bản đồ sau khi xóa
        this.refreshMapState();
    }

    /**
     * Vẽ lại Marker và Đường đi
     */
    async refreshMapState() {
        const updateBtn = document.getElementById('update-map-btn');
        if (updateBtn) this.ui.setLoading(updateBtn, true);

        try {
            // 1. Vẽ các điểm Marker
            this.map.drawMarkers(this.state.route);

            // 2. Nếu có >= 2 điểm thì vẽ đường nối
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

    // --- C. XỬ LÝ SỰ KIỆN (EVENT HANDLERS) ---

    setupEventListeners() {
        // 1. Form Submit
        const form = document.getElementById('route-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // 2. Drag & Drop
        this.setupDragAndDrop();

        // 3. Nút "Chỉnh sửa lại"
        document.getElementById('edit-route-btn').onclick = () => {
            this.ui.navigateTo('builder');
            this.map.clearRoute(); 
            this.state.route = []; // Xóa hết lộ trình làm lại từ đầu
            document.getElementById('route-steps-container').innerHTML = '';
            
            // Hiện lại tất cả gợi ý vì lộ trình đã trống
            this.updateSuggestionUI();
        };

        // 4. Nút cập nhật bản đồ
        document.getElementById('update-map-btn').onclick = () => this.refreshMapState();

        // 5. Các nút đóng/mở Panel
        this.setupPanelControls();

        // 6. Chatbot
        this.setupChat();

        // 7. Sự kiện từ Popup bản đồ
        window.addEventListener('chat-request', (e) => {
            this.openChatContext(e.detail);
        });

        // 8. TÌM KIẾM (REAL-TIME SEARCH)
        const searchInput = document.querySelector('.search-box-wrapper input');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                // Debounce: Chờ người dùng ngừng gõ 0.5s mới tìm
                clearTimeout(timeout);
                timeout = setTimeout(async () => {
                    const keyword = e.target.value;
                    
                    // Gọi API lấy danh sách mới theo từ khóa
                    this.state.allSuggestions = await apiService.getSuggestions(keyword);
                    
                    // Render lại (tự động trừ các điểm đang chọn trong lộ trình)
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

            const [startData, endData] = await Promise.all([
                apiService.getLocationDetails(startName),
                apiService.getLocationDetails(endName)
            ]);

            // Reset lộ trình cũ
            this.state.route = [];
            document.getElementById('route-steps-container').innerHTML = '';

            // Thêm 2 điểm mới vào
            this.addLocationToRoute(startData, false);
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

        const sendMessage = () => {
            const txt = input.value.trim();
            if (!txt) return;

            this.ui.addChatMessage(txt, 'user');
            input.value = '';

            this.ui.showTypingIndicator(true);
            setTimeout(() => {
                this.ui.showTypingIndicator(false);
                this.ui.addChatMessage(`Tôi đã nhận được yêu cầu: "${txt}".`, 'ai');
            }, 1000);
        };

        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    }

    openChatContext(contextName) {
        if (!document.body.classList.contains('chat-open')) {
            document.getElementById('floating-chat-btn').click();
        }
        this.ui.addChatMessage(`Bạn muốn biết thêm thông tin gì về <strong>${contextName}</strong>?`, 'ai');
    }
}

// Khởi chạy App
const app = new AppController();
window.App = app;