import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from inference import predict_face_shape_rgb


load_dotenv()

app = Flask(__name__)
CORS(app)


# =========================
# CONFIG
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    os.path.join(BASE_DIR, "model", "rgb_vggface_best_20260504_1335.keras")
)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
DEBUG_FOLDER = os.path.join(BASE_DIR, "debug")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DEBUG_FOLDER, exist_ok=True)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Face shape Flask backend is running"
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH)
    })


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({
            "error": "No image file uploaded. Use form-data key named 'image'."
        }), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({
            "error": "Empty filename."
        }), 400

    original_filename = secure_filename(image_file.filename)
    extension = os.path.splitext(original_filename)[1].lower()

    if extension == "":
        extension = ".jpg"

    unique_id = uuid.uuid4().hex

    image_path = os.path.join(UPLOAD_FOLDER, f"{unique_id}{extension}")
    debug_path = os.path.join(DEBUG_FOLDER, f"debug_{unique_id}.jpg")

    try:
        image_file.save(image_path)

        result = predict_face_shape_rgb(
            image_path=image_path,
            model_path=MODEL_PATH,
            debug_path=debug_path
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )