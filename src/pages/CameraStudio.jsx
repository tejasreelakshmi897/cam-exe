import { useEffect, useRef, useState } from "react";
import { filters } from "../data/filters";
import { saveMemory } from "../utils/memoryStorage";
import "./CameraStudio.css";

const defaultAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  grain: 0,
  glow: 0,
  vignette: 0,
};

const defaultCameraSettings = {
  mirror: true,
  flash: false,
  timer: 0,
  ratio: "4:3",
};

const frameColors = {
  Classic: "#ffffff",
  Vintage: "#f1e5cf",
  Midnight: "#24211f",
};

function readSaved(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function CameraStudio({ onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const capturingRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("user");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState("photo");

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [message, setMessage] = useState("");

  const [polaroidFrame, setPolaroidFrame] = useState("Classic");
  const [caption, setCaption] = useState("");
  const [showDate, setShowDate] = useState(true);
  const [photoDate, setPhotoDate] = useState("");

  const [selectedFilter, setSelectedFilter] = useState(() =>
    readSaved("camexe-filter", "None")
  );

  const [adjustments, setAdjustments] = useState(() => ({
    ...defaultAdjustments,
    ...readSaved("camexe-adjustments", {}),
  }));

  const [cameraSettings, setCameraSettings] = useState(() => ({
    ...defaultCameraSettings,
    ...readSaved("camexe-camera-settings", {}),
  }));

  const [presets, setPresets] = useState(() =>
    readSaved("camexe-presets", [])
  );

  const [presetName, setPresetName] = useState("");

  // REMEMBER FILTERS AND SETTINGS

  useEffect(() => {
    localStorage.setItem(
      "camexe-filter",
      JSON.stringify(selectedFilter)
    );
  }, [selectedFilter]);

  useEffect(() => {
    localStorage.setItem(
      "camexe-adjustments",
      JSON.stringify(adjustments)
    );
  }, [adjustments]);

  useEffect(() => {
    localStorage.setItem(
      "camexe-camera-settings",
      JSON.stringify(cameraSettings)
    );
  }, [cameraSettings]);

  useEffect(() => {
    localStorage.setItem(
      "camexe-presets",
      JSON.stringify(presets)
    );
  }, [presets]);

  // CAMERA STREAM

  useEffect(() => {
    if (!cameraOn) return;

    let cancelled = false;
    let currentStream = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access requires HTTPS or localhost."
          );
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facingMode },
            },
          });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        currentStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setCameraError(
            "Unable to open camera. Check permissions or HTTPS."
          );

          setCameraOn(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      if (currentStream) {
        currentStream
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (streamRef.current === currentStream) {
        streamRef.current = null;
      }
    };
  }, [cameraOn, facingMode]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  function cancelCountdown() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    capturingRef.current = false;
    setCapturing(false);
    setCountdown(null);
  }

  function openCamera() {
    setCameraError("");
    setMessage("");
    setCameraOn(true);
  }

  function closeCamera() {
    cancelCountdown();
    setCameraOn(false);
  }

  function switchCamera() {
    cancelCountdown();

    setFacingMode((previous) =>
      previous === "user" ? "environment" : "user"
    );
  }

  function updateAdjustment(name, value) {
    setAdjustments((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateCameraSetting(name, value) {
    setCameraSettings((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // CUSTOM PRESETS

  function savePreset() {
    const name = presetName.trim();

    if (!name) {
      setMessage("Enter a preset name.");
      return;
    }

    setPresets((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name,
        filter: selectedFilter,
        adjustments: { ...adjustments },
      },
    ]);

    setPresetName("");
    setMessage(`Saved preset: ${name}`);
  }

  function applyPreset(preset) {
    setSelectedFilter(preset.filter);

    setAdjustments({
      ...defaultAdjustments,
      ...preset.adjustments,
    });

    setMessage(`Applied: ${preset.name}`);
  }

  function deletePreset(id) {
    setPresets((previous) =>
      previous.filter((preset) => preset.id !== id)
    );

    setMessage("Preset deleted.");
  }

  // FILTER EFFECTS

  const activeFilter = filters.find(
    (filter) => filter.name === selectedFilter
  );

  const videoEffect = `
    ${activeFilter?.effect || ""}
    brightness(${adjustments.brightness}%)
    contrast(${adjustments.contrast}%)
    saturate(${adjustments.saturation}%)
    sepia(${adjustments.warmth / 200})
  `;

  const isCreamy =
    selectedFilter === "Creamy Soft Glow";

  const previewRatio =
    cameraSettings.ratio === "1:1"
      ? "1 / 1"
      : cameraSettings.ratio === "16:9"
      ? "16 / 9"
      : "4 / 3";

  // TAKE PHOTO

  function takePhoto() {
    const video = videoRef.current;

    if (!cameraOn || !video || video.readyState < 2) {
      setMessage("Start the camera first.");
      return;
    }

    if (capturingRef.current) return;

    capturingRef.current = true;

    setCapturing(true);
    setMessage("");

    const seconds = Number(cameraSettings.timer);

    if (seconds > 0) {
      let remaining = seconds;

      setCountdown(remaining);

      timerRef.current = setInterval(() => {
        remaining -= 1;

        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          clearInterval(timerRef.current);

          timerRef.current = null;

          setCountdown(null);

          capturePhoto();
        }
      }, 1000);
    } else {
      capturePhoto();
    }
  }

  // CAPTURE PHOTO

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth) {
      capturingRef.current = false;

      setCapturing(false);
      setMessage("Camera is not ready.");

      return;
    }

    try {
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas unavailable.");
      }

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      const ratio =
        cameraSettings.ratio === "1:1"
          ? 1
          : cameraSettings.ratio === "16:9"
          ? 16 / 9
          : 4 / 3;

      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      if (sourceWidth / sourceHeight > ratio) {
        cropWidth = sourceHeight * ratio;
      } else {
        cropHeight = sourceWidth / ratio;
      }

      const cropX = (sourceWidth - cropWidth) / 2;
      const cropY = (sourceHeight - cropHeight) / 2;

      canvas.width = Math.round(cropWidth);
      canvas.height = Math.round(cropHeight);

      context.save();

      // MIRROR MODE

      if (
        facingMode === "user" &&
        cameraSettings.mirror
      ) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.filter = videoEffect;

      context.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.restore();
      context.filter = "none";

      // CREAMY GOLDEN BLOOM

      if (isCreamy) {
        const bloomCanvas =
          document.createElement("canvas");

        bloomCanvas.width = canvas.width;
        bloomCanvas.height = canvas.height;

        const bloomContext =
          bloomCanvas.getContext("2d");

        if (bloomContext) {
          bloomContext.drawImage(canvas, 0, 0);

          context.save();

          context.globalAlpha = 0.32;

          context.globalCompositeOperation =
            "screen";

          context.filter =
            "blur(12px) brightness(1.3)";

          context.drawImage(bloomCanvas, 0, 0);

          context.restore();
        }

        context.fillStyle =
          "rgba(255, 175, 75, 0.06)";

        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // GLOW

      if (adjustments.glow > 0) {
        const glow = context.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          0,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.7
        );

        glow.addColorStop(
          0,
          `rgba(255, 226, 190, ${
            adjustments.glow / 250
          })`
        );

        glow.addColorStop(
          1,
          "rgba(255, 226, 190, 0)"
        );

        context.fillStyle = glow;

        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // VIGNETTE

      if (adjustments.vignette > 0) {
        const vignette =
          context.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.15,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.75
          );

        vignette.addColorStop(
          0,
          "rgba(0, 0, 0, 0)"
        );

        vignette.addColorStop(
          1,
          `rgba(0, 0, 0, ${
            adjustments.vignette / 110
          })`
        );

        context.fillStyle = vignette;

        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // FILM GRAIN

      if (adjustments.grain > 0) {
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const pixels = imageData.data;

        const intensity =
          adjustments.grain * 0.35;

        for (let i = 0; i < pixels.length; i += 4) {
          const noise =
            (Math.random() - 0.5) * intensity;

          pixels[i] += noise;
          pixels[i + 1] += noise;
          pixels[i + 2] += noise;
        }

        context.putImageData(imageData, 0, 0);
      }

      // SIMULATED FLASH

      if (cameraSettings.flash) {
        context.fillStyle =
          "rgba(255, 245, 230, 0.15)";

        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        setFlashActive(true);

        setTimeout(
          () => setFlashActive(false),
          180
        );
      }

      setCapturedPhoto(
        canvas.toDataURL("image/png")
      );

      setPhotoDate(
        new Date().toLocaleDateString("en-GB")
      );

      setMessage(
        "Your moment has been captured!"
      );
    } catch (error) {
      console.error(error);

      setMessage("Unable to capture photo.");
    } finally {
      capturingRef.current = false;

      setCapturing(false);
    }
  }

  // DOWNLOAD NORMAL PHOTO AND SAVE TO CAMERA ROLL

  async function downloadPhoto() {
    if (!capturedPhoto) return;

    const link = document.createElement("a");

    link.href = capturedPhoto;
    link.download = `CAMexe-${Date.now()}.png`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    try {
      await saveMemory(
        capturedPhoto,
        "photo",
        "A little moment in time"
      );

      setMessage(
        "Photo downloaded and saved to Camera Roll!"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Photo downloaded, but could not save to Camera Roll."
      );
    }
  }

  // DOWNLOAD POLAROID AND SAVE TO CAMERA ROLL

  async function downloadPolaroid() {
    if (!capturedPhoto) return;

    try {
      const image = new Image();

      image.src = capturedPhoto;

      await image.decode();

      const canvas =
        document.createElement("canvas");

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas unavailable.");
      }

      const width = 900;
      const padding = 65;

      const photoWidth = width - padding * 2;

      const photoHeight = Math.round(
        photoWidth * (image.height / image.width)
      );

      const bottomSpace = 200;

      canvas.width = width;

      canvas.height =
        padding + photoHeight + bottomSpace;

      const background =
        frameColors[polaroidFrame];

      const textColor =
        polaroidFrame === "Midnight"
          ? "#ffffff"
          : "#3d342e";

      // DRAW FRAME

      context.fillStyle = background;

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // DRAW IMAGE

      context.drawImage(
        image,
        padding,
        padding,
        photoWidth,
        photoHeight
      );

      context.fillStyle = textColor;
      context.textAlign = "center";
      context.textBaseline = "middle";

      // DRAW CAPTION

      context.font = "italic 38px Georgia";

      const captionText =
        caption.trim().slice(0, 80);

      if (captionText) {
        const maxTextWidth = width - 110;

        const words = captionText.split(/\s+/);

        const lines = [];

        let line = "";

        for (const word of words) {
          const test = line
            ? `${line} ${word}`
            : word;

          if (
            context.measureText(test).width >
              maxTextWidth &&
            line
          ) {
            lines.push(line);

            line = word;
          } else {
            line = test;
          }
        }

        if (line) {
          lines.push(line);
        }

        const visibleLines = lines.slice(0, 2);

        visibleLines.forEach((text, index) => {
          context.fillText(
            text,
            width / 2,
            padding + photoHeight + 62 + index * 43,
            maxTextWidth
          );
        });
      }

      // DRAW DATE

      if (showDate && photoDate.trim()) {
        context.font = "24px monospace";

        context.globalAlpha = 0.7;

        context.fillText(
          photoDate.trim(),
          width / 2,
          canvas.height - 43,
          width - 100
        );

        context.globalAlpha = 1;
      }

      // CREATE FINAL IMAGE

      const finalImage =
        canvas.toDataURL("image/png");

      // DOWNLOAD POLAROID

      const link = document.createElement("a");

      link.href = finalImage;

      link.download =
        `CAMexe-Polaroid-${Date.now()}.png`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      // SAVE POLAROID TO CAMERA ROLL

      try {
        await saveMemory(
          finalImage,
          "polaroid",
          captionText || "A little moment in time"
        );

        setMessage(
          "Polaroid downloaded and saved to Camera Roll!"
        );
      } catch (error) {
        console.error(error);

        setMessage(
          "Polaroid downloaded, but could not save to Camera Roll."
        );
      }
    } catch (error) {
      console.error(error);

      setMessage("Unable to create Polaroid.");
    }
  }

  // RETAKE PHOTO

  function retakePhoto() {
    setCapturedPhoto(null);
    setMessage("");
  }

  function handleBack() {
    closeCamera();
    onBack();
  }

  return (
    <div className="studio-page">

      {/* HEADER */}

      <header className="studio-header">

        <button onClick={handleBack}>
          ← BACK
        </button>

        <h2>
          CAM<span>.exe</span> / STUDIO
        </h2>

        <button
          onClick={() => setSettingsOpen(true)}
        >
          SETTINGS
        </button>

      </header>

      <div className="studio-layout">

        <div className="studio-camera">

          {/* PHOTO / POLAROID SWITCH */}

          <div className="cam-mode-switch">

            <button
              className={
                mode === "photo" ? "active" : ""
              }
              onClick={() => setMode("photo")}
            >
              PHOTO
            </button>

            <button
              className={
                mode === "polaroid" ? "active" : ""
              }
              onClick={() => setMode("polaroid")}
            >
              POLAROID
            </button>

          </div>

          <div className="studio-camera-top">

            <span>CAM_001</span>

            <span>
              {cameraOn ? "● LIVE" : "● STANDBY"}
            </span>

          </div>

          {/* LIVE VIEWFINDER */}

          <div
            className="studio-viewfinder"
            style={{
              aspectRatio: previewRatio,
            }}
          >

            {cameraOn ? (
              <>

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    filter: videoEffect,

                    transform:
                      facingMode === "user" &&
                      cameraSettings.mirror
                        ? "scaleX(-1)"
                        : "none",
                  }}
                />

                <div
                  className="studio-grain"
                  style={{
                    opacity:
                      adjustments.grain / 100,
                  }}
                />

                <div
                  className="studio-glow"
                  style={{
                    opacity:
                      adjustments.glow / 100,
                  }}
                />

                <div
                  className="studio-vignette"
                  style={{
                    opacity:
                      adjustments.vignette / 100,
                  }}
                />

                {isCreamy && (
                  <div className="creamy-glow-layer" />
                )}

              </>
            ) : (

              <div className="studio-placeholder">

                <h2>READY?</h2>

                <p>
                  {cameraError ||
                    "YOUR NEXT MEMORY AWAITS"}
                </p>

                <button onClick={openCamera}>
                  START CAMERA
                </button>

              </div>
            )}

            {countdown !== null && (
              <div className="studio-countdown">
                {countdown}
              </div>
            )}

            {flashActive && (
              <div className="studio-flash" />
            )}

          </div>

          <div className="studio-camera-bottom">

            <span>
              {selectedFilter.toUpperCase()}
            </span>

            <span>
              {cameraSettings.ratio}
            </span>

          </div>

          {/* FILTER CAROUSEL */}

          <div className="studio-filter-section">

            <div className="studio-filter-heading">

              <span>CHOOSE YOUR FILTER</span>

              <span>
                {filters.length} FILTERS
              </span>

            </div>

            <div className="studio-filter-list">

              {filters.map((filter) => (

                <button
                  type="button"
                  key={filter.name}
                  className={`studio-filter ${
                    selectedFilter === filter.name
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedFilter(filter.name)
                  }
                >

                  <div
                    className="studio-filter-thumbnail"
                    style={{
                      filter: filter.effect,
                    }}
                  />

                  <span>{filter.name}</span>

                </button>

              ))}

              <button
                type="button"
                className={`studio-filter ${
                  selectedFilter === "None"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedFilter("None")
                }
              >

                <div className="studio-filter-thumbnail none-filter" />

                <span>ORIGINAL</span>

              </button>

            </div>

          </div>

          {/* CAMERA ACTIONS */}

          <div className="studio-actions">

            <button
              className="studio-small-button"
              onClick={() => setSettingsOpen(true)}
            >
              SETTINGS
            </button>

            <button
              className="studio-shutter"
              onClick={takePhoto}
              disabled={!cameraOn || capturing}
              title="Take photo"
            >
              <span />
            </button>

            <button
              className="studio-small-button"
              onClick={switchCamera}
              disabled={capturing}
            >
              FLIP CAM
            </button>

          </div>

          {message && (
            <p className="studio-message">
              {message}
            </p>
          )}

          {/* CAPTURED PHOTO PREVIEW */}

          {capturedPhoto && (

            <div className="studio-capture-preview">

              <h3>
                {mode === "polaroid"
                  ? "YOUR LITTLE MEMORY."
                  : "YOUR MOMENT, CAPTURED."}
              </h3>

              {mode === "polaroid" ? (
                <>

                  {/* POLAROID PREVIEW */}

                  <div
                    className="polaroid-preview"
                    style={{
                      background:
                        frameColors[polaroidFrame],

                      color:
                        polaroidFrame === "Midnight"
                          ? "white"
                          : "#3d342e",
                    }}
                  >

                    <img
                      src={capturedPhoto}
                      alt="Polaroid photograph"
                    />

                    <div className="polaroid-caption">

                      {caption ||
                        "a little moment in time"}

                    </div>

                    {showDate && (

                      <div className="polaroid-date">
                        {photoDate}
                      </div>

                    )}

                  </div>

                  {/* POLAROID EDITOR */}

                  <div className="polaroid-editor">

                    <h3>
                      PERSONALIZE YOUR POLAROID
                    </h3>

                    <div className="polaroid-frame-options">

                      {Object.keys(frameColors).map(
                        (frame) => (

                          <button
                            key={frame}
                            className={
                              polaroidFrame === frame
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setPolaroidFrame(frame)
                            }
                          >

                            <span
                              className="polaroid-color-swatch"
                              style={{
                                background:
                                  frameColors[frame],
                              }}
                            />

                            {frame.toUpperCase()}

                          </button>

                        )
                      )}

                    </div>

                    <label>

                      CAPTION

                      <input
                        type="text"
                        maxLength={80}
                        placeholder="e.g. somewhere in my dreams"
                        value={caption}
                        onChange={(event) =>
                          setCaption(event.target.value)
                        }
                      />

                    </label>

                    <label>

                      DATE

                      <input
                        type="text"
                        maxLength={30}
                        value={photoDate}
                        onChange={(event) =>
                          setPhotoDate(event.target.value)
                        }
                      />

                    </label>

                    <label className="polaroid-date-toggle">

                      <input
                        type="checkbox"
                        checked={showDate}
                        onChange={(event) =>
                          setShowDate(
                            event.target.checked
                          )
                        }
                      />

                      SHOW DATE ON POLAROID

                    </label>

                  </div>

                  <div className="studio-capture-buttons">

                    <button onClick={retakePhoto}>
                      RETAKE
                    </button>

                    <button onClick={downloadPolaroid}>
                      DOWNLOAD POLAROID
                    </button>

                  </div>

                </>
              ) : (
                <>

                  <img
                    src={capturedPhoto}
                    alt="Captured photo"
                  />

                  <div className="studio-capture-buttons">

                    <button onClick={retakePhoto}>
                      RETAKE
                    </button>

                    <button onClick={downloadPhoto}>
                      DOWNLOAD PHOTO
                    </button>

                    <button
                      onClick={() =>
                        setMode("polaroid")
                      }
                    >
                      MAKE POLAROID
                    </button>

                  </div>

                </>
              )}

            </div>

          )}

        </div>

        {/* DESKTOP SIDE PANEL */}

        <aside className="studio-side-panel">

          <p className="eyebrow">
            YOUR PERSONAL CAMERA
          </p>

          <h2>MAKE IT YOURS.</h2>

          <p>
            Capture a little nostalgia, customize
            your filters, and turn your favorite
            moments into Polaroids.
          </p>

          <button
            onClick={() => setSettingsOpen(true)}
          >
            CUSTOMIZE CAMERA
          </button>

          {cameraOn && (

            <button onClick={closeCamera}>
              TURN OFF CAMERA
            </button>

          )}

        </aside>

      </div>

      {/* SETTINGS DRAWER */}

      {settingsOpen && (

        <div
          className="studio-drawer-backdrop"
          onClick={() => setSettingsOpen(false)}
        >

          <div
            className="studio-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Camera settings"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="studio-drawer-header">

              <h2>CAMERA SETTINGS</h2>

              <button
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                CLOSE ×
              </button>

            </div>

            {/* FILTER LAB */}

            <h3>01 / FILTER LAB</h3>

            {[
              ["brightness", 50, 160],
              ["contrast", 50, 160],
              ["saturation", 0, 200],
              ["warmth", 0, 100],
              ["grain", 0, 100],
              ["glow", 0, 100],
              ["vignette", 0, 100],
            ].map(([name, min, max]) => (

              <label
                className="studio-slider"
                key={name}
              >

                <span>

                  {name.toUpperCase()} —{" "}
                  {adjustments[name]}

                </span>

                <input
                  type="range"
                  min={min}
                  max={max}
                  value={adjustments[name]}
                  onChange={(event) =>
                    updateAdjustment(
                      name,
                      Number(event.target.value)
                    )
                  }
                />

              </label>

            ))}

            <button
              className="studio-reset-button"
              onClick={() =>
                setAdjustments({
                  ...defaultAdjustments,
                })
              }
            >
              RESET ADJUSTMENTS
            </button>

            {/* CAMERA CONTROLS */}

            <h3>02 / CAMERA CONTROLS</h3>

            <label className="studio-toggle">

              Mirror Mode

              <input
                type="checkbox"
                checked={cameraSettings.mirror}
                onChange={(event) =>
                  updateCameraSetting(
                    "mirror",
                    event.target.checked
                  )
                }
              />

            </label>

            <label className="studio-toggle">

              Flash

              <input
                type="checkbox"
                checked={cameraSettings.flash}
                onChange={(event) =>
                  updateCameraSetting(
                    "flash",
                    event.target.checked
                  )
                }
              />

            </label>

            <label className="studio-select">

              Countdown

              <select
                value={cameraSettings.timer}
                onChange={(event) =>
                  updateCameraSetting(
                    "timer",
                    Number(event.target.value)
                  )
                }
              >

                <option value={0}>
                  Off
                </option>

                <option value={3}>
                  3 seconds
                </option>

                <option value={5}>
                  5 seconds
                </option>

                <option value={10}>
                  10 seconds
                </option>

              </select>

            </label>

            <label className="studio-select">

              Aspect Ratio

              <select
                value={cameraSettings.ratio}
                onChange={(event) =>
                  updateCameraSetting(
                    "ratio",
                    event.target.value
                  )
                }
              >

                <option value="4:3">
                  4:3 Classic
                </option>

                <option value="1:1">
                  1:1 Square
                </option>

                <option value="16:9">
                  16:9 Wide
                </option>

              </select>

            </label>

            <p className="studio-note">
              Flash uses a simulated light effect.
              Countdown works when taking photos.
            </p>

            {/* CUSTOM FILTER PRESETS */}

            <h3>03 / MY FILTER PRESETS</h3>

            <div className="studio-preset-form">

              <input
                placeholder="Name your filter preset"
                value={presetName}
                onChange={(event) =>
                  setPresetName(event.target.value)
                }
              />

              <button onClick={savePreset}>
                SAVE PRESET
              </button>

            </div>

            <div className="studio-presets">

              {presets.length === 0 && (
                <p>No presets saved yet.</p>
              )}

              {presets.map((preset) => (

                <div
                  className="studio-preset"
                  key={preset.id}
                >

                  <div>

                    <strong>
                      {preset.name}
                    </strong>

                    <small>
                      {preset.filter}
                    </small>

                  </div>

                  <div>

                    <button
                      onClick={() =>
                        applyPreset(preset)
                      }
                    >
                      APPLY
                    </button>

                    <button
                      onClick={() =>
                        deletePreset(preset.id)
                      }
                    >
                      DELETE
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      )}

      {/* HIDDEN CAPTURE CANVAS */}

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />

    </div>
  );
}

export default CameraStudio;