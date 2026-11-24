
import "./App.css";
import Header from "./components/Header";

function App() {
  return (
    <div className="app">

      <Header />

      <main className="hero">

        <p className="eyebrow">WELCOME TO YOUR DIGITAL PLAYGROUND</p>

        <h1>
          YOUR CAMERA.
          <br />
          YOUR ERA.
          <br />
          YOUR VIBE.
        </h1>

        <p className="description">
          Capture memories, explore different eras
          and turn ordinary moments into something special.
        </p>

        <div className="buttons">
          <button>CAM STUDIO</button>
          <button>TIME WARP</button>
        </div>

      </main>

    </div>
  );
}

export default App;
