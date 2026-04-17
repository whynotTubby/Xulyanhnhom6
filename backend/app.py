from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
import numpy as np # Thư viện vừa cài

app = Flask(__name__)
CORS(app)

def image_to_base64(img):
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"

@app.route('/api/process', methods=['POST'])
def process_image():
    file = request.files.get('image')
    action = request.form.get('action')
    if not file: return jsonify({"success": False}), 400

    img = Image.open(file).convert('RGB')

    # XỬ LÝ FILTER
    if action == 'filter':
        f_type = request.form.get('filter_type')
        if f_type == 'sharpen':
            img = img.filter(ImageFilter.SHARPEN)
        elif f_type == 'blur':
            img = img.filter(ImageFilter.BLUR)
        elif f_type == 'grayscale':
            img = img.convert('L').convert('RGB')
        elif f_type == 'negative':
            data = 255 - np.array(img)
            img = Image.fromarray(data.astype(np.uint8))
        elif f_type == 'sepia':
            data = np.array(img)
            r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
            tr = 0.393 * r + 0.769 * g + 0.189 * b
            tg = 0.349 * r + 0.686 * g + 0.168 * b
            tb = 0.272 * r + 0.534 * g + 0.131 * b
            data[:,:,0], data[:,:,1], data[:,:,2] = np.clip(tr,0,255), np.clip(tg,0,255), np.clip(tb,0,255)
            img = Image.fromarray(data.astype(np.uint8))

    # XỬ LÝ XOAY / LẬT
    elif action == 'rotate':
        img = img.rotate(-90, expand=True)
    elif action == 'flip_h':
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    elif action == 'flip_v':
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

    # XỬ LÝ SÁNG / TƯƠNG PHẢN
    # Tìm trong hàm process_image(), phần action == 'adjust' và sửa lại:
    elif action == 'adjust':
        b_factor = (float(request.form.get('brightness', 0)) + 100) / 100.0
        c_factor = (float(request.form.get('contrast', 0)) + 100) / 100.0
        s_factor = (float(request.form.get('saturation', 0)) + 100) / 100.0 # Mới
        
        img = ImageEnhance.Brightness(img).enhance(b_factor)
        img = ImageEnhance.Contrast(img).enhance(c_factor)
        img = ImageEnhance.Color(img).enhance(s_factor) # Chỉnh độ bão hòa

    return jsonify({"success": True, "result": image_to_base64(img)})

if __name__ == '__main__':
    app.run(port=5001, debug=True)