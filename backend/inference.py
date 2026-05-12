import os
import cv2
import numpy as np
import tensorflow as tf
from mtcnn.mtcnn import MTCNN


# =========================
# LABELS
# =========================
y_label_dict = {
    0: "Heart",
    1: "Oblong",
    2: "Oval",
    3: "Round",
    4: "Square"
}


# =========================
# LOAD DETECTOR
# =========================
detector = MTCNN()


# =========================
# CROP_AND_RESIZE
# =========================
def crop_and_resize(image, target_w=224, target_h=224):
    if image.ndim == 2:
        img_h, img_w = image.shape
    elif image.ndim == 3:
        img_h, img_w, _ = image.shape
    else:
        raise ValueError("Unsupported image shape")

    target_aspect_ratio = target_w / target_h
    input_aspect_ratio = img_w / img_h

    if input_aspect_ratio > target_aspect_ratio:
        resize_w = int(input_aspect_ratio * target_h)
        resize_h = target_h

        img = cv2.resize(image, (resize_w, resize_h))

        crop_left = int((resize_w - target_w) / 2)
        crop_right = crop_left + target_w

        new_img = img[:, crop_left:crop_right]

    elif input_aspect_ratio < target_aspect_ratio:
        resize_w = target_w
        resize_h = int(target_w / input_aspect_ratio)

        img = cv2.resize(image, (resize_w, resize_h))

        crop_top = int((resize_h - target_h) / 4)
        crop_bottom = crop_top + target_h

        new_img = img[crop_top:crop_bottom, :]

    else:
        new_img = cv2.resize(image, (target_w, target_h))

    return new_img


# =========================
# EXTRACT_FACE
# =========================
def extract_face(img, target_size=(224, 224)):
    crop_info = {
        "used_mtcnn": False,
        "box": None,
        "crop_coordinates": None,
        "fallback": False
    }

    try:
        results = detector.detect_faces(img)

        if results == []:
            crop_info["fallback"] = True

            new_face = crop_and_resize(
                img,
                target_w=target_size[0],
                target_h=target_size[1]
            )

        else:
            x1, y1, width, height = results[0]["box"]
            x2, y2 = x1 + width, y1 + height

            crop_info["used_mtcnn"] = True
            crop_info["box"] = {
                "x": int(x1),
                "y": int(y1),
                "width": int(width),
                "height": int(height)
            }

            adj_h = 10

            if y1 - adj_h < 10:
                new_y1 = 0
            else:
                new_y1 = y1 - adj_h

            if y1 + height + adj_h < img.shape[0]:
                new_y2 = y1 + height + adj_h
            else:
                new_y2 = img.shape[0]

            new_height = new_y2 - new_y1
            adj_w = int((new_height - width) / 2)

            if x1 - adj_w < 0:
                new_x1 = 0
            else:
                new_x1 = x1 - adj_w

            if x2 + adj_w > img.shape[1]:
                new_x2 = img.shape[1]
            else:
                new_x2 = x2 + adj_w

            crop_info["crop_coordinates"] = {
                "x1": int(new_x1),
                "y1": int(new_y1),
                "x2": int(new_x2),
                "y2": int(new_y2)
            }

            new_face = img[new_y1:new_y2, new_x1:new_x2]

            if new_face.size == 0:
                crop_info["fallback"] = True

                new_face = crop_and_resize(
                    img,
                    target_w=target_size[0],
                    target_h=target_size[1]
                )

        sqr_img = cv2.resize(new_face, target_size)

        return sqr_img, crop_info

    except Exception as e:
        crop_info["fallback"] = True
        crop_info["error"] = str(e)

        fallback_img = crop_and_resize(
            img,
            target_w=target_size[0],
            target_h=target_size[1]
        )

        return fallback_img, crop_info


# =========================
# PREPROCESS
# =========================
def preprocess_rgb_image(image_path, debug_path=None):
    img_bgr = cv2.imread(image_path)

    if img_bgr is None:
        raise ValueError(f"Could not read image: {image_path}")

    face_bgr, crop_info = extract_face(img_bgr)

    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)

    if debug_path is not None:
        debug_bgr = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2BGR)
        cv2.imwrite(debug_path, debug_bgr)

    test_img = np.array(face_rgb, dtype=np.float32) / 255.0
    test_img = test_img.reshape(1, 224, 224, 3)

    return test_img, crop_info


# =========================
# PREDICT
# =========================
def predict_face_shape_rgb(image_path, model_path, debug_path=None):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")

    # This matches the version that worked with the local script:
    # load model during prediction, not at Flask startup.
    model = tf.keras.models.load_model(model_path, compile=False)

    test_img, crop_info = preprocess_rgb_image(
        image_path=image_path,
        debug_path=debug_path
    )

    pred = model.predict(test_img, verbose=0)[0]

    label_idx = int(np.argmax(pred))
    confidence = float(np.max(pred))

    probabilities = {
        y_label_dict[i]: round(float(p), 6)
        for i, p in enumerate(pred)
    }

    probabilities_percent = {
        y_label_dict[i]: round(float(p) * 100, 2)
        for i, p in enumerate(pred)
    }

    return {
        "face_shape": y_label_dict[label_idx],
        "confidence": round(confidence, 6),
        "confidence_percent": round(confidence * 100, 2),
        "probabilities": probabilities,
        "probabilities_percent": probabilities_percent,
        "debug": {
            "crop_info": crop_info,
            "debug_crop": debug_path
        }
    }