/* =========================================================
   LOOKOUT MANUAL EDITOR V7 — HARDENED EDITING ENGINE
   Loaded after manual-editor.js so it can repair/extend the
   legacy editor without changing the rest of LookOut.
   ========================================================= */
(function(){
  'use strict';

  const g=window;
  const q=(s)=>document.querySelector(s);
  const qa=(s)=>Array.from(document.querySelectorAll(s));
  const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const canvas=()=>g.editorCanvas;
  const active=()=>canvas()?.getActiveObject()||null;
  const image=()=>{const o=active();return o?.type==='image'?o:null;};
  const objects=()=>canvas()?.getObjects()||[];

  /* ---------- status ---------- */
  g.setManualStatus=function(message){
    const el=q('#loStatusText')||q('.lo-status-message')||q('.lo-statusbar span:last-child');
    if(el) el.textContent=message;
    const shell=q('#manualWorkspaceShell');
    if(shell){shell.dataset.status=message||'';}
  };

  /* ---------- document state ---------- */
  function meta(){ try { return manualDocumentMeta; } catch(e) { return g.manualDocumentMeta||(g.manualDocumentMeta={width:1200,height:800,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null}); } }
  function docSize(){ try { return manualDocumentSize; } catch(e) { return g.manualDocumentSize||{width:1200,height:800}; } }
  function currentTool(){ try { return manualCurrentTool; } catch(e) { return g.__loV7CurrentTool||'select'; } }
  function backgroundObject(){return objects().find(o=>o.__loTool==='background')||null;}

  function ensureBackground(){
    const c=canvas(); if(!c)return null;
    let bg=backgroundObject();
    if(!bg){
      bg=new fabric.Rect({left:0,top:0,width:docSize().width,height:docSize().height,originX:'left',originY:'top',fill:meta().backgroundColor||'#fff',selectable:false,evented:false,excludeFromExport:false});
      bg.__loTool='background'; bg.__loName='Background'; bg.__loLocked=true;
      c.add(bg);
    }
    bg.set({left:0,top:0,width:docSize().width,height:docSize().height,scaleX:1,scaleY:1,selectable:false,evented:false});
    bg.setCoords(); c.sendToBack(bg); return bg;
  }

  function applyBackgroundFill(fill,type){
    const c=canvas();if(!c)return;
    const bg=ensureBackground();if(!bg)return;
    meta().backgroundType=type||'solid';
    bg.set({fill}); bg.setCoords(); c.sendToBack(bg); c.renderAll();
    if(typeof g.flushManualHistory==='function')g.flushManualHistory('Background: '+(type||'solid'));
  }

  g.setManualBackgroundColorV5=function(color){
    let c=String(color||'').trim();
    if(/^#[0-9a-f]{3}$/i.test(c))c='#'+c.slice(1).split('').map(x=>x+x).join('');
    if(!/^#[0-9a-f]{6}$/i.test(c))return;
    meta().backgroundColor=c; meta().backgroundType='solid';
    const setup=q('.lo-setup-card');
    if(setup && !objects().length){
      qa('[data-setup-color]').forEach(el=>el.value=c);
      setup.dataset.backgroundType='solid';
      return;
    }
    applyBackgroundFill(c,'solid');
    qa('[data-setup-color]').forEach(el=>el.value=c);
    if(typeof g.renderBackgroundInspector==='function')g.renderBackgroundInspector();
    g.setManualStatus('Solid background set to '+c.toUpperCase());
  };

  g.clearManualBackground=function(){
    const c=canvas();if(!c)return;
    const bg=ensureBackground(); if(bg)bg.set({fill:'rgba(0,0,0,0)'});
    meta().backgroundType='transparent';meta().backgroundColor='rgba(0,0,0,0)';
    c.renderAll();if(typeof g.flushManualHistory==='function')g.flushManualHistory('Background: Transparent');
    if(typeof g.renderBackgroundInspector==='function')g.renderBackgroundInspector();g.setManualStatus('Background set to transparent');
  };

  g.applyManualGradientBackgroundV5=function(a,b,radial){
    a=/^#[0-9a-f]{6}$/i.test(a)?a:'#ffffff'; b=/^#[0-9a-f]{6}$/i.test(b)?b:'#dbeafe';
    meta().gradientA=a;meta().gradientB=b;meta().backgroundType='gradient';
    const w=docSize().width,h=docSize().height;
    const grad=new fabric.Gradient({
      type:radial?'radial':'linear',gradientUnits:'pixels',
      coords:radial?{x1:w/2,y1:h/2,r1:0,x2:w/2,y2:h/2,r2:Math.max(w,h)/2}:{x1:0,y1:0,x2:w,y2:h},
      colorStops:[{offset:0,color:a},{offset:1,color:b}]
    });
    const setup=q('.lo-setup-card');
    if(setup && !objects().length){setup.dataset.backgroundType='gradient';return;}
    applyBackgroundFill(grad,'gradient');g.setManualStatus('Gradient background applied');
    if(typeof g.renderBackgroundInspector==='function')g.renderBackgroundInspector();
  };

  /* ---------- professional document setup ---------- */
  const presets={
    '1:1':[1080,1080],'4:5':[1080,1350],'3:2':[1800,1200],'4:3':[1600,1200],
    '16:9':[1920,1080],'9:16':[1080,1920],'21:9':[2560,1080],
    'YouTube':[1920,1080],'Instagram':[1080,1080],'Story':[1080,1920],'A4':[2480,3508],'A3':[3508,4961]
  };
  g.loDocRatioPresets=function(){return presets;};

  function convertToPx(v,unit,dpi){
    if(unit==='in')return Math.round(v*dpi);
    if(unit==='cm')return Math.round(v/2.54*dpi);
    return Math.round(v);
  }
  function convertFromPx(v,unit,dpi){
    if(unit==='in')return (v/dpi).toFixed(2);
    if(unit==='cm')return (v/dpi*2.54).toFixed(2);
    return String(Math.round(v));
  }

  g.loSelectRatio=function(r){
    qa('.lo-ratio-btn').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));
    const p=presets[r];const unit=q('#loSetupUnit')?.value||'px';const dpi=num(q('#loSetupDpi')?.value,96);
    if(p){q('#loSetupW').value=convertFromPx(p[0],unit,dpi);q('#loSetupH').value=convertFromPx(p[1],unit,dpi);}
    if(q('#loSetupRatio'))q('#loSetupRatio').value=r;
    g.updateManualDocumentInfo?.();
  };

  g.loUpdateSetupDimensions=function(){
    const unit=q('#loSetupUnit')?.value||'px',dpi=num(q('#loSetupDpi')?.value,96);
    const ratio=q('#loSetupRatio')?.value||'custom';
    if(ratio!=='custom'&&presets[ratio]){
      q('#loSetupW').value=convertFromPx(presets[ratio][0],unit,dpi);
      q('#loSetupH').value=convertFromPx(presets[ratio][1],unit,dpi);
    }
    g.updateManualDocumentInfo?.();
  };

  g.updateManualDocumentInfo=function(){
    const unit=q('#loSetupUnit')?.value||'px',dpi=num(q('#loSetupDpi')?.value,96);
    const w=convertToPx(num(q('#loSetupW')?.value,1200),unit,dpi),h=convertToPx(num(q('#loSetupH')?.value,800),unit,dpi);
    const label=q('#loSetupResolutionLabel');if(label)label.textContent=`${w.toLocaleString()} × ${h.toLocaleString()} px • ${dpi} DPI`;
    const info=q('#loCanvasInfo');if(info)info.textContent=`${w.toLocaleString()} × ${h.toLocaleString()} px • ${dpi} DPI`;
  };

  g.mountManualDocumentSetup=function(){
    const empty=q('#loEmptyState');if(!empty)return;
    g.__loSetupSelecting=true;empty.classList.add('lo-setup-state');empty.style.display='flex';
    empty.innerHTML=`<div class="lo-setup-card lo-setup-v7">
      <div class="lo-setup-head"><div><span class="lo-setup-kicker">LOOKOUT / NEW DOCUMENT</span><h3>Create your canvas</h3><p>Set the real working resolution first. Your first image will fill the document without distortion, and you can resize it smaller later.</p></div><span class="lo-document-chip" id="loSetupResolutionLabel">1,920 × 1,080 px • 96 DPI</span></div>
      <div class="lo-setup-grid">
        <section class="lo-setup-section"><div class="lo-v7-section-title"><span>01</span><div><b>Canvas & resolution</b><small>Pixel dimensions are the export resolution.</small></div></div>
          <div class="lo-setup-row"><div class="lo-setup-field"><label>Width</label><input id="loSetupW" type="number" min="1" max="12000" value="1920" oninput="loUpdateSetupDimensions()"></div><div class="lo-setup-field"><label>Height</label><input id="loSetupH" type="number" min="1" max="12000" value="1080" oninput="loUpdateSetupDimensions()"></div></div>
          <div class="lo-setup-row"><div class="lo-setup-field"><label>Unit</label><select id="loSetupUnit" onchange="loUpdateSetupDimensions()"><option value="px">Pixels</option><option value="in">Inches</option><option value="cm">Centimeters</option></select></div><div class="lo-setup-field"><label>DPI</label><input id="loSetupDpi" type="number" min="36" max="1200" value="96" oninput="loUpdateSetupDimensions()"></div></div>
          <div class="lo-ratio-grid">${Object.keys(presets).map(r=>`<button class="lo-ratio-btn ${r==='16:9'?'active':''}" data-ratio="${r}" onclick="loSelectRatio('${r}')">${r}</button>`).join('')}<button class="lo-ratio-btn" data-ratio="custom" onclick="loSelectRatio('custom')">Custom</button></div>
          <div class="lo-doc-setup-mini"><button onclick="loApplyDpiPreset(96)">Screen · 96</button><button onclick="loApplyDpiPreset(150)">Draft · 150</button><button onclick="loApplyDpiPreset(300)">Print · 300</button></div>
        </section>
        <section class="lo-setup-section"><div class="lo-v7-section-title"><span>02</span><div><b>Background</b><small>Choose it before upload; change it later from Background.</small></div></div>
          <div class="lo-bg-tabs"><button class="lo-bg-tab active" data-bg="solid" onclick="loSetupBackgroundTab('solid')">Solid</button><button class="lo-bg-tab" data-bg="gradient" onclick="loSetupBackgroundTab('gradient')">Gradient</button><button class="lo-bg-tab" data-bg="texture" onclick="loSetupBackgroundTab('texture')">Texture</button></div>
          <div id="loSetupSolid"><div class="lo-bg-presets">${['#ffffff','#000000','#f3f4f6','#111827','#0f172a','#1e3a8a','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#e5e7eb','#94a3b8','#334155','#fde68a'].map(c=>`<button class="lo-bg-swatch" style="background:${c}" title="${c}" onclick="setManualBackgroundColorV5('${c}')"></button>`).join('')}</div><label class="lo-v7-color-field">Custom color <input data-setup-color type="color" value="#ffffff" onchange="setManualBackgroundColorV5(this.value)"></label></div>
          <div id="loSetupGradient" class="lo-bg-gradient-controls"><label>Start <input id="loSetupGradA" type="color" value="#ffffff"></label><label>End <input id="loSetupGradB" type="color" value="#dbeafe"></label><div class="lo-gradient-actions"><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(loSetupGradA.value,loSetupGradB.value,false)">Linear</button><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(loSetupGradA.value,loSetupGradB.value,true)">Radial</button></div></div>
          <div id="loSetupTexture" class="lo-bg-texture-controls"><div class="lo-background-mode-grid">${['paper','canvas','grid','dots','diagonal','noise'].map(k=>`<button type="button" onclick="loBuiltInTexture('${k}')">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div><button class="lo-dock-btn" onclick="loTextureUpload()"><i class="fa-solid fa-upload"></i> Upload texture</button></div>
        </section>
      </div>
      <div class="lo-setup-footer"><span class="lo-setup-note"><b>Fill Canvas</b> keeps the image aspect ratio and crops overflow. No automatic transparent border.</span><button onclick="loCreateDocumentFromSetup(false)">Create blank</button><button class="primary" onclick="loCreateDocumentFromSetup(true)"><i class="fa-solid fa-image"></i> Create & place image</button></div>
    </div>`;
    g.loSetupBackgroundTab?.('solid');g.updateManualDocumentInfo?.();
  };

  g.loApplyDpiPreset=function(dpi){if(q('#loSetupDpi'))q('#loSetupDpi').value=dpi;g.updateManualDocumentInfo?.();};
  g.loSetupBackgroundTab=function(type){
    qa('.lo-bg-tab').forEach(b=>b.classList.toggle('active',b.dataset.bg===type));
    const s=q('#loSetupSolid'),gr=q('#loSetupGradient'),t=q('#loSetupTexture');
    if(s)s.style.display=type==='solid'?'block':'none';if(gr)gr.style.display=type==='gradient'?'grid':'none';if(t)t.style.display=type==='texture'?'grid':'none';
    meta().backgroundType=type;
  };

  g.loCreateDocumentFromSetup=function(placeImage){
    const unit=q('#loSetupUnit')?.value||'px',dpi=clamp(num(q('#loSetupDpi')?.value,96),36,1200);
    const w=clamp(convertToPx(num(q('#loSetupW')?.value,1920),unit,dpi),16,12000),h=clamp(convertToPx(num(q('#loSetupH')?.value,1080),unit,dpi),16,12000);
    if(typeof g.loSetDocumentSize==='function')g.loSetDocumentSize(w,h,dpi,unit);
    meta().width=w;meta().height=h;meta().dpi=dpi;meta().unit=unit;
    const type=meta().backgroundType||'solid';
    if(type==='solid')g.setManualBackgroundColorV5(q('[data-setup-color]')?.value||'#ffffff');
    else if(type==='gradient')g.applyManualGradientBackgroundV5(q('#loSetupGradA')?.value||'#fff',q('#loSetupGradB')?.value||'#dbeafe',false);
    else if(type==='texture'&&meta().textureSrc)g.loApplyTexture?.(meta().textureSrc);
    g.__loSetupSelecting=false; const empty=q('#loEmptyState');if(empty){empty.classList.remove('lo-setup-state');empty.style.display='none';}
    g.ensureLookoutBackground?.();
    if(typeof g.flushManualHistory==='function')g.flushManualHistory('Document setup');
    g.updateManualDocumentInfo?.();g.setManualStatus(`Document ready · ${w.toLocaleString()} × ${h.toLocaleString()} px · ${dpi} DPI`);
    if(placeImage)g.triggerManualImageUpload?.();
  };

  /* ---------- image placement: true fill-to-cover ---------- */
  g.addImageToEditor=function(src,name='Image'){
    if(!g.fabric||!canvas())return;
    fabric.Image.fromURL(src,function(img){
      if(!img)return;
      const d=docSize();
      img.__loName=name.replace(/\.[^.]+$/,'')||'Image';img.__loOriginalSrc=src;
      img.__loAdjustments=Object.assign({brightness:0,contrast:0,exposure:0,saturation:0,hue:0,temperature:0,tintAmount:0,tint:'#fff',highlights:0,shadows:0,sharpness:0,blur:0,vignette:0,grain:0},img.__loAdjustments||{});
      img.__loEffects=[];img.__loEffectIntensity=1;
      img.__loBaseWidth=img.width||img.getElement()?.naturalWidth||1;img.__loBaseHeight=img.height||img.getElement()?.naturalHeight||1;
      img.__loCrop=null;img.cropX=0;img.cropY=0;img.clipPath=null;
      const scale=Math.max(d.width/img.__loBaseWidth,d.height/img.__loBaseHeight);
      img.set({scaleX:scale,scaleY:scale,left:d.width/2,top:d.height/2,originX:'center',originY:'center'});
      canvas().add(img);canvas().bringToFront(img);canvas().setActiveObject(img);canvas().renderAll();
      q('#loEmptyState')?.style.setProperty('display','none');
      g.flushManualHistory?.('Place image');g.renderManualInspector?.();g.updateManualWorkspaceState?.();g.fitManualCanvas?.();g.setManualStatus('Image placed · Fill Canvas');
    },{crossOrigin:'anonymous'});
  };

  /* ---------- crop: keep an explicit target while interaction is active ---------- */
  g.startManualCrop=function(){
    const img=image();if(!img){g.setManualStatus('Select an image layer before cropping');return;}
    g.manualCropTarget=img;g.manualCropDragging=false;g.manualCropStart=null;g.manualCropBox=null;
    g.__loV7CurrentTool='crop';canvas().isDrawingMode=false;canvas().discardActiveObject();canvas().selection=false;canvas().defaultCursor='crosshair';
    g.setManualStatus('Crop active · drag inside the image');
  };

  g.handleManualCanvasDown=function(opt){
    const type=currentTool();
    if(type==='crop'){
      const img=g.manualCropTarget||image();if(!img)return;
      if(g.manualCropBox)canvas().remove(g.manualCropBox);
      g.manualCropTarget=img;g.manualCropDragging=true;g.manualCropStart=canvas().getPointer(opt.e);
      g.manualCropBox=new fabric.Rect({left:g.manualCropStart.x,top:g.manualCropStart.y,width:1,height:1,originX:'left',originY:'top',fill:'rgba(21,155,196,.10)',stroke:'#159bc4',strokeWidth:2,strokeDashArray:[8,6],selectable:false,evented:false,excludeFromExport:true});
      canvas().add(g.manualCropBox);canvas().bringToFront(g.manualCropBox);canvas().requestRenderAll();return;
    }
    if(typeof g.__lookoutOriginalCanvasDown==='function')return g.__lookoutOriginalCanvasDown(opt);
    if(type==='pan'){g.manualPanning=true;g.manualPanLast={x:opt.e.clientX,y:opt.e.clientY};canvas().defaultCursor='grabbing';}
    if(type==='zoom'){const p=canvas().getPointer(opt.e),z=canvas().getZoom(),nz=clamp(z*1.25,.1,4);canvas().zoomToPoint(new fabric.Point(p.x,p.y),nz);q('#loZoomLabel').textContent=Math.round(nz*100)+'%';}
    if(type==='picker')g.pickCanvasColor?.(opt);
  };

  g.handleManualCanvasMove=function(opt){
    if(g.manualCropDragging&&g.manualCropStart){
      const end=canvas().getPointer(opt.e),s=g.manualCropStart;
      let x=Math.min(s.x,end.x),y=Math.min(s.y,end.y),w=Math.max(4,Math.abs(end.x-s.x)),h=Math.max(4,Math.abs(end.y-s.y));
      const ratio=g.getCropRatio?.()||null;
      if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;if(end.x<s.x)x=s.x-w;if(end.y<s.y)y=s.y-h;}
      g.manualCropBox?.set({left:x,top:y,width:w,height:h});g.manualCropBox?.setCoords();canvas().requestRenderAll();return;
    }
    if(typeof g.__lookoutOriginalCanvasMove==='function')return g.__lookoutOriginalCanvasMove(opt);
    if(g.manualPanning){const dx=opt.e.clientX-g.manualPanLast.x,dy=opt.e.clientY-g.manualPanLast.y,v=canvas().viewportTransform;v[4]+=dx;v[5]+=dy;canvas().requestRenderAll();g.manualPanLast={x:opt.e.clientX,y:opt.e.clientY};}
  };

  g.handleManualCanvasUp=function(){
    if(g.manualCropDragging){g.manualCropDragging=false;g.applyManualCropBox?.();return;}
    if(typeof g.__lookoutOriginalCanvasUp==='function')return g.__lookoutOriginalCanvasUp();
    if(g.manualPanning){g.manualPanning=false;canvas().defaultCursor='grab';}
  };

  g.applyManualCropBox=function(){
    const img=g.manualCropTarget,box=g.manualCropBox;if(!img||!box){if(box)canvas().remove(box);g.manualCropBox=null;return;}
    const br=box.getBoundingRect(true,true);
    const pts=[new fabric.Point(br.left,br.top),new fabric.Point(br.left+br.width,br.top),new fabric.Point(br.left+br.width,br.top+br.height),new fabric.Point(br.left,br.top+br.height)];
    const local=pts.map(p=>img.toLocalPoint(p,'center','center'));
    const sx=local.map(p=>(p.x+(img.width||1)/2)+(img.cropX||0));
    const sy=local.map(p=>(p.y+(img.height||1)/2)+(img.cropY||0));
    const x=clamp(Math.min(...sx),0,img.__loBaseWidth),y=clamp(Math.min(...sy),0,img.__loBaseHeight);
    const w=clamp(Math.abs(Math.max(...sx)-Math.min(...sx)),2,img.__loBaseWidth-x),h=clamp(Math.abs(Math.max(...sy)-Math.min(...sy)),2,img.__loBaseHeight-y);
    canvas().remove(box);g.manualCropBox=null;g.manualCropTarget=null;g.__loV7CurrentTool='select';canvas().selection=true;canvas().defaultCursor='default';
    const center=img.getCenterPoint();img.set({cropX:x,cropY:y,width:w,height:h,clipPath:null});img.setPositionByOrigin(center,'center','center');img.__loCrop={x,y,width:w,height:h};img.setCoords();canvas().setActiveObject(img);canvas().renderAll();
    g.flushManualHistory?.('Manual crop');g.renderManualInspector?.();g.setManualStatus('Crop applied · original source remains recoverable through Reset/Undo');
  };

  /* ---------- image reset crop ---------- */
  g.resetActualImageCrop=function(){const img=image();if(!img)return;const center=img.getCenterPoint();img.set({cropX:0,cropY:0,width:img.__loBaseWidth,height:img.__loBaseHeight,clipPath:null});img.setPositionByOrigin(center,'center','center');img.__loCrop=null;img.__loMaskType=null;img.setCoords();canvas().renderAll();g.flushManualHistory?.('Reset crop');g.renderManualInspector?.();g.setManualStatus('Crop reset');};

  /* ---------- masks ---------- */
  g.loadMaskToolbar=function(){
    q('#secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Masks</span>${['circle','ellipse','rounded','hexagon','none'].map(x=>`<button class="lo-dock-btn" onclick="applyLookoutMask('${x}')">${x}</button>`).join('')}</div>`;
    g.renderSimpleInspector?.('Masks','Non-destructive geometric image masks',`<div class="lo-option-grid">${['circle','ellipse','rounded','hexagon','none'].map(x=>`<button onclick="applyLookoutMask('${x}')">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><div class="lo-inspector-hint">Masks remain editable and do not destroy image pixels.</div>`);
  };
  g.applyLookoutMask=function(type){
    const img=image();if(!img)return;
    if(type==='none'){img.clipPath=null;img.__loMaskType=null;canvas().renderAll();g.flushManualHistory?.('Remove mask');return;}
    const w=img.width||100,h=img.height||100;
    let cp;
    if(type==='circle')cp=new fabric.Circle({radius:Math.min(w,h)/2,originX:'center',originY:'center'});
    else if(type==='ellipse')cp=new fabric.Ellipse({rx:w/2,ry:h/2,originX:'center',originY:'center'});
    else if(type==='rounded')cp=new fabric.Rect({width:w,height:h,rx:Math.min(40,w/6),ry:Math.min(40,h/6),originX:'center',originY:'center'});
    else cp=new fabric.Polygon([{x:0,y:-h/2},{x:w*.43,y:-h*.25},{x:w*.43,y:h*.25},{x:0,y:h/2},{x:-w*.43,y:h*.25},{x:-w*.43,y:-h*.25}],{originX:'center',originY:'center'});
    img.clipPath=cp;img.__loMaskType=type;canvas().renderAll();g.flushManualHistory?.('Mask: '+type);g.setManualStatus(type==='none'?'Mask removed':'Mask applied: '+type);
  };

  /* ---------- effects: independent preset + intensity ---------- */
  const effectDefs={
    grayscale:{label:'B&W',kind:'grayscale'},sepia:{label:'Sepia',kind:'sepia'},invert:{label:'Invert',kind:'invert'},
    vintage:{label:'Vintage',adjust:{saturation:-22,contrast:12,temperature:12,vignette:18}},
    cool:{label:'Cool',adjust:{temperature:-34,saturation:6}},warm:{label:'Warm',adjust:{temperature:34,saturation:6}},
    dramatic:{label:'Dramatic',adjust:{contrast:28,shadows:10,sharpness:18}},soft:{label:'Soft',adjust:{blur:7,contrast:-8}},
    cinematic:{label:'Cinematic',adjust:{contrast:20,saturation:-8,temperature:7,highlights:-12,shadows:10}},
    faded:{label:'Faded',adjust:{contrast:-18,saturation:-12,brightness:7}},
    crisp:{label:'Crisp',adjust:{contrast:16,sharpness:28,saturation:5}},
    matte:{label:'Matte',adjust:{contrast:-12,highlights:-10,shadows:16,saturation:-4}},
    dreamy:{label:'Dreamy',adjust:{brightness:8,contrast:-12,blur:4,saturation:4}},
    noir:{label:'Noir',kind:'grayscale',adjust:{contrast:28,shadows:-5,vignette:30}},
    sunset:{label:'Sunset',adjust:{temperature:45,saturation:14,highlights:-6}},
    arctic:{label:'Arctic',adjust:{temperature:-45,saturation:2,contrast:10}}
  };
  function effectState(img){img.__loEffects=Array.isArray(img.__loEffects)?img.__loEffects:[];img.__loEffectIntensity=clamp(num(img.__loEffectIntensity,1),0,1);return img;}
  g.applyAdvancedEffect=function(type){
    const img=image();if(!img)return;effectState(img);if(!effectDefs[type])return;
    img.__loEffects=[type];img.__loEffectIntensity=1;g.applyManualImageAdjustments?.(img);g.flushManualHistory?.('Effect: '+effectDefs[type].label);g.renderEffectsInspector?.();g.setManualStatus(effectDefs[type].label+' applied');
  };
  g.setManualEffectIntensity=function(v){const img=image();if(!img)return;effectState(img);img.__loEffectIntensity=clamp(num(v,100)/100,0,1);g.applyManualImageAdjustments?.(img);g.flushManualHistory?.('Effect intensity');q('#loEffectIntensityValue')&&(q('#loEffectIntensityValue').textContent=Math.round(img.__loEffectIntensity*100)+'%');};
  g.clearImageEffects=function(){const img=image();if(!img)return;img.__loEffects=[];img.__loEffectIntensity=1;g.applyManualImageAdjustments?.(img);canvas().renderAll();g.flushManualHistory?.('Clear effects');g.renderEffectsInspector?.();g.setManualStatus('Effects cleared · adjustments preserved');};
  g.renderEffectsInspector=function(){
    const img=image(),activeEffect=img?.__loEffects?.[0]||'';
    const cards=Object.entries(effectDefs).map(([k,v])=>`<button class="lo-effect-card ${activeEffect===k?'active':''}" onclick="applyAdvancedEffect('${k}')"><strong>${v.label}</strong><span>${k}</span></button>`).join('');
    g.renderSimpleInspector?.('Effects','Preset looks are layered above your underlying adjustments',`<div class="lo-effect-grid">${cards}</div><div class="lo-effect-intensity"><div><span>Intensity</span><strong id="loEffectIntensityValue">${Math.round((img?.__loEffectIntensity||1)*100)}%</strong></div><input type="range" min="0" max="100" value="${Math.round((img?.__loEffectIntensity||1)*100)}" oninput="setManualEffectIntensity(this.value)"></div><div class="lo-option-grid"><button onclick="clearImageEffects()">Clear effect only</button></div>`);
  };

  /* Override adjustment engine to preserve user adjustments and apply effect intensity. */
  const originalAdjust=g.applyManualImageAdjustments;
  g.applyManualImageAdjustments=function(img){
    if(!img||!fabric?.Image?.filters)return;
    const base=Object.assign({},img.__loAdjustments||{}),a=Object.assign({brightness:0,contrast:0,exposure:0,saturation:0,hue:0,temperature:0,tintAmount:0,tint:'#fff',highlights:0,shadows:0,sharpness:0,blur:0,vignette:0,grain:0},base);
    const effect=img.__loEffects?.[0],inten=clamp(num(img.__loEffectIntensity,1),0,1),def=effectDefs[effect];
    if(def?.adjust)Object.keys(def.adjust).forEach(k=>{a[k]=num(a[k],0)+num(def.adjust[k],0)*inten;});
    const f=fabric.Image.filters,filters=[];const push=(C,s)=>C&&filters.push(new C(s));
    if(a.brightness||a.exposure)push(f.Brightness,{brightness:clamp((a.brightness+a.exposure)/100,-1,1)});
    if(a.contrast)push(f.Contrast,{contrast:clamp(a.contrast/100,-1,1)});
    if(a.saturation)push(f.Saturation,{saturation:clamp(a.saturation/100,-1,1)});
    if(a.hue)push(f.HueRotation,{rotation:clamp(a.hue/180,-1,1)});
    if(a.blur)push(f.Blur,{blur:clamp(a.blur/100,0,.65)});
    if(a.sharpness&&f.Convolute){const s=clamp(a.sharpness/100,0,1);push(f.Convolute,{matrix:[0,-s,0,-s,1+4*s,-s,0,-s,0]});}
    if(a.tintAmount)push(f.BlendColor,{color:a.tint,mode:'tint',alpha:clamp(a.tintAmount/100,0,.55)});
    if(a.shadows>0)push(f.BlendColor,{color:'#fff',mode:'screen',alpha:clamp(a.shadows/100,0,.18)});else if(a.shadows<0)push(f.BlendColor,{color:'#000',mode:'multiply',alpha:clamp(Math.abs(a.shadows)/100,0,.16)});
    if(a.highlights>0)push(f.BlendColor,{color:'#fff',mode:'screen',alpha:clamp(a.highlights/100,0,.16)});else if(a.highlights<0)push(f.BlendColor,{color:'#000',mode:'multiply',alpha:clamp(Math.abs(a.highlights)/100,0,.12)});
    if(a.temperature)push(f.BlendColor,{color:a.temperature>0?'#ffd3ad':'#a8d8ff',mode:a.temperature>0?'screen':'multiply',alpha:clamp(Math.abs(a.temperature)/220,0,.18)});
    if(a.vignette)push(f.BlendColor,{color:'#000',mode:'multiply',alpha:clamp(a.vignette/180,0,.20)});
    if(a.grain&&f.Noise)push(f.Noise,{noise:Math.round(clamp(a.grain/100,0,1)*45)});
    if(effect==='grayscale')push(f.Saturation,{saturation:-1*inten});
    if(effect==='sepia')push(f.BlendColor,{color:'#9c6b42',mode:'color',alpha:.65*inten});
    if(effect==='invert'&&inten>.5)push(f.Invert,{});
    img.filters=filters;img.applyFilters();canvas().renderAll();
  };

  /* ---------- brush / eraser: stable controls + safer visual behavior ---------- */
  g.loadDrawToolbar=function(type='draw'){
    q('#secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">${type==='eraser'?'Eraser':'Brush'}</span><label class="lo-dock-control">Size <input id="brushSize" type="range" min="1" max="240" value="${g.manualBrushSize||12}" oninput="manualBrushSize=Number(this.value);document.getElementById('brushSizeNum').value=this.value;configureCanvasInteraction('${type}')"><input id="brushSizeNum" class="lo-dock-number" type="number" min="1" max="240" value="${g.manualBrushSize||12}" oninput="manualBrushSize=clamp(Number(this.value)||12,1,240);document.getElementById('brushSize').value=manualBrushSize;configureCanvasInteraction('${type}')"></label><label class="lo-dock-control">Opacity <input id="brushOpacity" type="range" min="1" max="100" value="${Math.round((g.manualBrushOpacity||1)*100)}" oninput="manualBrushOpacity=Number(this.value)/100;configureCanvasInteraction('${type}')"></label><label class="lo-dock-control">Hardness <input id="brushHardness" type="range" min="0" max="100" value="${Math.round((g.manualBrushHardness||1)*100)}" oninput="manualBrushHardness=Number(this.value)/100;configureCanvasInteraction('${type}')"></label><input type="color" value="${g.manualBrushColor||'#ffffff'}" onchange="manualBrushColor=this.value;configureCanvasInteraction('${type}')"></div>`;
  };

  /* ---------- alignment/distribution ---------- */
  g.alignActive=function(which){
    const c=canvas(),o=active();if(!c||!o)return;const d=docSize(),w=d.width,h=d.height,ow=o.getScaledWidth(),oh=o.getScaledHeight();
    if(which==='left')o.set({left:ow/2});if(which==='center')o.set({left:w/2});if(which==='right')o.set({left:w-ow/2});if(which==='top')o.set({top:oh/2});if(which==='middle')o.set({top:h/2});if(which==='bottom')o.set({top:h-oh/2});o.setCoords();c.renderAll();g.flushManualHistory?.('Align: '+which);
  };
  g.distributeSelected=function(axis){const c=canvas(),sel=c?.getActiveObjects?.()||[];if(!c||sel.length<3)return;sel.sort((a,b)=>(axis==='x'?a.left-b.left:a.top-b.top));const first=axis==='x'?sel[0].left:sel[0].top,last=axis==='x'?sel.at(-1).left:sel.at(-1).top,step=(last-first)/(sel.length-1);sel.forEach((o,i)=>o.set(axis==='x'?{left:first+step*i}:{top:first+step*i}));c.renderAll();g.flushManualHistory?.('Distribute '+axis);};

  /* ---------- transform / text improvements ---------- */
  g.setActiveSize=function(prop,value){const o=active();if(!o)return;const v=Math.max(1,num(value,1));if(prop==='width')o.scaleX=v/(o.width||1);else o.scaleY=v/(o.height||1);o.setCoords();canvas().renderAll();g.flushManualHistory?.('Resize '+prop);g.renderManualInspector?.();};
  g.changeTextSize=function(v){const o=active();if(!o||!['i-text','textbox','text'].includes(o.type))return;o.set('fontSize',clamp(num(v,50),6,600));canvas().renderAll();g.flushManualHistory?.('Text size');g.renderManualInspector?.();};

  /* ---------- inspector scrolling / theme polish ---------- */
  function syncTheme(){
    const dark=document.body.classList.contains('dark-mode');const app=q('.lo-editor-app');if(app)app.dataset.theme=dark?'dark':'light';
    qa('.lo-tool,.lo-dock-btn,.lo-icon-btn,.lo-mode-switch').forEach(el=>el.setAttribute('data-theme',dark?'dark':'light'));
  }
  g.syncLookoutManualTheme=syncTheme;

  /* ---------- canvas initialization hardening ---------- */
  function patchCanvasEvents(){
    const c=canvas();if(!c||c.__loV7Patched)return;c.__loV7Patched=true;
    /* Preserve original handlers for pan/picker paths while V7 owns crop. */
    g.__lookoutOriginalCanvasDown=null;g.__lookoutOriginalCanvasMove=null;g.__lookoutOriginalCanvasUp=null;
    c.off('mouse:down');c.off('mouse:move');c.off('mouse:up');
    c.on('mouse:down',g.handleManualCanvasDown);c.on('mouse:move',g.handleManualCanvasMove);c.on('mouse:up',g.handleManualCanvasUp);
    c.on('selection:created',()=>{g.renderManualInspector?.();g.updateManualWorkspaceState?.();});
    c.on('selection:updated',()=>{g.renderManualInspector?.();g.updateManualWorkspaceState?.();});
    c.on('selection:cleared',()=>{g.renderManualInspector?.();g.updateManualWorkspaceState?.();});
    c.on('object:modified',()=>{g.flushManualHistory?.('Object modified');g.renderManualInspector?.();g.updateManualWorkspaceState?.();});
  }

  /* Re-wrap setup after editor creation without relying on fragile mutation timing. */
  function afterOpen(){
    setTimeout(()=>{syncTheme();patchCanvasEvents();if(canvas()&&!objects().length&&!q('.lo-setup-card,.lo-setup-v8'))g.mountManualDocumentSetup?.();},30);
  }

  /* Ensure V7 custom properties survive save/history. */
  if(Array.isArray(g.MANUAL_CUSTOM_PROPS)){
    ['__loEffectIntensity','__loMaskType'].forEach(p=>{if(!g.MANUAL_CUSTOM_PROPS.includes(p))g.MANUAL_CUSTOM_PROPS.push(p);});
  }

  /* Theme observer */
  if(!g.__lookoutV7ThemeObserver){g.__lookoutV7ThemeObserver=new MutationObserver(syncTheme);g.__lookoutV7ThemeObserver.observe(document.body,{attributes:true,attributeFilter:['class','data-ui-style']});}

  /* Patch openManualEdit so the hardening pass always runs after the shell exists. */
  const oldOpen=g.openManualEdit;
  if(typeof oldOpen==='function'&&!g.__lookoutV7OpenPatched){
    g.__lookoutV7OpenPatched=true;
    g.openManualEdit=function(mode){oldOpen(mode);afterOpen();};
  }

  /* Keep setup from being remounted repeatedly. */
  const oldCreate=g.loCreateDocumentFromSetup;
  if(typeof oldCreate==='function'&&!g.__lookoutV7CreatePatched){
    g.__lookoutV7CreatePatched=true;
    g.loCreateDocumentFromSetup=function(place){oldCreate(place);setTimeout(()=>{ensureBackground();g.fitManualCanvas?.();syncTheme();},80);};
  }

  /* Make the existing effects tool render the richer panel. */
  const oldOpenTool=g.openToolPanel;
  if(typeof oldOpenTool==='function'&&!g.__lookoutV7ToolPatched){
    g.__lookoutV7ToolPatched=true;
    g.openToolPanel=function(type,el){g.__loV7CurrentTool=type;oldOpenTool(type,el);if(type==='effects')g.renderEffectsInspector?.();if(type==='mask')g.loadMaskToolbar?.();syncTheme();};
  }

  /* Initial pass when this file loads after manual-editor.js. */
  setTimeout(()=>{syncTheme();if(canvas())patchCanvasEvents();},50);
})();

/* V7.1 persistence + setup texture hardening */
(function(){
  const g=window,q=s=>document.querySelector(s);
  if(typeof g.serializeManualCanvas==='function'){
    g.serializeManualCanvas=function(){
      const c=g.editorCanvas;if(!c)return null;
      const props=['__loName','__loAdjustments','__loEffects','__loEffectIntensity','__loLocked','__loOriginalSrc','__loMaskType','__loTool','__loBaseWidth','__loBaseHeight','__loCrop','globalCompositeOperation'];
      return JSON.stringify(c.toJSON(props));
    };
  }
  g.saveManualProject=function(){
    if(!g.editorCanvas)return;
    let dm={}; try{dm=manualDocumentMeta;}catch(e){dm=g.manualDocumentMeta||{};} let ds={width:1200,height:800}; try{ds=manualDocumentSize;}catch(e){ds=g.manualDocumentSize||ds;} const data={name:q('#loProjectName')?.textContent||'Untitled Project',width:ds.width||1200,height:ds.height||800,document:dm,canvas:JSON.parse(g.serializeManualCanvas?.()||'{}'),savedAt:new Date().toISOString()};
    localStorage.setItem('lookoutManualProject',JSON.stringify(data));g.setManualStatus?.('Project saved locally');
  };
  g.loBuiltInTexture=function(kind){
    const setup=q('.lo-setup-card');
    if(setup&&g.__loSetupSelecting&&!g.editorCanvas?.getObjects?.().length){
      const map={paper:'#f3f0e8',canvas:'#e8e5dc',grid:'#eef3f6',dots:'#f4f4f4',diagonal:'#eef1f4',noise:'#eeeeee'};
      const m=meta();m.backgroundType='texture';m.textureSrc='builtin:'+kind;setup.dataset.texture=kind;
      const sw=setup.querySelectorAll('.lo-background-mode-grid button');sw.forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase()===kind));
      g.setManualStatus?.('Texture selected: '+kind);return;
    }
    const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#f1f2f3';x.fillRect(0,0,128,128);
    if(kind==='paper'){x.fillStyle='rgba(80,90,100,.07)';for(let i=0;i<1500;i++)x.fillRect(Math.random()*128,Math.random()*128,1,1);}
    if(kind==='canvas'){x.strokeStyle='rgba(60,70,80,.12)';for(let i=0;i<128;i+=6){x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke();}}
    if(kind==='grid'){x.strokeStyle='rgba(60,90,110,.14)';for(let i=0;i<=128;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke();}}
    if(kind==='dots'){x.fillStyle='rgba(60,80,100,.2)';for(let y=8;y<128;y+=20)for(let xx=8;xx<128;xx+=20){x.beginPath();x.arc(xx,y,1.6,0,Math.PI*2);x.fill();}}
    if(kind==='diagonal'){x.strokeStyle='rgba(60,80,100,.11)';x.lineWidth=5;for(let i=-128;i<256;i+=22){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.stroke();}}
    if(kind==='noise'){const d=x.getImageData(0,0,128,128);for(let i=0;i<d.data.length;i+=4){const n=225+Math.floor(Math.random()*25);d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255;}x.putImageData(d,0,0);}
    const bg=typeof g.loEnsureBackground==='function'?g.loEnsureBackground():null;if(bg){bg.set('fill',new fabric.Pattern({source:c,repeat:'repeat'}));meta().backgroundType='texture';meta().textureSrc='builtin:'+kind;g.editorCanvas.renderAll();g.flushManualHistory?.('Background texture');}
  };
  /* Add a small public helper used by the setup code. */
  g.ensureLookoutBackground=function(){
    if(typeof g.loEnsureBackground==='function')return g.loEnsureBackground();
    return null;
  };
})();

/* V7.2 — full background inspector after the document exists */
(function(){
  const g=window,q=s=>document.querySelector(s);
  g.renderBackgroundInspectorV5=function(){
    const m=(()=>{try{return manualDocumentMeta}catch(e){return g.manualDocumentMeta||{backgroundColor:'#fff',backgroundType:'solid',gradientA:'#fff',gradientB:'#dbeafe'}}})();
    const presets=['#ffffff','#000000','#f3f4f6','#111827','#0f172a','#1e3a8a','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#e5e7eb','#94a3b8','#334155','#fde68a'];
    g.renderSimpleInspector?.('Background','Editable document background — solid, gradient or texture',`
      <div class="lo-background-tabs"><button class="${m.backgroundType==='solid'?'active':''}" onclick="setManualBackgroundColorV5('${m.backgroundColor&&m.backgroundColor[0]==='#'?m.backgroundColor:'#ffffff'}')">Solid</button><button onclick="applyManualGradientBackgroundV5('#ffffff','#dbeafe',false)">Gradient</button><button onclick="loBuiltInTexture('paper')">Texture</button></div>
      <div class="lo-section-title">Solid colors</div><div class="lo-background-presets">${presets.map(c=>`<button style="background:${c}" title="${c}" onclick="setManualBackgroundColorV5('${c}')"></button>`).join('')}</div>
      <div class="lo-background-custom"><label>Custom HEX</label><input id="manualBackgroundColorInspector" type="color" value="${/^#[0-9a-f]{6}$/i.test(m.backgroundColor||'')?m.backgroundColor:'#ffffff'}" onchange="setManualBackgroundColorV5(this.value)"><input type="text" value="${/^#[0-9a-f]{6}$/i.test(m.backgroundColor||'')?m.backgroundColor:'#ffffff'}" maxlength="7" onkeydown="if(event.key==='Enter')setManualBackgroundColorV5(this.value)"></div>
      <div class="lo-section-title">Gradient</div><div class="lo-bg-gradient-controls visible"><label>Start <input id="loInspectorGradA" type="color" value="${m.gradientA||'#ffffff'}"></label><label>End <input id="loInspectorGradB" type="color" value="${m.gradientB||'#dbeafe'}"></label><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(loInspectorGradA.value,loInspectorGradB.value,false)">Linear</button><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(loInspectorGradA.value,loInspectorGradB.value,true)">Radial</button></div>
      <div class="lo-section-title">Texture</div><div class="lo-background-mode-grid">${['paper','canvas','grid','dots','diagonal','noise'].map(k=>`<button onclick="loBuiltInTexture('${k}')">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div><button class="lo-wide-action" onclick="loTextureUpload()"><i class="fa-solid fa-upload"></i> Upload custom texture</button>
      <button class="lo-wide-action" onclick="clearManualBackground()"><i class="fa-solid fa-border-none"></i> Transparent</button>
      <div class="lo-inspector-hint"><i class="fa-solid fa-lock"></i><span>Background is kept separate from image layers, so changing it never damages the artwork.</span></div>`);
  };
  g.loadBackgroundToolbarV5=function(){
    q('#secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Background</span><button class="lo-dock-btn" onclick="setManualBackgroundColorV5('#ffffff')">Solid</button><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5('#ffffff','#dbeafe',false)">Gradient</button><button class="lo-dock-btn" onclick="loBuiltInTexture('paper')">Texture</button><button class="lo-dock-btn" onclick="loTextureUpload()">Upload texture</button></div>`;
    g.renderBackgroundInspectorV5();
  };
  g.loadBackgroundToolbar=function(){g.loadBackgroundToolbarV5();};g.renderBackgroundInspector=function(){g.renderBackgroundInspectorV5();};
})();

/* V7.3 — custom texture upload respects pre-document setup */
(function(){
  const g=window;
  g.loTextureUpload=function(){
    const input=document.createElement('input');input.type='file';input.accept='image/*';
    input.onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{
      let m;try{m=manualDocumentMeta}catch(err){m=g.manualDocumentMeta||(g.manualDocumentMeta={});}
      m.backgroundType='texture';m.textureSrc=ev.target.result;
      if(g.__loSetupSelecting){g.setManualStatus?.('Custom texture selected');return;}
      g.loApplyTexture?.(ev.target.result);
    };reader.readAsDataURL(file);};input.click();
  };
})();

/* V7.4 — selection region becomes a real editable image mask */
(function(){
  const g=window,q=s=>document.querySelector(s),c=()=>g.editorCanvas;
  g.createSelectionRect=function(){
    const canvas=c();if(!canvas)return;
    canvas.getObjects().filter(o=>o.__loTool==='selection').forEach(o=>canvas.remove(o));
    const r=new fabric.Rect({left:canvas.getWidth()/canvas.getZoom()/2-150,top:canvas.getHeight()/canvas.getZoom()/2-110,width:300,height:220,originX:'left',originY:'top',fill:'rgba(21,155,196,.08)',stroke:'#159bc4',strokeWidth:2,strokeDashArray:[8,6],excludeFromExport:true});
    r.__loTool='selection';r.__loName='Selection';r.__loInverted=false;canvas.add(r);canvas.setActiveObject(r);canvas.renderAll();g.flushManualHistory?.('Selection region');g.renderManualInspector?.();
  };
  g.invertSelectionRegion=function(){
    const r=c()?.getActiveObject();if(!r||r.__loTool!=='selection')return;r.__loInverted=!r.__loInverted;r.set({fill:r.__loInverted?'rgba(239,68,68,.08)':'rgba(21,155,196,.08)'});c().renderAll();g.flushManualHistory?.('Invert selection region');g.setManualStatus?.(r.__loInverted?'Selection inverted':'Selection normal');
  };
  g.applySelectionAsMask=function(){
    const r=c()?.getActiveObject(),img=c()?.getObjects().find(o=>o.type==='image'&&o!==r)||c()?.getActiveObject();if(!r||r.__loTool!=='selection'||!img)return;
    const br=r.getBoundingRect(true,true),pts=[new fabric.Point(br.left,br.top),new fabric.Point(br.left+br.width,br.top),new fabric.Point(br.left+br.width,br.top+br.height),new fabric.Point(br.left,br.top+br.height)];
    const local=pts.map(p=>img.toLocalPoint(p,'center','center'));const xs=local.map(p=>p.x),ys=local.map(p=>p.y),w=Math.max(2,Math.abs(Math.max(...xs)-Math.min(...xs))),h=Math.max(2,Math.abs(Math.max(...ys)-Math.min(...ys)));
    const cp=new fabric.Rect({left:(Math.min(...xs)+Math.max(...xs))/2,top:(Math.min(...ys)+Math.max(...ys))/2,width:w,height:h,originX:'center',originY:'center'});cp.inverted=!!r.__loInverted;img.clipPath=cp;img.__loMaskType=r.__loInverted?'selection-inverted':'selection';c().remove(r);c().setActiveObject(img);c().renderAll();g.flushManualHistory?.('Selection mask');g.renderManualInspector?.();g.setManualStatus('Selection converted to an editable image mask');
  };
  g.loadSelectionToolbar=function(){q('#secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Select Area</span><button class="lo-dock-btn" onclick="createSelectionRect()">New</button><button class="lo-dock-btn" onclick="invertSelectionRegion()">Invert</button><button class="lo-dock-btn" onclick="applySelectionAsMask()">Apply to image</button><button class="lo-dock-btn" onclick="clearSelectionRegion()">Clear</button></div>`;g.renderSimpleInspector?.('Select Area','Create a region and convert it into a non-destructive image mask',`<div class="lo-option-grid"><button onclick="createSelectionRect()">New rectangle</button><button onclick="invertSelectionRegion()">Invert</button><button onclick="applySelectionAsMask()">Apply to image</button><button onclick="clearSelectionRegion()">Clear</button></div>`);};
})();
