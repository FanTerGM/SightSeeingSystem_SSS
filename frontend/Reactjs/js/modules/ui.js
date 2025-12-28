import { CONFIG } from '../config.js';

export class UIModule {
    constructor() {
        // Cache DOM elements
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

        // State kéo thả
        this.dragItem = null;
        this.dragPlaceholder = null;
        this._initializeContainerDragDrop();
    }

    // --- HÀM HỖ TRỢ LỌC ĐỊA CHỈ (MỚI THÊM) ---
    _cleanAddress(name, address) {
        if (!address) return '';
        if (address.toLowerCase().startsWith(name.toLowerCase())) {
            return address.substring(name.length).replace(/^[\s,.-]+/, '');
        }
        return address;
    }

    // --- LOGIC KÉO THẢ (GIỮ NGUYÊN) ---
    _initializeContainerDragDrop() {
        const container = this.dom.lists.routeSteps;
        if (!container) return;

        container.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if (!this.dragItem) return;
            container.classList.add('dragging-active');
            const afterElement = this._getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(this.dragPlaceholder);
            } else {
                container.insertBefore(this.dragPlaceholder, afterElement);
            }
        });

        container.addEventListener('dragleave', (e) => {
            if (e.target === container) container.classList.remove('dragging-active');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('dragging-active');
        });
    }

    _getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.route-step-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- CẬP NHẬT: DANH SÁCH GỢI Ý (ĐÃ SỬA LỖI LẶP ĐỊA CHỈ) ---
    renderSuggestionList(dataList, excludeIds = []) {
        const container = this.dom.lists.suggestions;
        container.innerHTML = "";

        const filteredList = dataList.filter(item => !excludeIds.includes(item.id));

        if (filteredList.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#888; padding:20px; font-size:0.9rem;">Không tìm thấy địa điểm nào phù hợp!</div>';
            return;
        }

        filteredList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'l-card';
            el.draggable = true;
            el.style.touchAction = "pan-y";
            
            // Xử lý địa chỉ sạch sẽ trước khi render
            const cleanAddr = this._cleanAddress(item.name, item.address);

            el.innerHTML = `
                <img src="${item.img || CONFIG.DEFAULT_IMAGE}" alt="${item.name}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'" style="pointer-events: none;"> 
                <div style="flex:1; pointer-events: none; overflow: hidden;">
                    <h4 style="margin:0; font-size:0.95rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</h4>
                    <p style="margin:4px 0 0 0; font-size:0.8rem; color:#666; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">
                        ${cleanAddr || 'Việt Nam'}
                    </p>
                </div>
                <i class="fas fa-plus-circle" style="color:var(--primary-color); font-size:1.2rem;"></i>
            `;
            
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = "copy";
            });

            el.onclick = () => {
                if (window.innerWidth <= 768) {
                    if (window.App) window.App.addLocationToRoute(item);
                    const panel = document.getElementById('suggestion-panel');
                    if (panel) panel.classList.remove('is-visible');
                } else {
                    this.showDetailsPanel(item);
                }
            };

            container.appendChild(el);
        });
    }

    addStepItem(data, onDelete) {
        const container = this.dom.lists.routeSteps;
        const div = document.createElement('div');
        div.className = 'route-step-item';
        div.dataset.id = data.id;
        div.draggable = true;
        
        div.innerHTML = `
            <div class="step-drag-handle" style="cursor: grab; padding: 8px; margin-right: 8px;">
                <i class="fas fa-grip-vertical" style="color: #bbb;"></i>
            </div>
            <div class="step-index"></div>
            <div style="flex:1; font-weight:600; font-size:0.9rem;">${data.name}</div>
            <i class="fas fa-trash-alt" title="Xóa điểm này" style="cursor:pointer; color:#dadce0;"></i>
        `;

        const delBtn = div.querySelector('.fa-trash-alt');
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            div.remove();
            this._refreshStepIndices();
            if (onDelete) onDelete(data);
            this._updateRouteOrder(); 
        };

        div.onclick = (e) => {
            if (!e.target.closest('.fa-trash-alt') && !e.target.closest('.step-drag-handle')) {
                this.showDetailsPanel(data);
            }
        };

        div.addEventListener('dragstart', (e) => {
            this.dragItem = div;
            div.classList.add('dragging');
            div.style.opacity = '0.4';
            this.dragPlaceholder = document.createElement('div');
            this.dragPlaceholder.className = 'route-step-placeholder';
            this.dragPlaceholder.style.cssText = `height: ${div.offsetHeight}px; background: linear-gradient(90deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px dashed #2D6A4F; border-radius: 8px; margin: 8px 0;`;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', div.innerHTML); 
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            div.style.opacity = '1';
            if (this.dragPlaceholder && this.dragPlaceholder.parentNode) {
                this.dragPlaceholder.parentNode.replaceChild(div, this.dragPlaceholder);
            }
            this.dragItem = null;
            this.dragPlaceholder = null;
            this._updateRouteOrder();
            this._refreshStepIndices();
        });

        container.appendChild(div);
        this._refreshStepIndices();
    }

    _updateRouteOrder() {
        if (!window.App) return;
        const container = this.dom.lists.routeSteps;
        const items = container.querySelectorAll('.route-step-item');
        const newOrder = [];
        items.forEach(item => {
            const id = item.dataset.id;
            const location = window.App.state.route.find(loc => loc.id == id);
            if (location) newOrder.push(location);
        });
        window.App.state.route = newOrder;
        if (newOrder.length >= 2) window.App.refreshMapState();
    }

    // --- CẬP NHẬT: BẢNG CHI TIẾT (ĐÃ SỬA LỖI LẶP ĐỊA CHỈ) ---
    showDetailsPanel(data) {
        const panel = document.getElementById('details-panel');
        const content = document.getElementById('details-content');
        
        if (!panel || !content) return;

        // Xử lý địa chỉ sạch sẽ cho bảng chi tiết
        const cleanAddr = this._cleanAddress(data.name, data.address);

        content.innerHTML = `
            <div style="position: relative;">
                <img src="${data.img || CONFIG.DEFAULT_IMAGE}" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
                <span style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 10px; border-radius:6px; font-size:0.8rem; font-weight:500;">
                    <i class="fas fa-tag"></i> ${data.price || 'Miễn phí'}
                </span>
            </div>
            
            <div class="detail-title-group">
                <h3 class="detail-name">${data.name}</h3>
                <div class="detail-address">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${cleanAddr || 'Việt Nam'}</span>
                </div>
            </div>

            <p style="color:#444; line-height:1.6; font-size:0.95rem; text-align: justify;">
                ${data.desc || 'Chưa có mô tả chi tiết cho địa điểm này. Bạn có thể hỏi AI để biết thêm thông tin!'}
            </p>

            <button onclick="window.dispatchEvent(new CustomEvent('chat-request', {detail: '${data.name}'}))" 
                style="width:100%; padding:14px; background:var(--bg-body); border:1px solid var(--primary-color); color:var(--primary-color); border-radius:10px; font-weight:600; cursor:pointer; margin-top:20px; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s;">
                <i class="fas fa-robot"></i> Hỏi AI về địa điểm này
            </button>
        `;

        panel.style.setProperty('display', 'flex', 'important');
    }

    addChatMessage(text, type) {
        const msgs = this.dom.chat.messages;
        const div = document.createElement('div');
        div.className = `message msg-${type}`;
        
        if (type === 'ai') {
            div.style.cssText = "background:#fff; padding:12px; margin-top:10px; border-radius: 12px 12px 12px 0; box-shadow: var(--shadow-sm); width: 85%; align-self: flex-start; border: 1px solid #eee;";
        } else {
            div.style.cssText = "background:var(--accent-color); color:white; padding:10px 14px; margin-top:10px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(231, 111, 81, 0.2); align-self: flex-end; max-width: 80%;";
        }
        
        div.innerHTML = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    showTypingIndicator(show) {
        this.dom.chat.indicator.style.display = show ? 'block' : 'none';
        if (show) {
            this.dom.chat.messages.scrollTop = this.dom.chat.messages.scrollHeight;
        }
    }

    _refreshStepIndices() {
        const steps = this.dom.lists.routeSteps.querySelectorAll('.step-index');
        steps.forEach((el, index) => {
            el.innerText = index + 1;
        });
    }
}