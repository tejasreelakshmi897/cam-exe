
import { saveMemory } from "../utils/memoryStorage";
import { useEffect, useRef, useState } from "react";
import "./PhotoBooth.css";

const frameColors = {
  cream: { background: "#f1e4cd", text: "#55483c" },
  pink: { background: "#e9b5b8", text: "#432f35" },
  midnight: { background: "#252321", text: "#f5f0e8" },
};

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function PhotoBooth({ onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);
  const runningRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [shooting, setShooting] = useState(false);
  const [frame, setFrame] = useState("cream");
  const [caption, setCaption] = useState("little moments, big memories");
  const [error, setError] = useState("");

  const selectedFrame = frameColors[frame];

  useEffect(() => {
    cancelledRef.current = false;

    return () => {
      cancelledRef.current = true;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  async function startCamera() {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setError("Camera access failed. Please allow camera permission.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      throw new Error("Camera is not ready.");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not capture photo.");
    }

    const width = 600;
    const height = 450;

    canvas.width = width;
    canvas.height = height;

    // Mirror the selfie image.
    context.translate(width, 0);
    context.scale(-1, 1);

    const scale = Math.max(
      width / video.videoWidth,
      height / video.videoHeight
    );

    const sourceWidth = width / scale;
    const sourceHeight = height / scale;

    context.drawImage(
      video,
      (video.videoWidth - sourceWidth) / 2,
      (video.videoHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL("image/png");
  }

  async function takePhotoStrip() {
    if (runningRef.current || !cameraOn) return;

    runningRef.current = true;
    setShooting(true);
    setPhotos([]);
    setError("");

    const captured = [];

    try {
      for (let i = 0; i < 4; i++) {
        for (let count = 3; count >= 1; count--) {
          if (cancelledRef.current) return;

          setCountdown(count);
          await wait(1000);
        }

        if (cancelledRef.current) return;

        setCountdown(null);

        const photo = capturePhoto();
        captured.push(photo);

        setPhotos([...captured]);

        await wait(500);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while taking photos.");
    } finally {
      runningRef.current = false;

      if (!cancelledRef.current) {
        setCountdown(null);
        setShooting(false);
      }
    }
  }

  function downloadStrip() {
    if (photos.length !== 4) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return;

    const width = 700;
    const padding = 45;
    const photoWidth = width - padding * 2;
    const photoHeight = 458;
    const gap = 18;
    const top = 45;
    const footer = 160;

    canvas.width = width;
    canvas.height =
      top + 4 * photoHeight + 3 * gap + footer;

    context.fillStyle = selectedFrame.background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    let loaded = 0;
    const images = [];

    photos.forEach((src, index) => {
      const image = new Image();

      image.onload = async () => {
        images[index] = image;
        loaded++;

        if (loaded === 4) {
          images.forEach((img, i) => {
            context.drawImage(
              img,
              padding,
              top + i * (photoHeight + gap),
              photoWidth,
              photoHeight
            );
          });

          context.fillStyle = selectedFrame.text;
          context.textAlign = "center";
          context.font = "italic 29px Georgia";

          context.fillText(
            caption.trim().slice(0, 45),
            width / 2,
            canvas.height - 75,
            width - 70
          );

          context.font = "17px monospace";
          context.globalAlpha = 0.65;
          context.fillText(
            "CAM.exe / PHOTO BOOTH",
            width / 2,
            canvas.height - 35
          );
          context.globalAlpha = 1;

          const link = document.createElement("a");
          link.download = `CAMexe-PhotoStrip-${Date.now()}.png`;
          const finalStrip = canvas.toDataURL("image/png");

link.href = finalStrip;
link.click();

try {
  await saveMemory(finalStrip, "strip", caption);
} catch (err) {
  console.error(err);
  setError("Strip downloaded, but could not save to Camera Roll.");
}
        }
      };

      image.onerror = () => {
        setError("Could not prepare the photo strip.");
      };

      image.src = src;
    });
  }

  return (
    <div className="booth-page">
      <header className="booth-header">
        <button onClick={onBack}>← BACK</button>
        <h2>CAM<span>.exe</span> / BOOTH</h2>
        <span>PHOTO BOOTH / 004</span>
      </header>

      <main className="booth-container">
        <div className="booth-heading">
          <p>FOUR FRAMES. ONE MEMORY.</p>
          <h1>STRIKE A POSE.</h1>
          <p>3... 2... 1... your little moment is forever.</p>
        </div>

        <div className="booth-layout">
          <section className="booth-camera-card">
            <div className="booth-camera-label">
              <span>CAM_004</span>
              <span>{cameraOn ? "● LIVE" : "○ OFFLINE"}</span>
            </div>

            <div className="booth-viewfinder">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  display: cameraOn ? "block" : "none",
                }}
              />

              {!cameraOn && (
                <div className="booth-placeholder">
                  <h2>READY, CUTIE?</h2>
                  <p>YOUR PHOTO BOOTH AWAITS.</p>
                  <button onClick={startCamera}>
                    START CAMERA
                  </button>
                </div>
              )}

              {countdown !== null && (
                <div className="booth-countdown">
                  {countdown}
                </div>
              )}
            </div>

            <div className="booth-camera-actions">
              <button
                onClick={takePhotoStrip}
                disabled={!cameraOn || shooting}
              >
                {shooting
                  ? `CAPTURING ${photos.length + 1} / 4`
                  : "TAKE 4 PHOTOS"}
              </button>
            </div>

            {error && (
              <p className="booth-error" role="alert">
                {error}
              </p>
            )}

            <p className="booth-tip">
              Each photo gets a 3-second countdown.
              Change your pose between shots!
            </p>
          </section>

          <aside className="booth-editor">
            <p className="booth-eyebrow">
              YOUR LITTLE KEEPSAKE
            </p>
            <h2>THE PHOTO STRIP.</h2>

            <div
              className="booth-strip"
              style={{
                background: selectedFrame.background,
                color: selectedFrame.text,
              }}
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="booth-strip-photo"
                  key={index}
                >
                  {photos[index] ? (
                    <img
                      src={photos[index]}
                      alt={`Captured frame ${index + 1}`}
                    />
                  ) : (
                    <span>FRAME 0{index + 1}</span>
                  )}
                </div>
              ))}

              <div className="booth-strip-caption">
                {caption}
              </div>

              <div className="booth-strip-brand">
                CAM.exe / PHOTO BOOTH
              </div>
            </div>

            <h3>CHOOSE YOUR FRAME</h3>

            <div className="booth-frame-options">
              {Object.entries(frameColors).map(
                ([key, option]) => (
                  <button
                    key={key}
                    className={frame === key ? "active" : ""}
                    onClick={() => setFrame(key)}
                  >
                    <span
                      style={{
                        background: option.background,
                      }}
                    />
                    {key.toUpperCase()}
                  </button>
                )
              )}
            </div>

            <label className="booth-caption-label">
              YOUR CAPTION
              <input
                type="text"
                maxLength={45}
                value={caption}
                onChange={(event) =>
                  setCaption(event.target.value)
                }
              />
            </label>

            <button
              className="booth-download"
              onClick={downloadStrip}
              disabled={photos.length !== 4 || shooting}
            >
              DOWNLOAD PHOTO STRIP
            </button>

            {photos.length > 0 && !shooting && (
              <button
                className="booth-retake"
                onClick={() => setPhotos([])}
              >
                RETAKE STRIP
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default PhotoBooth;
