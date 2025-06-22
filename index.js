"use strict";

// --- UI Elements ---
const editor = document.getElementById("editor");
const sdpTextarea = document.getElementById("sdpTextarea");
const applySdpBtn = document.getElementById("applySdpBtn");
const startOfferBtn = document.getElementById("startOfferBtn");
const startAnswerBtn = document.getElementById("startAnswerBtn");
const generateQrBtn = document.getElementById("generateQrBtn");
const qrCodeDiv = document.getElementById("qrCode");
const qrInput = document.getElementById("qrInput");
const applyQrBtn = document.getElementById("applyQrBtn");
const generateUrlBtn = document.getElementById("generateUrlBtn");
const shareUrlInput = document.getElementById("shareUrl");

const saveLocalBtn = document.getElementById("saveLocalBtn");
const loadLocalBtn = document.getElementById("loadLocalBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportDocxBtn = document.getElementById("exportDocxBtn");

const proofreadBtn = document.getElementById("proofreadBtn");
const summarizeBtn = document.getElementById("summarizeBtn");
const translateBtn = document.getElementById("translateBtn");
const aiOutput = document.getElementById("aiOutput");

const startVoiceBtn = document.getElementById("startVoiceBtn");
const stopVoiceBtn = document.getElementById("stopVoiceBtn");
const voiceText = document.getElementById("voiceText");

// --- Rich Text Commands ---
document.querySelectorAll('#toolbar button[data-cmd]').forEach(btn => {
  btn.onclick = () => document.execCommand(btn.dataset.cmd, false, null);
});

document.getElementById("fontName").onchange = e => {
  document.execCommand("fontName", false, e.target.value);
};
document.getElementById("fontSize").onchange = e => {
  document.execCommand("fontSize", false, e.target.value);
};

document.getElementById("undoBtn").onclick = () => document.execCommand("undo");
document.getElementById("redoBtn").onclick = () => document.execCommand("redo");

// --- Local Save/Load ---
saveLocalBtn.onclick = () => {
  localStorage.setItem("greenword_content", editor.innerHTML);
  alert("保存しました");
};

loadLocalBtn.onclick = () => {
  const data = localStorage.getItem("greenword_content");
  if (data) editor.innerHTML = data;
};

// --- Export ---
exportHtmlBtn.onclick = () => {
  const blob = new Blob([editor.innerHTML], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "greenword.html";
  a.click();
};

exportPdfBtn.onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(editor.innerText, 10, 10);
  doc.save("greenword.pdf");
};

exportDocxBtn.onclick = () => {
  const doc = new window.docx.Document({
    sections: [{ children: [new window.docx.Paragraph(editor.innerText)] }]
  });
  window.docx.Packer.toBlob(doc).then(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "greenword.docx";
    a.click();
  });
};

// --- WebRTC P2P Sync (Simplified Multi-peer Mesh) ---
const peers = [];
let localStream = null;

const createPeer = async () => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  peer.onicecandidate = e => {
    if (e.candidate) console.log("ICE:", JSON.stringify(e.candidate));
  };
  peer.ondatachannel = e => {
    const channel = e.channel;
    channel.onmessage = e => {
      editor.innerHTML = e.data;
    };
  };
  return peer;
};

let dataChannel;

startOfferBtn.onclick = async () => {
  const peer = await createPeer();
  dataChannel = peer.createDataChannel("doc");
  dataChannel.onopen = () => console.log("DataChannel open");
  dataChannel.onmessage = e => editor.innerHTML = e.data;
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  sdpTextarea.value = JSON.stringify(offer);
  peers.push(peer);
};

startAnswerBtn.onclick = async () => {
  const peer = await createPeer();
  const offer = JSON.parse(sdpTextarea.value);
  await peer.setRemoteDescription(offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  sdpTextarea.value = JSON.stringify(answer);
  peers.push(peer);
};

applySdpBtn.onclick = async () => {
  const sdp = JSON.parse(sdpTextarea.value);
  const peer = peers[peers.length - 1];
  if (sdp.type === "answer") await peer.setRemoteDescription(sdp);
};

// Sync changes
editor.oninput = () => {
  peers.forEach(p => {
    const channel = p.createDataChannel ? dataChannel : null;
    if (channel && channel.readyState === "open") {
      channel.send(editor.innerHTML);
    }
  });
};

// --- QR/URL Share ---
generateQrBtn.onclick = () => {
  QRCode.toCanvas(qrCodeDiv, sdpTextarea.value, { width: 180 });
};

applyQrBtn.onclick = () => {
  sdpTextarea.value = qrInput.value;
};

generateUrlBtn.onclick = () => {
  const url = `${location.origin}${location.pathname}#offer=${encodeURIComponent(sdpTextarea.value)}`;
  shareUrlInput.value = url;
};

// --- AI Placeholder Functions ---
const dummyAI = text => `[AI結果] ${text.slice(0, 50)}...`;
proofreadBtn.onclick = () => aiOutput.value = dummyAI(editor.innerText);
summarizeBtn.onclick = () => aiOutput.value = dummyAI(editor.innerText);
translateBtn.onclick = () => aiOutput.value = dummyAI(editor.innerText);

// --- 音声入力 ---
let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = e => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    voiceText.value = transcript;
    editor.innerText += transcript;
  };
}

startVoiceBtn.onclick = () => {
  if (recognition) {
    recognition.start();
    startVoiceBtn.disabled = true;
    stopVoiceBtn.disabled = false;
  }
};

stopVoiceBtn.onclick = () => {
  if (recognition) {
    recognition.stop();
    startVoiceBtn.disabled = false;
    stopVoiceBtn.disabled = true;
  }
};
