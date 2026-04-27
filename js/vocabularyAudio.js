let activeVocabularyAudio = null;

async function playAudioUrl(url) {
  if (!url) return false;
  activeVocabularyAudio?.pause?.();
  activeVocabularyAudio = new Audio(url);
  try {
    await activeVocabularyAudio.play();
    return true;
  } catch {
    return false;
  }
}

async function playTtsEndpoint(word) {
  const endpoint = window.AppConfig?.VOCABULARY_TTS_ENDPOINT;
  if (!endpoint) return false;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: word.front, pronunciation: word.pronunciation || "" }),
  });
  if (!response.ok) return false;
  const blob = await response.blob();
  return await playAudioUrl(URL.createObjectURL(blob));
}

function playSpeech(text) {
  if (!text || !window.speechSynthesis) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  const voices = window.speechSynthesis.getVoices?.() || [];
  utterance.voice = voices.find((voice) => /^en[-_]/i.test(voice.lang)) || null;
  window.speechSynthesis.speak(utterance);
  return true;
}

export async function playVocabularyWordAudio(word) {
  if (!word?.front) return false;
  if (await playAudioUrl(word.audioUrl)) return true;
  try {
    if (await playTtsEndpoint(word)) return true;
  } catch (error) {
    console.warn("Vocabulary TTS failed", error);
  }
  return playSpeech(word.front);
}
