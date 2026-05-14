import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Upload,
  ShieldCheck,
  Loader2,
  CheckCircle,
  RotateCcw,
  Image as ImageIcon,
  X,
  ScanFace,
  LogIn,
  LogOut,
  UserRound,
  Layers,
} from "lucide-react";

import { getRecommendations } from "./utils/recommendationEngine";

import { useAuth } from "./hooks/useAuth";
import { useFavorites } from "./hooks/useFavorites";
import { useFeedback } from "./hooks/useFeedback";
import { usePredictionHistory } from "./hooks/usePredictionHistory";

import AuthModal from "./components/AuthModal";
import RecommendationGrid from "./components/RecommendationGrid";
import ProfileDrawer from "./components/ProfileDrawer";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const PREDICT_URL = `${API_BASE_URL}/predict`;

function App() {
  const [step, setStep] = useState("start");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const uploadInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { user, login, register, logout } = useAuth();

  const {
    profiles,
    profilesLoading,
    profileCount,
    maxProfiles,
    savePrediction,
    deleteProfile,
    loadProfiles,
  } = usePredictionHistory(user);

  const { isFavorite, saveFavorite, loadFavorites } = useFavorites(user);
  const { submitFeedback } = useFeedback(user);

  const recommendations = useMemo(() => {
    if (!result) return null;

    return getRecommendations(
      result?.probabilities_percent,
      result?.face_shape
    );
  }, [result]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  async function openCamera() {
    setError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera is not supported in this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraOpen(true);
    } catch {
      setError(
        "Could not open camera. Check browser permission, or use Upload Photo instead."
      );
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    canvas.width = 900;
    canvas.height = 900;

    const context = canvas.getContext("2d");

    context.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture image.");
          return;
        }

        const file = new File([blob], "camera-photo.jpg", {
          type: "image/jpeg",
        });

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setPredictionId(null);
        setError("");
        setActionMessage("");
        setStep("preview");
        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setPredictionId(null);
    setError("");
    setActionMessage("");
    setStep("preview");

    event.target.value = "";
  }

  async function analyzeImage() {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setStep("loading");
    setError("");
    setActionMessage("");
    setPredictionId(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch(PREDICT_URL, {
        method: "POST",
        body: formData,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Backend did not return valid JSON.");
      }

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Analysis failed."
        );
      }

      setResult(data);
      setStep("result");

      if (!user) {
        setActionMessage(
          "You are not logged in, so this analysis was not saved. Login to save up to 3 analysis profiles."
        );
        return;
      }

      const saveResult = await savePrediction(data);

      if (saveResult.saved) {
        setPredictionId(saveResult.id);
        setActionMessage(
          `Prediction profile saved. You now have ${Math.min(
            profileCount + 1,
            maxProfiles
          )}/${maxProfiles} saved profiles.`
        );
      } else {
        setPredictionId(null);
        setActionMessage(saveResult.reason);
      }
    } catch (err) {
      setError(err.message || "Could not connect to Flask backend.");
      setStep("preview");
    }
  }

  async function handleSaveFavorite(item) {
    try {
      await saveFavorite(item, {
        predictionId,
        faceShape: result?.face_shape || recommendations?.dominantShape,
      });

      setActionMessage("Saved to this prediction profile.");
      await loadFavorites();
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || "Could not save favorite.");

      if (!user) {
        setAuthOpen(true);
      }
    }
  }

  async function handleFeedback(item, vote, comment) {
    try {
      if (!predictionId) {
        throw new Error(
          "This analysis was not saved as a profile, so feedback cannot be saved for it."
        );
      }

      await submitFeedback({
        item,
        vote,
        predictionId,
        comment,
      });

      setActionMessage("Feedback saved.");
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || "Could not save feedback.");

      if (!user) {
        setAuthOpen(true);
      }
    }
  }

  function requireLogin(message) {
    setActionMessage(message || "Login is required for this action.");
    setAuthOpen(true);
  }

  function blockedAction(message) {
    setActionMessage(message || "This action is not available.");
  }

  async function handleLogout() {
    try {
      await logout();
      setActionMessage("Logged out.");
      setProfileDrawerOpen(false);
      setPredictionId(null);
    } catch (err) {
      console.error(err);
      setActionMessage("Could not log out.");
    }
  }

  async function handleDeleteProfile(profileId) {
    await deleteProfile(profileId);
    await loadProfiles();
    await loadFavorites();

    if (predictionId === profileId) {
      setPredictionId(null);
      setActionMessage(
        "Current saved profile was deleted. You can still view the current result, but saving frames is disabled unless you scan again."
      );
    }
  }

  function reset() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setPredictionId(null);
    setError("");
    setActionMessage("");
    setStep("upload");
  }

  return (
    <main className="page">
      <section className="app-shell">
        <header className="app-header">
          <div className="brand">
            <div className="brand-icon">
              <ScanFace size={22} />
            </div>

            <div>
              <p className="eyebrow">Bifocus</p>
              <h1>Face shape scanner</h1>
            </div>
          </div>

          <div className="header-actions">
            <div className="privacy-chip">
              <ShieldCheck size={16} />
              Private
            </div>

            {user && (
              <button
                className="profiles-btn"
                onClick={() => setProfileDrawerOpen(true)}
              >
                <Layers size={16} />
                My Profiles {profileCount}/{maxProfiles}
              </button>
            )}

            {user ? (
              <div className="user-chip">
                <UserRound size={16} />
                <span>{user.email}</span>

                <button onClick={handleLogout} title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button className="login-btn" onClick={() => setAuthOpen(true)}>
                <LogIn size={16} />
                Login
              </button>
            )}
          </div>
        </header>

        {step === "start" && (
          <section className="screen hero-screen">
            <div className="hero-copy">
              <div className="hero-badge">
                <Camera size={16} />
                AI eyewear fitting assistant
              </div>

              <h2>Find glasses that actually fit your face.</h2>

              <p>
                Take a photo or upload one, then let the model detect your face
                shape and suggest eyewear styles inspired by popular optical
                frames.
              </p>

              <button className="primary-btn" onClick={() => setStep("upload")}>
                Get Started
              </button>
            </div>

            <div className="hero-panel">
              <div className="scan-card">
                <div className="scan-face">
                  <ScanFace size={72} />
                </div>

                <div className="scan-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "upload" && (
          <section className="screen upload-screen">
            <div className="section-header">
              <p className="eyebrow">Step 1</p>

              <h2>Add your photo</h2>

              <p>
                Use a clear front-facing photo. Scanning works without login, but
                saving favorites and feedback requires an account.
              </p>
            </div>

            <div className="actions-grid">
              <button className="action-card primary-action" onClick={openCamera}>
                <div className="action-icon">
                  <Camera size={28} />
                </div>

                <div>
                  <h3>Take Photo</h3>
                  <p>Open camera</p>
                </div>
              </button>

              <button
                className="action-card"
                onClick={() => uploadInputRef.current.click()}
              >
                <div className="action-icon light">
                  <Upload size={28} />
                </div>

                <div>
                  <h3>Upload Photo</h3>
                  <p>Choose image</p>
                </div>
              </button>
            </div>

            <input
              ref={uploadInputRef}
              className="hidden-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
            />

            {error && <div className="error-card">{error}</div>}

            <div className="tips-card">
              <h3>Photo tips</h3>

              <div className="tips-grid">
                <span>Good lighting</span>
                <span>Face forward</span>
                <span>Full face visible</span>
                <span>No glasses if possible</span>
              </div>
            </div>
          </section>
        )}

        {step === "preview" && (
          <section className="screen preview-screen">
            <div className="section-header compact">
              <p className="eyebrow">Step 2</p>

              <h2>Preview photo</h2>

              <p>Check the image before sending it to the model.</p>
            </div>

            <div className="preview-layout">
              <div className="preview-box">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected preview" />
                ) : (
                  <div className="preview-placeholder">
                    <ImageIcon size={44} />
                    <p>No image selected</p>
                  </div>
                )}
              </div>

              <div className="preview-side">
                <div className="info-card">
                  <h3>Before analyzing</h3>

                  <p>
                    Make sure your face is centered and the photo is not blurry.
                    The uploaded image is only used for prediction.
                  </p>
                </div>

                {error && <div className="error-card">{error}</div>}

                <div className="button-row">
                  <button className="secondary-btn" onClick={reset}>
                    Change
                  </button>

                  <button className="primary-btn" onClick={analyzeImage}>
                    Analyze
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "loading" && (
          <section className="screen loading-screen">
            <div className="loader-circle">
              <Loader2 size={52} className="spinner" />
            </div>

            <h2>Analyzing your face</h2>

            <p>Detecting the face shape using your backend model.</p>
          </section>
        )}

        {step === "result" && result && (
          <section className="screen result-screen">
            <div className="section-header compact">
              <div className="success-icon">
                <CheckCircle size={30} />
              </div>

              <p className="eyebrow">Step 3</p>

              <h2>Analysis complete</h2>

              <p>
                Confidence:{" "}
                <strong>
                  {Number(result?.confidence_percent || 0).toFixed(2)}%
                </strong>
              </p>
            </div>

            <div className="result-layout">
              <div className="result-card">
                <img src={previewUrl} alt="Analyzed face" />

                <div>
                  <p className="eyebrow">Detected face shape</p>

                  <h3>{result.face_shape}</h3>

                  <p>This is the result returned from your current model API.</p>
                </div>
              </div>

              <div className="probability-card">
                <h3>Prediction probabilities</h3>

                {result?.probabilities_percent &&
                  Object.entries(result.probabilities_percent).map(
                    ([shape, value]) => {
                      const safeValue = Number(value) || 0;

                      return (
                        <div className="prob-row" key={shape}>
                          <div className="prob-label">
                            <span>{shape}</span>
                            <small>{safeValue.toFixed(2)}%</small>
                          </div>

                          <div className="bar">
                            <div
                              style={{
                                width: `${Math.min(safeValue, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </div>

            <RecommendationGrid
              recommendations={recommendations}
              user={user}
              predictionId={predictionId}
              actionMessage={actionMessage}
              isFavorite={isFavorite}
              onRequireLogin={requireLogin}
              onBlockedAction={blockedAction}
              onSaveFavorite={handleSaveFavorite}
              onFeedback={handleFeedback}
            />

            <button className="primary-btn full-btn" onClick={reset}>
              <RotateCcw size={18} />
              New analysis
            </button>
          </section>
        )}
      </section>

      {cameraOpen && (
        <div className="camera-modal">
          <div className="camera-sheet">
            <div className="camera-top">
              <div>
                <p className="eyebrow">Camera</p>
                <h3>Take a front-facing photo</h3>
              </div>

              <button className="icon-btn" onClick={closeCamera}>
                <X size={22} />
              </button>
            </div>

            <div className="camera-preview">
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="face-guide"></div>
            </div>

            <button className="primary-btn capture-btn" onClick={capturePhoto}>
              Capture Photo
            </button>

            <canvas ref={canvasRef} className="hidden-canvas"></canvas>
          </div>
        </div>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        login={login}
        register={register}
      />

      <ProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        user={user}
        profiles={profiles}
        profilesLoading={profilesLoading}
        maxProfiles={maxProfiles}
        onDeleteProfile={handleDeleteProfile}
      />
    </main>
  );
}

export default App;