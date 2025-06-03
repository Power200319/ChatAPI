// Place this code inside script.js

const englishText = document.getElementById("englishText");
const khmerText = document.getElementById("khmerText");
const startBtn = document.getElementById("startBtn");

let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = true;
}

let khmerVoice = null;

function loadVoices() {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

function speakKhmer(text) {
  if (!khmerVoice) {
    console.warn("Khmer voice not loaded or available.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = khmerVoice;
  utterance.lang = "km-KH";
  window.speechSynthesis.speak(utterance);
}

async function initVoiceSupport() {
  const voices = await loadVoices();
  khmerVoice = voices.find(v => v.lang === "km-KH");
  if (!khmerVoice) {
    alert("⚠️ Khmer voice not supported on this device. Use Chrome on Android or try installing a Khmer voice.");
  }
}

if (recognition) {
  let isRunning = false;

  startBtn.onclick = () => {
    if (!isRunning) {
      recognition.start();
      isRunning = true;
      startBtn.textContent = "🎙️ Listening...";
    }
  };

  recognition.onend = () => {
    if (isRunning) recognition.start(); // auto-restart
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    englishText.textContent = transcript;

    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=km&dt=t&q=${encodeURIComponent(transcript)}`)
      .then(res => res.json())
      .then(data => {
        const translated = data[0][0][0];
        khmerText.textContent = translated;
        speakKhmer(translated);
      })
      .catch(err => console.error("Translation error:", err));
  };
}

window.onload = () => {
  initVoiceSupport();
};
