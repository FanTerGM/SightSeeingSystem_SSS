// 1. Quản lý Chat AI Pop-up
function initAIChat() {
    const chatButton = document.getElementById("ai-chat-button");
    const chatContainer = document.getElementById("ai-chat-container");
    const closeChatBtn = document.getElementById("close-chat-btn");

    if (chatButton && chatContainer && closeChatBtn) {
        chatButton.addEventListener("click", () => {
            chatContainer.style.display = "flex"; 
        });
        closeChatBtn.addEventListener("click", () => {
            chatContainer.style.display = "none";
        });
    }
}

// 2. Quản lý Thu/Mở Panel Trái
function initTogglePanel(mapInstance) {
    const togglePanelBtn = document.getElementById("toggle-panel-btn");
    
    if (togglePanelBtn) {
        const toggleIcon = togglePanelBtn.querySelector("i");
        togglePanelBtn.addEventListener("click", () => {
            document.body.classList.toggle("panel-collapsed");

            if (document.body.classList.contains("panel-collapsed")) {
                toggleIcon.className = "fas fa-chevron-right";
                togglePanelBtn.title = "Mở bảng điều khiển";
            } else {
                toggleIcon.className = "fas fa-chevron-left";
                togglePanelBtn.title = "Thu bảng điều khiển";
            }
            // Cập nhật map sau khi animation xong
            setTimeout(() => {
                if(mapInstance) mapInstance.invalidateSize();
            }, 300);
        });
    }
}

// 3. Quản lý Panel Chi Tiết (Bên phải)
function updateDetailsPanel(selectedItems) {
    const detailsPanel = document.getElementById('details-panel');
    const detailsContent = document.getElementById('details-content');
    const errorMsg = document.getElementById('modify-error-message');

    if(errorMsg) errorMsg.style.display = 'none';

    if (selectedItems.length === 1) {
        const locationName = selectedItems[0].dataset.locationName;
        detailsPanel.style.display = 'flex';
        document.body.classList.add('details-panel-visible');

        // Render nội dung chi tiết
        detailsContent.innerHTML = `
            <h3>${locationName}</h3>
            <img src="https://via.placeholder.com/300x150.png?text=${locationName.replace(/ /g, '+')}"
                 alt="Ảnh ${locationName}"
                 style="width: 100%; border-radius: 8px; margin-bottom: 15px;">
            <p>Đây là nội dung mô tả chi tiết về <strong>${locationName}</strong>.</p>
            <p>Thông tin được trích xuất từ hệ thống dữ liệu du lịch.</p>
        `;
    } else {
        detailsPanel.style.display = 'none';
        document.body.classList.remove('details-panel-visible');
    }
}

// Xuất các hàm ra ngoài để file khác dùng được
window.UI = {
    initAIChat,
    initTogglePanel,
    updateDetailsPanel
};