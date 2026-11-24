
import { useState } from "react";

import CameraStudio from "./pages/CameraStudio";
import GalleryEditor from "./pages/GalleryEditor";
import PhotoBooth from "./pages/PhotoBooth";
import CameraRoll from "./pages/CameraRoll";
import ShutterVideo from "./pages/ShutterVideo";

import { filters } from "./data/filters";

import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState("home");

  function openStudio() {
    setCurrentPage("studio");
    window.scrollTo(0, 0);
  }

  function openGallery() {
    setCurrentPage("gallery");
    window.scrollTo(0, 0);
  }

  function openBooth() {
    setCurrentPage("booth");
    window.scrollTo(0, 0);
  }

  function openCameraRoll() {
    setCurrentPage("roll");
    window.scrollTo(0, 0);
  }

  function openShutter() {
    setCurrentPage("shutter");
    window.scrollTo(0, 0);
  }

  function goHome() {
    setCurrentPage("home");
    window.scrollTo(0, 0);
  }

  if (currentPage === "studio") {
    return <CameraStudio onBack={goHome} />;
  }

  if (currentPage === "gallery") {
    return <GalleryEditor onBack={goHome} />;
  }

  if (currentPage === "booth") {
    return <PhotoBooth onBack={goHome} />;
  }

  if (currentPage === "roll") {
    return <CameraRoll onBack={goHome} />;
  }

  if (currentPage === "shutter") {
    return <ShutterVideo onBack={goHome} />;
  }

  return (
    <div className="app">

      {/* NAVIGATION */}

      <nav className="navbar">

        <div className="logo">
          CAM<span>.exe</span>
        </div>

        <div className="nav-links">

          <a href="#studio">STUDIO</a>

          <a href="#filters">FILTERS</a>

          <a href="#editor">EDITOR</a>

          <a href="#shutter">SHUTTER</a>

        </div>

        <button
          className="roll-button"
          onClick={openCameraRoll}
        >
          MY CAMERA ROLL
        </button>

      </nav>

      {/* HERO SECTION */}

      <main className="hero">

        <div className="hero-content">

          <p className="eyebrow">
            YOUR PERSONAL TIME MACHINE
          </p>

          <h1>
            EVERY MOMENT.
            <br />
            A DIFFERENT <span>ERA.</span>
          </h1>

          <p className="hero-description">
            A little nostalgia, a little creativity.
            Capture your moments, explore different
            eras and make ordinary memories
            unforgettable.
          </p>

          <div
            className="hero-buttons"
            style={{ flexWrap: "wrap" }}
          >

            <button
              className="primary-button"
              onClick={openStudio}
            >
              OPEN CAMERA
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                document
                  .getElementById("filters")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              EXPLORE FILTERS
            </button>

            <button
              className="secondary-button"
              onClick={openBooth}
            >
              PHOTO BOOTH
            </button>

            <button
              className="secondary-button"
              onClick={openShutter}
            >
              SHUTTER VIDEO
            </button>

          </div>

        </div>

        {/* CAMERA PREVIEW */}

        <div
          className="camera-preview"
          id="studio"
        >

          <div className="camera-top">

            <span>CAM_001</span>

            <span>● READY</span>

          </div>

          <div className="preview-screen">

            <div className="preview-message">

              <span>YOUR NEXT MEMORY</span>

              <h2>READY?</h2>

              <p>YOUR CAMERA STUDIO AWAITS</p>

              <button
                className="primary-button"
                onClick={openStudio}
                style={{ marginTop: "25px" }}
              >
                ENTER STUDIO
              </button>

            </div>

          </div>

          <div className="camera-bottom">

            <span>MODE: AUTO</span>

            <span>CAM.exe DIGITAL</span>

          </div>

        </div>

      </main>

      {/* FILTER COLLECTION */}

      <section
        className="filters-section"
        id="filters"
      >

        <div className="section-heading">

          <div>

            <p className="eyebrow">
              FIND YOUR AESTHETIC
            </p>

            <h2>CHOOSE YOUR ERA.</h2>

          </div>

          <p>
            {filters.length} WAYS TO SEE THE WORLD
          </p>

        </div>

        <div className="filter-preview">

          {filters.map((filter) => (

            <button
              type="button"
              key={filter.name}
              className="filter-card"
              onClick={openStudio}
            >

              <span>
                {filter.name.toUpperCase()}
              </span>

            </button>

          ))}

        </div>

      </section>

      {/* GALLERY EDITOR */}

      <section
        className="editor-section"
        id="editor"
      >

        <p className="eyebrow">
          AFTER THE CLICK
        </p>

        <h2>MAKE IT YOURS.</h2>

        <p>
          Upload your favorite memories,
          explore nostalgic filters, adjust
          colors and give every photo its
          own aesthetic.
        </p>

        <button
          className="secondary-button"
          onClick={openGallery}
          style={{ marginTop: "25px" }}
        >
          OPEN GALLERY EDITOR
        </button>

      </section>

      {/* SHUTTER VIDEO SECTION */}

      <section
        className="home-shutter-section"
        id="shutter"
      >

        <div className="home-shutter-content">

          <p className="eyebrow">
            LIFE IN MOTION / CAM_006
          </p>

          <h2>
            SOME MOMENTS
            <br />
            DESERVE TO <span>MOVE.</span>
          </h2>

          <p>
            Morning sunlight, golden afternoons,
            quiet evenings and midnight memories.
            Turn everyday life into your own
            little cinematic masterpiece.
          </p>

          <div className="home-shutter-tags">

            <span>AUTO LIGHT</span>

            <span>DAYLIGHT</span>

            <span>LOW LIGHT</span>

            <span>CINEMATIC FILTERS</span>

          </div>

          <button
            className="primary-button"
            onClick={openShutter}
          >
            OPEN SHUTTER VIDEO
          </button>

        </div>

        <div className="home-shutter-camera">

          <div className="home-shutter-top">

            <span>CAM_006</span>

            <span>● REC</span>

          </div>

          <div className="home-shutter-screen">

            <div className="home-shutter-screen-content">

              <p>YOUR LIFE, YOUR LITTLE MOVIE</p>

              <h3>ROLL CAMERA.</h3>

              <button
                className="home-record-button"
                onClick={openShutter}
                aria-label="Open video studio"
              >
                <span />
              </button>

            </div>

          </div>

          <div className="home-shutter-bottom">

            <span>HD / 30 FPS</span>

            <span>DAY TO NIGHT</span>

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="footer">

        MADE WITH LOVE IN THE DIGITAL UNIVERSE

        <span>CAM.exe © 2026</span>

      </footer>

    </div>
  );
}

export default App;
