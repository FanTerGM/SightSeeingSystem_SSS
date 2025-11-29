import { CONFIG } from '../config.js';

export class UIModule {
    constructor() {
        // Cache các DOM element thường dùng để tăng hiệu năng
        this.dom = {
            panels: {
                builder: document.getElementById('route-builder'),
                summary: document.getElementById('route-summary'),
                suggestion: document.getElementById('suggestion-panel'),
                details: document.getElementById('details-panel')
            },
            lists: {
                suggestions: document.getElementById('suggestion-list'),
                routeSteps: document.getElementById('route-steps-container')
            },
            chat: {
                messages: document.getElementById('chat-messages'),
                indicator: document.getElementById('typing-indicator')
            }
        };
    }

    /**
     * Chuyển đổi giữa các màn hình (Builder <-> Summary)
     * @param {string} viewName - 'builder' hoặc 'summary'
     */
    navigateTo(viewName) {
        if (viewName === 'summary') {
            this.dom.panels.builder.style.display = 'none';
            this.dom.panels.summary.style.display = 'block';
            this.dom.panels.suggestion.classList.add('is-visible');
        } else {
            this.dom.panels.builder.style.display = 'block';
            this.dom.panels.summary.style.display = 'none';
            this.dom.panels.suggestion.classList.remove('is-visible');
            this.dom.panels.details.style.display = 'none';
        }
    }

    /**
     * Render danh sách địa điểm gợi ý (Bên phải màn hình)
     * @param {Array} dataList - Danh sách tất cả gợi ý từ API
     * @param {Array} excludeIds - Danh sách ID các điểm đã có trong lộ trình (cần ẩn đi)
     */
    renderSuggestionList(dataList, excludeIds = []) {
        const container = this.dom.lists.suggestions;
        container.innerHTML = ""; // Xóa cũ

        // LỌC DỮ LIỆU: Chỉ giữ lại những item KHÔNG có trong danh sách loại trừ
        const filteredList = dataList.filter(item => !excludeIds.includes(item.id));

        if (filteredList.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#888; padding:20px; font-size:0.9rem;">Không tìm thấy địa điểm nào phù hợp hoặc bạn đã chọn hết rồi!</div>';
            return;
        }

        filteredList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'l-card';
            el.draggable = true; // Cho phép kéo
            
            // HTML cho thẻ card
            el.innerHTML = `
                <img src="${item.img || CONFIG.DEFAULT_IMAGE}" alt="${item.name}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">${item.name}</h4>
                    <p style="margin:2px 0 0 0; font-size:0.75rem; color:var(--text-sec);">
                        ${item.address ? item.address.substring(0, 35) + '...' : ''}
                    </p>
                </div>
                <i class="fas fa-grip-vertical" style="color:#ddd;"></i>
            `;
            
            // Xử lý sự kiện Kéo (Drag Start)
            el.addEventListener('dragstart', (e) => {
                // Đóng gói data thành JSON để gửi sang Main Controller
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = "copy";
                
                // Hiệu ứng mờ khi kéo
                el.style.opacity = "0.5";
                document.getElementById('route-steps-container').classList.add('drag-over');
            });

            el.addEventListener('dragend', () => {
                el.style.opacity = "1";
                document.getElementById('route-steps-container').classList.remove('drag-over');
            });

            // Click thì xem chi tiết
            el.onclick = () => this.showDetailsPanel(item);

            container.appendChild(el);
        });
    }

    /**
     * Thêm một bước vào lộ trình (Cột bên trái)
     * @param {Object} data - Dữ liệu địa điểm
     * @param {Function} onDelete - Callback gọi khi user xóa item
     */
    addStepItem(data, onDelete) {
        const container = this.dom.lists.routeSteps;
        const div = document.createElement('div');
        div.className = 'route-step-item';
        div.dataset.id = data.id; // Lưu ID để dễ tìm
        
        div.innerHTML = `
            <div class="step-index"></div>
            <div style="flex:1; font-weight:600; font-size:0.9rem;">${data.name}</div>
            <i class="fas fa-trash-alt" style="color:#dadce0; cursor:pointer; transition:0.2s;" 
               title="Xóa điểm này"></i>
        `;

        // Xử lý nút xóa
        const delBtn = div.querySelector('.fas.fa-trash-alt');
        delBtn.onmouseover = () => delBtn.style.color = 'var(--danger-color)';
        delBtn.onmouseout = () => delBtn.style.color = '#dadce0';
        delBtn.onclick = (e) => {
            e.stopPropagation(); // Tránh kích hoạt click của cha
            div.remove(); // Xóa khỏi DOM
            this._refreshStepIndices(); // Đánh lại số thứ tự
            if (onDelete) onDelete(data); // Gọi về controller để xóa data
        };

        div.onclick = () => this.showDetailsPanel(data);

        container.appendChild(div);
        this._refreshStepIndices();
    }

    /**
     * Đánh lại số thứ tự (1, 2, 3...) cho các bước trong lộ trình
     */
    _refreshStepIndices() {
        const steps = this.dom.lists.routeSteps.querySelectorAll('.step-index');
        steps.forEach((el, index) => {
            el.innerText = index + 1;
        });
    }

    /**
     * Hiển thị Panel chi tiết (Trượt từ trái qua)
     */
    showDetailsPanel(data) {
        const panel = this.dom.panels.details;
        const content = document.getElementById('details-content');
        
        panel.style.display = 'flex';
        
        // Render nội dung chi tiết
        content.innerHTML = `
            <img src="${data.img || CONFIG.DEFAULT_IMAGE}" style="width:100%; border-radius:12px; margin-bottom:15px;" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
            <h3 style="margin:0; color:var(--primary-color); font-size:1.4rem;">${data.name}</h3>
            
            <div style="display:flex; gap:10px; margin:15px 0;">
                <span style="background:#e6f4ea; color:#137333; padding:4px 12px; border-radius:16px; font-size:0.85rem; font-weight:600;">
                    <i class="fas fa-tag"></i> ${data.price}
                </span>
                <span style="background:#fce8e6; color:#c5221f; padding:4px 12px; border-radius:16px; font-size:0.85rem; font-weight:600;">
                    ${data.status}
                </span>
            </div>

            <p style="color:#5f6368; line-height:1.6; font-size:0.95rem;">
                ${data.desc || 'Chưa có mô tả chi tiết cho địa điểm này.'}
            </p>
            
            <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
            
            <p style="font-size:0.9rem; margin-bottom:5px;"><strong><i class="fas fa-map-marker-alt"></i> Địa chỉ:</strong></p>
            <p style="color:#5f6368; margin-top:0;">${data.address}</p>

            <button class="primary-btn" onclick="window.App.addLocationToRoute(${JSON.stringify(data).replace(/"/g, '&quot;')})">
                <i class="fas fa-plus-circle"></i> Thêm vào lộ trình
            </button>
        `;
    }

    /**
     * Helper: Hiển thị trạng thái Loading cho nút bấm
     */
    setLoading(btnElement, isLoading) {
        if (isLoading) {
            btnElement.dataset.originalContent = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang tải...';
            btnElement.disabled = true;
        } else {
            if (btnElement.dataset.originalContent) {
                btnElement.innerHTML = btnElement.dataset.originalContent;
            }
            btnElement.disabled = false;
        }
    }

    /**
     * Chat: Thêm tin nhắn vào khung chat
     * @param {string} text - Nội dung
     * @param {string} type - 'user' hoặc 'ai'
     */
    addChatMessage(text, type) {
        const msgs = this.dom.chat.messages;
        const div = document.createElement('div');
        div.className = `message msg-${type}`;
        // Style inline để đảm bảo hiển thị đúng nếu CSS chưa load kịp (phòng hờ)
        if (type === 'ai') {
            div.style.cssText = "background:#fff; padding:12px; margin-top:10px; border-radius: 12px 12px 12px 0; box-shadow: var(--shadow-sm); width: 85%; align-self: flex-start; border: 1px solid #eee;";
        } else {
            div.style.cssText = "background:var(--accent-color); color:white; padding:10px 14px; margin-top:10px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(231, 111, 81, 0.2); align-self: flex-end; max-width: 80%;";
        }
        
        div.innerHTML = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight; // Cuộn xuống dưới cùng
    }

    showTypingIndicator(show) {
        this.dom.chat.indicator.style.display = show ? 'block' : 'none';
        // Cuộn xuống để thấy indicator
        if (show) {
            this.dom.chat.messages.scrollTop = this.dom.chat.messages.scrollHeight;
        }
    }
}