
import { saveMemory } from "../utils/memoryStorage";
import { useRef, useState } from "react";
import { filters } from "../data/filters";
import "./GalleryEditor.css";

const frames = {
  classic: {
    name: "CLASSIC",
    background: "#ffffff",
    text: "#292521",
  },
  vintage: {
    name: "VINTAGE",
    background: "#f1e4cd",
    text: "#55483c",
  },
  midnight: {
    name: "MIDNIGHT",
    background: "#252321",
    text: "#f5f0e8",
  },
};

function GalleryEditor({ onBack }) {
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState("photo");

  const [selectedFilter, setSelectedFilter] = useState("None");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const [selectedFrame, setSelectedFrame] = useState("classic");
  const [caption, setCaption] = useState("a little moment in time");
  const [showDate, setShowDate] = useState(true);
  const [photoDate, setPhotoDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState("");

  const activeFilter = filters.find(
    (filter) => filter.name === selectedFilter
  );

  const filterEffect = `
    ${activeFilter?.effect || ""}
    brightness(${brightness}%)
    contrast(${contrast}%)
    saturate(${saturation}%)
  `;

  const frame = frames[selectedFrame];

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image.");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(reader.result);
    };

    reader.onerror = () => {
      setError("Could not read the selected image.");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function resetFilters() {
    setSelectedFilter("None");
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  }

  function drawCover(context, image, x, y, width, height) {
    const scale = Math.max(
      width / image.naturalWidth,
      height / image.naturalHeight
    );

    const sourceWidth = width / scale;
    const sourceHeight = height / scale;

    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  }

  function downloadPhoto() {
    if (!photo) return;

    setError("");

    const image = new Image();

   image.onload = async () => {
      try {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          setError("Could not prepare the image.");
          return;
        }

        if (mode === "photo") {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;

          context.filter = filterEffect;
          context.drawImage(image, 0, 0);
          context.filter = "none";
        } else {
          const width = 900;
          const padding = 65;
          const imageSize = width - padding * 2;
          const imageTop = 65;
          const bottomSpace = 235;

          canvas.width = width;
          canvas.height =
            imageTop + imageSize + bottomSpace;

          context.fillStyle = frame.background;
          context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          context.filter = filterEffect;

          drawCover(
            context,
            image,
            padding,
            imageTop,
            imageSize,
            imageSize
          );

          context.filter = "none";

          context.fillStyle = frame.text;
          context.textAlign = "center";

          const captionText = caption.trim();

          if (captionText) {
            context.font = "italic 38px Georgia";

            const maxWidth = width - 120;

            let displayedCaption = captionText;

            while (
              displayedCaption.length > 1 &&
              context.measureText(displayedCaption).width >
                maxWidth
            ) {
              displayedCaption =
                displayedCaption.slice(0, -1);
            }

            if (displayedCaption !== captionText) {
              displayedCaption =
                displayedCaption.trimEnd() + "…";
            }

            context.fillText(
              displayedCaption,
              width / 2,
              imageTop + imageSize + 90
            );
          }

          if (showDate && photoDate) {
            context.font = "22px monospace";
            context.globalAlpha = 0.7;

            context.fillText(
              photoDate,
              width / 2,
              imageTop + imageSize + 145
            );

            context.globalAlpha = 1;
          }
        }

        const link = document.createElement("a");

        link.download =
          mode === "polaroid"
            ? `CAMexe-Polaroid-${Date.now()}.png`
            : `CAMexe-Edited-${Date.now()}.png`;

        const finalImage = canvas.toDataURL("image/png");

link.href = finalImage;
link.click();

try {
  await saveMemory(
    finalImage,
    mode === "polaroid" ? "polaroid" : "photo",
    mode === "polaroid" ? caption : "Edited memory"
  );
} catch (err) {
  console.error(err);
  setError("Image downloaded, but could not save to Camera Roll.");
}
      } catch (err) {
        console.error(err);
        setError("Could not export the image.");
      }
    };

    image.onerror = () => {
      setError("Could not load the image for download.");
    };

    image.src = photo;
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <button onClick={onBack}>← BACK</button>

        <h2>
          CAM<span>.exe</span> / GALLERY
        </h2>

        <span>PHOTO LAB</span>
      </header>

      <main className="gallery-container">
        <div className="gallery-heading">
          <p>THE DIGITAL DARKROOM / 001</p>

          <h1>YOUR PHOTOS, REIMAGINED.</h1>

          <p>
            Old memories. New feelings. Your favorite filters.
          </p>
        </div>

        <div className="gallery-mode-switch">
          <button
            className={mode === "photo" ? "active" : ""}
            onClick={() => setMode("photo")}
          >
            PHOTO
          </button>

          <button
            className={mode === "polaroid" ? "active" : ""}
            onClick={() => setMode("polaroid")}
          >
            POLAROID
          </button>
        </div>

        <div className="gallery-workspace">
          <section className="gallery-preview-panel">
            {!photo ? (
              <div className="gallery-upload">
                <span className="gallery-upload-icon">+</span>

                <h2>DROP A MEMORY HERE.</h2>

                <p>Upload a photo to start editing.</p>

                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  CHOOSE PHOTO
                </button>
              </div>
            ) : mode === "photo" ? (
              <div className="gallery-photo-preview">
                <img
                  src={photo}
                  alt="Photo being edited"
                  style={{ filter: filterEffect }}
                />
              </div>
            ) : (
              <div className="gallery-polaroid-stage">
                <div
                  className="gallery-polaroid"
                  style={{
                    background: frame.background,
                    color: frame.text,
                  }}
                >
                  <div className="gallery-polaroid-image">
                    <img
                      src={photo}
                      alt="Polaroid preview"
                      style={{ filter: filterEffect }}
                    />
                  </div>

                  <div className="gallery-polaroid-caption">
                    {caption || "\u00A0"}
                  </div>

                  {showDate && photoDate && (
                    <div className="gallery-polaroid-date">
                      {photoDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              hidden
            />

            {error && (
              <p className="gallery-error" role="alert">
                {error}
              </p>
            )}

            {photo && (
              <div className="gallery-photo-actions">
                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  CHANGE PHOTO
                </button>

                <button onClick={downloadPhoto}>
                  {mode === "polaroid"
                    ? "SAVE POLAROID"
                    : "SAVE PHOTO"}
                </button>
              </div>
            )}
          </section>

          <aside className="gallery-controls">
            <p className="gallery-eyebrow">
              YOUR EDITING DESK
            </p>

            <h2>MAKE IT A MEMORY.</h2>

            <div className="gallery-control-section">
              <h3>01 / CHOOSE A FILTER</h3>

              <div className="gallery-filter-list">
                <button
                  className={
                    selectedFilter === "None"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedFilter("None")
                  }
                >
                  ORIGINAL
                </button>

                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    className={
                      selectedFilter === filter.name
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedFilter(filter.name)
                    }
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="gallery-control-section">
              <h3>02 / FINE TUNE</h3>

              {[
                [
                  "BRIGHTNESS",
                  brightness,
                  setBrightness,
                ],
                [
                  "CONTRAST",
                  contrast,
                  setContrast,
                ],
                [
                  "SATURATION",
                  saturation,
                  setSaturation,
                ],
              ].map(([label, value, setter]) => (
                <label
                  className="gallery-slider"
                  key={label}
                >
                  <span>
                    {label} — {value}%
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={value}
                    onChange={(event) =>
                      setter(Number(event.target.value))
                    }
                  />
                </label>
              ))}
            </div>

            {mode === "polaroid" && (
              <div className="gallery-control-section">
                <h3>03 / POLAROID STUDIO</h3>

                <p className="gallery-field-label">
                  CHOOSE YOUR FRAME
                </p>

                <div className="gallery-frame-options">
                  {Object.entries(frames).map(
                    ([key, option]) => (
                      <button
                        key={key}
                        className={
                          selectedFrame === key
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedFrame(key)
                        }
                      >
                        <span
                          className="gallery-frame-swatch"
                          style={{
                            background:
                              option.background,
                          }}
                        />

                        {option.name}
                      </button>
                    )
                  )}
                </div>

                <label className="gallery-text-field">
                  YOUR CAPTION

                  <input
                    type="text"
                    maxLength={80}
                    value={caption}
                    onChange={(event) =>
                      setCaption(event.target.value)
                    }
                    placeholder="write a little memory..."
                  />
                </label>

                <label className="gallery-text-field">
                  PHOTO DATE

                  <input
                    type="date"
                    value={photoDate}
                    onChange={(event) =>
                      setPhotoDate(event.target.value)
                    }
                  />
                </label>

                <label className="gallery-date-toggle">
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(event) =>
                      setShowDate(event.target.checked)
                    }
                  />

                  SHOW DATE ON POLAROID
                </label>
              </div>
            )}

            <button
              className="gallery-reset"
              onClick={resetFilters}
            >
              RESET FILTERS
            </button>
          </aside>
        </div>
      </main>

      <canvas ref={canvasRef} hidden />
    </div>
  );
}

export default GalleryEditor;
