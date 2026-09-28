/* LOOKOUT MANUAL EDITOR V8 — PROFESSIONAL DOCUMENT SETUP / UI POLISH */
(function(){
  'use strict';
  const g=window, q=s=>document.querySelector(s), qa=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const presets={
    '1:1':[1080,1080],'4:5':[1080,1350],'3:2':[1800,1200],'4:3':[1600,1200],
    '16:9':[1920,1080],'9:16':[1080,1920],'21:9':[2560,1080],
    'YouTube':[1920,1080],'Instagram':[1080,1080],'Story':[1080,1920],'A4':[2480,3508],'A3':[3508,4961]
  };
  const convertToPx=(v,u,d)=>u==='in'?Math.round(v*d):u==='cm'?Math.round(v/2.54*d):Math.round(v);
  const convertFromPx=(v,u,d)=>u==='in'?(v/d).toFixed(2):u==='cm'?(v/d*2.54).toFixed(2):String(Math.round(v));
  function meta(){try{return manualDocumentMeta}catch(e){return g.manualDocumentMeta||(g.manualDocumentMeta={width:1920,height:1080,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null});}}
  function updatePreview(){
    const unit=q('#loV8Unit')?.value||'px',dpi=Math.max(36,Math.min(1200,Number(q('#loV8Dpi')?.value)||96));
    const w=convertToPx(Number(q('#loV8W')?.value)||1920,unit,dpi),h=convertToPx(Number(q('#loV8H')?.value)||1080,unit,dpi);
    const label=q('#loV8Resolution'); if(label)label.textContent=`${w.toLocaleString()} × ${h.toLocaleString()} px`;
    const dpiLabel=q('#loV8DpiLabel');if(dpiLabel)dpiLabel.textContent=`${dpi} DPI`;
    const ratio=q('#loV8PreviewRatio');if(ratio){const ar=Math.max(.25,Math.min(4,w/h));ratio.style.aspectRatio=`${w}/${h}`;ratio.dataset.ratio=`${w}:${h}`;}
    const size=q('#loV8Physical');if(size){const iw=w/dpi,ih=h/dpi;size.textContent=`${iw.toFixed(2)} × ${ih.toFixed(2)} in`}
    const type=meta().backgroundType||'solid';const preview=q('#loV8Preview');
    if(preview){
      preview.dataset.backgroundType=type;
      if(type==='solid')preview.style.background=meta().backgroundColor||'#fff';
      else if(type==='gradient')preview.style.background=`linear-gradient(135deg, ${meta().gradientA||'#fff'}, ${meta().gradientB||'#dbeafe'})`;
      else preview.style.background=`linear-gradient(135deg,#e9eef2 25%,#dfe6eb 25%,#dfe6eb 50%,#e9eef2 50%,#e9eef2 75%,#dfe6eb 75%) 0 0/24px 24px`;
    }
  }
  function selectRatio(r){
    qa('.lo-v8-ratio').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));
    const p=presets[r];
    if(p){const u=q('#loV8Unit')?.value||'px',d=Number(q('#loV8Dpi')?.value)||96;q('#loV8W').value=convertFromPx(p[0],u,d);q('#loV8H').value=convertFromPx(p[1],u,d);}
    else if(q('#loV8W')){q('#loV8W').focus();}
    updatePreview();
  }
  function bgTab(type){
    qa('.lo-v8-bg-tab').forEach(b=>b.classList.toggle('active',b.dataset.bg===type));
    ['solid','gradient','texture'].forEach(k=>{const el=q('#loV8Bg-'+k);if(el)el.hidden=k!==type;});
    meta().backgroundType=type; updatePreview();
  }
  g.mountManualDocumentSetup=function(){
    const empty=q('#loEmptyState');if(!empty)return;
    // Idempotent mount: several legacy lifecycle hooks can request the setup at once.
    // Never rewrite the setup DOM while it already exists; doing so can create a
    // MutationObserver feedback loop and was the main source of browser crashes.
    if(empty.dataset.loSetupMounted==='v8' && q('.lo-setup-v8')) return;
    empty.dataset.loSetupMounted='v8';
    g.__loSetupSelecting=true;empty.classList.add('lo-setup-state');empty.style.display='flex';
    empty.innerHTML=`<div class="lo-setup-v8" role="dialog" aria-modal="true" aria-labelledby="loV8Title">
      <div class="lo-v8-head">
        <div class="lo-v8-title"><div class="lo-v8-mark"><i class="fa-solid fa-layer-group"></i></div><div><span>LOOKOUT CREATIVE WORKSPACE</span><h2 id="loV8Title">Create a new document</h2><p>Define the working resolution and background first. Your first image will fill the canvas without distortion.</p></div></div>
        <div class="lo-v8-head-meta"><div><b id="loV8Resolution">1,920 × 1,080 px</b><span id="loV8DpiLabel">96 DPI</span></div><i class="fa-solid fa-shield-halved" title="Non-destructive workflow"></i></div>
      </div>
      <div class="lo-v8-body">
        <section class="lo-v8-card lo-v8-document"><div class="lo-v8-card-head"><div><span class="lo-v8-step">01</span><div><h3>Document</h3><p>Canvas size, resolution and presets</p></div></div><span class="lo-v8-live">LIVE</span></div>
          <div class="lo-v8-fields"><label>Width<input id="loV8W" type="number" min="16" max="12000" value="1920"></label><label>Height<input id="loV8H" type="number" min="16" max="12000" value="1080"></label><label>Unit<select id="loV8Unit"><option value="px">Pixels</option><option value="in">Inches</option><option value="cm">Centimeters</option></select></label><label>DPI<input id="loV8Dpi" type="number" min="36" max="1200" value="96"></label></div>
          <div class="lo-v8-subhead"><span>Canvas presets</span><div class="lo-v8-dpi-presets"><button data-dpi="96">Screen 96</button><button data-dpi="150">Draft 150</button><button data-dpi="300">Print 300</button></div></div>
          <div class="lo-v8-ratios">${Object.keys(presets).map(r=>`<button type="button" class="lo-v8-ratio ${r==='16:9'?'active':''}" data-ratio="${esc(r)}">${esc(r)}</button>`).join('')}<button type="button" class="lo-v8-ratio" data-ratio="custom">Custom</button></div>
          <div class="lo-v8-note"><i class="fa-solid fa-circle-info"></i><span>DPI controls physical print dimensions. Pixel width × height controls the actual working/export resolution.</span></div>
        </section>
        <section class="lo-v8-card lo-v8-background"><div class="lo-v8-card-head"><div><span class="lo-v8-step">02</span><div><h3>Background</h3><p>Start with a clean base or add a texture</p></div></div></div>
          <div class="lo-v8-bg-tabs"><button class="lo-v8-bg-tab active" data-bg="solid">Solid</button><button class="lo-v8-bg-tab" data-bg="gradient">Gradient</button><button class="lo-v8-bg-tab" data-bg="texture">Texture</button></div>
          <div id="loV8Bg-solid"><div class="lo-v8-swatches">${['#ffffff','#f3f4f6','#dbeafe','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#111827','#0f172a','#334155'].map(c=>`<button class="lo-v8-swatch" style="background:${c}" title="${c}" data-color="${c}"></button>`).join('')}</div><label class="lo-v8-color-input"><span>Custom color</span><input id="loV8Color" type="color" value="#ffffff"></label></div>
          <div id="loV8Bg-gradient" hidden><div class="lo-v8-gradient-fields"><label>Start<input id="loV8GradA" type="color" value="#ffffff"></label><label>End<input id="loV8GradB" type="color" value="#dbeafe"></label></div><div class="lo-v8-inline-actions"><button data-grad="linear">Linear gradient</button><button data-grad="radial">Radial gradient</button></div></div>
          <div id="loV8Bg-texture" hidden><div class="lo-v8-textures">${['paper','canvas','grid','dots','diagonal','noise'].map(k=>`<button data-texture="${k}"><i class="fa-solid fa-swatchbook"></i><span>${k[0].toUpperCase()+k.slice(1)}</span></button>`).join('')}</div><button class="lo-v8-upload-texture" id="loV8UploadTexture"><i class="fa-solid fa-upload"></i> Upload your own texture</button></div>
          <div class="lo-v8-bg-preview"><span>Background preview</span><div id="loV8MiniBg"></div></div>
        </section>
        <section class="lo-v8-card lo-v8-preview-card"><div class="lo-v8-card-head"><div><span class="lo-v8-step">03</span><div><h3>Preview</h3><p>See the document before you begin</p></div></div></div><div class="lo-v8-preview-wrap"><div class="lo-v8-preview-frame"><div id="loV8Preview"></div></div><span class="lo-v8-preview-label">FILL CANVAS</span></div><div class="lo-v8-preview-stats"><div><span>Resolution</span><b id="loV8Resolution2">1,920 × 1,080 px</b></div><div><span>Physical</span><b id="loV8Physical">20.00 × 11.25 in</b></div><div><span>Background</span><b id="loV8BgType">Solid</b></div></div><div class="lo-v8-preview-note"><i class="fa-solid fa-wand-magic-sparkles"></i><span>When you add an image, LookOut scales it to cover this document while preserving its original aspect ratio.</span></div></section>
      </div>
      <div class="lo-v8-footer"><div class="lo-v8-footer-copy"><i class="fa-solid fa-circle-check"></i><div><b>Non-destructive document</b><span>Background, transforms, adjustments and effects remain editable.</span></div></div><div class="lo-v8-footer-actions"><button class="lo-v8-secondary" id="loV8Blank">Create blank canvas</button><button class="lo-v8-primary" id="loV8Place"><i class="fa-solid fa-image"></i> Create & place image</button></div></div>
    </div>`;
    const sync=()=>{updatePreview();const r=q('#loV8Resolution2');if(r)r.textContent=q('#loV8Resolution')?.textContent||'';const t=q('#loV8BgType');if(t)t.textContent=(meta().backgroundType||'solid').replace(/^./,x=>x.toUpperCase());const mini=q('#loV8MiniBg'),pre=q('#loV8Preview');if(mini&&pre)mini.style.background=pre.style.background;};
    ['loV8W','loV8H','loV8Unit','loV8Dpi'].forEach(id=>q('#'+id)?.addEventListener('input',()=>{qa('.lo-v8-ratio').forEach(b=>b.classList.remove('active'));sync();}));
    qa('.lo-v8-ratio').forEach(b=>b.addEventListener('click',()=>{selectRatio(b.dataset.ratio);sync();}));
    qa('.lo-v8-dpi-presets button').forEach(b=>b.addEventListener('click',()=>{q('#loV8Dpi').value=b.dataset.dpi;sync();}));
    qa('.lo-v8-bg-tab').forEach(b=>b.addEventListener('click',()=>{bgTab(b.dataset.bg);sync();}));
    qa('.lo-v8-swatch').forEach(b=>b.addEventListener('click',()=>{meta().backgroundType='solid';meta().backgroundColor=b.dataset.color;q('#loV8Color').value=b.dataset.color;bgTab('solid');sync();}));
    q('#loV8Color')?.addEventListener('input',e=>{meta().backgroundType='solid';meta().backgroundColor=e.target.value;sync();});
    ['loV8GradA','loV8GradB'].forEach(id=>q('#'+id)?.addEventListener('input',()=>{meta().backgroundType='gradient';sync();}));
    qa('[data-grad]').forEach(b=>b.addEventListener('click',()=>{meta().backgroundType='gradient';sync();}));
    qa('[data-texture]').forEach(b=>b.addEventListener('click',()=>{meta().backgroundType='texture';meta().textureSrc='builtin:'+b.dataset.texture;sync();g.setManualStatus?.('Texture selected: '+b.dataset.texture);}));
    q('#loV8UploadTexture')?.addEventListener('click',()=>g.loTextureUpload?.());
    function create(place){
      const u=q('#loV8Unit').value,d=Math.max(36,Math.min(1200,Number(q('#loV8Dpi').value)||96));
      const w=Math.max(16,Math.min(12000,convertToPx(Number(q('#loV8W').value)||1920,u,d))),h=Math.max(16,Math.min(12000,convertToPx(Number(q('#loV8H').value)||1080,u,d)));
      meta().width=w;meta().height=h;meta().dpi=d;meta().unit=u;
      if(typeof g.loSetDocumentSize==='function')g.loSetDocumentSize(w,h,d,u);
      const type=meta().backgroundType||'solid';
      if(type==='solid'&&g.setManualBackgroundColorV5)g.setManualBackgroundColorV5(meta().backgroundColor||q('#loV8Color').value||'#fff');
      else if(type==='gradient'&&g.applyManualGradientBackgroundV5)g.applyManualGradientBackgroundV5(q('#loV8GradA').value,q('#loV8GradB').value,false);
      else if(type==='texture'&&meta().textureSrc){if(g.loBuiltInTexture&&meta().textureSrc.startsWith('builtin:'))g.loBuiltInTexture(meta().textureSrc.slice(8));else g.loApplyTexture?.(meta().textureSrc);}
      g.__loSetupSelecting=false;empty.dataset.loSetupMounted='';empty.classList.remove('lo-setup-state');empty.style.display='none';g.ensureLookoutBackground?.();g.flushManualHistory?.('Document setup');g.updateManualDocumentInfo?.();g.updateManualWorkspaceState?.();g.setManualStatus?.(`Document ready · ${w.toLocaleString()} × ${h.toLocaleString()} px · ${d} DPI`);
      if(place)g.triggerManualImageUpload?.();
    }
    q('#loV8Blank').addEventListener('click',()=>create(false));q('#loV8Place').addEventListener('click',()=>create(true));
    sync();
  };
  // Re-apply the setup after the V7 timer has had a chance to create the shell.
  setTimeout(()=>{if(document.body.classList.contains('manual-editor-active')&&q('#loEmptyState')&&!q('.lo-setup-card,.lo-setup-v8'))g.mountManualDocumentSetup();},120);
})();
