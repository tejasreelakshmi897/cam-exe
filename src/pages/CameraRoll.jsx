import { useEffect, useState } from "react";
import {
  getMemories,
  deleteMemory,
  updateMemory,
} from "../utils/memoryStorage";

import "./CameraRoll.css";

const categories = [
  { name: "ALL MEMORIES", value: "all" },
  { name: "PHOTOS", value: "photo" },
  { name: "POLAROIDS", value: "polaroid" },
  { name: "PHOTO STRIPS", value: "strip" },
  { name: "VIDEOS", value: "video" },
  { name: "FAVORITES", value: "favorites" },
];

// VIDEO PLAYER

function VideoPlayer({ blob }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!(blob instanceof Blob)) return;

    const videoURL = URL.createObjectURL(blob);
    setUrl(videoURL);

    return () => {
      URL.revokeObjectURL(videoURL);
    };
  }, [blob]);

  if (!url) return null;

  return (
    <video
      className="roll-video-player"
      src={url}
      controls
      playsInline
      preload="metadata"
      style={{
        width: "100%",
        maxHeight: "65vh",
        objectFit: "contain",
        background: "#171717",
      }}
    />
  );
}

// CAMERA ROLL

function CameraRoll({ onBack }) {
  const [memories, setMemories] = useState([]);
  const [category, setCategory] = useState("all");
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    try {
      setLoading(true);
      setError("");

      const data = await getMemories();
      setMemories(data);
    } catch (err) {
      console.error(err);
      setError("Could not load your memories.");
    } finally {
      setLoading(false);
    }
  }

  // FAVORITES

  async function toggleFavorite(memory) {
    try {
      const updatedMemory = {
        ...memory,
        favorite: !memory.favorite,
      };

      await updateMemory(updatedMemory);

      setMemories((previous) =>
        previous.map((item) =>
          item.id === memory.id ? updatedMemory : item
        )
      );

      setSelectedMemory((previous) =>
        previous?.id === memory.id
          ? updatedMemory
          : previous
      );
    } catch (err) {
      setError("Could not update your favorite.");
    }
  }

  // DELETE MEMORY

  async function removeMemory(memory) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this memory?"
    );

    if (!confirmed) return;

    try {
      await deleteMemory(memory.id);

      setMemories((previous) =>
        previous.filter((item) => item.id !== memory.id)
      );

      if (selectedMemory?.id === memory.id) {
        setSelectedMemory(null);
      }
    } catch (err) {
      setError("Could not delete this memory.");
    }
  }

  // DOWNLOAD PHOTO OR VIDEO

  function downloadMemory(memory) {
    const link = document.createElement("a");

    let temporaryURL = null;

    if (memory.type === "video") {
      if (!(memory.video instanceof Blob)) {
        setError("Video file is unavailable.");
        return;
      }

      temporaryURL = URL.createObjectURL(memory.video);

      const extension = (
        memory.mimeType || memory.video.type
      ).includes("mp4")
        ? "mp4"
        : "webm";

      link.href = temporaryURL;

      link.download =
        `CAMexe-video-${memory.id}.${extension}`;
    } else {
      link.href = memory.image;

      link.download =
        `CAMexe-${memory.type}-${memory.id}.png`;
    }

    document.body.appendChild(link);

    link.click();
    link.remove();

    if (temporaryURL) {
      setTimeout(() => {
        URL.revokeObjectURL(temporaryURL);
      }, 30000);
    }
  }

  // DATE FORMAT

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // MEMORY TYPE

  function formatType(type) {
    if (type === "polaroid") return "POLAROID";
    if (type === "strip") return "PHOTO STRIP";
    if (type === "video") return "VIDEO";

    return "PHOTO";
  }

  // VIDEO DURATION

  function formatDuration(duration) {
    const total = Math.max(
      0,
      Math.floor(Number(duration) || 0)
    );

    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  // CATEGORY FILTER

  const filteredMemories = memories.filter((memory) => {
    if (category === "all") return true;

    if (category === "favorites") {
      return memory.favorite;
    }

    return memory.type === category;
  });

  const favoriteCount = memories.filter(
    (memory) => memory.favorite
  ).length;

  const videoCount = memories.filter(
    (memory) => memory.type === "video"
  ).length;

  return (
    <div className="roll-page">

      {/* HEADER */}

      <header className="roll-header">
        <button onClick={onBack}>← BACK</button>

        <h2>
          CAM<span>.exe</span> / CAMERA ROLL
        </h2>

        <span>MEMORIES / 005</span>
      </header>

      <main className="roll-container">

        {/* HEADING */}

        <div className="roll-heading">
          <p>THE LITTLE THINGS WE KEEP</p>

          <h1>YOUR MEMORY ARCHIVE.</h1>

          <p>
            Some moments deserve to stay forever.
          </p>
        </div>

        {/* MEMORY COUNTS */}

        <div className="roll-stats">

          <div>
            <h2>{memories.length}</h2>
            <p>MEMORIES</p>
          </div>

          <div>
            <h2>
              {memories.filter(
                (item) => item.type === "polaroid"
              ).length}
            </h2>

            <p>POLAROIDS</p>
          </div>

          <div>
            <h2>
              {memories.filter(
                (item) => item.type === "strip"
              ).length}
            </h2>

            <p>PHOTO STRIPS</p>
          </div>

          <div>
            <h2>{videoCount}</h2>
            <p>VIDEOS</p>
          </div>

          <div>
            <h2>{favoriteCount}</h2>
            <p>FAVORITES</p>
          </div>

        </div>

        {/* CATEGORY FILTERS */}

        <div className="roll-categories">

          {categories.map((item) => (
            <button
              key={item.value}
              className={
                category === item.value ? "active" : ""
              }
              onClick={() => setCategory(item.value)}
            >
              {item.name}
            </button>
          ))}

        </div>

        {error && (
          <p className="roll-error" role="alert">
            {error}
          </p>
        )}

        {/* LOADING AND EMPTY STATE */}

        {loading ? (
          <div className="roll-empty">
            <h2>Finding your memories...</h2>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="roll-empty">

            <span className="roll-empty-icon">
              {category === "video" ? "▷" : "♡"}
            </span>

            <h2>
              {category === "all"
                ? "NOTHING BUT POSSIBILITIES."
                : category === "video"
                ? "NO MOVING MEMORIES YET."
                : "NO MEMORIES HERE YET."}
            </h2>

            <p>
              {category === "all"
                ? "Your little moments will live here."
                : category === "video"
                ? "Your little movies will live here."
                : "Your collection is waiting to grow."}
            </p>

            <button onClick={onBack}>
              MAKE A MEMORY
            </button>

          </div>
        ) : (

          /* MEMORY GRID */

          <div className="roll-grid">

            {filteredMemories.map((memory) => (
              <article
                className="roll-card"
                key={memory.id}
              >

                <button
                  className="roll-image"
                  onClick={() =>
                    setSelectedMemory(memory)
                  }
                  aria-label={
                    memory.type === "video"
                      ? "Play video"
                      : "View memory"
                  }
                  style={{ position: "relative" }}
                >

                  {memory.type === "video" ? (

                    <>

                      {/* VIDEO THUMBNAIL */}

                      {memory.image ? (
                        <img
                          src={memory.image}
                          alt="Video thumbnail"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="roll-video-placeholder"
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: "180px",
                            background: "#292323",
                          }}
                        />
                      )}

                      {/* PLAY ICON */}

                      <span
                        className="roll-video-play"
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform:
                            "translate(-50%, -50%)",
                          width: "55px",
                          height: "55px",
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.45)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "24px",
                        }}
                      >
                        ▶
                      </span>

                      {/* VIDEO DURATION */}

                      <span
                        className="roll-video-duration"
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          right: "10px",
                          background: "rgba(0,0,0,0.65)",
                          color: "#fff",
                          padding: "5px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                        }}
                      >
                        {formatDuration(memory.duration)}
                      </span>

                    </>

                  ) : (

                    <img
                      src={memory.image}
                      alt={
                        memory.caption ||
                        formatType(memory.type)
                      }
                      loading="lazy"
                    />

                  )}

                </button>

                <div className="roll-card-info">

                  <div className="roll-card-meta">

                    <span>
                      {formatType(memory.type)}
                    </span>

                    <span>
                      {formatDate(memory.createdAt)}
                    </span>

                  </div>

                  <h3>
                    {memory.caption ||
                      (memory.type === "video"
                        ? "a moving memory"
                        : "a little memory")}
                  </h3>

                  <div className="roll-card-actions">

                    <button
                      className={
                        memory.favorite ? "favorited" : ""
                      }
                      onClick={() =>
                        toggleFavorite(memory)
                      }
                      aria-label={
                        memory.favorite
                          ? "Remove favorite"
                          : "Add favorite"
                      }
                      aria-pressed={memory.favorite}
                    >
                      {memory.favorite ? "♥" : "♡"}
                    </button>

                    <button
                      onClick={() =>
                        downloadMemory(memory)
                      }
                    >
                      SAVE
                    </button>

                    <button
                      onClick={() =>
                        removeMemory(memory)
                      }
                    >
                      DELETE
                    </button>

                  </div>

                </div>

              </article>
            ))}

          </div>
        )}

        <footer className="roll-footer">
          COLLECT MOMENTS, NOT THINGS.
        </footer>

      </main>

      {/* PHOTO AND VIDEO PREVIEW */}

      {selectedMemory && (
        <div
          className="roll-modal"
          onClick={() => setSelectedMemory(null)}
        >

          <div
            className="roll-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Memory preview"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="roll-close"
              onClick={() => setSelectedMemory(null)}
              aria-label="Close preview"
            >
              ×
            </button>

            {/* VIDEO OR PHOTO */}

            {selectedMemory.type === "video" ? (

              <VideoPlayer
                blob={selectedMemory.video}
              />

            ) : (

              <img
                src={selectedMemory.image}
                alt="Selected memory"
              />

            )}

            <h3>
              {selectedMemory.caption ||
                "a little memory"}
            </h3>

            <p>
              {formatDate(selectedMemory.createdAt)}
            </p>

            {selectedMemory.type === "video" && (
              <p>
                DURATION:{" "}
                {formatDuration(selectedMemory.duration)}
              </p>
            )}

            <button
              className="roll-modal-download"
              onClick={() =>
                downloadMemory(selectedMemory)
              }
            >
              {selectedMemory.type === "video"
                ? "DOWNLOAD VIDEO"
                : "DOWNLOAD MEMORY"}
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default CameraRoll;