
import { useEffect, useRef, useState } from "react";
import { filters } from "../data/filters";
import { saveVideo } from "../utils/memoryStorage";
import "./ShutterVideo.css";

const videoFilters = [
  {
    name: "Original",
    effect: "",
    color: "#d5c9b8",
  },
  {
    name: "Morning Diary",
    effect: "brightness(1.04) contrast(0.9) saturate(0.85) sepia(0.15)",
    color: "#ead6b5",
  },
  {
    name: "Sun Kissed",
    effect: "brightness(1.02) contrast(0.95) saturate(1.15) sepia(0.25)",
    color: "#e7ad69",
  },
  {
    name: "Daylight Film",
    effect: "brightness(0.96) contrast(0.92) saturate(0.9)",
    color: "#c5c8b0",
  },
  {
    name: "Morning Mist",
    effect: "brightness(1.08) contrast(0.85) saturate(0.75)",
    color: "#d7dfd7",
  },
  {
    name: "Midnight Diary",
    effect: "brightness(1.15) contrast(0.92) saturate(0.9) sepia(0.22)",
    color: "#9b8061",
  },
  {
    name: "Blue Hour",
    effect: "brightness(1.12) contrast(0.9) saturate(0.8) hue-rotate(12deg)",
    color: "#7389ae",
  },
  {
    name: "After Dark",
    effect: "brightness(1.2) contrast(0.9) saturate(0.85)",
    color: "#76665d",
  },
  {
    name: "Amber Nights",
    effect: "brightness(1.1) contrast(1.02) saturate(1.1) sepia(0.35)",
    color: "#bd9257",
  },
  {
    name: "Dream Sequence",
    effect: "brightness(1.06) contrast(0.85) saturate(0.8) sepia(0.12)",
    color: "#d9b5c9",
  },
  {
    name: "Cinema 2000",
    effect: "contrast(1.08) saturate(0.8) sepia(0.18)",
    color: "#b99a79",
  },
  ...filters,
].filter(
  (filter, index, array) =>
    array.findIndex(
      (item) => item.name === filter.name
    ) === index
);

const motionStyles = [
  {
    name: "Normal",
    fps: 30,
    trail: 0,
    description: "Smooth everyday video",
  },
  {
    name: "Memory Lane",
    fps: 12,
    trail: 0.22,
    description: "Soft nostalgic movement",
  },
  {
    name: "Shutter Diary",
    fps: 8,
    trail: 0.42,
    description: "Choppy vintage digicam",
  },
  {
    name: "Dream Sequence",
    fps: 10,
    trail: 0.65,
    description: "Dreamy ghost trails",
  },
  {
    name: "Slow Shutter",
    fps: 6,
    trail: 0.82,
    description: "Soft cinematic motion smear",
  },
  {
    name: "Lost Tapes",
    fps: 5,
    trail: 0.4,
    description: "Retro fragmented movement",
  },
];

const dimensions = {
  "16:9": [960, 540],
  "9:16": [540, 960],
  "1:1": [640, 640],
  "4:3": [800, 600],
};

function ShutterVideo({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const animationRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const brightnessRef = useRef(1);
  const mountedRef = useRef(true);
  const recordingRef = useRef(false);
  const startingRef = useRef(false);
  const readyRef = useRef(false);
  const settingsRef = useRef({});
  const recordingStartRef = useRef(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [facingMode, setFacingMode] = useState("user");

  const [selectedFilter, setSelectedFilter] =
    useState("Morning Diary");

  const [selectedMotion, setSelectedMotion] =
    useState("Shutter Diary");

  const [lightMode, setLightMode] = useState("auto");
  const [exposure, setExposure] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [glow, setGlow] = useState(10);
  const [grain, setGrain] = useState(8);

  const [trailStrength, setTrailStrength] =
    useState(100);

  const [audio, setAudio] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [ratio, setRatio] = useState("16:9");

  const [seconds, setSeconds] = useState(0);
  const [videoURL, setVideoURL] = useState("");
  const [videoBlob, setVideoBlob] = useState(null);
  const [message, setMessage] = useState("");

  const [detectedLight, setDetectedLight] =
    useState("Detecting");

  const activeFilter = videoFilters.find(
    (filter) => filter.name === selectedFilter
  );

  const activeMotion =
    motionStyles.find(
      (motion) => motion.name === selectedMotion
    ) || motionStyles[0];

  // LIVE SETTINGS

  useEffect(() => {
    settingsRef.current = {
      effect: activeFilter?.effect || "",
      motion: activeMotion,
      lightMode,
      exposure,
      warmth,
      glow,
      grain,
      trailStrength,
      mirror,
      facingMode,
      ratio,
    };
  }, [
    activeFilter,
    activeMotion,
    lightMode,
    exposure,
    warmth,
    glow,
    grain,
    trailStrength,
    mirror,
    facingMode,
    ratio,
  ]);

  // CAMERA CLEANUP

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      cancelAnimationFrame(animationRef.current);

      const recorder = recorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.stop();
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      recordingStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [videoURL]);

  // RECORDING TIMER

  useEffect(() => {
    if (!recording) return;

    const timer = setInterval(() => {
      setSeconds(
        Math.floor(
          (Date.now() - recordingStartRef.current) / 1000
        )
      );
    }, 200);

    return () => clearInterval(timer);
  }, [recording]);

  // START CAMERA

  async function startCamera(
    direction = facingMode,
    withAudio = audio
  ) {
    if (
      recordingRef.current ||
      startingRef.current ||
      finishing
    ) {
      return;
    }

    startingRef.current = true;
    readyRef.current = false;

    setStarting(true);
    setMessage("");
    setDetectedLight("Detecting");

    cancelAnimationFrame(animationRef.current);

    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;

    setCameraOn(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera requires HTTPS or localhost."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: direction },
            width: { ideal: 960 },
            height: { ideal: 540 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: withAudio,
        });

      if (!mountedRef.current) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      video.srcObject = stream;

      await video.play();

      if (!mountedRef.current) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      setFacingMode(direction);
      setCameraOn(true);
      setAudio(withAudio);

      brightnessRef.current = 1;

      drawVideo();

    } catch (error) {
      console.error(error);

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;

      if (mountedRef.current) {
        setCameraOn(false);

        setMessage(
          "Unable to start camera. Check camera and microphone permissions."
        );
      }

    } finally {
      startingRef.current = false;

      if (mountedRef.current) {
        setStarting(false);
      }
    }
  }

  // ===================================
  // SLOW SHUTTER PROCESSING ENGINE
  // ===================================

  function drawVideo() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    const makeCanvas = () =>
      document.createElement("canvas");

    // HELD OUTPUT FRAME

    const heldCanvas = makeCanvas();

    const heldContext = heldCanvas.getContext(
      "2d",
      { alpha: false }
    );

    // RECENT CAMERA FRAMES

    const history = Array.from(
      { length: 6 },
      () => {
        const frame = makeCanvas();

        return {
          canvas: frame,
          context: frame.getContext("2d", {
            alpha: false,
          }),
        };
      }
    );

    // LIGHT SENSOR

    const sampleCanvas = makeCanvas();

    sampleCanvas.width = 32;
    sampleCanvas.height = 24;

    const sampleContext =
      sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      });

    // FILM GRAIN

    const grainCanvas = makeCanvas();

    grainCanvas.width = 120;
    grainCanvas.height = 68;

    const grainContext =
      grainCanvas.getContext("2d");

    if (
      !context ||
      !heldContext ||
      !sampleContext ||
      !grainContext ||
      history.some((frame) => !frame.context)
    ) {
      setMessage("Canvas processing is unavailable.");
      return;
    }

    const grainPixels =
      grainContext.createImageData(
        grainCanvas.width,
        grainCanvas.height
      );

    let lastTick = -Infinity;
    let lastHold = -Infinity;
    let lastSample = -Infinity;

    let lastVideoTime = -1;
    let average = 115;
    let count = 0;
    let cursor = 0;

    let signature = "";
    let lastLight = "";

    function render(now) {
      if (!mountedRef.current) return;

      animationRef.current =
        requestAnimationFrame(render);

      if (
        video.readyState < 2 ||
        !video.videoWidth
      ) {
        return;
      }

      // PROCESS AT UP TO 30 FPS

      const interval = 1000 / 30;

      if (now - lastTick < interval - 2) {
        return;
      }

      lastTick = Number.isFinite(lastTick)
        ? now - ((now - lastTick) % interval)
        : now;

      const settings = settingsRef.current;

      if (!settings.motion) return;

      const motion = settings.motion;

      const [width, height] =
        dimensions[settings.ratio] ||
        dimensions["16:9"];

      const key = [
        settings.ratio,
        motion.name,
        settings.mirror,
        settings.facingMode,
        settings.effect,
      ].join("|");

      // RESET HISTORY WHEN SETTINGS CHANGE

      if (
        key !== signature ||
        canvas.width !== width ||
        canvas.height !== height
      ) {
        if (
          canvas.width !== width ||
          canvas.height !== height
        ) {
          canvas.width = width;
          canvas.height = height;
        }

        heldCanvas.width = width;
        heldCanvas.height = height;

        history.forEach((frame) => {
          frame.canvas.width = width;
          frame.canvas.height = height;
        });

        signature = key;
        count = 0;
        cursor = 0;

        lastHold = -Infinity;
        lastVideoTime = -1;
      }

      // DETECT AVAILABLE LIGHT

      if (now - lastSample >= 500) {
        lastSample = now;

        sampleContext.drawImage(
          video,
          0,
          0,
          32,
          24
        );

        const data =
          sampleContext.getImageData(
            0,
            0,
            32,
            24
          ).data;

        let total = 0;

        for (
          let i = 0;
          i < data.length;
          i += 4
        ) {
          total +=
            data[i] * 0.2126 +
            data[i + 1] * 0.7152 +
            data[i + 2] * 0.0722;
        }

        average = total / (32 * 24);

        let light = "Balanced Light";

        if (average < 65) {
          light = "Low Light";
        } else if (average > 175) {
          light = "Bright Sunlight";
        }

        if (light !== lastLight) {
          lastLight = light;
          setDetectedLight(light);
        }
      }

      // AUTOMATIC LIGHT CORRECTION

      let targetBrightness = 1;

      if (settings.lightMode === "auto") {
        targetBrightness = Math.min(
          1.55,
          Math.max(
            0.78,
            115 / Math.max(average, 30)
          )
        );
      }

      if (settings.lightMode === "daylight") {
        targetBrightness =
          average > 175 ? 0.85 : 1;
      }

      if (settings.lightMode === "night") {
        targetBrightness =
          average < 100 ? 1.4 : 1.05;
      }

      brightnessRef.current +=
        (targetBrightness -
          brightnessRef.current) *
        0.08;

      const finalBrightness =
        brightnessRef.current *
        (settings.exposure / 100);

      // COLLECT NEW CAMERA FRAMES

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const frame = history[cursor];
        const frameContext = frame.context;

        const scale = Math.max(
          width / video.videoWidth,
          height / video.videoHeight
        );

        const sourceWidth = width / scale;
        const sourceHeight = height / scale;

        const sourceX =
          (video.videoWidth - sourceWidth) / 2;

        const sourceY =
          (video.videoHeight - sourceHeight) / 2;

        frameContext.save();

        frameContext.setTransform(
          1, 0, 0, 1, 0, 0
        );

        if (
          settings.mirror &&
          settings.facingMode === "user"
        ) {
          frameContext.translate(width, 0);
          frameContext.scale(-1, 1);
        }

        const baseEffect =
          settings.effect === "none"
            ? ""
            : settings.effect;

        frameContext.filter = `
          ${baseEffect}
          brightness(${finalBrightness})
          sepia(${settings.warmth / 200})
        `.trim();

        frameContext.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height
        );

        frameContext.restore();

        cursor =
          (cursor + 1) % history.length;

        count = Math.min(
          count + 1,
          history.length
        );
      }

      if (!count) return;

      // CONTROLLED FRAME HOLD

      const holdDuration =
        1000 / motion.fps;

      if (now - lastHold >= holdDuration) {
        lastHold = Number.isFinite(lastHold)
          ? now - ((now - lastHold) % holdDuration)
          : now;

        const newestIndex =
          (cursor - 1 + history.length) %
          history.length;

        heldContext.globalAlpha = 1;
        heldContext.filter = "none";

        heldContext.drawImage(
          history[newestIndex].canvas,
          0,
          0
        );

        // MULTI-FRAME MOTION ACCUMULATION

        const strength = Math.min(
          0.9,
          motion.trail *
            (settings.trailStrength / 100)
        );

        let trailFrames = 3;

        if (motion.name === "Dream Sequence") {
          trailFrames = 5;
        }

        if (motion.name === "Slow Shutter") {
          trailFrames = 6;
        }

        if (motion.name === "Memory Lane") {
          trailFrames = 2;
        }

        const availableFrames = Math.min(
          trailFrames,
          count - 1
        );

        if (
          strength > 0 &&
          availableFrames > 0
        ) {
          heldContext.save();

          for (
            let age = availableFrames;
            age >= 1;
            age--
          ) {
            const index =
              (
                cursor -
                1 -
                age +
                history.length
              ) % history.length;

            heldContext.globalAlpha =
              strength *
              (1 - (age - 1) /
                (availableFrames + 1)) *
              0.65;

            if (
              motion.name === "Slow Shutter"
            ) {
              heldContext.filter =
                `blur(${age * 0.4}px)`;
            } else {
              heldContext.filter = "none";
            }

            heldContext.drawImage(
              history[index].canvas,
              0,
              0
            );
          }

          heldContext.restore();
        }

        // SOFT CINEMATIC GLOW

        if (settings.glow > 0) {
          const gradient =
            heldContext.createRadialGradient(
              width * 0.35,
              height * 0.25,
              0,
              width * 0.35,
              height * 0.25,
              width * 0.85
            );

          gradient.addColorStop(
            0,
            `rgba(255,220,180,${
              settings.glow / 500
            })`
          );

          gradient.addColorStop(
            1,
            "rgba(255,220,180,0)"
          );

          heldContext.fillStyle = gradient;

          heldContext.fillRect(
            0,
            0,
            width,
            height
          );
        }

        // FILM GRAIN

        if (settings.grain > 0) {
          for (
            let i = 0;
            i < grainPixels.data.length;
            i += 4
          ) {
            const value =
              Math.random() > 0.5 ? 255 : 0;

            grainPixels.data[i] = value;
            grainPixels.data[i + 1] = value;
            grainPixels.data[i + 2] = value;

            grainPixels.data[i + 3] =
              Math.random() * 80;
          }

          grainContext.putImageData(
            grainPixels,
            0,
            0
          );

          heldContext.save();

          heldContext.globalAlpha =
            settings.grain / 100;

          heldContext.imageSmoothingEnabled =
            false;

          heldContext.drawImage(
            grainCanvas,
            0,
            0,
            width,
            height
          );

          heldContext.restore();
        }
      }

      // DISPLAY THE HELD FRAME

      context.globalAlpha = 1;
      context.filter = "none";

      context.drawImage(
        heldCanvas,
        0,
        0
      );

      // MANUAL RECORDING FRAME REQUEST

      const recordingTrack =
        recordingStreamRef.current
          ?.getVideoTracks()[0];

      if (
        recordingRef.current &&
        recordingTrack?.requestFrame
      ) {
        recordingTrack.requestFrame();
      }

      readyRef.current = true;
    }

    animationRef.current =
      requestAnimationFrame(render);
  }

  // FLIP CAMERA

  function flipCamera() {
    const next =
      facingMode === "user"
        ? "environment"
        : "user";

    if (cameraOn) {
      startCamera(next, audio);
    } else {
      setFacingMode(next);
    }
  }

  // MICROPHONE

  function toggleAudio() {
    const next = !audio;

    if (cameraOn) {
      startCamera(facingMode, next);
    } else {
      setAudio(next);
    }
  }

  // ===================================
  // START RECORDING
  // ===================================

  function startRecording() {
    if (
      !cameraOn ||
      recordingRef.current ||
      startingRef.current ||
      finishing
    ) {
      return;
    }

    if (!readyRef.current) {
      setMessage(
        "Wait for the camera to become ready."
      );

      return;
    }

    try {
      if (
        typeof MediaRecorder === "undefined" ||
        !canvasRef.current?.captureStream
      ) {
        throw new Error(
          "Recording is not supported."
        );
      }

      setMessage("");
      setSeconds(0);
      setVideoURL("");
      setVideoBlob(null);

      chunksRef.current = [];

      // RECORD PROCESSED CANVAS

      let canvasStream =
        canvasRef.current.captureStream(0);

      const track =
        canvasStream.getVideoTracks()[0];

      if (
        typeof track?.requestFrame !== "function"
      ) {
        canvasStream
          .getTracks()
          .forEach((item) => item.stop());

        canvasStream =
          canvasRef.current.captureStream(30);
      }

      recordingStreamRef.current =
        canvasStream;

      // ADD AUDIO

      if (audio && streamRef.current) {
        streamRef.current
          .getAudioTracks()
          .forEach((track) => {
            canvasStream.addTrack(track);
          });
      }

      // VIDEO FORMATS

      const formats = [
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];

      const mimeType = formats.find(
        (format) =>
          MediaRecorder.isTypeSupported(format)
      );

      const options = {
        videoBitsPerSecond: 3500000,
      };

      if (mimeType) {
        options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(
        canvasStream,
        options
      );

      recorderRef.current = recorder;

      let failed = false;

      // COLLECT RECORDED DATA

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // COMPLETE RECORDING

      recorder.onstop = async () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              mimeType ||
              "video/webm",
          }
        );

        const duration = Math.floor(
          (Date.now() -
            recordingStartRef.current) /
            1000
        );

        canvasStream
          .getVideoTracks()
          .forEach((track) => track.stop());

        recordingStreamRef.current = null;
        recordingRef.current = false;

        if (!mountedRef.current) return;

        setRecording(false);
        setFinishing(true);

        if (failed || !blob.size) {
          setMessage(
            "Unable to complete recording."
          );

          setFinishing(false);
          return;
        }

        const url = URL.createObjectURL(blob);

        setVideoBlob(blob);
        setVideoURL(url);
        setSeconds(duration);

        // AUTOMATIC CAMERA ROLL SAVING

        try {
          const thumbnail =
            canvasRef.current?.toDataURL(
              "image/jpeg",
              0.8
            ) || "";

          await saveVideo(
            blob,
            selectedFilter + " - Moving Memories",
            thumbnail,
            duration
          );

          if (mountedRef.current) {
            setMessage(
              "Your video is saved to Camera Roll!"
            );
          }

        } catch (error) {
          console.error(
            "Video saving failed:",
            error
          );

          if (mountedRef.current) {
            setMessage(
              "Video is ready to download, but Camera Roll saving failed."
            );
          }

        } finally {
          if (mountedRef.current) {
            setFinishing(false);
          }
        }
      };

      // RECORDING ERROR HANDLING

      recorder.onerror = () => {
        failed = true;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }

        if (mountedRef.current) {
          setMessage("Video recording failed.");
        }
      };

      // BEGIN RECORDING

      recorder.start(250);

      recordingStartRef.current = Date.now();
      recordingRef.current = true;

      setRecording(true);

    } catch (error) {
      console.error(error);

      recordingStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => track.stop());

      recordingStreamRef.current = null;
      recordingRef.current = false;

      setRecording(false);
      setFinishing(false);

      setMessage(
        "Unable to record video in this browser."
      );
    }
  }

  // STOP RECORDING

  function stopRecording() {
    const recorder = recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      setSeconds(
        Math.floor(
          (Date.now() -
            recordingStartRef.current) /
            1000
        )
      );

      setFinishing(true);
      setRecording(false);

      recorder.stop();
    }
  }

  function handleShutter() {
    if (recordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // DOWNLOAD VIDEO

  function downloadVideo() {
    if (!videoURL || !videoBlob) return;

    const extension =
      videoBlob.type.includes("mp4")
        ? "mp4"
        : "webm";

    const link =
      document.createElement("a");

    link.href = videoURL;

    link.download =
      `CAMexe-Shutter-${Date.now()}.${extension}`;

    document.body.appendChild(link);

    link.click();
    link.remove();
  }

  // STOP CAMERA

  function stopCamera() {
    if (
      recordingRef.current ||
      finishing
    ) {
      return;
    }

    cancelAnimationFrame(animationRef.current);

    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
    readyRef.current = false;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  }

  // RESET ADJUSTMENTS

  function resetAdjustments() {
    setExposure(100);
    setWarmth(0);
    setGlow(10);
    setGrain(8);
    setTrailStrength(100);
    setLightMode("auto");
  }

  // MORNING PRESET

  function applyMorningPreset() {
    setSelectedFilter("Morning Diary");
    setSelectedMotion("Shutter Diary");
    setLightMode("auto");
    setExposure(100);
    setWarmth(12);
    setGlow(15);
    setGrain(6);
    setTrailStrength(120);
  }

  // NIGHT PRESET

  function applyNightPreset() {
    setSelectedFilter("Amber Nights");
    setSelectedMotion("Shutter Diary");
    setLightMode("night");
    setExposure(100);
    setWarmth(10);
    setGlow(5);
    setGrain(5);
    setTrailStrength(120);
  }

  // DREAM PRESET

  function applyDreamPreset() {
    setSelectedFilter("Dream Sequence");
    setSelectedMotion("Dream Sequence");
    setLightMode("auto");
    setExposure(100);
    setWarmth(8);
    setGlow(25);
    setGrain(8);
    setTrailStrength(130);
  }

  function formatTime(value) {
    const hours =
      Math.floor(value / 3600);

    const minutes =
      Math.floor((value % 3600) / 60);

    const secs = value % 60;

    return [hours, minutes, secs]
      .map((part) =>
        String(part).padStart(2, "0")
      )
      .join(":");
  }

  // ===================================
  // USER INTERFACE
  // ===================================

  return (
    <div className="shutter-page">

      <header className="shutter-header">

        <button
          onClick={onBack}
          disabled={
            recording ||
            starting ||
            finishing
          }
        >
          ← BACK
        </button>

        <h2>
          CAM<span>.exe</span> / SHUTTER
        </h2>

        <span>CAM_006</span>

      </header>

      <main className="shutter-container">

        <div className="shutter-heading">

          <p>LIFE IN MOTION</p>

          <h1>MOVING MEMORIES.</h1>

          <p>
            Life isn't always smooth.
            Sometimes the little imperfect
            frames make the best memories.
          </p>

        </div>

        <div className="shutter-layout">

          <section className="shutter-camera">

            <div className="shutter-camera-top">

              <span
                className={
                  recording ? "recording" : ""
                }
              >
                {recording
                  ? "● REC"
                  : cameraOn
                  ? "● LIVE"
                  : "○ STANDBY"}
              </span>

              <span>
                {formatTime(seconds)} / DIGITAL
              </span>

            </div>

            {/* VIEWFINDER */}

            <div
              className="shutter-viewfinder"
              style={{
                aspectRatio:
                  ratio.replace(":", " / "),
              }}
            >

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />

              <canvas
                ref={canvasRef}
                style={{
                  display:
                    cameraOn
                      ? "block"
                      : "none",
                }}
              />

              {!cameraOn && (

                <div className="shutter-placeholder">

                  <h2>ROLL CAMERA.</h2>

                  <p>
                    YOUR LITTLE MOVIE AWAITS
                  </p>

                  <button
                    onClick={() => startCamera()}
                    disabled={starting}
                  >
                    {starting
                      ? "STARTING..."
                      : "START CAMERA"}
                  </button>

                </div>

              )}

            </div>

            <div className="shutter-camera-bottom">

              <span>
                {selectedFilter.toUpperCase()}
              </span>

              <span>
                {activeMotion.fps} FPS / {ratio}
              </span>

            </div>

            <div className="shutter-motion-indicator">

              <span>MOTION STYLE</span>

              <strong>
                {selectedMotion}
              </strong>

            </div>

            {/* LIGHT SENSOR */}

            <div className="shutter-light-status">

              <span>LIGHT SENSOR</span>

              <strong>
                {cameraOn
                  ? detectedLight
                  : "Camera offline"}
              </strong>

            </div>

            <div className="shutter-light-modes">

              {[
                ["auto", "AUTO LIGHT"],
                ["daylight", "DAYLIGHT"],
                ["night", "LOW LIGHT"],
              ].map(([value, label]) => (

                <button
                  key={value}
                  className={
                    lightMode === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setLightMode(value)
                  }
                >
                  {label}
                </button>

              ))}

            </div>

            {/* RECORDING CONTROLS */}

            <div className="shutter-actions">

              <button
                className="shutter-small-button"
                onClick={toggleAudio}
                disabled={
                  recording ||
                  starting ||
                  finishing
                }
              >
                MIC {audio ? "ON" : "OFF"}
              </button>

              <button
                className={`shutter-record ${
                  recording ? "active" : ""
                }`}
                onClick={handleShutter}
                disabled={
                  !cameraOn ||
                  starting ||
                  finishing
                }
                aria-label={
                  recording
                    ? "Stop recording"
                    : "Start recording"
                }
              >
                <span />
              </button>

              <button
                className="shutter-small-button"
                onClick={flipCamera}
                disabled={
                  recording ||
                  starting ||
                  finishing
                }
              >
                FLIP CAM
              </button>

            </div>

            <p className="shutter-instruction">

              {finishing
                ? "PREPARING YOUR MOVIE..."
                : recording
                ? "RECORDING — PRESS TO STOP"
                : "PRESS SHUTTER TO RECORD"}

            </p>

            {message && (

              <p
                className="shutter-message"
                role="status"
              >
                {message}
              </p>

            )}

            {/* VIDEO PLAYBACK */}

            {videoURL && (

              <div className="shutter-playback">

                <h2>YOUR LITTLE MOVIE.</h2>

                <video
                  src={videoURL}
                  controls
                  playsInline
                />

                <div className="shutter-playback-actions">

                  <button onClick={downloadVideo}>
                    DOWNLOAD VIDEO
                  </button>

                  <button
                    disabled={finishing}
                    onClick={() => {
                      setVideoURL("");
                      setVideoBlob(null);
                      setSeconds(0);
                      setMessage("");
                    }}
                  >
                    RECORD AGAIN
                  </button>

                </div>

              </div>

            )}

          </section>

          {/* SETTINGS PANEL */}

          <aside className="shutter-settings">

            <p className="shutter-eyebrow">
              THE CINEMATIC EXPERIENCE
            </p>

            <h2>SET THE MOOD.</h2>

            {/* QUICK PRESETS */}

            <h3>01 / QUICK AESTHETICS</h3>

            <div className="shutter-quick-presets">

              <button
                className="morning-preset"
                onClick={applyMorningPreset}
              >
                <strong>Morning Memories</strong>
                <small>Sunlight / 8 FPS</small>
              </button>

              <button
                className="night-preset"
                onClick={applyNightPreset}
              >
                <strong>Midnight Memories</strong>
                <small>Amber nights / 8 FPS</small>
              </button>

              <button
                className="dream-preset"
                onClick={applyDreamPreset}
              >
                <strong>In My Dreams</strong>
                <small>Soft motion / 10 FPS</small>
              </button>

            </div>

            {/* MOTION STYLES */}

            <h3>02 / MOTION STYLE</h3>

            <div className="shutter-motion-options">

              {motionStyles.map((motion) => (

                <button
                  key={motion.name}
                  className={
                    selectedMotion === motion.name
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedMotion(motion.name)
                  }
                >

                  <div>

                    <strong>
                      {motion.name}
                    </strong>

                    <small>
                      {motion.description}
                    </small>

                  </div>

                  <span className="motion-fps">
                    {motion.fps} FPS
                  </span>

                </button>

              ))}

            </div>

            <label className="shutter-slider">

              <span>
                MOTION TRAILS — {trailStrength}%
              </span>

              <input
                type="range"
                min="0"
                max="150"
                value={trailStrength}
                onChange={(event) =>
                  setTrailStrength(
                    Number(event.target.value)
                  )
                }
              />

            </label>

            {/* VIDEO FILTERS */}

            <h3>03 / VIDEO FILTERS</h3>

            <div className="shutter-filters">

              {videoFilters.map((filter) => (

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

                  <div
                    className="shutter-filter-color"
                    style={{
                      background:
                        filter.color ||
                        "#d4b8a5",

                      filter:
                        filter.effect ||
                        "none",
                    }}
                  />

                  <span>{filter.name}</span>

                </button>

              ))}

            </div>

            {/* LIGHT LAB */}

            <h3>04 / LIGHT LAB</h3>

            <label className="shutter-slider">

              <span>
                EXPOSURE — {exposure}%
              </span>

              <input
                type="range"
                min="50"
                max="160"
                value={exposure}
                onChange={(event) =>
                  setExposure(
                    Number(event.target.value)
                  )
                }
              />

            </label>

            <label className="shutter-slider">

              <span>
                WARMTH — {warmth}%
              </span>

              <input
                type="range"
                min="0"
                max="100"
                value={warmth}
                onChange={(event) =>
                  setWarmth(
                    Number(event.target.value)
                  )
                }
              />

            </label>

            <label className="shutter-slider">

              <span>
                SOFT GLOW — {glow}%
              </span>

              <input
                type="range"
                min="0"
                max="100"
                value={glow}
                onChange={(event) =>
                  setGlow(
                    Number(event.target.value)
                  )
                }
              />

            </label>

            <label className="shutter-slider">

              <span>
                FILM GRAIN — {grain}%
              </span>

              <input
                type="range"
                min="0"
                max="100"
                value={grain}
                onChange={(event) =>
                  setGrain(
                    Number(event.target.value)
                  )
                }
              />

            </label>

            <button
              className="shutter-reset"
              onClick={resetAdjustments}
            >
              RESET ADJUSTMENTS
            </button>

            {/* CAMERA SETTINGS */}

            <h3>05 / CAMERA SETTINGS</h3>

            <label className="shutter-select">

              ASPECT RATIO

              <select
                value={ratio}
                disabled={
                  recording ||
                  finishing
                }
                onChange={(event) =>
                  setRatio(event.target.value)
                }
              >

                <option value="16:9">
                  Landscape 16:9
                </option>

                <option value="9:16">
                  Portrait 9:16
                </option>

                <option value="1:1">
                  Square 1:1
                </option>

                <option value="4:3">
                  Vintage 4:3
                </option>

              </select>

            </label>

            <label className="shutter-toggle">

              Mirror Camera

              <input
                type="checkbox"
                checked={mirror}
                onChange={(event) =>
                  setMirror(event.target.checked)
                }
              />

            </label>

            {cameraOn && (

              <button
                className="shutter-reset"
                onClick={stopCamera}
                disabled={
                  recording ||
                  finishing
                }
              >
                TURN OFF CAMERA
              </button>

            )}

            <p className="shutter-note">
              Some memories are beautiful
              because they are imperfect.
            </p>

          </aside>

        </div>

      </main>

      <footer className="shutter-footer">

        MADE WITH LOVE IN THE DIGITAL UNIVERSE

      </footer>

    </div>
  );
}

export default ShutterVideo;
