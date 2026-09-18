/* Iskaan PWA — main app logic
 * - Tesseract.js (~2 MB) loaded ONLY on first OCR press
 * - Service Worker does NOT precache Tesseract assets
 * - jsPDF loaded on demand for PDF export
 * - Amiri font embedded in PDF for Arabic RTL rendering
 */

const state = {
  stream: null,
  imageBlob: null,
  imageDataURL: null,
  ocrText: '',
  lang: 'ara+eng',
  tesseract: null,
  tesseractReady: false
};

const $ = id => document.getElementById(id);

// ====== Tesseract.js loaded ON DEMAND ======
async function ensureTesseractReady(){
  if (state.tesseractReady && state.tesseract) return state.tesseract;

  showLoader('Loading OCR engine… first time may take a few seconds');
  try {
    const tessMod = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    const Tesseract = tessMod.default || tessMod;

    const langs = state.lang.replace(/\s/g,'');
    const worker = await Tesseract.createWorker(langs, 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0',
      langPath:   'https://tessdata.projectnaptha.com/4.0.0_best',
      logger: m => {
        if (m.progress != null) {
          showLoader(`OCR: ${Math.round(m.progress*100)}% — ${m.status||''}`);
        }
      }
    });

    state.tesseract = worker;
    state.tesseractReady = true;
    hideLoader();
    return worker;
  } catch (err) {
    hideLoader();
    showStatus('Could not load OCR engine. Check your connection.', 'error');
    throw err;
  }
}

// ====== Camera ======
async function openCamera(){
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    const video = $('video');
    video.srcObject = state.stream;
    video.style.display = 'block';
    $('placeholder').style.display = 'none';
    $('preview').style.display = 'none';
    $('btn-capture').disabled = false;
    $('btn-open-camera').disabled = true;
    showStatus('Camera ready — point at document', 'info');
  } catch (err) {
    showStatus('Could not open camera: ' + (err.message || 'check permission'), 'error');
  }
}

function captureImage(){
  if (!state.stream) return;
  const video = $('video');
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    state.imageBlob = blob;
    $('preview').src = URL.createObjectURL(blob);
    $('preview').style.display = 'block';
    $('video').style.display = 'none';
    $('btn-capture').disabled = true;
    $('btn-retake').disabled = false;
    $('btn-ocr').disabled = false;
    state.imageDataURL = canvas.toDataURL('image/png');
    stopCamera();
    showStatus('Image captured. Tap "Extract Text" to continue', 'success');
  }, 'image/png');
}

function stopCamera(){
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
}

function retake(){
  state.imageBlob = null;
  state.imageDataURL = null;
  state.ocrText = '';
  $('preview').style.display = 'none';
  $('preview').src = '';
  $('result').textContent = 'Extracted text will appear here…';
  $('result').classList.add('empty');
  $('export-actions').style.display = 'none';
  $('btn-ocr').disabled = true;
  $('btn-retake').disabled = true;
  openCamera();
}

function handleFileUpload(e){
  const file = e.target.files?.[0];
  if (!file) return;
  state.imageBlob = file;
  const reader = new FileReader();
  reader.onload = ev => {
    state.imageDataURL = ev.target.result;
    $('preview').src = state.imageDataURL;
    $('preview').style.display = 'block';
    $('video').style.display = 'none';
    $('placeholder').style.display = 'none';
    $('btn-ocr').disabled = false;
    $('btn-retake').disabled = false;
    showStatus('Image uploaded. Tap "Extract Text"', 'success');
  };
  reader.readAsDataURL(file);
}

// ====== OCR ======
async function runOCR(){
  if (!state.imageDataURL) return;
  try {
    const worker = await ensureTesseractReady();
    showLoader('Extracting text…');
    const { data } = await worker.recognize(state.imageDataURL);
    state.ocrText = data.text || '';
    $('result').textContent = state.ocrText || '(no text detected)';
    $('result').classList.remove('empty');
    $('export-actions').style.display = 'flex';
    showStatus(`Done — ${state.ocrText.length} characters`, 'success');
  } catch (err) {
    showStatus('OCR failed: ' + (err.message || err), 'error');
  } finally {
    hideLoader();
  }
}

// ====== Arabic shape+reverse for jsPDF ======
const ARABIC_LIGATURES = {
  'لا': 'ﻻ', 'ﻷ': 'ﻷ', 'ﻹ': 'ﻹ', 'ﻵ': 'ﻵ',
  'الله': 'ﺍﻟﻠﻪ', 'علي': 'ﻋﻠﻲ', 'على': 'ﻋﻠﻰ'
};
function shapeArabic(input){
  if (!input) return '';
  let s = input;
  for (const [a,b] of Object.entries(ARABIC_LIGATURES)) {
    s = s.split(a).join(b);
  }
  return s.split('').reverse().join('');
}

// ====== PDF Export with Amiri ======
async function exportPDF(){
  if (!state.ocrText) return;
  showLoader('Building PDF…');
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    const jsPDFCtor = mod.jsPDF || mod.default?.jsPDF || window.jsPDF;
    if (!jsPDFCtor) throw new Error('jsPDF not available');

    const doc = new jsPDFCtor({ orientation: 'p', unit: 'mm', format: 'a4' });
    const amiriB64 = await loadAmiriBase64();
    doc.addFileToVFS('Amiri-Regular.ttf', amiriB64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
    doc.setFontSize(14);

    const lines = state.ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const shaped = lines.map(shapeArabic);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 8;
    const maxLinesPerPage = Math.floor((pageH - margin*2) / lineHeight);
    let y = margin + lineHeight;
    let lineCount = 0;
    doc.setRTL?.(true);
    for (const ln of shaped) {
      if (lineCount >= maxLinesPerPage) {
        doc.addPage();
        y = margin + lineHeight;
        lineCount = 0;
      }
      doc.text(ln, pageW - margin, y, { align: 'right' });
      y += lineHeight;
      lineCount++;
    }
    if (state.imageDataURL) {
      const img = new Image();
      img.src = state.imageDataURL;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      const imgW = pageW - margin*2;
      const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.7;
      doc.addImage(state.imageDataURL, 'PNG', margin, margin, imgW, imgW * ratio);
    }
    doc.save(`iskaan-${Date.now()}.pdf`);
    showStatus('PDF downloaded', 'success');
  } catch (err) {
    showStatus('PDF failed: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

let _amiriB64Cache = null;
async function loadAmiriBase64(){
  if (_amiriB64Cache) return _amiriB64Cache;
  const url = './Amiri-Regular.ttf';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Amiri font load failed');
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  _amiriB64Cache = btoa(bin);
  return _amiriB64Cache;
}

function exportTXT(){
  if (!state.ocrText) return;
  const blob = new Blob([state.ocrText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `iskaan-${Date.now()}.txt`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  showStatus('TXT downloaded', 'success');
}

function setLang(lang){
  state.lang = lang;
  state.tesseractReady = false;
  document.querySelectorAll('.chip').forEach(c =>
    c.classList.toggle('active', c.dataset.lang === lang));
  if (state.tesseract) {
    state.tesseract.terminate?.();
    state.tesseract = null;
  }
}

function showStatus(msg, kind){
  const el = $('status');
  el.textContent = msg;
  el.className = 'status ' + (kind||'info');
  el.style.display = 'block';
}
function showLoader(text){
  $('loader-text').textContent = text || 'Loading…';
  $('loader').classList.remove('hidden');
}
function hideLoader(){ $('loader').classList.add('hidden'); }

function maybeShowIOSHint(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
  const dismissed = localStorage.getItem('iskaan-ios-hint-dismissed') === '1';
  if (isIOS && !isStandalone && !dismissed) {
    $('ios-install-hint').style.display = 'block';
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(r => console.log('SW ready:', r.scope))
      .catch(err => console.warn('SW failed:', err));
  });
}

window.addEventListener('DOMContentLoaded', () => {
  $('btn-open-camera').addEventListener('click', openCamera);
  $('btn-capture').addEventListener('click', captureImage);
  $('btn-retake').addEventListener('click', retake);
  $('btn-ocr').addEventListener('click', runOCR);
  $('file-input').addEventListener('change', handleFileUpload);
  $('btn-export-pdf').addEventListener('click', exportPDF);
  $('btn-export-txt').addEventListener('click', exportTXT);
  $('ios-hint-close').addEventListener('click', () => {
    $('ios-install-hint').style.display = 'none';
    localStorage.setItem('iskaan-ios-hint-dismissed', '1');
  });
  document.querySelectorAll('.chip').forEach(c =>
    c.addEventListener('click', () => setLang(c.dataset.lang)));
  maybeShowIOSHint();
});

window.addEventListener('pagehide', stopCamera);
