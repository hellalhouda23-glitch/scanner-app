const state = {
  stream: null,
  imageBlob: null,
  imageDataURL: null,
  ocrText: '',
  lang: 'ara',
  uiLang: 'ara',
  worker: null,
  tesseractReady: false
};

const $ = id => document.getElementById(id);

const I18N = {
  ara: {
    dir: 'rtl',
    ocrLang: 'ara',
    appTitle: 'إسكان',
    tagline: 'ماسح المستندات الذكي',
    placeholder: 'اضغطي "فتح الكاميرا" لبدء المسح',
    btnOpenCamera: 'فتح الكاميرا',
    btnCapture: 'التقاط',
    btnRetake: 'إعادة',
    btnOcr: 'استخراج النص',
    btnUpload: 'رفع صورة',
    btnExportPdf: 'تصدير PDF',
    btnExportTxt: 'تصدير نص',
    resultPlaceholder: 'سيظهر النص المستخرج هنا…',
    statusCameraReady: 'الكاميرا جاهزة — وجهيها نحو المستند',
    statusImageCaptured: 'تم التقاط الصورة. اضغطي على "استخراج النص"',
    statusImageUploaded: 'تم تحميل الصورة. اضغطي على "استخراج النص"',
    statusOcrSuccess: n => `تم بنجاح — تم استخراج ${n} حرفاً`,
    statusNoText: '(لم يتم اكتشاف أي نص)',
    statusCameraError: e => 'تعذر فتح الكاميرا: ' + (e || 'تحققي من الصلاحيات'),
    statusTesseractError: 'فشل في تحميل محرك التعرف على النصوص. تأكدي من الاتصال بالإنترنت.',
    statusOcrError: e => 'فشل استخراج النص: ' + (e || ''),
    statusPdfGenerating: 'جارٍ إنشاء ملف PDF…',
    statusPdfSuccess: 'تم تحميل ملف PDF بنجاح',
    statusPdfError: e => 'فشل إنشاء PDF: ' + (e || ''),
    statusTxtSuccess: 'تم تحميل ملف TXT بنجاح',
    loaderTesseract: 'جارٍ تحميل محرك التعرف على النصوص… قد يستغرق بضع ثوانٍ',
    loaderLang: 'جارٍ إعداد محرك اللغة…',
    loaderOcr: 'جارٍ استخراج النص من الصورة…',
    loaderPdf: 'جارٍ إنشاء ملف PDF…',
    loaderProcessing: (p, s) => `معالجة النص: ${Math.round(p * 100)}% — ${s || ''}`
  },
  eng: {
    dir: 'ltr',
    ocrLang: 'eng',
    appTitle: 'Iskaan',
    tagline: 'Smart Document Scanner',
    placeholder: 'Tap "Open Camera" to start scanning',
    btnOpenCamera: 'Open Camera',
    btnCapture: 'Capture',
    btnRetake: 'Retake',
    btnOcr: 'Extract Text',
    btnUpload: 'Upload Image',
    btnExportPdf: 'Export PDF',
    btnExportTxt: 'Export Text',
    resultPlaceholder: 'Extracted text will appear here…',
    statusCameraReady: 'Camera ready — point it at the document',
    statusImageCaptured: 'Image captured. Tap "Extract Text"',
    statusImageUploaded: 'Image uploaded. Tap "Extract Text"',
    statusOcrSuccess: n => `Success — extracted ${n} characters`,
    statusNoText: '(No text detected)',
    statusCameraError: e => 'Cannot open camera: ' + (e || 'check permissions'),
    statusTesseractError: 'Failed to load text recognition engine. Check your internet connection.',
    statusOcrError: e => 'Text extraction failed: ' + (e || ''),
    statusPdfGenerating: 'Generating PDF…',
    statusPdfSuccess: 'PDF file downloaded successfully',
    statusPdfError: e => 'PDF creation failed: ' + (e || ''),
    statusTxtSuccess: 'TXT file downloaded successfully',
    loaderTesseract: 'Loading text recognition engine… may take a few seconds',
    loaderLang: 'Setting up language engine…',
    loaderOcr: 'Extracting text from image…',
    loaderPdf: 'Generating PDF…',
    loaderProcessing: (p, s) => `Processing text: ${Math.round(p * 100)}% — ${s || ''}`
  },
  fra: {
    dir: 'ltr',
    ocrLang: 'fra',
    appTitle: 'Iskaan',
    tagline: 'Scanner de Documents Intelligent',
    placeholder: 'Appuyez sur « Ouvrir Caméra » pour commencer',
    btnOpenCamera: 'Ouvrir Caméra',
    btnCapture: 'Capturer',
    btnRetake: 'Reprendre',
    btnOcr: 'Extraire le Texte',
    btnUpload: 'Télécharger Image',
    btnExportPdf: 'Exporter PDF',
    btnExportTxt: 'Exporter Texte',
    resultPlaceholder: 'Le texte extrait apparaîtra ici…',
    statusCameraReady: 'Caméra prête — pointez-la vers le document',
    statusImageCaptured: 'Image capturée. Appuyez sur « Extraire Texte »',
    statusImageUploaded: 'Image téléchargée. Appuyez sur « Extraire Texte »',
    statusOcrSuccess: n => `Succès — ${n} caractères extraits`,
    statusNoText: '(Aucun texte détecté)',
    statusCameraError: e => 'Impossible d\'ouvrir la caméra : ' + (e || 'vérifiez les autorisations'),
    statusTesseractError: 'Échec du chargement du moteur de reconnaissance. Vérifiez votre connexion.',
    statusOcrError: e => 'Échec de l\'extraction du texte : ' + (e || ''),
    statusPdfGenerating: 'Génération du PDF…',
    statusPdfSuccess: 'Fichier PDF téléchargé avec succès',
    statusPdfError: e => 'Échec de la création du PDF : ' + (e || ''),
    statusTxtSuccess: 'Fichier TXT téléchargé avec succès',
    loaderTesseract: 'Chargement du moteur de reconnaissance… peut prendre quelques secondes',
    loaderLang: 'Configuration du moteur de langue…',
    loaderOcr: 'Extraction du texte de l\'image…',
    loaderPdf: 'Génération du PDF…',
    loaderProcessing: (p, s) => `Traitement du texte : ${Math.round(p * 100)}% — ${s || ''}`
  },
  engara: {
    dir: 'ltr',
    ocrLang: 'eng+ara',
    appTitle: 'Iskaan',
    tagline: 'Smart Document Scanner — ماسح المستندات الذكي',
    placeholder: 'Tap "Open Camera" to start scanning',
    btnOpenCamera: 'Open Camera',
    btnCapture: 'Capture',
    btnRetake: 'Retake',
    btnOcr: 'Extract Text',
    btnUpload: 'Upload Image',
    btnExportPdf: 'Export PDF',
    btnExportTxt: 'Export Text',
    resultPlaceholder: 'Extracted text will appear here…',
    statusCameraReady: 'Camera ready — point it at the document',
    statusImageCaptured: 'Image captured. Tap "Extract Text"',
    statusImageUploaded: 'Image uploaded. Tap "Extract Text"',
    statusOcrSuccess: n => `Success — extracted ${n} characters`,
    statusNoText: '(No text detected)',
    statusCameraError: e => 'Cannot open camera: ' + (e || 'check permissions'),
    statusTesseractError: 'Failed to load text recognition engine. Check your internet connection.',
    statusOcrError: e => 'Text extraction failed: ' + (e || ''),
    statusPdfGenerating: 'Generating PDF…',
    statusPdfSuccess: 'PDF file downloaded successfully',
    statusPdfError: e => 'PDF creation failed: ' + (e || ''),
    statusTxtSuccess: 'TXT file downloaded successfully',
    loaderTesseract: 'Loading text recognition engine… may take a few seconds',
    loaderLang: 'Setting up language engine…',
    loaderOcr: 'Extracting text from image…',
    loaderPdf: 'Generating PDF…',
    loaderProcessing: (p, s) => `Processing text: ${Math.round(p * 100)}% — ${s || ''}`
  }
};
function getI18nKey(value) {
  const map = {
    'français': 'fra', 'francais': 'fra', 'fra': 'fra',
    'english': 'eng', 'eng': 'eng',
    'العربية': 'ara', 'العربيه': 'ara', 'ara': 'ara',
    'english + عربي': 'engara', 'eng+ara': 'engara', 'engara': 'engara'
  };
  if (!value) return 'ara';
  return map[value] || map[String(value).trim().toLowerCase()] || 'ara';
}

function setButtonText(btn, newText) {
  if (!btn) return;
  Array.from(btn.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .forEach(n => n.remove());
  btn.appendChild(document.createTextNode(' ' + newText + ' '));
}

function applyTranslations() {
  const t = I18N[state.uiLang] || I18N.ara;
  document.documentElement.setAttribute('dir', t.dir);
  document.documentElement.setAttribute('lang', state.uiLang);
  if ($('app-title')) $('app-title').textContent = t.appTitle;
  if ($('app-tagline')) $('app-tagline').textContent = t.tagline;
  if ($('placeholder')) $('placeholder').textContent = t.placeholder;
  setButtonText($('btn-open-camera'), t.btnOpenCamera);
  setButtonText($('btn-capture'), t.btnCapture);
  setButtonText($('btn-retake'), t.btnRetake);
  setButtonText($('btn-ocr'), t.btnOcr);
  setButtonText($('btn-upload'), t.btnUpload);
  setButtonText($('btn-export-pdf'), t.btnExportPdf);
  setButtonText($('btn-export-txt'), t.btnExportTxt);
  const resultEl = $('result');
  if (resultEl && resultEl.classList.contains('empty')) {
    resultEl.textContent = t.resultPlaceholder;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureTesseractReady() {
  if (state.tesseractReady && state.worker) return state.worker;
  const t = I18N[state.uiLang];
  showLoader(t.loaderTesseract);
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const langs = state.lang.replace(/\s/g, '');
    showLoader(t.loaderLang);
    const worker = await Tesseract.createWorker(langs, 1, {
      logger: m => {
        if (m.progress != null) {
          showLoader(t.loaderProcessing(m.progress, m.status));
        }
      }
    });
    state.worker = worker;
    state.tesseractReady = true;
    hideLoader();
    return worker;
  } catch (err) {
    hideLoader();
    showStatus(t.statusTesseractError, 'error');
    throw err;
  }
}

async function openCamera(){
  const t = I18N[state.uiLang];
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
    showStatus(t.statusCameraReady, 'info');
  } catch (err) {
    showStatus(t.statusCameraError(err.message), 'error');
  }
}

function captureImage(){
  if (!state.stream) return;
  const t = I18N[state.uiLang];
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
    showStatus(t.statusImageCaptured, 'success');
  }, 'image/png');
}

function stopCamera(){
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
}

function retake(){
  const t = I18N[state.uiLang];
  state.imageBlob = null;
  state.imageDataURL = null;
  state.ocrText = '';
  $('preview').style.display = 'none';
  $('preview').src = '';
  $('result').textContent = t.resultPlaceholder;
  $('result').classList.add('empty');
  $('export-actions').style.display = 'none';
  $('btn-ocr').disabled = true;
  $('btn-retake').disabled = true;
  openCamera();
}

function handleFileUpload(e){
  const t = I18N[state.uiLang];
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
    showStatus(t.statusImageUploaded, 'success');
  };
  reader.readAsDataURL(file);
}
