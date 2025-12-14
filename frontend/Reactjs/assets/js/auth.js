document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector(".login-form");
    // Nếu không phải trang đăng nhập thì dừng lại
    if (!loginForm) return;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const infoBox = document.querySelector(".info-box");
    const originalInfoText = infoBox ? infoBox.innerHTML : "";

    function showError(message) {
        if(infoBox) {
            infoBox.innerHTML = `⛔ ${message}`;
            infoBox.classList.add("error");
        }
    }

    function resetInfoBox() {
        if(infoBox) {
            infoBox.innerHTML = originalInfoText;
            infoBox.classList.remove("error");
        }
    }

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        // Logic check tài khoản (Giả lập)
        if (email === "admin@gmail.com" && password === "123456789") {
            infoBox.innerHTML = "✅ Đăng nhập thành công! Đang chuyển hướng...";
            infoBox.classList.remove("error");
            
            // CHUYỂN HƯỚNG SANG TRANG MAP
            setTimeout(() => {
                window.location.href = "map.html"; 
            }, 1000);

        } else if (email === "user@gmail.com" && password === "123456789") {
            showError("Tài khoản chưa kích hoạt. Vui lòng kiểm tra email.");
        } else {
            showError("Sai email hoặc mật khẩu. Vui lòng thử lại.");
        }
    });

    if(emailInput) emailInput.addEventListener("input", resetInfoBox);
    if(passwordInput) passwordInput.addEventListener("input", resetInfoBox);
});