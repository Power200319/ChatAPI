const fromLang = document.getElementById("fromLang");
const toLang = document.getElementById("toLang");
const sourceText = document.getElementById("sourceText");
const targetText = document.getElementById("targetText");
const micBtn = document.getElementById("micBtn");
const stopBtn = document.getElementById("stopBtn");
const pasteBtn = document.getElementById("pasteBtn");
const historyList = document.getElementById("historyList");
const toggleDarkModeBtn = document.getElementById("darkModeBtn");
const historyToggleBtn = document.getElementById("historyToggleBtn");
const historyContainer = document.getElementById("historyContainer");

const languageMap = {
  English: "en",
  Khmer: "km",
  French: "fr",
  Chinese: "zh-CN",
  Japanese: "ja",
  Spanish: "es",
  German: "de",
  Thai: "th",
  Vietnamese: "vi",
};

for (let [lang, code] of Object.entries(languageMap)) {
  fromLang.innerHTML += `<option value="${code}">${lang}</option>`;
  toLang.innerHTML += `<option value="${code}">${lang}</option>`;
}
fromLang.value = "en";
toLang.value = "km";

function speak(text, lang) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1.1;
  speechSynthesis.cancel(); // Stop previous speech before speaking
  speechSynthesis.speak(utter);
}

async function translateText(text, from, to) {
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(
      text
    )}`
  );
  const data = await response.json();
  return data[0][0][0];
}

function addToHistory(original, translated) {
  const div = document.createElement("div");
  div.className = "history-item";
  div.innerHTML = `<strong>${original}</strong><br>${translated}<hr>`;
  historyList.prepend(div);
}

let recognition;

function startVoice() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech recognition not supported");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = fromLang.value;
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.innerText = "⏳ Loading...";

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    sourceText.innerText = text;
    const translated = await translateText(text, fromLang.value, toLang.value);
    targetText.innerText = translated;
    speak(translated, toLang.value);
    addToHistory(text, translated);
    micBtn.innerText = "🎙️ Start Listening";
  };

  recognition.onerror = (e) => {
    console.error("Error: ", e);
    micBtn.innerText = "🎙️ Start Listening";
  };

  recognition.onend = () => {
    micBtn.disabled = false;
    stopBtn.disabled = true;
    micBtn.innerText = "🎙️ Start Listening";
  };

  recognition.start();
}

micBtn.onclick = () => {
  startVoice();
  micBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  recognition?.stop();
  micBtn.disabled = false;
  stopBtn.disabled = true;
  micBtn.innerText = "🎙️ Start Listening";
};

pasteBtn.onclick = async () => {
  const text = await navigator.clipboard.readText();
  sourceText.innerText = text;
  const translated = await translateText(text, fromLang.value, toLang.value);
  targetText.innerText = translated;
  speak(translated, toLang.value);
  addToHistory(text, translated);
};

toggleDarkModeBtn.onclick = () => {
  document.body.classList.toggle("dark-mode");
};

historyToggleBtn.onclick = () => {
  historyContainer.classList.toggle("hidden");
};
