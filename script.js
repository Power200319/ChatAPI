// script.js

// Grab all necessary DOM elements
const fromLang           = document.getElementById('fromLang');
const toLang             = document.getElementById('toLang');
const sourceText         = document.getElementById('sourceText');   // contenteditable div
const translateBtn       = document.getElementById('translateBtn');
const pasteBtn           = document.getElementById('pasteBtn');
const targetText         = document.getElementById('targetText');
const micBtn             = document.getElementById('micBtn');
const stopBtn            = document.getElementById('stopBtn');
const darkModeBtn        = document.getElementById('darkModeBtn');
const historyToggleBtn   = document.getElementById('historyToggleBtn');
const historyContainer   = document.getElementById('historyContainer');
const historyList        = document.getElementById('historyList');

// Populate language dropdowns
const languageMap = {
  'English': 'en',
  'Khmer':   'km',
  'French':  'fr',
  'Chinese': 'zh-CN',
  'Japanese':'ja',
  'Spanish': 'es',
  'German':  'de',
  'Thai':    'th',
  'Vietnamese':'vi'
};

for (let [name, code] of Object.entries(languageMap)) {
  fromLang.innerHTML += `<option value="${code}">${name}</option>`;
  toLang.innerHTML   += `<option value="${code}">${name}</option>`;
}
fromLang.value = 'en';
toLang.value   = 'km';

// Text-to-Speech helper (stops any old utterance first)
function speak(text, lang) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// Perform translation via Google Translate API
async function translateText() {
  const raw = sourceText.innerText.trim();
  if (!raw) return;

  const fromCode = fromLang.value;
  const toCode   = toLang.value;

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromCode}&tl=${toCode}&dt=t&q=${encodeURIComponent(raw)}`
    );
    const data = await res.json();
    const translated = data[0][0][0];
    targetText.textContent = translated;
    speak(translated, toCode);
    addToHistory(raw, translated);
  } catch (err) {
    console.error('Translation error:', err);
    targetText.textContent = '⚠️ Translation failed';
  }
}

// Add a record to history
function addToHistory(original, translated) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.innerHTML = `<strong>${original}</strong><br>${translated}<hr>`;
  historyList.prepend(div);
}

// Paste from clipboard and immediately translate
pasteBtn.addEventListener('click', async () => {
  const clip = await navigator.clipboard.readText();
  sourceText.innerText = clip;
  translateText();
});

// Wire up the Translate button
translateBtn.addEventListener('click', () => {
  translateText();
});

// Auto-translate whenever the user types or pastes in the contenteditable div
let translateDebounce;
sourceText.addEventListener('input', () => {
  clearTimeout(translateDebounce);
  translateDebounce = setTimeout(() => {
    translateText();
  }, 300);
});

// Dark mode toggle
darkModeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// Show/Hide history
historyToggleBtn.addEventListener('click', () => {
  if (historyContainer.style.display === 'none' || !historyContainer.style.display) {
    historyContainer.style.display = 'block';
  } else {
    historyContainer.style.display = 'none';
  }
});

// Speech recognition setup
let recognition;
function startListening() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Speech recognition not supported");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = fromLang.value;
  recognition.interimResults = false;
  recognition.continuous = true; // ⭐ Important for continuous listening

  micBtn.textContent = '⏳ Listening...';
  micBtn.disabled = true;
  stopBtn.disabled = false;

  recognition.onresult = async (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript + ' ';
      }
    }

    if (transcript.trim()) {
      sourceText.innerText = transcript.trim();
      await translateText();
    }
  };

  recognition.onerror = (event) => {
    console.error('Recognition error:', event.error);
  };

  recognition.onend = () => {
    // Restart listening unless stopped manually
    if (!stopBtn.disabled) {
      recognition.start();
    }
  };

  recognition.start();
}

function stopListening() {
  if (recognition) {
    recognition.onend = null;  // Prevent auto-restart
    recognition.stop();
  }

  micBtn.textContent = '🎙️ Start';
  micBtn.disabled = false;
  stopBtn.disabled = true;
}


// Wire up mic/stop buttons
micBtn.addEventListener('click',  startListening);
stopBtn.addEventListener('click', stopListening);

// On page load, hide history by default
window.addEventListener('DOMContentLoaded', () => {
  historyContainer.style.display = 'none';
  stopBtn.disabled = true;
});
