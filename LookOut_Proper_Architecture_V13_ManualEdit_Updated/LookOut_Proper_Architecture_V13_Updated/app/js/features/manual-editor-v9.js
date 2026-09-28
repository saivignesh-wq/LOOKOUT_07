/* LOOKOUT MANUAL EDITOR V9 — CLEAN DOCUMENT START / IMAGE OR BACKGROUND */
(function(){
  'use strict';
  const g=window;
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const presets={
    '1:1':[1080,1080],'4:5':[1080,1350],'3:2':[1800,1200],'4:3':[1600,1200],
    '16:9':[1920,1080],'9:16':[1080,1920],'21:9':[2560,1080],
    'YouTube':[1920,1080],'Instagram':[1080,1080],'Story':[1080,1920],'A4':[2480,3508],'A3':[3508,4961]
  };
  const toPx=(v,u,d)=>u==='in'?Math.round(v*d):u==='cm'?Math.round(v/2.54*d):Math.round(v);
  const fromPx=(v,u,d)=>u==='in'?(v/d).toFixed(2):u==='cm'?(v/d*2.54).toFixed(2):String(Math.round(v));
  const meta=()=>{
    try{return manualDocumentMeta;}catch(e){
      return g.manualDocumentMeta||(g.manualDocumentMeta={width:1920,height:1080,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null});
    }
  };
  let pendingImage=null;
  let startMode='image';
  let bgMode='solid';

  function updatePreview(){
    const u=q('#loV9Unit')?.value||'px';
    const d=Math.max(36,Math.min(1200,Number(q('#loV9Dpi')?.value)||96));
    const w=Math.max(16,Math.min(12000,toPx(Number(q('#loV9W')?.value)||1920,u,d)));
    const h=Math.max(16,Math.min(12000,toPx(Number(q('#loV9H')?.value)||1080,u,d)));
    const res=`${w.toLocaleString()} × ${h.toLocaleString()} px`;
    if(q('#loV9Resolution'))q('#loV9Resolution').textContent=res;
    if(q('#loV9DpiLabel'))q('#loV9DpiLabel').textContent=`${d} DPI`;
    if(q('#loV9Resolution2'))q('#loV9Resolution2').textContent=res;
    if(q('#loV9Physical'))q('#loV9Physical').textContent=`${(w/d).toFixed(2)} × ${(h/d).toFixed(2)} in`;
    const preview=q('#loV9Preview');
    if(preview){
      preview.style.aspectRatio=`${w}/${h}`;
      if(bgMode==='solid')preview.style.background=meta().backgroundColor||'#fff';
      else if(bgMode==='gradient')preview.style.background=`linear-gradient(135deg, ${q('#loV9GradA')?.value||'#fff'}, ${q('#loV9GradB')?.value||'#dbeafe'})`;
      else preview.style.background=`linear-gradient(135deg,#eef2f6 25%,#dfe5eb 25%,#dfe5eb 50%,#eef2f6 50%,#eef2f6 75%,#dfe5eb 75%) 0 0/28px 28px`;
    }
    if(q('#loV9BgLabel'))q('#loV9BgLabel').textContent=bgMode[0].toUpperCase()+bgMode.slice(1);
  }

  function setStartMode(mode){
    startMode=mode;
    qa('.lo-v9-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const image=q('#loV9ImageStart'), bg=q('#loV9BackgroundStart');
    if(image)image.hidden=mode!=='image';
    if(bg)bg.hidden=mode!=='background';
    const note=q('#loV9ModeNote');
    if(note)note.textContent=mode==='image'?'Start with an image. LookOut will fill the document without distorting it. You can add a background later.':'Start with a designed background. You can add one or more images after the document is created.';
  }

  function setBgMode(mode){
    bgMode=mode; meta().backgroundType=mode;
    qa('.lo-v9-bg-tab').forEach(b=>b.classList.toggle('active',b.dataset.bg===mode));
    ['solid','gradient','texture'].forEach(k=>{const el=q('#loV9Bg-'+k);if(el)el.hidden=k!==mode;});
    updatePreview();
  }

  function selectRatio(r){
    qa('.lo-v9-ratio').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));
    const p=presets[r];
    if(p){const u=q('#loV9Unit')?.value||'px',d=Number(q('#loV9Dpi')?.value)||96;q('#loV9W').value=fromPx(p[0],u,d);q('#loV9H').value=fromPx(p[1],u,d);}
    updatePreview();
  }

  function chooseImage(file){
    if(!file||!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=e=>{
      pendingImage={src:e.target.result,name:file.name};
      const zone=q('#loV9Dropzone');
      if(zone){zone.classList.add('has-image');zone.innerHTML=`<div class="lo-v9-file-icon"><i class="fa-solid fa-image"></i></div><div><b>${esc(file.name)}</b><span>Ready to place · ${Math.round(file.size/1024)} KB</span></div><button type="button" id="loV9ReplaceImage">Replace</button>`;}
      q('#loV9ReplaceImage')?.addEventListener('click',()=>q('#loV9ImageInput')?.click());
      const c=q('#loV9ImageChip');if(c)c.textContent='Image selected';
    };
    reader.readAsDataURL(file);
  }

  function render(){
    const empty=q('#loEmptyState');if(!empty)return;
    if(empty.dataset.loSetupMounted==='v9' && q('.lo-setup-v9'))return;
    empty.dataset.loSetupMounted='v9';
    g.__loSetupSelecting=true;
    empty.classList.add('lo-setup-state');empty.style.display='flex';
    pendingImage=null;startMode='image';bgMode='solid';
    empty.innerHTML=`
      <div class="lo-setup-v9" role="dialog" aria-modal="true" aria-labelledby="loV9Title">
        <header class="lo-v9-header">
          <div class="lo-v9-brand"><div class="lo-v9-logo">L</div><div><span>LOOKOUT · MANUAL EDIT</span><h2 id="loV9Title">Start a new canvas</h2><p>Choose your working resolution, then decide whether you want to begin with an image or a designed background.</p></div></div>
          <div class="lo-v9-header-meta"><b id="loV9Resolution">1,920 × 1,080 px</b><span id="loV9DpiLabel">96 DPI</span></div>
        </header>

        <div class="lo-v9-startbar">
          <div class="lo-v9-start-copy"><span>START WITH</span><b id="loV9ModeTitle">Image</b><small id="loV9ModeNote">Start with an image. LookOut will fill the document without distorting it. You can add a background later.</small></div>
          <div class="lo-v9-mode-switch" role="tablist" aria-label="Start with">
            <button type="button" class="lo-v9-mode active" data-mode="image"><i class="fa-solid fa-image"></i><span>Upload image</span><small>Fill canvas automatically</small></button>
            <button type="button" class="lo-v9-mode" data-mode="background"><i class="fa-solid fa-palette"></i><span>Background</span><small>Solid, gradient or texture</small></button>
          </div>
        </div>

        <main class="lo-v9-content">
          <section class="lo-v9-card lo-v9-document-card">
            <div class="lo-v9-card-title"><span class="lo-v9-number">01</span><div><h3>Document</h3><p>Working size and export resolution</p></div><span class="lo-v9-live">LIVE</span></div>
            <div class="lo-v9-fields"><label>Width<input id="loV9W" type="number" min="16" max="12000" value="1920"></label><label>Height<input id="loV9H" type="number" min="16" max="12000" value="1080"></label><label>Unit<select id="loV9Unit"><option value="px">Pixels</option><option value="in">Inches</option><option value="cm">Centimeters</option></select></label><label>DPI<input id="loV9Dpi" type="number" min="36" max="1200" value="96"></label></div>
            <div class="lo-v9-label-row"><span>Canvas presets</span><div class="lo-v9-dpi"><button type="button" data-dpi="96">Screen · 96</button><button type="button" data-dpi="150">Draft · 150</button><button type="button" data-dpi="300">Print · 300</button></div></div>
            <div class="lo-v9-ratios">${Object.keys(presets).map(r=>`<button type="button" class="lo-v9-ratio ${r==='16:9'?'active':''}" data-ratio="${esc(r)}">${esc(r)}</button>`).join('')}<button type="button" class="lo-v9-ratio" data-ratio="custom">Custom</button></div>
            <div class="lo-v9-resolution-note"><i class="fa-solid fa-circle-info"></i><span><b>Pixel size controls the real working/export resolution.</b> DPI controls physical print size.</span></div>
          </section>

          <section id="loV9ImageStart" class="lo-v9-card lo-v9-start-card">
            <div class="lo-v9-card-title"><span class="lo-v9-number">02</span><div><h3>Image</h3><p>Choose an image to fill the document</p></div></div>
            <label class="lo-v9-dropzone" id="loV9Dropzone" for="loV9ImageInput"><div class="lo-v9-upload-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div><div><b>Upload an image</b><span>PNG, JPG, WEBP · your image stays proportional</span></div><strong>Choose file</strong></label>
            <input id="loV9ImageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            <div class="lo-v9-image-rules"><div><i class="fa-solid fa-expand"></i><span>Fill Canvas</span></div><div><i class="fa-solid fa-lock"></i><span>Keep ratio</span></div><div><i class="fa-solid fa-crop-simple"></i><span>Crop overflow</span></div></div>
            <button type="button" class="lo-v9-secondary-wide" id="loV9UseBlankInstead"><i class="fa-solid fa-layer-group"></i> Start with a blank canvas instead</button>
          </section>

          <section id="loV9BackgroundStart" class="lo-v9-card lo-v9-start-card" hidden>
            <div class="lo-v9-card-title"><span class="lo-v9-number">02</span><div><h3>Background</h3><p>Only background controls are shown when you choose this start mode.</p></div></div>
            <div class="lo-v9-bg-tabs"><button type="button" class="lo-v9-bg-tab active" data-bg="solid">Solid</button><button type="button" class="lo-v9-bg-tab" data-bg="gradient">Gradient</button><button type="button" class="lo-v9-bg-tab" data-bg="texture">Texture</button></div>
            <div id="loV9Bg-solid"><div class="lo-v9-swatches">${['#ffffff','#f3f4f6','#e2e8f0','#dbeafe','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#111827','#0f172a'].map(c=>`<button type="button" class="lo-v9-swatch" style="background:${c}" title="${c}" data-color="${c}"></button>`).join('')}</div><label class="lo-v9-custom-color"><span>Custom solid color</span><input id="loV9Color" type="color" value="#ffffff"></label></div>
            <div id="loV9Bg-gradient" hidden><div class="lo-v9-color-row"><label>Start<input id="loV9GradA" type="color" value="#ffffff"></label><label>End<input id="loV9GradB" type="color" value="#dbeafe"></label></div><div class="lo-v9-gradient-kind"><button type="button" data-grad="linear">Linear</button><button type="button" data-grad="radial">Radial</button></div></div>
            <div id="loV9Bg-texture" hidden><div class="lo-v9-textures">${['paper','canvas','grid','dots','diagonal','noise'].map(k=>`<button type="button" data-texture="${k}"><i class="fa-solid fa-swatchbook"></i><span>${k[0].toUpperCase()+k.slice(1)}</span></button>`).join('')}</div><button type="button" class="lo-v9-secondary-wide" id="loV9UploadTexture"><i class="fa-solid fa-upload"></i> Upload custom texture</button></div>
            <div class="lo-v9-mini-preview"><span>Preview</span><div id="loV9MiniBg"></div></div>
            <button type="button" class="lo-v9-secondary-wide" id="loV9AddImageAfter"><i class="fa-solid fa-image"></i> Add image after creating background</button>
          </section>
        </main>

        <footer class="lo-v9-footer">
          <div class="lo-v9-footer-info"><i class="fa-solid fa-shield-halved"></i><div><b>Non-destructive workflow</b><span>Canvas, background, transforms, adjustments and effects remain editable.</span></div></div>
          <div class="lo-v9-actions"><button type="button" class="lo-v9-secondary" id="loV9Cancel">Cancel</button><button type="button" class="lo-v9-primary" id="loV9Create"><i class="fa-solid fa-sparkles"></i> Create canvas</button></div>
        </footer>
      </div>`;

    const modeTitle=q('#loV9ModeTitle');
    const sync=()=>{
      updatePreview();
      if(modeTitle)modeTitle.textContent=startMode==='image'?'Image':'Background';
      const mini=q('#loV9MiniBg'),pre=q('#loV9Preview');
      if(mini)mini.style.background=pre?.style.background||'#fff';
    };

    qa('.lo-v9-mode').forEach(b=>b.addEventListener('click',()=>{setStartMode(b.dataset.mode);sync();}));
    qa('.lo-v9-ratio').forEach(b=>b.addEventListener('click',()=>selectRatio(b.dataset.ratio)));
    ['loV9W','loV9H','loV9Unit','loV9Dpi'].forEach(id=>q('#'+id)?.addEventListener('input',()=>{qa('.lo-v9-ratio').forEach(b=>b.classList.remove('active'));sync();}));
    qa('.lo-v9-dpi button').forEach(b=>b.addEventListener('click',()=>{q('#loV9Dpi').value=b.dataset.dpi;sync();}));
    qa('.lo-v9-bg-tab').forEach(b=>b.addEventListener('click',()=>setBgMode(b.dataset.bg)));
    qa('.lo-v9-swatch').forEach(b=>b.addEventListener('click',()=>{meta().backgroundColor=b.dataset.color;setBgMode('solid');q('#loV9Color').value=b.dataset.color;sync();}));
    q('#loV9Color')?.addEventListener('input',e=>{meta().backgroundColor=e.target.value;setBgMode('solid');sync();});
    ['loV9GradA','loV9GradB'].forEach(id=>q('#'+id)?.addEventListener('input',()=>{bgMode='gradient';meta().backgroundType='gradient';sync();}));
    qa('[data-grad]').forEach(b=>b.addEventListener('click',()=>{bgMode='gradient';meta().backgroundType='gradient';sync();}));
    qa('[data-texture]').forEach(b=>b.addEventListener('click',()=>{bgMode='texture';meta().backgroundType='texture';meta().textureSrc='builtin:'+b.dataset.texture;sync();}));
    q('#loV9UploadTexture')?.addEventListener('click',()=>g.loTextureUpload?.());
    q('#loV9ImageInput')?.addEventListener('change',e=>chooseImage(e.target.files?.[0]));
    const drop=q('#loV9Dropzone');
    ['dragenter','dragover'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging');}));
    ['dragleave','drop'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging');}));
    drop?.addEventListener('drop',e=>chooseImage(e.dataTransfer?.files?.[0]));
    q('#loV9UseBlankInstead')?.addEventListener('click',()=>{setStartMode('background');sync();});
    q('#loV9AddImageAfter')?.addEventListener('click',()=>{createDocument(false,true);});
    q('#loV9Cancel')?.addEventListener('click',()=>{g.__loSetupSelecting=false;empty.dataset.loSetupMounted='';empty.classList.remove('lo-setup-state');empty.style.display='none';});

    function createDocument(addImageAfter=false,forceUpload=false){
      const u=q('#loV9Unit').value,d=Math.max(36,Math.min(1200,Number(q('#loV9Dpi').value)||96));
      const w=Math.max(16,Math.min(12000,toPx(Number(q('#loV9W').value)||1920,u,d)));
      const h=Math.max(16,Math.min(12000,toPx(Number(q('#loV9H').value)||1080,u,d)));
      meta().width=w;meta().height=h;meta().dpi=d;meta().unit=u;
      if(typeof g.loSetDocumentSize==='function')g.loSetDocumentSize(w,h,d,u);
      if(startMode==='background'){
        const type=bgMode;
        if(type==='solid'&&g.setManualBackgroundColorV5)g.setManualBackgroundColorV5(meta().backgroundColor||'#ffffff');
        else if(type==='gradient'&&g.applyManualGradientBackgroundV5)g.applyManualGradientBackgroundV5(q('#loV9GradA')?.value||'#fff',q('#loV9GradB')?.value||'#dbeafe',false);
        else if(type==='texture'&&meta().textureSrc){if(g.loBuiltInTexture&&meta().textureSrc.startsWith('builtin:'))g.loBuiltInTexture(meta().textureSrc.slice(8));else g.loApplyTexture?.(meta().textureSrc);}
      } else {
        // Image-first mode deliberately starts with a clean document; background remains available later.
        if(typeof g.setManualBackgroundColorV5==='function')g.setManualBackgroundColorV5('#ffffff');
      }
      g.__loSetupSelecting=false;empty.dataset.loSetupMounted='';empty.classList.remove('lo-setup-state');empty.style.display='none';
      g.ensureLookoutBackground?.();g.flushManualHistory?.('Document setup');g.updateManualDocumentInfo?.();g.updateManualWorkspaceState?.();g.setManualStatus?.(`Document ready · ${w.toLocaleString()} × ${h.toLocaleString()} px · ${d} DPI`);
      if(startMode==='image'||addImageAfter||forceUpload){
        if(pendingImage&&typeof g.addImageToEditor==='function'){
          g.addImageToEditor(pendingImage.src,pendingImage.name);
        } else g.triggerManualImageUpload?.();
      }
    }
    q('#loV9Create').addEventListener('click',()=>createDocument());
    sync();
  }

  g.mountManualDocumentSetup=render;
  setTimeout(()=>{
    if(document.body.classList.contains('manual-editor-active')&&q('#loEmptyState')&&!q('.lo-setup-v9'))g.mountManualDocumentSetup();
  },80);
})();
