const sourceText = document.getElementById("sourceText");
const targetText = document.getElementById("targetText");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const modeSelect = document.getElementById("modeSelect");

let recognition;
let currentMode = "en-km";
let khmerVoice = null;
let chineseVoice = null;
let isSpeaking = false;
let controller = null;
let isRunning = false;

if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.interimResults = false;
  recognition.continuous = true;
}

function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
}

function speak(text, lang) {
  if (isSpeaking) return; // prevent overlapping speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0; // speaking speed: normal

  if (lang === "km-KH" && khmerVoice) utterance.voice = khmerVoice;
  if (lang.startsWith("zh") && chineseVoice) utterance.voice = chineseVoice;

  isSpeaking = true;
  utterance.onend = () => {
    isSpeaking = false;
  };
  window.speechSynthesis.speak(utterance);
}

async function initVoiceSupport() {
  const voices = await loadVoices();
  khmerVoice = voices.find((v) => v.lang === "km-KH");
  chineseVoice = voices.find((v) => v.lang.startsWith("zh"));
}

function getLangPair() {
  switch (currentMode) {
    case "en-km":
      return { source: "en", target: "km", recog: "en-US", speak: "km-KH" };
    case "km-en":
      return { source: "km", target: "en", recog: "km-KH", speak: "en-US" };
    case "km-zh":
      return { source: "km", target: "zh", recog: "km-KH", speak: "zh-CN" };
    case "zh-km":
      return { source: "zh", target: "km", recog: "zh-CN", speak: "km-KH" };
    default:
      return { source: "en", target: "km", recog: "en-US", speak: "km-KH" };
  }
}

modeSelect.onchange = () => {
  currentMode = modeSelect.value;
  updateRecognitionLang();
};

function updateRecognitionLang() {
  if (recognition) {
    recognition.lang = getLangPair().recog;
  }
}

if (recognition) {
  startBtn.onclick = () => {
    updateRecognitionLang();
    if (!isRunning) {
      recognition.start();
      isRunning = true;
      startBtn.textContent = "🎙️ Listening...";
    }
  };

  resetBtn.onclick = () => {
    if (recognition && isRunning) {
      recognition.stop();
      isRunning = false;
      startBtn.textContent = "🎙️ Start Listening";
    }
    sourceText.textContent = "";
    targetText.textContent = "";
    window.speechSynthesis.cancel();
  };

  recognition.onend = () => {
    if (isRunning) recognition.start(); // keep listening
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    sourceText.textContent = transcript;

    const { source, target, speak: speakLang } = getLangPair();

    if (controller) controller.abort();
    controller = new AbortController();

    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(transcript)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const translated = data[0][0][0];
        targetText.textContent = translated;
        speak(translated, speakLang);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Translation error:", err);
      });
  };
}

window.onload = () => {
  initVoiceSupport();
  updateRecognitionLang();

  // Preload a dummy translation to speed up the first real call
  fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=km&dt=t&q=hello")
    .then((res) => res.json())
    .catch(() => {});
};
