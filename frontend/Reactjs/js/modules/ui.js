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

        // --- DRAG & DROP STATE ---
        // Store these at the class level so they can be shared between events
        this.dragItem = null;
        this.dragPlaceholder = null;
        
        // Initialize drag and drop for container
        this._initializeContainerDragDrop();
    }

    /**
     * Initialize drag and drop logic on the container
     * (Centralized logic for sorting)
     */
    _initializeContainerDragDrop() {
        const container = this.dom.lists.routeSteps;
        if (!container) return;

        // 1. DRAG OVER: Calculate position and move the placeholder
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow dropping
            
            // Only run if we are dragging a route step (checked via class property)
            if (!this.dragItem) return;

            container.classList.add('dragging-active');

            const afterElement = this._getDragAfterElement(container, e.clientY);
            
            // Move the placeholder to the correct position
            if (afterElement == null) {
                container.appendChild(this.dragPlaceholder);
            } else {
                container.insertBefore(this.dragPlaceholder, afterElement);
            }
        });

        // 2. DRAG LEAVE: styling only
        container.addEventListener('dragleave', (e) => {
            if (e.target === container) {
                container.classList.remove('dragging-active');
            }
        });

        // 3. DROP: styling only (Actual move happens in dragend)
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('dragging-active');
        });
    }

    /**
     * Helper: Determine where to insert the element based on mouse Y position
     */
    _getDragAfterElement(container, y) {
        // Get all items except the one currently being dragged (marked by .dragging)
        const draggableElements = [...container.querySelectorAll('.route-step-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    navigateTo(viewName) {
        const isMobile = window.innerWidth <= 768;

        if (viewName === 'summary') {
            this.dom.panels.builder.style.display = 'none';
            this.dom.panels.summary.style.display = 'block';

            if (isMobile) {
                document.body.classList.add('view-summary');
                this.dom.panels.suggestion.style.display = '';
            } else {
                this.dom.panels.suggestion.classList.add('is-visible');
            }
        } else {
            this.dom.panels.builder.style.display = 'block';
            this.dom.panels.summary.style.display = 'none';
            
            if (isMobile) {
                document.body.classList.remove('view-summary');
            } else {
                this.dom.panels.suggestion.classList.remove('is-visible');
                this.dom.panels.details.style.display = 'none';
            }
        }
    }

    renderSuggestionList(dataList, excludeIds = []) {
        const container = this.dom.lists.suggestions;
        container.innerHTML = "";

        const filteredList = dataList.filter(item => !excludeIds.includes(item.id));

        if (filteredList.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#888; padding:20px; font-size:0.9rem;">Không tìm thấy địa điểm nào phù hợp hoặc bạn đã chọn hết rồi!</div>';
            return;
        }

        filteredList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'l-card';
            el.draggable = true;
            el.style.touchAction = "pan-y";

            el.innerHTML = `
                <img src="${item.img || CONFIG.DEFAULT_IMAGE}" alt="${item.name}" 
                     style="pointer-events: none;"> 
                <div style="flex:1; pointer-events: none;">
                    <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">${item.name}</h4>
                </div>
            `;
            
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = "copy";
                
                const dragImg = el.querySelector('img');
                if (dragImg) {
                    e.dataTransfer.setDragImage(dragImg, 25, 25);
                }

                el.style.opacity = "0.5";
                document.getElementById('route-steps-container').classList.add('drag-over');
            });

            el.addEventListener('dragend', () => {
                el.style.opacity = "1";
                document.getElementById('route-steps-container').classList.remove('drag-over');
            });

            el.onclick = () => {
                this.showDetailsPanel(item);
            };

            container.appendChild(el);
        });
    }

    /**
     * Add a step to the route
     */
    addStepItem(data, onDelete) {
        const container = this.dom.lists.routeSteps;
        const div = document.createElement('div');
        div.className = 'route-step-item';
        div.dataset.id = data.id;
        div.draggable = true;
        
        div.innerHTML = `
            <div class="step-drag-handle" style="cursor: grab; padding: 8px; margin-right: 8px;">
                <i class="fas fa-grip-vertical" style="color: #888;"></i>
            </div>
            <div class="step-index"></div>
            <div style="flex:1; font-weight:600; font-size:0.9rem;">${data.name}</div>
            <i class="fas fa-trash-alt" style="color:#dadce0; cursor:pointer; transition:0.2s;" 
               title="Xóa điểm này"></i>
        `;

        // Delete button
        const delBtn = div.querySelector('.fas.fa-trash-alt');
        delBtn.onmouseover = () => delBtn.style.color = 'var(--danger-color)';
        delBtn.onmouseout = () => delBtn.style.color = '#dadce0';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            div.remove();
            this._refreshStepIndices();
            if (onDelete) onDelete(data);
            this._updateRouteOrder(); // Update state after delete
        };

        // Click to view details
        div.onclick = (e) => {
            if (!e.target.closest('.fa-trash-alt') && !e.target.closest('.step-drag-handle')) {
                this.showDetailsPanel(data);
            }
        };

        // ========== DRAG START (Setup) ==========
        div.addEventListener('dragstart', (e) => {
            this.dragItem = div;
            div.classList.add('dragging');
            div.style.opacity = '0.4';

            // Create Placeholder
            this.dragPlaceholder = document.createElement('div');
            this.dragPlaceholder.className = 'route-step-placeholder';
            this.dragPlaceholder.style.cssText = `
                height: ${div.offsetHeight}px;
                background: linear-gradient(90deg, #e8f5e9 0%, #c8e6c9 100%);
                border: 2px dashed #2D6A4F;
                border-radius: 8px;
                margin: 8px 0;
            `;

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', div.innerHTML);
        });

        // ========== DRAG END (Finalize) ==========
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            div.style.opacity = '1';

            // Replace the placeholder with the real item
            if (this.dragPlaceholder && this.dragPlaceholder.parentNode) {
                this.dragPlaceholder.parentNode.replaceChild(div, this.dragPlaceholder);
            }

            // Cleanup
            this.dragItem = null;
            this.dragPlaceholder = null;
            
            // Clean styles
            container.querySelectorAll('.route-step-item').forEach(item => {
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });

            // Update indices and data
            this._updateRouteOrder();
            this._refreshStepIndices();
        });

        // Note: 'dragover' and 'drop' are now handled by the CONTAINER in _initializeContainerDragDrop

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
            if (location) {
                newOrder.push(location);
            }
        });

        window.App.state.route = newOrder;
        console.log("🔄 Route order updated:", newOrder.map(l => l.name));
        
        if (newOrder.length >= 2) {
            window.App.refreshMapState();
        }
    }

    _refreshStepIndices() {
        const steps = this.dom.lists.routeSteps.querySelectorAll('.step-index');
        steps.forEach((el, index) => {
            el.innerText = index + 1;
        });
    }

    showDetailsPanel(data) {
        const panel = this.dom.panels.details;
        const content = document.getElementById('details-content');
        
        panel.style.display = 'flex';
        
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

            <button class="primary-btn" onclick="
                window.App.addLocationToRoute(${JSON.stringify(data).replace(/"/g, '&quot;')});
                document.getElementById('details-panel').style.display = 'none';
            ">
                <i class="fas fa-plus-circle"></i> Thêm vào lộ trình
            </button>
        `;
    }

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
}