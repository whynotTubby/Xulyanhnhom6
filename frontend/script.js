// Cấu hình địa chỉ Backend - Đảm bảo khớp với app.py của bạn
const API_URL = "http://localhost:5001/api/process";

let originalBase64 = null;  // Lưu ảnh gốc ban đầu
let currentProcessedUrl = null; // Lưu ảnh đang hiển thị
let historyStack = []; // Lưu lịch sử để Undo

const mainPreview = document.getElementById('main-preview');
const loadingOverlay = document.getElementById('loading-overlay');

// 1. XỬ LÝ CHỌN ẢNH
document.getElementById('upload').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('file-name').innerText = file.name;
    const reader = new FileReader();
    
    reader.onload = (ev) => {
        const base64 = ev.target.result;
        originalBase64 = base64;
        updateUI(base64, true); // Lưu vào history
        console.log("Đã tải ảnh lên thành công");
    };
    reader.readAsDataURL(file);
};

// 2. HÀM CẬP NHẬT GIAO DIỆN
function updateUI(base64Data, addToStack = false) {
    currentProcessedUrl = base64Data;
    mainPreview.src = base64Data;
    mainPreview.style.display = 'block';
    
    if (addToStack) {
        historyStack.push(base64Data);
        if (historyStack.length > 20) historyStack.shift();
    }
}

// 3. HÀM GỌI PYTHON (CORE LOGIC)
async function applyAction(action, extraParams = {}) {
    if (!currentProcessedUrl) {
        alert("Vui lòng tải ảnh lên trước!");
        return;
    }

    loadingOverlay.style.display = 'flex';
    console.log(`Đang gửi yêu cầu: ${action}`);

    try {
        const formData = new FormData();
        
        // CHUYỂN ẢNH ĐANG HIỂN THỊ THÀNH BLOB ĐỂ GỬI ĐI (QUAN TRỌNG ĐỂ CỘNG DỒN)
        const blob = await fetch(currentProcessedUrl).then(r => r.blob());
        formData.append('image', blob, 'image.png');
        formData.append('action', action);

        // Thêm tham số nếu là chỉnh sáng/tương phản
        if (action === 'adjust') {
    formData.append('brightness', document.getElementById('brightness').value);
    formData.append('contrast', document.getElementById('contrast').value);
    formData.append('saturation', document.getElementById('saturation').value); // Thêm dòng này
}
        
        // Thêm tham số nếu là filter
        if (extraParams.filter_type) {
            formData.append('filter_type', extraParams.filter_type);
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            updateUI(result.result, true);
            console.log("Xử lý thành công!");
        } else {
            alert("Lỗi từ Server: " + result.message);
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Không thể kết nối tới Server Python (Cổng 5001). Bạn đã chạy app.py chưa?");
    } finally {
        loadingOverlay.style.display = 'none';
        // Reset filter select về mặc định
        document.getElementById('filter-select').selectedIndex = 0;
    }
}

// 4. XỬ LÝ THANH TRƯỢT (SLIDERS)
let debounceTimer;
const sliders = ['brightness', 'contrast', 'saturation']; // Thêm saturation vào mảng
sliders.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.oninput = function() {
            // Cập nhật con số hiển thị (b lấy ký tự đầu: b, c, s)
            document.getElementById(`val-${id.charAt(0)}`).innerText = this.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => applyAction('adjust'), 300);
        };
    }
});

// 5. CÁC CHỨC NĂNG PHỤ
function undo() {
    if (historyStack.length > 1) {
        historyStack.pop(); // Bỏ cái hiện tại
        const prev = historyStack[historyStack.length - 1];
        updateUI(prev, false);
    }
}

function downloadImage() {
    if (!currentProcessedUrl) return;
    const link = document.createElement('a');
    link.download = "pixellab_output.png";
    link.href = currentProcessedUrl;
    link.click();
}

// 6. SO SÁNH BEFORE/AFTER
const compareBtn = document.getElementById('compare-btn');
compareBtn.onmousedown = () => { if(originalBase64) mainPreview.src = originalBase64; };
compareBtn.onmouseup = () => { if(currentProcessedUrl) mainPreview.src = currentProcessedUrl; };