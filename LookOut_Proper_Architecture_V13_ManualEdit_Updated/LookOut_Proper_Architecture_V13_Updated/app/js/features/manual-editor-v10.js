/* LOOKOUT MANUAL EDITOR V11 — FULL WORKSPACE START SCREEN
 * UI shell updated in manual-editor-v10.css; editor behavior remains V10-stable.
 *
 * LOOKOUT MANUAL EDITOR V10
 * Clean start flow + native image document sizing.
 * Start choices:
 *  1) Upload Image -> document exactly matches source pixel dimensions and DPI metadata.
 *  2) Create Background -> choose ratio/size + solid or gradient, then enter the editor.
 */
(function () {
  'use strict';
  const g = window;
  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const presets = {
    '1:1':[1080,1080], '4:5':[1080,1350], '3:2':[1800,1200], '4:3':[1600,1200],
    '16:9':[1920,1080], '9:16':[1080,1920], '21:9':[2560,1080],
    'YouTube':[1920,1080], 'Instagram':[1080,1080], 'Story':[1080,1920], 'A4':[2480,3508], 'A3':[3508,4961]
  };
  const meta = () => g.manualDocumentMeta || (g.manualDocumentMeta = {
    width:1920,height:1080,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',
    gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null
  });
  let mode = 'image';
  let backgroundType = 'solid';
  let pending = null;
  let mounted = false;

  function readUint32(view, offset, little) { return view.getUint32(offset, little); }
  function readUint16(view, offset, little) { return view.getUint16(offset, little); }
  function parseJpegDpi(buffer) {
    const v = new DataView(buffer);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 4 < v.byteLength) {
      if (v.getUint8(p) !== 0xFF) { p++; continue; }
      const marker = v.getUint8(p + 1); p += 2;
      if (marker === 0xD8 || marker === 0xD9) continue;
      if (p + 2 > v.byteLength) break;
      const len = v.getUint16(p); if (len < 2 || p + len > v.byteLength) break;
      if (marker === 0xE1 && len >= 10) {
        const exif = new Uint8Array(buffer, p + 2, len - 2);
        const tag = String.fromCharCode(...exif.slice(0,6));
        if (tag === 'Exif\0\0') {
          const base = p + 2 + 6, t = new DataView(buffer, base);
          const endian = String.fromCharCode(t.getUint8(0), t.getUint8(1));
          const little = endian === 'II';
          if ((little ? t.getUint16(2,true) : t.getUint16(2,false)) !== 42) return null;
          const ifdOff = little ? t.getUint32(4,true) : t.getUint32(4,false);
          if (ifdOff + 2 > t.byteLength) return null;
          const count = little ? t.getUint16(ifdOff,true) : t.getUint16(ifdOff,false);
          for (let i=0;i<count;i++) {
            const off = ifdOff + 2 + i*12;
            if (off + 12 > t.byteLength) break;
            const tagId = little ? t.getUint16(off,true) : t.getUint16(off,false);
            if (tagId !== 0x011A) continue;
            const type = little ? t.getUint16(off+2,true) : t.getUint16(off+2,false);
            const countV = little ? t.getUint32(off+4,true) : t.getUint32(off+4,false);
            if (type !== 5 || countV < 1) continue;
            const ptr = little ? t.getUint32(off+8,true) : t.getUint32(off+8,false);
            if (ptr + 8 > t.byteLength) continue;
            const num = little ? t.getUint32(ptr,true) : t.getUint32(ptr,false);
            const den = little ? t.getUint32(ptr+4,true) : t.getUint32(ptr+4,false);
            if (num && den) return Math.round(num / den);
          }
        }
      }
      p += len;
    }
    return null;
  }
  function parsePngDpi(buffer) {
    const v = new DataView(buffer);
    if (v.byteLength < 33) return null;
    const sig = [137,80,78,71,13,10,26,10];
    for (let i=0;i<8;i++) if (v.getUint8(i)!==sig[i]) return null;
    let p = 8;
    while (p + 12 <= v.byteLength) {
      const len = readUint32(v,p,false); const type = String.fromCharCode(v.getUint8(p+4),v.getUint8(p+5),v.getUint8(p+6),v.getUint8(p+7));
      if (type === 'pHYs' && len >= 9 && p + 8 + len <= v.byteLength) {
        const pp = p + 8; const xppm = readUint32(v,pp,false); const yppm = readUint32(v,pp+4,false); const unit = v.getUint8(pp+8);
        if (unit === 1 && xppm > 0 && yppm > 0) return Math.round(xppm / 39.3700787402);
      }
      p += 12 + len;
    }
    return null;
  }
  async function readDpi(file) {
    try {
      const buffer = await file.arrayBuffer();
      return file.type === 'image/jpeg' || file.type === 'image/jpg' ? parseJpegDpi(buffer) : file.type === 'image/png' ? parsePngDpi(buffer) : null;
    } catch { return null; }
  }
  function readImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const src = e.target.result;
      const img = new Image();
      img.onload = async () => {
        const dpi = await readDpi(file) || 96;
        pending = {src, name:file.name, width:img.naturalWidth, height:img.naturalHeight, dpi};
        meta().width = img.naturalWidth; meta().height = img.naturalHeight; meta().dpi = dpi; meta().unit='px';
        meta().imageSourceDpi = dpi; meta().imageSourceWidth = img.naturalWidth; meta().imageSourceHeight = img.naturalHeight;
        const zone = q('#loV10Dropzone');
        if (zone) zone.innerHTML = `<div class="lo-v10-file-icon"><i class="fa-solid fa-image"></i></div><div><b>${esc(file.name)}</b><span>${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()} px · ${dpi} DPI · Original size</span></div><button type="button" id="loV10Replace">Replace</button>`;
        q('#loV10Replace')?.addEventListener('click', e2 => { e2.stopPropagation(); q('#loV10ImageInput')?.click(); });
        updateHeader();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }
  function updateHeader() {
    const m=meta();
    const r=q('#loV10Resolution'); if(r) r.textContent=`${(m.width||1920).toLocaleString()} × ${(m.height||1080).toLocaleString()} px`;
    const d=q('#loV10Dpi'); if(d) d.textContent=`${m.dpi||96} DPI`;
    const modeLabel=q('#loV10ModeLabel'); if(modeLabel) modeLabel.textContent=mode==='image'?'Upload Image':'Create Background';
  }
  function setMode(next) {
    mode=next;
    qa('.lo-v10-choice').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
    const image=q('#loV10ImagePanel'), bg=q('#loV10BackgroundPanel');
    if(image) image.hidden=next!=='image'; if(bg) bg.hidden=next!=='background';
    const title=q('#loV10ChoiceTitle'), note=q('#loV10ChoiceNote');
    if(title) title.textContent=next==='image'?'Upload Image':'Create Background';
    if(note) note.textContent=next==='image'?'The document will inherit the image pixel dimensions and embedded DPI. No scaling, cropping or ratio conversion is performed.':'Choose the working canvas size, then create a solid or gradient background. Images, text and other layers can be added after creation.';
    if(next==='image' && pending) { meta().width=pending.width; meta().height=pending.height; meta().dpi=pending.dpi; meta().unit='px'; }
    updateHeader();
  }
  function setBgType(type) {
    backgroundType=type; meta().backgroundType=type;
    qa('.lo-v10-bgmode').forEach(b=>b.classList.toggle('active',b.dataset.bg===type));
    q('#loV10SolidControls')?.toggleAttribute('hidden',type!=='solid');
    q('#loV10GradientControls')?.toggleAttribute('hidden',type!=='gradient');
    updatePreview();
  }
  function selectRatio(r) {
    const p=presets[r];
    qa('.lo-v10-ratio').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));
    if(p){q('#loV10W').value=p[0];q('#loV10H').value=p[1];}
    updatePreview();
  }
  function updatePreview(){
    const w=Math.max(16,Math.min(12000,Number(q('#loV10W')?.value)||1920));
    const h=Math.max(16,Math.min(12000,Number(q('#loV10H')?.value)||1080));
    const preview=q('#loV10Preview'); if(!preview)return;
    preview.style.aspectRatio=`${w}/${h}`;
    if(backgroundType==='solid') preview.style.background=q('#loV10Color')?.value||'#ffffff';
    else preview.style.background=`linear-gradient(135deg,${q('#loV10GradA')?.value||'#ffffff'},${q('#loV10GradB')?.value||'#dbeafe'})`;
    if(mode==='background'){ meta().width=w;meta().height=h;meta().dpi=Number(q('#loV10DpiInput')?.value)||96;meta().unit='px'; }
    updateHeader();
  }
  function clearSetup(){
    const empty=q('#loEmptyState'); if(!empty)return;
    g.__loSetupSelecting=false; mounted=false;
    empty.dataset.loSetupMounted=''; empty.classList.remove('lo-setup-state'); empty.style.display='none'; empty.innerHTML='';
  }
  function createBackgroundDocument(){
    const w=Math.max(16,Math.min(12000,Number(q('#loV10W')?.value)||1920));
    const h=Math.max(16,Math.min(12000,Number(q('#loV10H')?.value)||1080));
    const dpi=Math.max(36,Math.min(1200,Number(q('#loV10DpiInput')?.value)||96));
    meta().width=w;meta().height=h;meta().dpi=dpi;meta().unit='px';meta().backgroundType=backgroundType;
    if(typeof g.loSetDocumentSize==='function')g.loSetDocumentSize(w,h,dpi,'px');
    if(backgroundType==='solid' && g.setManualBackgroundColorV5) g.setManualBackgroundColorV5(q('#loV10Color')?.value||'#ffffff');
    if(backgroundType==='gradient' && g.applyManualGradientBackgroundV5) g.applyManualGradientBackgroundV5(q('#loV10GradA')?.value||'#ffffff',q('#loV10GradB')?.value||'#dbeafe',false);
    clearSetup();
    g.ensureLookoutBackground?.();g.flushManualHistory?.('New background document');g.updateManualDocumentInfo?.();g.updateManualWorkspaceState?.();g.setManualStatus?.(`Canvas ready · ${w.toLocaleString()} × ${h.toLocaleString()} px · ${dpi} DPI`);
    g.fitManualCanvas?.();
  }
  function setExactImageDocumentSize(width,height,dpi){
    // The normal editor setup intentionally caps user-entered canvas sizes for safety.
    // Image-first mode is different: the document must inherit the source pixel size exactly.
    if(typeof manualDocumentSize !== 'undefined') manualDocumentSize={width:Math.round(width),height:Math.round(height)};
    meta().width=Math.round(width); meta().height=Math.round(height); meta().dpi=Math.round(dpi); meta().unit='px';
    if(typeof editorCanvas !== 'undefined' && editorCanvas){
      const frame=q('#manualCanvasFrame');
      editorCanvas.setDimensions({width:frame?.clientWidth||1200,height:frame?.clientHeight||800});
      const bg=typeof loGetBackground==='function'?loGetBackground():null;
      if(bg){bg.set({width:Math.round(width),height:Math.round(height)});bg.setCoords();editorCanvas.sendToBack(bg);}
      editorCanvas.renderAll();
    }
  }
  function createImageDocument(){
    if(!pending){ q('#loV10Dropzone')?.classList.add('error'); setTimeout(()=>q('#loV10Dropzone')?.classList.remove('error'),700); q('#loV10Dropzone')?.scrollIntoView({block:'center'}); return; }
    const {width,height,dpi}=pending;
    setExactImageDocumentSize(width,height,dpi);
    meta().backgroundType='solid';
    // Native image documents should not introduce a visible background behind the image.
    clearSetup();
    g.ensureLookoutBackground?.();
    if(typeof g.addImageToEditor==='function')g.addImageToEditor(pending.src,pending.name,{nativeSize:true,sourceWidth:width,sourceHeight:height,sourceDpi:dpi});
    g.setManualStatus?.(`Image document ready · ${width.toLocaleString()} × ${height.toLocaleString()} px · ${dpi} DPI`);
    g.updateManualDocumentInfo?.();g.updateManualWorkspaceState?.();g.fitManualCanvas?.();
  }
  function render(){
    const empty=q('#loEmptyState'); if(!empty)return;
    if(mounted && q('.lo-setup-v10'))return;
    mounted=true; g.__loSetupSelecting=true; empty.dataset.loSetupMounted='v10'; empty.classList.add('lo-setup-state'); empty.style.display='flex';
    mode='image';backgroundType='solid';pending=null;
    empty.innerHTML=`
      <div class="lo-setup-v10" role="dialog" aria-modal="true" aria-labelledby="loV10Title">
        <header class="lo-v10-header">
          <div class="lo-v10-brand"><div class="lo-v10-logo">L</div><div><span>LOOKOUT · MANUAL EDIT</span><h1 id="loV10Title">Start creating</h1><p>Choose how you want to begin. The editor stays clean until you make a choice.</p></div></div>
          <div class="lo-v10-meta"><b id="loV10Resolution">Choose a start</b><span id="loV10Dpi">— DPI</span></div>
        </header>
        <section class="lo-v10-choicebar">
          <div><span>START WITH</span><h2 id="loV10ChoiceTitle">Upload Image</h2><p id="loV10ChoiceNote">The document will inherit the image pixel dimensions and embedded DPI. No scaling, cropping or ratio conversion is performed.</p></div>
          <div class="lo-v10-choicegrid">
            <button type="button" class="lo-v10-choice active" data-mode="image"><i class="fa-solid fa-image"></i><strong>Upload Image</strong><small>Use the image's original size</small></button>
            <button type="button" class="lo-v10-choice" data-mode="background"><i class="fa-solid fa-palette"></i><strong>Create Background</strong><small>Choose ratio, color or gradient</small></button>
          </div>
        </section>
        <section id="loV10ImagePanel" class="lo-v10-panel">
          <div class="lo-v10-panel-head"><div><span class="lo-v10-kicker">01 · IMAGE DOCUMENT</span><h3>Upload your source image</h3><p>LookOut creates a canvas exactly matching the image pixels. You can edit, crop, add text, shapes and layers afterward.</p></div><span class="lo-v10-badge">NATIVE SIZE</span></div>
          <label class="lo-v10-dropzone" id="loV10Dropzone" for="loV10ImageInput"><div class="lo-v10-upload-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div><div><strong>Choose an image</strong><span>PNG, JPG, JPEG or WEBP · drag & drop supported</span></div><em>Browse</em></label>
          <input id="loV10ImageInput" type="file" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="lo-v10-rules"><div><i class="fa-solid fa-expand"></i><span>Exact pixel dimensions</span></div><div><i class="fa-solid fa-circle-check"></i><span>Preserve embedded DPI</span></div><div><i class="fa-solid fa-lock"></i><span>Original aspect ratio</span></div></div>
        </section>
        <section id="loV10BackgroundPanel" class="lo-v10-panel" hidden>
          <div class="lo-v10-panel-head"><div><span class="lo-v10-kicker">01 · BACKGROUND DOCUMENT</span><h3>Build your canvas</h3><p>Choose the document ratio and background. Once created, you can insert images, text, shapes and other layers.</p></div><span class="lo-v10-badge">EDITABLE</span></div>
          <div class="lo-v10-fields"><label>Width <input id="loV10W" type="number" min="16" max="12000" value="1920"></label><label>Height <input id="loV10H" type="number" min="16" max="12000" value="1080"></label><label>DPI <input id="loV10DpiInput" type="number" min="36" max="1200" value="96"></label></div>
          <div class="lo-v10-section-label">Canvas ratio</div><div class="lo-v10-ratios">${Object.keys(presets).map(r=>`<button type="button" class="lo-v10-ratio ${r==='16:9'?'active':''}" data-ratio="${esc(r)}">${esc(r)}</button>`).join('')}</div>
          <div class="lo-v10-section-label">Background</div><div class="lo-v10-bgmodes"><button type="button" class="lo-v10-bgmode active" data-bg="solid"><i class="fa-solid fa-circle"></i> Solid</button><button type="button" class="lo-v10-bgmode" data-bg="gradient"><i class="fa-solid fa-fill-drip"></i> Gradient</button></div>
          <div id="loV10SolidControls"><div class="lo-v10-swatches">${['#ffffff','#f4f7fa','#dbeafe','#bae6fd','#a7f3d0','#fde68a','#fecaca','#ddd6fe','#fbcfe8','#111827','#0f172a','#000000'].map(c=>`<button type="button" class="lo-v10-swatch" style="background:${c}" data-color="${c}" title="${c}"></button>`).join('')}</div><label class="lo-v10-color">Custom color <input id="loV10Color" type="color" value="#ffffff"></label></div>
          <div id="loV10GradientControls" hidden><div class="lo-v10-gradient"><label>Start <input id="loV10GradA" type="color" value="#ffffff"></label><label>End <input id="loV10GradB" type="color" value="#dbeafe"></label></div><div class="lo-v10-preview-label">Gradient preview</div></div>
          <div class="lo-v10-preview-wrap"><span>Canvas preview</span><div id="loV10Preview"></div></div>
        </section>
        <footer class="lo-v10-footer"><div><i class="fa-solid fa-circle-info"></i><span id="loV10Footer">Select an image to preserve its original document size.</span></div><div class="lo-v10-actions"><button type="button" class="lo-v10-cancel" id="loV10Cancel">Cancel</button><button type="button" class="lo-v10-create" id="loV10Create">Continue</button></div></footer>
      </div>`;

    qa('.lo-v10-choice').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
    q('#loV10ImageInput')?.addEventListener('change',e=>readImage(e.target.files?.[0]));
    const drop=q('#loV10Dropzone');
    ['dragenter','dragover'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging');}));
    ['dragleave','drop'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging');}));
    drop?.addEventListener('drop',e=>readImage(e.dataTransfer?.files?.[0]));
    qa('.lo-v10-ratio').forEach(b=>b.addEventListener('click',()=>selectRatio(b.dataset.ratio)));
    ['loV10W','loV10H','loV10DpiInput'].forEach(id=>q('#'+id)?.addEventListener('input',updatePreview));
    qa('.lo-v10-bgmode').forEach(b=>b.addEventListener('click',()=>setBgType(b.dataset.bg)));
    qa('.lo-v10-swatch').forEach(b=>b.addEventListener('click',()=>{q('#loV10Color').value=b.dataset.color;setBgType('solid');}));
    q('#loV10Color')?.addEventListener('input',()=>setBgType('solid'));
    ['loV10GradA','loV10GradB'].forEach(id=>q('#'+id)?.addEventListener('input',()=>setBgType('gradient')));
    q('#loV10Create')?.addEventListener('click',()=>mode==='image'?createImageDocument():createBackgroundDocument());
    q('#loV10Cancel')?.addEventListener('click',()=>clearSetup());
    setMode('image'); updatePreview();
  }
  g.mountManualDocumentSetup = render;
  // Ensure this version owns the setup UI even though V7/V8/V9 scripts are retained for compatibility.
  setTimeout(()=>{
    if(document.body.classList.contains('manual-editor-active') && q('#loEmptyState')) render();
  },140);

  // Exact-size image placement for image-first documents. Normal in-editor uploads keep the editor's existing fill behavior.
  const originalAdd = g.addImageToEditor;
  g.addImageToEditor = function(src, name='Image', options={}) {
    if(!options?.nativeSize || !g.fabric || typeof editorCanvas === 'undefined' || !editorCanvas) return originalAdd?.call(g,src,name,options);
    fabric.Image.fromURL(src, img => {
      if(!img) return;
      const m=meta();
      img.__loName=String(name).replace(/\.[^.]+$/,'')||'Image';
      img.__loOriginalSrc=src; img.__loAdjustments=typeof cloneAdjustments==='function'?cloneAdjustments():{};
      img.__loBaseWidth=img.width||1; img.__loBaseHeight=img.height||1; img.__loCrop=null; img.cropX=0; img.cropY=0;
      img.set({scaleX:1,scaleY:1,left:0,top:0,originX:'left',originY:'top'});
      img.__loSourceDpi=options.sourceDpi||m.dpi||96; img.__loSourceWidth=options.sourceWidth||img.width; img.__loSourceHeight=options.sourceHeight||img.height;
      editorCanvas.add(img); editorCanvas.setActiveObject(img); editorCanvas.bringToFront(img); editorCanvas.renderAll();
      g.flushManualHistory?.('Place native image'); g.renderManualInspector?.(); g.updateManualWorkspaceState?.(); g.fitManualCanvas?.();
    },{crossOrigin:'anonymous'});
  };
})();
