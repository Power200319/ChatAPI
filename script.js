const sourceText = document.getElementById("sourceText");
const targetText = document.getElementById("targetText");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const modeSelect = document.getElementById("modeSelect");

let recognition;
let isRunning = false;
let khmerVoice = null;
let englishVoice = null;

if (!('webkitSpeechRecognition' in window)) {
  alert("Your browser does not support Speech Recognition API. Please use Chrome.");
} else {
  recognition = new webkitSpeechRecognition();
}

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";

function loadVoices() {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
}

async function initVoices() {
  const voices = await loadVoices();
  khmerVoice = voices.find(v => v.lang === "km-KH") || null;
  englishVoice = voices.find(v => v.lang.startsWith("en")) || null;
}

function getLangPair() {
  switch (modeSelect.value) {
    case "en-km": return { recog: "en-US", source: "en", target: "km", speakLang: "km-KH" };
    case "km-en": return { recog: "km-KH", source: "km", target: "en", speakLang: "en-US" };
    default: return { recog: "en-US", source: "en", target: "km", speakLang: "km-KH" };
  }
}

function speak(text, lang) {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (lang === "km-KH" && khmerVoice) utterance.voice = khmerVoice;
  if (lang.startsWith("en") && englishVoice) utterance.voice = englishVoice;
  utterance.rate = 1; // normal speed
  window.speechSynthesis.speak(utterance);
}

let debounceTimer;
function translateAndSpeak(text) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const { source, target, speakLang } = getLangPair();
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`)
      .then(res => res.json())
      .then(data => {
        const translated = data[0][0][0];
        targetText.textContent = translated;
        speak(translated, speakLang);
      })
      .catch(console.error);
  }, 300);
}

recognition.onresult = (event) => {
  let interimTranscript = "";
  let finalTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript;
    } else {
      interimTranscript += event.results[i][0].transcript;
    }
  }

  sourceText.textContent = interimTranscript || finalTranscript;

  if (finalTranscript) {
    translateAndSpeak(finalTranscript);
  }
};

recognition.onerror = (event) => {
  console.error("Speech recognition error", event.error);
};

recognition.onend = () => {
  if (isRunning) {
    recognition.start();
  }
};

startBtn.onclick = () => {
  if (!isRunning) {
    const { recog } = getLangPair();
    recognition.lang = recog;
    recognition.start();
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }
};

stopBtn.onclick = () => {
  if (isRunning) {
    recognition.stop();
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    window.speechSynthesis.cancel();
    sourceText.textContent = "";
    targetText.textContent = "";
  }
};

modeSelect.onchange = () => {
  if (isRunning) {
    recognition.stop();
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    sourceText.textContent = "";
    targetText.textContent = "";
    window.speechSynthesis.cancel();
  }
};

window.onload = () => {
  initVoices();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(console.error);
  }
};
