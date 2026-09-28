/* =====================================================
   LOOKOUT MANUAL EDITOR — PROFESSIONAL EDITOR CORE
   Fabric.js 5.x compatible.
   - Non-destructive image adjustments per image layer
   - Stable controls (no DOM replacement while dragging)
   - Undo/redo snapshots
   - Layers, transforms, typography, drawing, shapes, masks
   - Keyboard shortcuts, zoom/pan, grid/snap, save/export
   ===================================================== */

let editorCanvas = null;
let manualImageInput = null;
let manualHistoryTimer = null;
let manualRestoringHistory = false;
let manualHistory = [];
let manualHistoryIndex = -1;
let manualGridVisible = false;
let manualSnapEnabled = true;
let manualInspectorCollapsed = false;
let manualCurrentTool = 'select';
let manualBrushMode = 'brush';
let manualBrushColor = '#ffffff';
let manualBrushSize = 12;
let manualBrushOpacity = 1;
let manualBrushHardness = 1;
let manualDocumentSize = { width: 1200, height: 800 };
let manualPanning = false;
let manualPanLast = null;
let manualCropRatio = 'free';
let manualCropDragging = false;
let manualCropStart = null;
let manualCropBox = null;
let manualCropTarget = null;

const MANUAL_HISTORY_LIMIT = 50;
const MANUAL_CUSTOM_PROPS = [
  '__loName','__loAdjustments','__loEffects','__loLocked','__loOriginalSrc',
  '__loMaskType','__loTool','__loBaseWidth','__loBaseHeight','__loCrop','globalCompositeOperation'
];

const DEFAULT_ADJUSTMENTS = Object.freeze({
  brightness: 0, contrast: 0, exposure: 0, saturation: 0, hue: 0,
  temperature: 0, tintAmount: 0, tint: '#ffffff',
  highlights: 0, shadows: 0, sharpness: 0, blur: 0,
  vignette: 0, grain: 0
});

function cloneAdjustments(a){ return Object.assign({}, DEFAULT_ADJUSTMENTS, a || {}); }
function activeObject(){ return editorCanvas?.getActiveObject() || null; }
function activeImage(){ const o=activeObject(); return o?.type === 'image' ? o : null; }
function activeText(){ const o=activeObject(); return o && ['i-text','textbox','text'].includes(o.type) ? o : null; }
function canvasObjects(){ return editorCanvas ? editorCanvas.getObjects() : []; }
function safeNum(v,f=0){ const n=Number(v); return Number.isFinite(n)?n:f; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function esc(v){ return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- sidebar utilities ---------- */
function mountManualSidebarUtilities(){
  const sidebar=document.querySelector('.sidebar'); if(!sidebar) return;
  let utilities=document.getElementById('manualSidebarUtilities');
  if(!utilities){
    utilities=document.createElement('div'); utilities.id='manualSidebarUtilities'; utilities.className='manual-sidebar-utilities';
    utilities.innerHTML=`
      <button class="manual-sidebar-util" type="button" title="Light / Dark" onclick="toggleTheme();updateManualSidebarControls()"><i id="manualThemeIcon" class="fa-solid fa-moon"></i><span>Theme</span></button>
      <button class="manual-sidebar-util" type="button" title="LookOut UI style" onclick="toggleUIStyle();updateManualSidebarControls()"><i id="manualStyleIcon" class="fa-solid fa-sliders"></i><span id="manualStyleText">Pro</span></button>
      <button class="manual-sidebar-util" type="button" data-manual-action="quick" onclick="toggleManualSidebarPanel('quick',this)"><i class="fa-solid fa-bolt"></i><span>Quick</span></button>
      <button class="manual-sidebar-util" type="button" data-manual-action="explore" onclick="toggleManualSidebarPanel('explore',this)"><i class="fa-solid fa-grip"></i><span>Explore</span></button>
      <div class="manual-sidebar-popover" id="manualSidebarPopover" aria-hidden="true"></div>`;
    const bottom=sidebar.querySelector('.bottom-icons');
    if(bottom){ sidebar.insertBefore(utilities,bottom); }
    else sidebar.appendChild(utilities);
  }
  utilities.hidden=false;
  document.getElementById('themeToggle')?.classList.add('manual-control-hidden');
  document.getElementById('uiStyleToggle')?.classList.add('manual-control-hidden');
  updateManualSidebarControls();
}
function updateManualSidebarControls(){
  const ti=document.getElementById('manualThemeIcon'), si=document.getElementById('manualStyleIcon'), st=document.getElementById('manualStyleText');
  if(ti) ti.className=document.body.classList.contains('dark-mode')?'fa-solid fa-sun':'fa-solid fa-moon';
  if(si) si.className=document.body.classList.contains('professional-mode')?'fa-solid fa-layer-group':'fa-solid fa-sliders';
  if(st) st.textContent=document.body.classList.contains('professional-mode')?'Glass':'Pro';
}
function positionManualSidebarPopover(anchor,pop){
  if(!anchor||!pop)return; const r=anchor.getBoundingClientRect(); const w=Math.min(290,Math.max(230,pop.offsetWidth||250));
  let left=r.right+10, top=r.top; if(left+w>innerWidth-10)left=Math.max(10,r.left-w-10); if(top+(pop.offsetHeight||180)>innerHeight-10)top=Math.max(10,innerHeight-(pop.offsetHeight||180)-10);
  Object.assign(pop.style,{left:left+'px',top:top+'px',bottom:'auto'});
}
function toggleManualSidebarPanel(type,anchor){
  const pop=document.getElementById('manualSidebarPopover'); if(!pop)return;
  if(pop.dataset.type===type&&!pop.hidden){ closeManualSidebarPanel(); return; }
  pop.dataset.type=type; pop.hidden=false; pop.setAttribute('aria-hidden','false');
  pop.innerHTML=type==='quick'?`<div class="manual-popover-title"><strong>Quick Actions</strong><span>Editor shortcuts</span></div><div class="manual-popover-grid">
    <button type="button" onclick="triggerManualImageUpload();closeManualSidebarPanel()"><i class="fa-solid fa-image"></i><span>Place Image</span></button>
    <button type="button" onclick="addText();closeManualSidebarPanel()"><i class="fa-solid fa-font"></i><span>Add Text</span></button>
    <button type="button" onclick="saveManualProject();closeManualSidebarPanel()"><i class="fa-solid fa-floppy-disk"></i><span>Save Project</span></button>
    <button type="button" onclick="downloadManualEdit();closeManualSidebarPanel()"><i class="fa-solid fa-download"></i><span>Export</span></button>
    <button type="button" onclick="editorCanvas?.undo?.();closeManualSidebarPanel()"><i class="fa-solid fa-rotate-left"></i><span>Undo</span></button>
    <button type="button" onclick="editorCanvas?.redo?.();closeManualSidebarPanel()"><i class="fa-solid fa-rotate-right"></i><span>Redo</span></button>
  </div>`:`<div class="manual-popover-title"><strong>Explore Features</strong><span>LookOut tools</span></div><div class="manual-popover-links">
    <button type="button" onclick="openToolPanel('adjust');closeManualSidebarPanel()"><i class="fa-solid fa-sliders"></i><span>Adjustments</span><b>→</b></button>
    <button type="button" onclick="openToolPanel('effects');closeManualSidebarPanel()"><i class="fa-solid fa-sparkles"></i><span>Effects</span><b>→</b></button>
    <button type="button" onclick="openToolPanel('layers');closeManualSidebarPanel()"><i class="fa-solid fa-layer-group"></i><span>Layers</span><b>→</b></button>
    <button type="button" onclick="window.LookOutOpenFeatureStudio?.();closeManualSidebarPanel()"><i class="fa-solid fa-flask"></i><span>Feature Studio</span><b>→</b></button>
  </div>`;
  requestAnimationFrame(()=>positionManualSidebarPopover(anchor||document.querySelector(`[data-manual-action="${type}"]`),pop));
}
function closeManualSidebarPanel(){ const p=document.getElementById('manualSidebarPopover'); if(p){p.hidden=true;p.dataset.type='';p.setAttribute('aria-hidden','true');} }
function restoreManualSidebarUtilities(){
  closeManualSidebarPanel(); document.getElementById('manualSidebarUtilities')?.remove(); document.body.classList.remove('manual-editor-active');
  document.getElementById('themeToggle')?.classList.remove('manual-control-hidden'); document.getElementById('uiStyleToggle')?.classList.remove('manual-control-hidden');
}
function openManualAssistant(prefill=''){ if(window.LookOutRAG?.open)window.LookOutRAG.open(prefill); else alert('AI Assistant is still loading.'); }

document.addEventListener('click',e=>{ const p=document.getElementById('manualSidebarPopover'); if(p&&!p.hidden&&!e.target.closest('#manualSidebarPopover,.manual-sidebar-util'))closeManualSidebarPanel(); },true);
window.addEventListener('resize',()=>{const p=document.getElementById('manualSidebarPopover');if(p&&!p.hidden)positionManualSidebarPopover(document.querySelector(`[data-manual-action="${p.dataset.type}"]`),p);});

/* ---------- page shell ---------- */
function openManualEdit(mode='simple'){
  window.setWorkspacePageMode?.(); moveIndicator?.(document.getElementById('workspaceIcon'));
  document.querySelector('.sidebar')?.classList.remove('hidden'); document.querySelector('.main')?.classList.remove('fullscreen');
  if(typeof mainContent==='undefined') return;
  mainContent.classList.add('manual-editor-host'); document.body.classList.add('manual-editor-active'); mountManualSidebarUtilities(); mainContent.classList.remove('home-redesign');
  const advanced=mode==='advanced';
  mainContent.innerHTML=`
  <div class="lo-editor-app ${advanced?'is-advanced':'is-simple'}" id="manualWorkspaceShell">
    <header class="lo-editor-topbar">
      <div class="lo-brand-mini"><span class="lo-brand-symbol">L</span><div class="lo-brand-copy"><strong>LOOKOUT</strong><span>Manual Edit</span></div></div>
      <button class="lo-project-chip lo-project-name-btn" onclick="renameManualProject()"><i class="fa-regular fa-image"></i><span id="loProjectName">Untitled Project</span><small id="loTopLayerCount">0 layers</small></button>
      <div class="lo-top-actions">
        <button class="lo-icon-btn" title="Undo (Ctrl+Z)" onclick="editorCanvas?.undo?.()"><i class="fa-solid fa-rotate-left"></i></button>
        <button class="lo-icon-btn" title="Redo (Ctrl+Shift+Z)" onclick="editorCanvas?.redo?.()"><i class="fa-solid fa-rotate-right"></i></button>
        <span class="lo-top-divider"></span>
        <button class="lo-mode-switch" onclick="openManualEdit('${advanced?'simple':'advanced'}')"><i class="fa-solid ${advanced?'fa-feather-pointed':'fa-sliders'}"></i>${advanced?'Simple':'Advanced'}</button>
        <button class="lo-save-btn" onclick="saveManualProject()"><i class="fa-solid fa-floppy-disk"></i> Save</button>
        <button class="lo-create-btn" onclick="window.LookOutOpenFeatureStudio?.()"><i class="fa-solid fa-flask"></i><span>Feature Studio</span></button>
        <button class="lo-export-btn" onclick="downloadManualEdit()">Export <i class="fa-solid fa-arrow-up-right-from-square"></i></button>
      </div>
    </header>
    <div class="lo-contextbar">
      <div class="lo-context-left"><span class="lo-context-badge">${advanced?'ADVANCED WORKSPACE':'QUICK WORKSPACE'}</span><span class="lo-context-muted">RGBA / 8-bit</span><span class="lo-context-muted">•</span><span class="lo-context-muted" id="loCanvasInfo">0 layers</span></div>
      <div class="lo-context-tools">
        <button onclick="openToolPanel('adjust')"><i class="fa-solid fa-wand-magic-sparkles"></i> Adjust</button>
        <button onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i> Place</button>
        <button onclick="addText()"><i class="fa-solid fa-font"></i> Type</button>
        <button onclick="openToolPanel('effects')"><i class="fa-solid fa-sparkles"></i> Effects</button>
        <button onclick="window.LookOutOpenFeatureStudio?.()"><i class="fa-solid fa-flask"></i> Invent</button>
      </div>
    </div>
    <main class="lo-editor-body">
      <aside class="lo-tools-panel">
        <div class="lo-panel-label">EDIT</div>
        <div class="lo-tool-scroll">
          <div class="lo-tool-group"><span class="lo-group-label">NAVIGATE</span>
            <button class="lo-tool active" data-tool="select" onclick="openToolPanel('select',this)"><i class="fa-solid fa-arrow-pointer"></i><span>Select</span></button>
            <button class="lo-tool" data-tool="pan" onclick="openToolPanel('pan',this)"><i class="fa-solid fa-hand"></i><span>Pan</span></button>
            <button class="lo-tool" data-tool="zoom" onclick="openToolPanel('zoom',this)"><i class="fa-solid fa-magnifying-glass"></i><span>Zoom</span></button>
          </div>
          <div class="lo-tool-group"><span class="lo-group-label">CREATE</span>
            <button class="lo-tool" data-tool="crop" onclick="openToolPanel('crop',this)"><i class="fa-solid fa-crop-simple"></i><span>Crop</span></button>
            <button class="lo-tool" data-tool="text" onclick="openToolPanel('text',this)"><i class="fa-solid fa-font"></i><span>Type</span></button>
            <button class="lo-tool" data-tool="addimage" onclick="openToolPanel('addimage',this)"><i class="fa-regular fa-image"></i><span>Image</span></button>
            <button class="lo-tool" data-tool="draw" onclick="openToolPanel('draw',this)"><i class="fa-solid fa-paintbrush"></i><span>Brush</span></button>
            <button class="lo-tool" data-tool="eraser" onclick="openToolPanel('eraser',this)"><i class="fa-solid fa-eraser"></i><span>Eraser</span></button>
            <button class="lo-tool" data-tool="shape" onclick="openToolPanel('shape',this)"><i class="fa-regular fa-square"></i><span>Shape</span></button>
            <button class="lo-tool" data-tool="background" onclick="openToolPanel('background',this)"><i class="fa-solid fa-fill"></i><span>Background</span></button>
            <button class="lo-tool" data-tool="gradient" onclick="openToolPanel('gradient',this)"><i class="fa-solid fa-fill-drip"></i><span>Gradient</span></button>
            <button class="lo-tool" data-tool="picker" onclick="openToolPanel('picker',this)"><i class="fa-solid fa-eye-dropper"></i><span>Picker</span></button>
          </div>
          <div class="lo-tool-group"><span class="lo-group-label">ENHANCE</span>
            <button class="lo-tool" data-tool="adjust" onclick="openToolPanel('adjust',this)"><i class="fa-solid fa-sliders"></i><span>Adjust</span></button>
            <button class="lo-tool" data-tool="effects" onclick="openToolPanel('effects',this)"><i class="fa-solid fa-sparkles"></i><span>Effects</span></button>
            <button class="lo-tool" data-tool="color" onclick="openToolPanel('color',this)"><i class="fa-solid fa-circle-half-stroke"></i><span>Color</span></button>
            <button class="lo-tool" data-tool="retouch" onclick="openToolPanel('retouch',this)"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Retouch</span></button>
          </div>
          ${advanced?`<div class="lo-tool-group"><span class="lo-group-label">COMPOSE</span>
            <button class="lo-tool" data-tool="mask" onclick="openToolPanel('mask',this)"><i class="fa-solid fa-shapes"></i><span>Mask</span></button>
            <button class="lo-tool" data-tool="transform" onclick="openToolPanel('transform',this)"><i class="fa-solid fa-expand"></i><span>Transform</span></button>
            <button class="lo-tool" data-tool="layers" onclick="openToolPanel('layers',this)"><i class="fa-solid fa-layer-group"></i><span>Layers</span></button>
            <button class="lo-tool" data-tool="align" onclick="openToolPanel('align',this)"><i class="fa-solid fa-align-center"></i><span>Align</span></button>
            <button class="lo-tool" data-tool="selection" onclick="openToolPanel('selection',this)"><i class="fa-solid fa-object-group"></i><span>Select Area</span></button>
          </div>`:''}
        </div>
        <div class="lo-tool-bottom"><button class="lo-tool lo-tool-accent" onclick="window.LookOutOpenFeatureStudio?.()"><i class="fa-solid fa-flask"></i><span>Invent</span></button><button class="lo-tool" onclick="openSavedProjects()"><i class="fa-solid fa-folder-open"></i><span>Library</span></button></div>
      </aside>
      <section class="lo-canvas-workspace">
        <div class="lo-workspace-toolbar"><div class="lo-tool-context" id="loToolContext"><strong>Selection</strong><span>Select an object or place an image to begin</span></div>
          <div class="lo-view-controls"><button onclick="setManualCanvasZoom(.5)">50%</button><button onclick="setManualCanvasZoom(1)">100%</button><button onclick="fitManualCanvas()"><i class="fa-solid fa-expand"></i> Fit</button><span class="lo-view-divider"></span><button title="Grid" onclick="toggleManualGrid()"><i class="fa-solid fa-table-cells-large"></i></button><button id="loSnapBtn" class="is-on" title="Snap" onclick="toggleManualSnap()"><i class="fa-solid fa-magnet"></i></button></div>
        </div>
        <div class="lo-canvas-stage" id="manualCanvasStage"><div class="lo-stage-ruler lo-ruler-top"></div><div class="lo-stage-ruler lo-ruler-left"></div>
          <div class="lo-canvas-frame" id="manualCanvasFrame"><canvas id="editorCanvas"></canvas><div class="lo-empty-state" id="loEmptyState"><div class="lo-empty-icon"><i class="fa-regular fa-image"></i></div><div class="lo-empty-copy"><span>LOOKOUT CANVAS</span><h3>Start creating</h3><p>Place an image, add type, or open a saved project.</p></div><div><button class="lo-primary-soft" onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i> Place image</button><button class="lo-secondary-soft" onclick="addText()"><i class="fa-solid fa-font"></i> Add text</button></div></div></div>
        </div>
        <div class="lo-bottom-dock" id="secondaryToolbar"><div class="lo-dock-inner"><span class="lo-dock-title">Context</span><span class="lo-dock-note">Tool controls will appear here.</span></div></div>
        <div class="lo-statusbar"><span><i class="fa-solid fa-circle lo-ready-dot"></i> Ready</span><span id="loSelectionStatus">No selection</span><span id="loStatusMessage">Changes are non-destructive</span><div class="lo-status-spacer"></div><span>Zoom <strong id="loZoomLabel">Fit</strong></span><button onclick="fitManualCanvas()"><i class="fa-solid fa-expand"></i></button></div>
      </section>
      <aside class="lo-inspector" id="manualInspector"><div class="lo-inspector-head"><div><span>INSPECTOR</span><strong id="loInspectorTitle">Properties</strong></div><button title="Collapse inspector" onclick="toggleManualInspector()"><i class="fa-solid fa-ellipsis"></i></button></div>
        <div class="lo-inspector-tabs"><button class="active" onclick="switchInspector('properties',this)">Properties</button><button onclick="switchInspector('layers',this)">Layers</button><button onclick="switchInspector('history',this)">History</button></div>
        <div id="loInspectorContent" class="lo-inspector-content"></div>
      </aside>
    </main>
  </div>`;
  setupProfessionalEditor(); openToolPanel('select',document.querySelector('.lo-tool.active')); renderManualInspector(); updateManualWorkspaceState();
}

/* ---------- zoom / view ---------- */
function setManualCanvasZoom(scale){ if(!editorCanvas)return; const s=clamp(safeNum(scale,1),.1,4); editorCanvas.setZoom(s); editorCanvas.renderAll(); document.getElementById('loZoomLabel').textContent=Math.round(s*100)+'%'; }
function fitManualCanvas(){
  if(!editorCanvas)return; const frame=document.getElementById('manualCanvasFrame'); if(!frame)return;
  const pad=24, w=Math.max(240,editorCanvas.getWidth()-pad), h=Math.max(200,editorCanvas.getHeight()-pad); const s=clamp(Math.min(w/manualDocumentSize.width,h/manualDocumentSize.height),.1,2);
  editorCanvas.setZoom(s);
  editorCanvas.setViewportTransform([s,0,0,s,(editorCanvas.getWidth()-manualDocumentSize.width*s)/2,(editorCanvas.getHeight()-manualDocumentSize.height*s)/2]);
  editorCanvas.renderAll(); document.getElementById('loZoomLabel').textContent='Fit';
}
function toggleManualGrid(){ manualGridVisible=!manualGridVisible; document.getElementById('manualCanvasStage')?.classList.toggle('show-grid',manualGridVisible); }
function toggleManualSnap(){ manualSnapEnabled=!manualSnapEnabled; document.getElementById('loSnapBtn')?.classList.toggle('is-on',manualSnapEnabled); }
function toggleManualInspector(){ manualInspectorCollapsed=!manualInspectorCollapsed; document.getElementById('manualInspector')?.classList.toggle('is-collapsed',manualInspectorCollapsed); }

/* ---------- history ---------- */
function serializeManualCanvas(){
  if(!editorCanvas)return null;
  return JSON.stringify(editorCanvas.toJSON(MANUAL_CUSTOM_PROPS));
}
function pushManualHistory(label='Change'){
  if(manualRestoringHistory||!editorCanvas)return;
  clearTimeout(manualHistoryTimer);
  manualHistoryTimer=setTimeout(()=>{
    const snap=serializeManualCanvas(); if(!snap)return;
    if(manualHistoryIndex>=0&&manualHistory[manualHistoryIndex]===snap)return;
    manualHistory=manualHistory.slice(0,manualHistoryIndex+1); manualHistory.push(snap); if(manualHistory.length>MANUAL_HISTORY_LIMIT)manualHistory.shift(); manualHistoryIndex=manualHistory.length-1;
    updateHistoryInspector(label); updateManualWorkspaceState();
  },80);
}
function flushManualHistory(label){ clearTimeout(manualHistoryTimer); manualHistoryTimer=null; if(manualRestoringHistory)return; const snap=serializeManualCanvas(); if(!snap)return; if(manualHistory[manualHistoryIndex]===snap)return; manualHistory=manualHistory.slice(0,manualHistoryIndex+1); manualHistory.push(snap); if(manualHistory.length>MANUAL_HISTORY_LIMIT)manualHistory.shift(); manualHistoryIndex=manualHistory.length-1; updateHistoryInspector(label); }
function restoreManualHistory(index){
  if(index<0||index>=manualHistory.length||!editorCanvas)return; manualRestoringHistory=true; const json=manualHistory[index]; editorCanvas.loadFromJSON(json,()=>{ manualHistoryIndex=index; editorCanvas.renderAll(); manualRestoringHistory=false; renderManualInspector(); renderLayerInspector(); updateManualWorkspaceState(); });
}
function undoManual(){ if(manualHistoryIndex<=0)return; flushManualHistory('Change'); restoreManualHistory(manualHistoryIndex-1); }
function redoManual(){ if(manualHistoryIndex>=manualHistory.length-1)return; restoreManualHistory(manualHistoryIndex+1); }
function updateHistoryInspector(label){ const el=document.querySelector('.lo-history-current'); if(el)el.textContent=label||'Current document'; }
function switchInspector(panel,btn){ document.querySelectorAll('.lo-inspector-tabs button').forEach(b=>b.classList.remove('active')); btn?.classList.add('active'); if(panel==='layers')renderLayerInspector(); else if(panel==='history')renderHistoryInspector(); else renderManualInspector(); }
function renderHistoryInspector(){
  const box=document.getElementById('loInspectorContent'); if(!box)return;
  box.innerHTML=`<div class="lo-history-head"><strong>History</strong><span>${Math.max(0,manualHistory.length-1)} recorded changes</span></div><div class="lo-history-list">${manualHistory.map((_,i)=>`<button class="${i===manualHistoryIndex?'active':''}" onclick="restoreManualHistory(${i})"><i class="fa-${i===manualHistoryIndex?'solid':'regular'} fa-circle"></i><span>${i===manualHistoryIndex?'Current document':'Edit '+i}</span></button>`).reverse().join('')||'<div class="lo-no-layers">No history yet</div>'}</div><button class="lo-wide-action" onclick="undoManual()"><i class="fa-solid fa-rotate-left"></i> Undo</button><button class="lo-wide-action" onclick="redoManual()"><i class="fa-solid fa-rotate-right"></i> Redo</button>`;
}

/* ---------- properties / layers ---------- */
function getObjectName(o){ return o?.__loName || (o?.type==='image'?'Image':(['i-text','textbox','text'].includes(o?.type)?(o.text||'Text'):'Shape')); }
function setActiveProp(prop,value){ const o=activeObject(); if(!o)return; const numeric=['left','top','angle','opacity','scaleX','scaleY','skewX','skewY','fontSize','charSpacing','lineHeight','strokeWidth']; o.set(prop,numeric.includes(prop)?safeNum(value):value); editorCanvas.renderAll(); flushManualHistory('Property change'); renderManualInspector(); }
function setActiveSize(prop,value){ const o=activeObject(); if(!o)return; const v=Math.max(1,safeNum(value,1)); const base=Math.max(1,o[prop]||1); o.set(prop==='width'?'scaleX':'scaleY',v/base); o.setCoords(); editorCanvas.renderAll(); flushManualHistory('Resize'); renderManualInspector(); }
function duplicateActiveObject(){ const o=activeObject(); if(!o)return; o.clone(clone=>{clone.set({left:(o.left||0)+24,top:(o.top||0)+24}); clone.__loName=getObjectName(o)+' copy'; editorCanvas.add(clone); editorCanvas.setActiveObject(clone); editorCanvas.renderAll(); flushManualHistory('Duplicate'); renderLayerInspector(); updateManualWorkspaceState();}); }
function deleteActiveLayer(){ const o=activeObject(); if(!o)return; editorCanvas.remove(o); editorCanvas.discardActiveObject(); editorCanvas.renderAll(); flushManualHistory('Delete'); renderManualInspector(); renderLayerInspector(); updateManualWorkspaceState(); }
function selectLayerByIndex(i){ const o=editorCanvas?.getObjects()[i]; if(!o)return; editorCanvas.setActiveObject(o); editorCanvas.renderAll(); renderManualInspector(); updateManualWorkspaceState(); }
function renameActiveLayer(){ const o=activeObject();if(!o)return;const n=prompt('Layer name',getObjectName(o));if(n!==null){o.__loName=n.trim()||getObjectName(o);flushManualHistory('Rename layer');renderLayerInspector();renderManualInspector();} }
function toggleLayerVisibility(i){const o=editorCanvas?.getObjects()[i];if(!o)return;o.visible=!o.visible;editorCanvas.renderAll();flushManualHistory('Visibility');renderLayerInspector();}
function toggleLayerLock(i){const o=editorCanvas?.getObjects()[i];if(!o)return;o.__loLocked=!o.__loLocked;o.set({selectable:!o.__loLocked,evented:!o.__loLocked});editorCanvas.renderAll();flushManualHistory('Lock layer');renderLayerInspector();}
function moveActiveLayer(dir){ const o=activeObject();if(!o)return; if(dir==='up')editorCanvas.bringForward(o); else if(dir==='down')editorCanvas.sendBackwards(o); else if(dir==='top')editorCanvas.bringToFront(o); else editorCanvas.sendToBack(o); editorCanvas.renderAll();flushManualHistory('Layer order');renderLayerInspector(); }
function renderLayerInspector(){
  const box=document.getElementById('loInspectorContent');if(!box)return;const items=canvasObjects();
  box.innerHTML=`<div class="lo-layer-header"><strong>Layers</strong><div><button title="Add image" onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i></button><button title="Add text" onclick="addText()"><i class="fa-solid fa-font"></i></button></div></div><div class="lo-layer-list">${items.slice().reverse().map((o,ri)=>{const idx=items.length-1-ri;return `<div class="lo-layer-item ${o===activeObject()?'selected':''}"><button class="lo-layer-main" onclick="selectLayerByIndex(${idx})"><i class="fa-solid ${o.type==='image'?'fa-image':o.type.includes('text')?'fa-font':o.type==='path'?'fa-paintbrush':'fa-square'}"></i><span>${esc(getObjectName(o)).slice(0,30)}</span></button><button onclick="toggleLayerVisibility(${idx})"><i class="fa-regular ${o.visible===false?'fa-eye-slash':'fa-eye'}"></i></button><button onclick="toggleLayerLock(${idx})"><i class="fa-solid ${o.__loLocked?'fa-lock':'fa-lock-open'}"></i></button></div>`}).join('')||'<div class="lo-no-layers">No layers yet</div>'}</div><div class="lo-layer-actions"><button onclick="moveActiveLayer('top')">Top</button><button onclick="moveActiveLayer('up')">Up</button><button onclick="moveActiveLayer('down')">Down</button><button onclick="moveActiveLayer('bottom')">Bottom</button><button onclick="renameActiveLayer()">Rename</button><button class="danger-soft" onclick="deleteActiveLayer()">Delete</button></div>`;
}
function updateManualWorkspaceState(){
  const o=activeObject(), count=canvasObjects().length, empty=document.getElementById('loEmptyState'); if(empty)empty.style.display=count?'none':'flex';
  const s=document.getElementById('loSelectionStatus');if(s)s.textContent=o?`Selected: ${getObjectName(o)}`:'No selection';
  const info=document.getElementById('loCanvasInfo');if(info)info.textContent=`${count} layers`;const tc=document.getElementById('loTopLayerCount');if(tc)tc.textContent=`${count} layers`;
  const ctx=document.getElementById('loToolContext');if(ctx)ctx.innerHTML=o?`<strong>${getObjectName(o)}</strong><span>Selected object • refine it in the Inspector</span>`:`<strong>${manualCurrentTool[0].toUpperCase()+manualCurrentTool.slice(1)}</strong><span>Select an object or place an image to begin</span>`;
}

function renderManualInspector(){
  const box=document.getElementById('loInspectorContent');if(!box)return;const o=activeObject(); if(!o){box.innerHTML=`<div class="lo-inspector-empty"><div class="lo-inspector-icon"><i class="fa-solid fa-sliders"></i></div><h3>Properties</h3><p>Select an object to edit exact position, size, typography, opacity, blending and more.</p><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Use Ctrl/Cmd+Z to undo. Adjustments are kept per image layer.</span></div></div>`;return;}
  const w=Math.round((o.width||0)*(o.scaleX||1)),h=Math.round((o.height||0)*(o.scaleY||1));
  box.innerHTML=`<div class="lo-inspector-section"><div class="lo-section-title">${esc(o.type.toUpperCase())}<span>${esc(getObjectName(o))}</span></div>
    <div class="lo-field-row"><label>X</label><input type="number" step="1" value="${Math.round(o.left||0)}" onkeydown="manualNumericKey(event)" onchange="setActiveProp('left',this.value)"><label>Y</label><input type="number" step="1" value="${Math.round(o.top||0)}" onkeydown="manualNumericKey(event)" onchange="setActiveProp('top',this.value)"></div>
    <div class="lo-field-row"><label>W</label><input type="number" min="1" step="1" value="${w}" onchange="setActiveSize('width',this.value)"><label>H</label><input type="number" min="1" step="1" value="${h}" onchange="setActiveSize('height',this.value)"></div>
    <div class="lo-range-field"><div><span>Opacity</span><input class="lo-range-number" type="number" min="0" max="100" value="${Math.round((o.opacity??1)*100)}" oninput="setActiveOpacityFromInspector(this.value)"><strong class="range-value">%</strong></div><input type="range" min="0" max="100" value="${Math.round((o.opacity??1)*100)}" oninput="setActiveOpacityFromInspector(this.value)"></div>
    <div class="lo-range-field"><div><span>Rotation</span><input class="lo-range-number" type="number" min="-180" max="180" value="${Math.round(o.angle||0)}" oninput="setActiveRotationFromInspector(this.value)"><strong>°</strong></div><input type="range" min="-180" max="180" value="${Math.round(o.angle||0)}" oninput="setActiveRotationFromInspector(this.value)"></div>
    <div class="lo-select-field"><label>Blend mode</label><select onchange="changeBlend(this.value)">${['source-over','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion'].map(x=>`<option value="${x}" ${o.globalCompositeOperation===x?'selected':''}>${x}</option>`).join('')}</select></div>
    ${['i-text','textbox','text'].includes(o.type)?renderTypographyControls(o):''}
    ${o.type==='image'?`<button class="lo-wide-action" onclick="openToolPanel('adjust')"><i class="fa-solid fa-sliders"></i> Image adjustments</button>`:''}
    <div class="lo-inspector-actions"><button onclick="duplicateActiveObject()"><i class="fa-regular fa-copy"></i> Duplicate</button><button onclick="deleteActiveLayer()"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`;
}
function renderTypographyControls(o){return `<div class="lo-divider-line"></div><div class="lo-section-title">TYPOGRAPHY</div><div class="lo-select-field"><label>Font</label><select onchange="setActiveProp('fontFamily',this.value)">${['Inter','Segoe UI','Arial','Georgia','Times New Roman','Courier New','Verdana','Trebuchet MS'].map(f=>`<option ${o.fontFamily===f?'selected':''}>${f}</option>`).join('')}</select></div><div class="lo-field-row"><label>Size</label><input type="number" min="6" max="400" value="${o.fontSize||50}" onchange="changeTextSize(this.value)"><button onclick="toggleTextStyle('fontWeight','bold','normal')"><i class="fa-solid fa-bold"></i></button><button onclick="toggleTextStyle('fontStyle','italic','normal')"><i class="fa-solid fa-italic"></i></button></div><div class="lo-field-row"><label>Align</label><button onclick="setTextAlign('left')">L</button><button onclick="setTextAlign('center')">C</button><button onclick="setTextAlign('right')">R</button><button onclick="toggleTextUnderline()"><i class="fa-solid fa-underline"></i></button></div><div class="lo-field-row"><label>Color</label><input type="color" value="${typeof o.fill==='string'?o.fill:'#ffffff'}" onchange="changeTextColor(this.value)"><label>Stroke</label><input type="color" value="${typeof o.stroke==='string'?o.stroke:'#000000'}" onchange="setActiveProp('stroke',this.value)"></div><div class="lo-field-row"><label>Stroke</label><input type="number" min="0" max="30" value="${o.strokeWidth||0}" onchange="setActiveProp('strokeWidth',this.value)"><label>Spacing</label><input type="number" min="-100" max="500" value="${o.charSpacing||0}" onchange="setActiveProp('charSpacing',this.value)"></div>`;}
function setActiveOpacityFromInspector(v){const o=activeObject();if(!o)return;const n=clamp(safeNum(v,100),0,100);o.set('opacity',n/100);editorCanvas.renderAll();const ranges=document.querySelectorAll('#loInspectorContent .lo-range-field input[type=range]');ranges[0]&&(ranges[0].value=n);flushManualHistory('Opacity');}
function setActiveRotationFromInspector(v){const o=activeObject();if(!o)return;const n=clamp(safeNum(v,0),-180,180);o.set('angle',n);o.setCoords();editorCanvas.renderAll();const ranges=document.querySelectorAll('#loInspectorContent .lo-range-field input[type=range]');ranges[1]&&(ranges[1].value=n);flushManualHistory('Rotation');}
function changeObjectOpacity(v){setActiveOpacityFromInspector(v);}
function changeBlend(mode){const o=activeObject();if(!o)return;o.globalCompositeOperation=mode;editorCanvas.renderAll();flushManualHistory('Blend mode');}
function manualNumericKey(e){ if(e.key==='Enter'){e.target.blur();} }

/* ---------- adjustment engine ---------- */
function getImageAdjustments(img){ img.__loAdjustments=cloneAdjustments(img.__loAdjustments); return img.__loAdjustments; }
function updateManualAdjust(key,value){ const img=activeImage();if(!img)return; const a=getImageAdjustments(img);a[key]=['tint'].includes(key)?value:safeNum(value);applyManualImageAdjustments(img);updateAdjustmentValue(key,a[key]);scheduleAdjustmentHistory(); }
function updateManualColor(key,value){ const img=activeImage();if(!img)return;getImageAdjustments(img)[key]=value;applyManualImageAdjustments(img); }
function updateAdjustmentValue(key,value){document.querySelectorAll(`[data-adjust-value="${key}"]`).forEach(el=>el.value=value);document.querySelectorAll(`[data-adjust-label="${key}"]`).forEach(el=>el.textContent=Math.round(safeNum(value)));document.querySelectorAll(`[data-adjust-control="${key}"]`).forEach(el=>{if(el.type==='range'||el.type==='number')el.value=value;});}
let manualAdjustmentHistoryTimer=null;
function scheduleAdjustmentHistory(){clearTimeout(manualAdjustmentHistoryTimer);manualAdjustmentHistoryTimer=setTimeout(()=>flushManualHistory('Adjustments'),350);}
function applyManualImageAdjustments(img=activeImage()){
  if(!img||!fabric?.Image?.filters)return;
  const base=getImageAdjustments(img), a=cloneAdjustments(base), f=fabric.Image.filters, filters=[];
  const push=(C,settings)=>C&&filters.push(new C(settings));
  // Effects are overlays; they never overwrite the user's underlying adjustment values.
  (img.__loEffects||[]).forEach(type=>{
    if(type==='vintage'){a.saturation-=20;a.contrast+=15;a.temperature+=12;a.vignette=Math.max(a.vignette,25);}
    if(type==='cool'){a.temperature-=35;a.saturation+=8;}
    if(type==='warm'){a.temperature+=35;a.saturation+=8;}
    if(type==='dramatic'){a.contrast+=35;a.sharpness=Math.max(a.sharpness,25);a.shadows+=15;}
    if(type==='soft'){a.blur=Math.max(a.blur,10);a.contrast-=8;}
  });
  if(a.brightness||a.exposure)push(f.Brightness,{brightness:clamp((a.brightness+a.exposure)/100,-1,1)});
  if(a.contrast)push(f.Contrast,{contrast:clamp(a.contrast/100,-1,1)});
  if(a.saturation)push(f.Saturation,{saturation:clamp(a.saturation/100,-1,1)});
  if(a.hue)push(f.HueRotation,{rotation:clamp(a.hue/180,-1,1)});
  if(a.blur)push(f.Blur,{blur:clamp(a.blur/100,0,.65)});
  if(a.sharpness&&f.Convolute){const s=clamp(a.sharpness/100,0,1);push(f.Convolute,{matrix:[0,-s,0,-s,1+4*s,-s,0,-s,0]});}
  if(a.tintAmount)push(f.BlendColor,{color:a.tint,mode:'tint',alpha:clamp(a.tintAmount/100,0,.55)});
  if(a.shadows>0)push(f.BlendColor,{color:'#ffffff',mode:'screen',alpha:clamp(a.shadows/100,0,.28)});
  else if(a.shadows<0)push(f.BlendColor,{color:'#000000',mode:'multiply',alpha:clamp(Math.abs(a.shadows)/100,0,.28)});
  if(a.highlights>0)push(f.BlendColor,{color:'#ffffff',mode:'screen',alpha:clamp(a.highlights/100,0,.28)});
  else if(a.highlights<0)push(f.BlendColor,{color:'#000000',mode:'multiply',alpha:clamp(Math.abs(a.highlights)/100,0,.28)});
  if(a.temperature)push(f.BlendColor,{color:a.temperature>0?'#ffd2a1':'#9ecbff',mode:a.temperature>0?'screen':'multiply',alpha:clamp(Math.abs(a.temperature)/180,0,.22)});
  if(a.vignette)push(f.BlendColor,{color:'#000000',mode:'multiply',alpha:clamp(a.vignette/150,0,.25)});
  if(a.grain&&f.Noise)push(f.Noise,{noise:Math.round(clamp(a.grain/100,0,1)*55)});
  const effectMap={grayscale:f.Grayscale,sepia:f.Sepia,invert:f.Invert};
  (img.__loEffects||[]).forEach(type=>{if(effectMap[type])filters.push(new effectMap[type]());});
  img.filters=filters;img.applyFilters();editorCanvas.renderAll();
}
function resetManualAdjustments(){const img=activeImage();if(!img)return;img.__loAdjustments=cloneAdjustments();applyManualImageAdjustments(img);renderAdjustmentInspector();flushManualHistory('Reset adjustments');}
function adjustRange(label,key,value,min,max,icon){return `<div class="lo-inspector-range"><div><span><i class="fa-solid ${icon}"></i>${label}</span><div class="lo-range-value"><input data-adjust-control="${key}" class="lo-range-number" type="number" min="${min}" max="${max}" value="${Math.round(value)}" oninput="updateManualAdjust('${key}',this.value)"><strong data-adjust-label="${key}">${Math.round(value)}</strong></div></div><input data-adjust-control="${key}" type="range" min="${min}" max="${max}" value="${value}" step="1" oninput="updateManualAdjust('${key}',this.value)"></div>`;}
function adjustColorRange(label,colorKey,amountKey,color,amount,icon){return `<div class="lo-color-range"><div class="lo-inspector-range"><div><span><i class="fa-solid ${icon}"></i>${label}</span><div class="lo-range-value"><input data-adjust-control="${amountKey}" class="lo-range-number" type="number" min="0" max="100" value="${Math.round(amount)}" oninput="updateManualAdjust('${amountKey}',this.value)"><strong data-adjust-label="${amountKey}">${Math.round(amount)}</strong></div></div><input data-adjust-control="${amountKey}" type="range" min="0" max="100" value="${amount}" oninput="updateManualAdjust('${amountKey}',this.value)"></div><input class="lo-color-swatch" type="color" value="${color}" onchange="updateManualColor('${colorKey}',this.value)"></div>`;}
function renderAdjustmentInspector(){
  const box=document.getElementById('loInspectorContent');if(!box)return;const img=activeImage();if(!img){box.innerHTML=`<div class="lo-inspector-empty"><div class="lo-inspector-icon"><i class="fa-solid fa-sliders"></i></div><h3>Select an image</h3><p>Choose an image layer to edit light, color and detail non-destructively.</p></div>`;return;}
  const a=getImageAdjustments(img); box.innerHTML=`<div class="lo-inspector-section adjustment-inspector"><div class="lo-inspector-summary"><span>IMAGE ADJUSTMENT</span><small>Non-destructive per layer</small></div>
  <div class="lo-adjust-group"><div class="lo-adjust-heading"><strong>Light</strong><span>Exposure & tone</span></div>${adjustRange('Brightness','brightness',a.brightness,-100,100,'fa-sun')}${adjustRange('Contrast','contrast',a.contrast,-100,100,'fa-adjust')}${adjustRange('Exposure','exposure',a.exposure,-100,100,'fa-circle-half-stroke')}${adjustRange('Highlights','highlights',a.highlights,-100,100,'fa-lightbulb')}${adjustRange('Shadows','shadows',a.shadows,-100,100,'fa-moon')}</div>
  <div class="lo-adjust-group"><div class="lo-adjust-heading"><strong>Color</strong><span>Chromatic balance</span></div>${adjustRange('Saturation','saturation',a.saturation,-100,100,'fa-droplet')}${adjustRange('Hue','hue',a.hue,-180,180,'fa-palette')}${adjustRange('Temperature','temperature',a.temperature,-100,100,'fa-temperature-half')}${adjustColorRange('Tint','tint','tintAmount',a.tint,a.tintAmount,'fa-eye-dropper')}</div>
  <div class="lo-adjust-group"><div class="lo-adjust-heading"><strong>Detail</strong><span>Clarity & texture</span></div>${adjustRange('Sharpness','sharpness',a.sharpness,0,100,'fa-wand-magic-sparkles')}${adjustRange('Blur','blur',a.blur,0,100,'fa-feather')}${adjustRange('Vignette','vignette',a.vignette,0,100,'fa-circle-dot')}${adjustRange('Grain','grain',a.grain,0,100,'fa-braille')}</div>
  <button class="lo-wide-action" onclick="resetManualAdjustments()"><i class="fa-solid fa-rotate-left"></i> Reset all adjustments</button></div>`;
}

/* ---------- tools ---------- */
function setToolContext(type,title,desc){manualCurrentTool=type;const ctx=document.getElementById('loToolContext');if(ctx)ctx.innerHTML=`<strong>${title}</strong><span>${desc}</span>`;}
function openToolPanel(type,element){
  document.querySelectorAll('.lo-tool').forEach(b=>b.classList.toggle('active',b===element||b.dataset.tool===type));
  manualCurrentTool=type; const map={select:['Selection','Select, resize, rotate and inspect objects'],pan:['Pan','Hold and drag the workspace'],zoom:['Zoom','Click the canvas to zoom in'],crop:['Crop','Apply ratio-based image crops'],text:['Typography','Full typography controls'],addimage:['Image','Place additional image layers'],draw:['Brush','Paint with size, opacity and hardness'],eraser:['Eraser','Erase non-destructively with transparent paths'],shape:['Shapes','Create editable vector shapes'],background:['Background','Set a solid canvas background color'],gradient:['Gradient','Apply gradients to objects'],picker:['Color Picker','Pick a color directly from the canvas'],adjust:['Adjust','Balance light, color and detail'],effects:['Effects','Apply reusable visual effects'],color:['Color','Fine color controls'],retouch:['Retouch','Fast image refinement'],mask:['Mask','Create geometric image masks'],transform:['Transform','Flip, skew, rotate and scale'],layers:['Layers','Organize, lock and reorder layers'],align:['Align','Align and distribute objects'],selection:['Select Area','Create a movable selection region']};
  const [title,desc]=map[type]||['Tool','Contextual editing controls'];setToolContext(type,title,desc);
  const t=document.getElementById('secondaryToolbar');if(!t)return;
  if(type==='adjust'){renderAdjustmentInspector();t.innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Adjust</span><button class="lo-dock-btn" onclick="resetManualAdjustments()">Reset</button><span class="lo-dock-note">Drag sliders or type exact values. Changes remain editable.</span></div>`;return;}
  if(type==='select'||type==='pan'||type==='zoom')loadSelectToolbar(type);else if(type==='crop')loadCropToolbar();else if(type==='text')loadTextToolbar();else if(type==='addimage')loadAddImageToolbar();else if(type==='draw'||type==='eraser')loadDrawToolbar(type);else if(type==='shape')loadShapeToolbar();else if(type==='background')loadBackgroundToolbar();else if(type==='gradient')loadGradientToolbar();else if(type==='picker')loadPickerToolbar();else if(type==='effects')loadEffectsToolbar();else if(type==='color')loadColorToolbar();else if(type==='retouch')loadRetouchToolbar();else if(type==='mask')loadMaskToolbar();else if(type==='transform')loadTransformToolbar();else if(type==='layers')loadLayersToolbar();else if(type==='align')loadAlignToolbar();else if(type==='selection')loadSelectionToolbar();
  if(type==='layers')renderLayerInspector();else if(type==='effects')renderEffectsInspector();else if(type==='adjust')renderAdjustmentInspector();else renderManualInspector();
  configureCanvasInteraction(type);
}
function renderSimpleInspector(title,description,content){const box=document.getElementById('loInspectorContent');if(box)box.innerHTML=`<div class="lo-inspector-section"><div class="lo-inspector-summary"><span>${title.toUpperCase()}</span><small>${description}</small></div>${content}</div>`;}
function loadSelectToolbar(type){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">${type==='move'?'Move':'Selection'}</span><button class="lo-dock-btn" onclick="duplicateActiveObject()">Duplicate</button><button class="lo-dock-btn" onclick="moveActiveLayer('up')">Bring forward</button><button class="lo-dock-btn" onclick="moveActiveLayer('down')">Send backward</button><button class="lo-dock-btn danger-soft" onclick="deleteActiveLayer()">Delete</button></div>`;}
function loadCropToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Crop</span><button class="lo-dock-btn lo-crop-start-btn" onclick="startManualCrop()"><i class="fa-solid fa-crop-simple"></i> Drag crop</button>${['free','1:1','4:5','3:2','4:3','16:9','9:16','circle'].map(r=>`<button class="lo-dock-btn" onclick="applyCropPreset('${r}')">${r}</button>`).join('')}<button class="lo-dock-btn" onclick="resetActualImageCrop()">Reset</button></div>`;renderSimpleInspector('Crop','Crop the selected image itself — not a clip/expand mask.',`<div class="lo-option-grid"><button onclick="startManualCrop()"><i class="fa-solid fa-crop-simple"></i> Start manual crop</button>${['free','1:1','4:5','3:2','4:3','16:9','9:16'].map(r=>`<button onclick="applyCropPreset('${r}')">${r}</button>`).join('')}<button onclick="applyCropPreset('circle')">Circle mask</button><button onclick="resetActualImageCrop()">Reset crop</button></div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Drag over the image. The selected region becomes the image's actual visible crop. It is reversible through Undo/Reset.</span></div>`);startManualCrop();}
function ensureImageCropState(img){
  if(!img)return;
  const el=img.getElement?.();
  const baseW=Number(img.__loBaseWidth||el?.naturalWidth||el?.width||img.width||1);
  const baseH=Number(img.__loBaseHeight||el?.naturalHeight||el?.height||img.height||1);
  img.__loBaseWidth=baseW; img.__loBaseHeight=baseH;
  if(!Number.isFinite(Number(img.cropX)))img.cropX=0;
  if(!Number.isFinite(Number(img.cropY)))img.cropY=0;
}
function applyActualImageCropSource(img,x,y,w,h,label='Crop'){
  if(!img||!editorCanvas)return;
  ensureImageCropState(img);
  const maxW=img.__loBaseWidth, maxH=img.__loBaseHeight;
  x=clamp(Number(x)||0,0,maxW); y=clamp(Number(y)||0,0,maxH);
  w=clamp(Number(w)||1,1,maxW-x); h=clamp(Number(h)||1,1,maxH-y);
  const centerPoint=img.getCenterPoint();
  img.set({cropX:x,cropY:y,width:w,height:h,clipPath:null});
  // Keep the cropped region anchored at the same visual center.
  img.setPositionByOrigin(centerPoint,'center','center');
  img.__loCrop={x,y,width:w,height:h};
  img.__loMaskType=null;
  img.setCoords();
  editorCanvas.setActiveObject(img);
  editorCanvas.renderAll();
  flushManualHistory(label);
  renderManualInspector();
  setManualStatus('Crop applied — pixels outside the crop are hidden from the image view, and the original source remains recoverable.');
}
function resetActualImageCrop(){
  const img=activeImage(); if(!img)return;
  ensureImageCropState(img);
  const center=img.getCenterPoint();
  img.set({cropX:0,cropY:0,width:img.__loBaseWidth,height:img.__loBaseHeight,clipPath:null});
  img.setPositionByOrigin(center,'center','center');
  img.__loCrop=null; img.__loMaskType=null; img.setCoords();
  editorCanvas.renderAll(); flushManualHistory('Reset crop'); renderManualInspector();
}
function applyCropPreset(type){
  const img=activeImage(); if(!img)return;
  manualCropRatio=type; ensureImageCropState(img);
  if(type==='free'){resetActualImageCrop();return;}
  if(type==='circle'){
    // Circle is intentionally a mask, not a rectangular crop preset.
    const size=Math.min(img.width||1,img.height||1);
    img.clipPath=new fabric.Circle({radius:size/2,originX:'center',originY:'center'});
    img.__loMaskType='circle'; img.__loCrop=null;
    editorCanvas.renderAll(); flushManualHistory('Circle mask'); renderManualInspector(); return;
  }
  const ratios={'1:1':1,'4:5':.8,'3:2':1.5,'4:3':4/3,'16:9':16/9,'9:16':9/16};
  const ratio=ratios[type]||1, iw=img.width||1, ih=img.height||1;
  let cw=iw, ch=cw/ratio;
  if(ch>ih){ch=ih;cw=ch*ratio;}
  const x=(img.cropX||0)+(iw-cw)/2, y=(img.cropY||0)+(ih-ch)/2;
  applyActualImageCropSource(img,x,y,cw,ch,'Crop '+type);
}
function clearCrop(){resetActualImageCrop();}
function loadTextToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Type</span><button class="lo-dock-btn" onclick="addText()">+ Text</button><button class="lo-dock-btn" onclick="toggleTextStyle('fontWeight','bold','normal')"><b>B</b></button><button class="lo-dock-btn" onclick="toggleTextStyle('fontStyle','italic','normal')"><i>I</i></button><button class="lo-dock-btn" onclick="toggleTextUnderline()"><u>U</u></button><label class="lo-dock-control">Size <input type="number" min="6" max="400" value="50" oninput="changeTextSize(this.value)"></label><input type="color" value="#ffffff" onchange="changeTextColor(this.value)"></div>`;}
function loadAddImageToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Image</span><button class="lo-dock-btn" onclick="triggerManualImageUpload()">Add image</button><button class="lo-dock-btn" onclick="duplicateActiveObject()">Duplicate</button><button class="lo-dock-btn" onclick="openToolPanel('crop')">Crop</button></div>`;}
function loadDrawToolbar(type='draw'){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">${type==='eraser'?'Eraser':'Brush'}</span><label class="lo-dock-control">Size <input id="brushSize" type="range" min="1" max="160" value="${manualBrushSize}" oninput="manualBrushSize=Number(this.value);document.getElementById('brushSizeNum').value=this.value"><input id="brushSizeNum" class="lo-dock-number" type="number" min="1" max="160" value="${manualBrushSize}" oninput="manualBrushSize=clamp(safeNum(this.value,12),1,160);document.getElementById('brushSize').value=manualBrushSize"></label><label class="lo-dock-control">Opacity <input type="range" min="1" max="100" value="${Math.round(manualBrushOpacity*100)}" oninput="manualBrushOpacity=Number(this.value)/100"></label><label class="lo-dock-control">Hardness <input type="range" min="0" max="100" value="${Math.round(manualBrushHardness*100)}" oninput="manualBrushHardness=Number(this.value)/100"></label><input type="color" value="${manualBrushColor}" onchange="manualBrushColor=this.value"></div>`;}
function loadShapeToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Shapes</span>${['rect','circle','triangle','line','arrow'].map(s=>`<button class="lo-dock-btn" onclick="addShape('${s}')">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}<input type="color" value="#9eeaff" onchange="window.__shapeFill=this.value"><input type="color" value="#ffffff" onchange="window.__shapeStroke=this.value"></div>`;}
function loadBackgroundToolbar(){
  const current=typeof editorCanvas?.backgroundColor==='string' && editorCanvas.backgroundColor && editorCanvas.backgroundColor!=='rgba(0,0,0,0)' ? editorCanvas.backgroundColor : '#10151c';
  document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner lo-background-dock"><span class="lo-dock-title">Background</span><span class="lo-color-dot" style="background:${esc(current)}"></span><input id="manualBackgroundColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(current)?current:'#10151c'}" onchange="setManualBackgroundColor(this.value)"><button class="lo-dock-btn" onclick="setManualBackgroundColor(document.getElementById('manualBackgroundColor')?.value||'#10151c')">Apply solid</button><button class="lo-dock-btn" onclick="clearManualBackground()">Transparent</button></div>`;
  renderBackgroundInspector();
}
function renderBackgroundInspector(){
  const current=typeof editorCanvas?.backgroundColor==='string' ? editorCanvas.backgroundColor : 'rgba(0,0,0,0)';
  const presets=['#ffffff','#000000','#f3f4f6','#111827','#0f172a','#1e3a8a','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  const hex=/^#[0-9a-f]{6}$/i.test(current)?current:'#ffffff';
  renderSimpleInspector('Background','Keep the canvas background solid while editing or exporting.',`<div class="lo-background-current"><div class="lo-background-preview" style="background:${esc(current)}"></div><div><strong>Solid background</strong><span>${current==='rgba(0,0,0,0)'?'Transparent':esc(current.toUpperCase())}</span></div></div><div class="lo-section-title">Solid colors</div><div class="lo-color-preset-grid">${presets.map(c=>`<button type="button" class="lo-color-preset" title="${c}" aria-label="Set background ${c}" style="--preset:${c}" onclick="setManualBackgroundColor('${c}')"></button>`).join('')}</div><div class="lo-background-custom"><label>Custom color</label><input id="manualBackgroundColorInspector" type="color" value="${hex}" onchange="setManualBackgroundColor(this.value)"><input type="text" value="${hex}" maxlength="7" aria-label="Background hex color" onkeydown="if(event.key==='Enter')setManualBackgroundColor(this.value)"></div><div class="lo-option-grid"><button onclick="clearManualBackground()"><i class="fa-solid fa-border-none"></i> Transparent</button><button onclick="setManualBackgroundColor('#ffffff')"><i class="fa-solid fa-sun"></i> White</button></div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>This changes the canvas background, not the image layer. Your image layers remain editable and the background is included in export.</span></div>`);
}
function setManualBackgroundColor(color){
  if(!editorCanvas)return;
  let c=String(color||'').trim();
  if(!/^#[0-9a-f]{6}$/i.test(c)){ if(/^#[0-9a-f]{3}$/i.test(c)) c='#'+c.slice(1).split('').map(x=>x+x).join(''); else return; }
  editorCanvas.backgroundColor=c; editorCanvas.renderAll();
  const a=document.getElementById('manualBackgroundColor'); if(a)a.value=c;
  const b=document.getElementById('manualBackgroundColorInspector'); if(b)b.value=c;
  flushManualHistory('Background: '+c); renderBackgroundInspector(); setManualStatus('Solid background set to '+c.toUpperCase());
}
function clearManualBackground(){
  if(!editorCanvas)return;
  editorCanvas.backgroundColor='rgba(0,0,0,0)'; editorCanvas.renderAll();
  flushManualHistory('Background: Transparent'); renderBackgroundInspector(); setManualStatus('Background set to transparent');
}

function loadGradientToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Gradient</span><input id="gradA" type="color" value="#9eeaff"><input id="gradB" type="color" value="#6e7cff"><button class="lo-dock-btn" onclick="applyGradient()">Apply</button></div>`;renderSimpleInspector('Gradient','Apply a linear gradient to a selected object',`<div class="lo-option-grid"><button onclick="applyGradient()">Apply gradient</button><button onclick="removeGradient()">Remove gradient</button></div>`);}
function loadPickerToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Picker</span><span class="lo-dock-note">Click any pixel on the canvas to sample its color.</span><input id="pickedColor" type="color" value="#ffffff" readonly></div>`;renderSimpleInspector('Color Picker','Sample a visible canvas pixel',`<div class="lo-color-preview" id="pickedColorPreview">#FFFFFF</div>`);}
function loadEffectsToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Effects</span>${['grayscale','sepia','invert','vintage','cool','warm','dramatic','soft'].map(x=>`<button class="lo-dock-btn" onclick="applyAdvancedEffect('${x}')">${x}</button>`).join('')}<button class="lo-dock-btn" onclick="clearImageEffects()">Clear</button></div>`;}
function renderEffectsInspector(){renderSimpleInspector('Effects','Reusable non-destructive image looks',`<div class="lo-option-grid">${['grayscale','sepia','invert','vintage','cool','warm','dramatic','soft'].map(x=>`<button onclick="applyAdvancedEffect('${x}')">${x}</button>`).join('')}</div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Effects replace only the selected image layer’s filter stack.</span></div>`);}
function loadColorToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Color</span><button class="lo-dock-btn" onclick="openToolPanel('adjust')">Color controls</button><button class="lo-dock-btn" onclick="applyAdvancedEffect('grayscale')">B&amp;W</button><button class="lo-dock-btn" onclick="applyAdvancedEffect('warm')">Warm</button><button class="lo-dock-btn" onclick="applyAdvancedEffect('cool')">Cool</button></div>`;renderAdjustmentInspector();}
function loadRetouchToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Retouch</span><button class="lo-dock-btn" onclick="applyRetouch('smooth')">Surface smooth</button><button class="lo-dock-btn" onclick="applyRetouch('detail')">Enhance detail</button><button class="lo-dock-btn" onclick="applyRetouch('light')">Recover highlights</button></div>`;renderSimpleInspector('Retouch','Fast, reversible image refinement',`<div class="lo-option-grid"><button onclick="applyRetouch('smooth')">Smooth</button><button onclick="applyRetouch('detail')">Detail</button><button onclick="applyRetouch('light')">Highlights</button></div>`);}
function loadMaskToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Mask</span><button class="lo-dock-btn" onclick="applyCropPreset('circle')">Circle</button><button class="lo-dock-btn" onclick="applyCropPreset('1:1')">Square</button><button class="lo-dock-btn" onclick="applyCropPreset('16:9')">Landscape</button><button class="lo-dock-btn" onclick="clearCrop()">Clear</button></div>`;renderSimpleInspector('Mask','Geometric non-destructive clipping',`<div class="lo-option-grid"><button onclick="applyCropPreset('circle')">Circle</button><button onclick="applyCropPreset('1:1')">Square</button><button onclick="applyCropPreset('4:5')">Portrait</button><button onclick="clearCrop()">Clear</button></div>`);}
function loadTransformToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Transform</span><button class="lo-dock-btn" onclick="setActiveProp('angle',0)">Reset rotation</button><button class="lo-dock-btn" onclick="flipActive('x')">Flip X</button><button class="lo-dock-btn" onclick="flipActive('y')">Flip Y</button><button class="lo-dock-btn" onclick="setActiveProp('skewX',0)">Reset skew</button></div>`;renderTransformInspector();}
function renderTransformInspector(){renderSimpleInspector('Transform','Precision controls',`<div class="lo-field-row"><label>Angle</label><input type="number" value="${Math.round(activeObject()?.angle||0)}" onchange="setActiveProp('angle',this.value)"><label>Skew X</label><input type="number" value="${Math.round(activeObject()?.skewX||0)}" onchange="setActiveProp('skewX',this.value)"></div><div class="lo-option-grid"><button onclick="flipActive('x')">Flip X</button><button onclick="flipActive('y')">Flip Y</button><button onclick="setActiveProp('angle',0)">Reset</button></div>`);}
function flipActive(axis){const o=activeObject();if(!o)return;const p=axis==='x'?'flipX':'flipY';o.set(p,!o[p]);editorCanvas.renderAll();flushManualHistory('Flip');renderManualInspector();}
function loadLayersToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Layers</span><button class="lo-dock-btn" onclick="addText()">+ Text</button><button class="lo-dock-btn" onclick="triggerManualImageUpload()">+ Image</button><button class="lo-dock-btn" onclick="moveActiveLayer('up')">Up</button><button class="lo-dock-btn" onclick="moveActiveLayer('down')">Down</button><button class="lo-dock-btn danger-soft" onclick="deleteActiveLayer()">Delete</button></div>`;}
function loadAlignToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Align</span><button class="lo-dock-btn" onclick="alignActive('left')">Left</button><button class="lo-dock-btn" onclick="alignActive('center')">Center</button><button class="lo-dock-btn" onclick="alignActive('right')">Right</button><button class="lo-dock-btn" onclick="alignActive('top')">Top</button><button class="lo-dock-btn" onclick="alignActive('middle')">Middle</button><button class="lo-dock-btn" onclick="alignActive('bottom')">Bottom</button></div>`;}
function loadSelectionToolbar(){document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Select Area</span><button class="lo-dock-btn" onclick="createSelectionRect()">New rectangle</button><button class="lo-dock-btn" onclick="invertSelectionRegion()">Invert mask</button><button class="lo-dock-btn" onclick="clearSelectionRegion()">Clear</button></div>`;renderSimpleInspector('Select Area','Create an editable marquee region',`<div class="lo-option-grid"><button onclick="createSelectionRect()">Rectangle</button><button onclick="clearSelectionRegion()">Clear</button></div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>The selection region is an editable overlay that can be moved/resized before applying it as a mask.</span></div>`);}

/* ---------- object creation ---------- */
function addShape(type){const fill=window.__shapeFill||'#9eeaff',stroke=window.__shapeStroke||'#ffffff';let o;if(type==='rect')o=new fabric.Rect({width:180,height:120,fill,stroke,strokeWidth:2,left:150,top:150,rx:12,ry:12});else if(type==='circle')o=new fabric.Circle({radius:80,fill,stroke,strokeWidth:2,left:200,top:160});else if(type==='triangle')o=new fabric.Triangle({width:150,height:140,fill,stroke,strokeWidth:2,left:200,top:160});else {const pts=type==='arrow'?[{x:0,y:25},{x:100,y:25},{x:100,y:5},{x:150,y:45},{x:100,y:85},{x:100,y:65},{x:0,y:65}]:[{x:0,y:0},{x:180,y:0}];o=new fabric.Polyline(pts,{fill:type==='arrow'?fill:'transparent',stroke,strokeWidth:5,left:180,top:180});}o.__loName=type[0].toUpperCase()+type.slice(1);editorCanvas.add(o);editorCanvas.setActiveObject(o);editorCanvas.renderAll();flushManualHistory('Add shape');}
function addText(){if(!editorCanvas)return;const text=new fabric.IText('LOOKOUT',{left:200,top:160,fill:'#ffffff',fontSize:50,fontFamily:'Inter',fontWeight:'600',fontStyle:'normal',underline:false,editable:true});text.__loName='Text';editorCanvas.add(text);editorCanvas.setActiveObject(text);editorCanvas.renderAll();flushManualHistory('Add text');renderManualInspector();}
function toggleTextStyle(property,onValue,offValue){const o=activeText();if(!o)return;o.set(property,o[property]===onValue?offValue:onValue);editorCanvas.renderAll();flushManualHistory('Text style');renderManualInspector();}
function toggleTextUnderline(){const o=activeText();if(!o)return;o.set('underline',!o.underline);editorCanvas.renderAll();flushManualHistory('Underline');renderManualInspector();}
function changeTextSize(v){const o=activeText();if(!o)return;o.set('fontSize',clamp(safeNum(v,50),6,400));editorCanvas.renderAll();}
function changeTextColor(c){const o=activeText();if(!o)return;o.set('fill',c);editorCanvas.renderAll();flushManualHistory('Text color');}
function setTextAlign(a){const o=activeText();if(!o)return;o.set('textAlign',a);editorCanvas.renderAll();flushManualHistory('Text alignment');}
function applyGradient(){const o=activeObject();if(!o)return;const a=document.getElementById('gradA')?.value||'#9eeaff',b=document.getElementById('gradB')?.value||'#6e7cff';o.set('fill',new fabric.Gradient({type:'linear',gradientUnits:'percentage',coords:{x1:0,y1:0,x2:1,y2:1},colorStops:[{offset:0,color:a},{offset:1,color:b}]}));editorCanvas.renderAll();flushManualHistory('Gradient');}
function removeGradient(){const o=activeObject();if(!o)return;o.set('fill','#ffffff');editorCanvas.renderAll();flushManualHistory('Remove gradient');}
function alignActive(which){const o=activeObject();if(!o||!editorCanvas)return;const cw=editorCanvas.getWidth()/editorCanvas.getZoom(),ch=editorCanvas.getHeight()/editorCanvas.getZoom(),w=o.getScaledWidth(),h=o.getScaledHeight();if(which==='left')o.left=w/2;if(which==='center')o.left=(cw)/2;if(which==='right')o.left=cw-w/2;if(which==='top')o.top=h/2;if(which==='middle')o.top=ch/2;if(which==='bottom')o.top=ch-h/2;o.setCoords();editorCanvas.renderAll();flushManualHistory('Align');}
function createSelectionRect(){clearSelectionRegion();const r=new fabric.Rect({left:150,top:120,width:300,height:220,fill:'rgba(158,234,255,.08)',stroke:'#9eeaff',strokeWidth:2,strokeDashArray:[8,6],excludeFromExport:true,hasControls:true,selectable:true});r.__loTool='selection';r.__loName='Selection';editorCanvas.add(r);editorCanvas.setActiveObject(r);editorCanvas.renderAll();flushManualHistory('Selection region');}
function invertSelectionRegion(){const o=activeObject();if(!o||o.__loTool!=='selection')return;o.set('angle',(o.angle||0)+180);editorCanvas.renderAll();flushManualHistory('Invert selection region');}
function clearSelectionRegion(){canvasObjects().filter(o=>o.__loTool==='selection').forEach(o=>editorCanvas.remove(o));editorCanvas.renderAll();}

/* ---------- effects / retouch ---------- */
function applyAdvancedEffect(type){
  const img=activeImage(); if(!img)return;
  img.__loEffects=[type];
  applyManualImageAdjustments(img);
  flushManualHistory('Effect: '+type); renderManualInspector();
}

function clearImageEffects(){const img=activeImage();if(!img)return;img.__loEffects=[];applyManualImageAdjustments(img);editorCanvas.renderAll();flushManualHistory('Clear effects');renderAdjustmentInspector();}
function applyRetouch(type){const img=activeImage();if(!img)return;const a=getImageAdjustments(img);if(type==='smooth'){a.blur=8;a.sharpness=0;}if(type==='detail'){a.sharpness=35;a.blur=0;a.contrast=10;}if(type==='light'){a.highlights=-20;a.shadows=25;}applyManualImageAdjustments(img);flushManualHistory('Retouch: '+type);renderManualInspector();}

/* ---------- image IO ---------- */
function setupImageUpload(){manualImageInput=document.createElement('input');manualImageInput.type='file';manualImageInput.accept='image/*';manualImageInput.multiple=true;manualImageInput.style.display='none';document.body.appendChild(manualImageInput);manualImageInput.onchange=e=>{Array.from(e.target.files||[]).forEach(file=>{const reader=new FileReader();reader.onload=ev=>addImageToEditor(ev.target.result,file.name);reader.readAsDataURL(file);});manualImageInput.value='';};}
function triggerManualImageUpload(){if(manualImageInput)manualImageInput.click();}
function addImageToEditor(src,name='Image'){
  fabric.Image.fromURL(src,(img)=>{if(!img)return;img.__loName=name.replace(/\.[^.]+$/,'')||'Image';img.__loOriginalSrc=src;img.__loAdjustments=cloneAdjustments();img.__loBaseWidth=img.width||img.getElement?.()?.naturalWidth||1;img.__loBaseHeight=img.height||img.getElement?.()?.naturalHeight||1;img.__loCrop=null;img.cropX=0;img.cropY=0;const maxW=Math.max(200,manualDocumentSize.width*.82),maxH=Math.max(200,manualDocumentSize.height*.82);const scale=Math.min(maxW/(img.width||1),maxH/(img.height||1),1);img.set({scaleX:scale,scaleY:scale,left:(manualDocumentSize.width-(img.width||0)*scale)/2,top:(manualDocumentSize.height-(img.height||0)*scale)/2});editorCanvas.add(img);editorCanvas.setActiveObject(img);editorCanvas.renderAll();flushManualHistory('Place image');renderManualInspector();updateManualWorkspaceState();}, {crossOrigin:'anonymous'});
}
function loadManualSelectedImages(){try{const images=JSON.parse(localStorage.getItem('editImages')||'null');if(Array.isArray(images))images.forEach((src,i)=>addImageToEditor(src,'Image '+(i+1)));}catch(e){console.warn('LookOut: unable to load selected images',e);}}
function saveManualProject(){if(!editorCanvas)return;const data={name:document.getElementById('loProjectName')?.textContent||'Untitled Project',width:manualDocumentSize.width,height:manualDocumentSize.height,dpi:manualDocumentMeta?.dpi||96,unit:manualDocumentMeta?.unit||'px',background:manualDocumentMeta||null,canvas:editorCanvas.toJSON(MANUAL_CUSTOM_PROPS),savedAt:new Date().toISOString()};localStorage.setItem('lookoutManualProject',JSON.stringify(data));setManualStatus('Project saved locally');}
function renameManualProject(){const el=document.getElementById('loProjectName');if(!el)return;const n=prompt('Project name',el.textContent||'Untitled Project');if(n!==null&&n.trim())el.textContent=n.trim();}
function loadSavedManualProject(){try{const raw=localStorage.getItem('lookoutManualProject');if(!raw)return;const p=JSON.parse(raw);if(!p.canvas)return;manualDocumentSize={width:p.width||1200,height:p.height||800};if(p.dpi&&typeof manualDocumentMeta!=='undefined')manualDocumentMeta.dpi=p.dpi;if(p.unit&&typeof manualDocumentMeta!=='undefined')manualDocumentMeta.unit=p.unit;if(p.background&&typeof manualDocumentMeta!=='undefined')manualDocumentMeta=Object.assign(manualDocumentMeta,p.background);editorCanvas.loadFromJSON(p.canvas,()=>{editorCanvas.renderAll();manualHistory=[];manualHistoryIndex=-1;flushManualHistory('Open saved project');if(p.name&&document.getElementById('loProjectName'))document.getElementById('loProjectName').textContent=p.name;fitManualCanvas();});}catch(e){console.warn('LookOut: saved project load failed',e);}}
function downloadManualEdit(format='png'){
  if(!editorCanvas)return;
  const ext=format==='jpeg'?'jpg':format;
  const exportFormat=format==='jpeg'?'jpeg':'png';
  const name=(document.getElementById('loProjectName')?.textContent||'lookout-manual-edit').replace(/\s+/g,'-').toLowerCase()+'.'+ext;
  // Export the actual document resolution, not the editor's fitted screen resolution.
  // The viewport is temporarily neutralized so a 3840x2160 document exports at 3840x2160.
  const previousTransform=editorCanvas.viewportTransform ? editorCanvas.viewportTransform.slice() : [1,0,0,1,0,0];
  const previousWidth=editorCanvas.getWidth(), previousHeight=editorCanvas.getHeight();
  try{
    const pixels=manualDocumentSize.width*manualDocumentSize.height;
    if(pixels>50000000){
      setManualStatus('Export cancelled · document is too large for safe browser export (max 50 MP).');
      alert('This document is too large for safe browser export. Reduce the canvas dimensions or export at a smaller resolution.');
      return;
    }
    editorCanvas.setViewportTransform([1,0,0,1,0,0]);
    editorCanvas.setDimensions({width:manualDocumentSize.width,height:manualDocumentSize.height});
    editorCanvas.renderAll();
    const data=editorCanvas.toDataURL({format:exportFormat,quality:.96,multiplier:1,enableRetinaScaling:false,left:0,top:0,width:manualDocumentSize.width,height:manualDocumentSize.height});
    triggerDownload?.(data,name);
    if(!window.triggerDownload){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
  }finally{
    editorCanvas.setDimensions({width:previousWidth,height:previousHeight});
    editorCanvas.setViewportTransform(previousTransform);
    editorCanvas.calcOffset();editorCanvas.renderAll();fitManualCanvas();
  }
}

/* ---------- canvas setup ---------- */
function resizeManualEditorCanvas(){
  if(!editorCanvas)return;
  const stage=document.getElementById('manualCanvasStage'), frame=document.getElementById('manualCanvasFrame');
  if(!stage||!frame)return;
  const w=Math.max(320,frame.clientWidth||stage.clientWidth), h=Math.max(260,frame.clientHeight||stage.clientHeight);
  editorCanvas.setDimensions({width:w,height:h});
  editorCanvas.calcOffset();
  fitManualCanvas();
}
function setupProfessionalEditor(){
  // Dispose any previous Fabric instance/input before rebuilding the editor shell.
  // openManualEdit can be called repeatedly (Simple/Advanced/theme/navigation), and
  // constructing a second Fabric instance on the same <canvas> leaks handlers and
  // can eventually crash the browser.
  try{ if(editorCanvas){ editorCanvas.dispose(); } }catch(e){ console.warn('LookOut: previous editor dispose failed',e); }
  editorCanvas=null;
  if(manualImageInput){ try{ manualImageInput.remove(); }catch(e){} manualImageInput=null; }
  editorCanvas=new fabric.Canvas('editorCanvas',{preserveObjectStacking:true,selection:true,stopContextMenu:true});
  editorCanvas.undo=undoManual; editorCanvas.redo=redoManual;
  editorCanvas.setDimensions({width:1200,height:800});editorCanvas.backgroundColor='rgba(0,0,0,0)';
  manualDocumentSize={width:1200,height:800}; setupImageUpload();
  editorCanvas.on('selection:created',()=>{renderManualInspector();updateManualWorkspaceState();});
  editorCanvas.on('selection:updated',()=>{renderManualInspector();updateManualWorkspaceState();});
  editorCanvas.on('selection:cleared',()=>{renderManualInspector();updateManualWorkspaceState();});
  editorCanvas.on('object:moving',e=>{if(manualSnapEnabled)snapObject(e.target);});
  editorCanvas.on('object:modified',()=>{editorCanvas.getActiveObjects().forEach(o=>o.setCoords());flushManualHistory('Object modified');renderManualInspector();updateManualWorkspaceState();});
  editorCanvas.on('object:added',()=>updateManualWorkspaceState()); editorCanvas.on('object:removed',()=>updateManualWorkspaceState());
  editorCanvas.on('path:created',e=>{if(manualBrushMode==='eraser')e.path.set({globalCompositeOperation:'destination-out'});e.path.__loName=manualBrushMode==='eraser'?'Eraser':'Brush';flushManualHistory(manualBrushMode==='eraser'?'Erase':'Brush stroke');});
  editorCanvas.on('mouse:down',handleManualCanvasDown); editorCanvas.on('mouse:move',handleManualCanvasMove); editorCanvas.on('mouse:up',handleManualCanvasUp);
  window.removeEventListener('resize',resizeManualEditorCanvas);window.addEventListener('resize',resizeManualEditorCanvas);
  loadManualSelectedImages(); requestAnimationFrame(()=>resizeManualEditorCanvas()); installManualKeyboardShortcuts(); flushManualHistory('New document');
}
function snapObject(o){if(!o||!manualSnapEnabled)return;const grid=20,zoom=editorCanvas.getZoom()||1;const threshold=8/zoom;const snap=v=>Math.abs(v-Math.round(v/grid)*grid)<threshold?Math.round(v/grid)*grid:v;o.set({left:snap(o.left||0),top:snap(o.top||0)});}
function removeManualCropBox(){
  if(manualCropBox&&editorCanvas){editorCanvas.remove(manualCropBox);}
  manualCropBox=null; manualCropDragging=false; manualCropStart=null;
}
function startManualCrop(){
  const img=activeImage();
  if(!editorCanvas||!img){setManualStatus('Select an image layer before cropping');return;}
  removeManualCropBox();
  manualCurrentTool='crop';
  editorCanvas.isDrawingMode=false; editorCanvas.selection=false;
  editorCanvas.discardActiveObject();
  editorCanvas.defaultCursor='crosshair';
  setManualStatus('Drag across the image to crop');
}
function getCropRatio(){
  const ratios={'1:1':1,'4:5':.8,'3:2':1.5,'4:3':4/3,'16:9':16/9,'9:16':9/16};
  return ratios[manualCropRatio]||null;
}
function updateManualCropBox(start,end){
  const minX=Math.min(start.x,end.x), maxX=Math.max(start.x,end.x), minY=Math.min(start.y,end.y), maxY=Math.max(start.y,end.y);
  let w=Math.max(4,maxX-minX), h=Math.max(4,maxY-minY), ratio=getCropRatio();
  if(ratio){
    if(w/h>ratio) w=h*ratio; else h=w/ratio;
    if(end.x<start.x){}
    if(end.y<start.y){}
    const sx=end.x>=start.x?1:-1, sy=end.y>=start.y?1:-1;
    const cx=(start.x+end.x)/2, cy=(start.y+end.y)/2;
    let left=cx-w/2, top=cy-h/2;
    const minSize=8;
    w=Math.max(minSize,w);h=Math.max(minSize,h);
    manualCropBox?.set({left,top,width:w,height:h});
  }else{
    manualCropBox?.set({left:minX,top:minY,width:w,height:h});
  }
  manualCropBox?.setCoords(); editorCanvas.requestRenderAll();
}
function applyManualCropBox(){
  const img=manualCropTarget || activeImage(), box=manualCropBox;
  if(!img||!box){removeManualCropBox();return;}
  ensureImageCropState(img);
  const br=box.getBoundingRect(true,true);
  const corners=[
    new fabric.Point(br.left,br.top),
    new fabric.Point(br.left+br.width,br.top),
    new fabric.Point(br.left+br.width,br.top+br.height),
    new fabric.Point(br.left,br.top+br.height)
  ];
  const locals=corners.map(p=>img.toLocalPoint(p,'center','center'));
  const sourcePoints=locals.map(p=>({x:(img.cropX||0)+p.x+(img.width||1)/2,y:(img.cropY||0)+p.y+(img.height||1)/2}));
  const minX=Math.min(...sourcePoints.map(p=>p.x)), maxX=Math.max(...sourcePoints.map(p=>p.x));
  const minY=Math.min(...sourcePoints.map(p=>p.y)), maxY=Math.max(...sourcePoints.map(p=>p.y));
  const x=clamp(minX,0,img.__loBaseWidth), y=clamp(minY,0,img.__loBaseHeight);
  const w=clamp(maxX-minX,2,img.__loBaseWidth-x), h=clamp(maxY-minY,2,img.__loBaseHeight-y);
  removeManualCropBox();
  manualCropTarget=null;
  applyActualImageCropSource(img,x,y,w,h,'Manual crop');
}
function configureCanvasInteraction(type){
  if(!editorCanvas)return; editorCanvas.isDrawingMode=type==='draw'||type==='eraser';manualBrushMode=type==='eraser'?'eraser':'brush';
  editorCanvas.selection=type==='select';editorCanvas.defaultCursor=type==='pan'?'grab':type==='zoom'?'zoom-in':type==='picker'?'crosshair':type==='draw'?'crosshair':type==='eraser'?'crosshair':'default';
  if(editorCanvas.isDrawingMode){const brush=new fabric.PencilBrush(editorCanvas);brush.width=manualBrushSize;brush.color=manualBrushColor;brush.opacity=manualBrushOpacity;brush.shadow=manualBrushHardness<1?new fabric.Shadow({color:'#000',blur:(1-manualBrushHardness)*12,offsetX:0,offsetY:0}):null;editorCanvas.freeDrawingBrush=brush;}
}
function handleManualCanvasDown(opt){
  const type=manualCurrentTool;
  if(type==='crop'){
    const img=manualCropTarget || activeImage(); if(!img)return;
    removeManualCropBox();
    manualCropDragging=true; manualCropStart=editorCanvas.getPointer(opt.e);
    manualCropBox=new fabric.Rect({left:manualCropStart.x,top:manualCropStart.y,width:1,height:1,fill:'rgba(158,234,255,.08)',stroke:'#9eeaff',strokeWidth:2,strokeDashArray:[8,6],selectable:false,evented:false,excludeFromExport:true});
    editorCanvas.add(manualCropBox); editorCanvas.bringToFront(manualCropBox); editorCanvas.requestRenderAll(); return;
  }
  if(type==='pan'){manualPanning=true;manualPanLast={x:opt.e.clientX,y:opt.e.clientY};editorCanvas.defaultCursor='grabbing';return;}
  if(type==='zoom'){const p=editorCanvas.getPointer(opt.e),z=editorCanvas.getZoom(),nz=clamp(z*1.25,.1,4);editorCanvas.zoomToPoint(new fabric.Point(p.x,p.y),nz);document.getElementById('loZoomLabel').textContent=Math.round(nz*100)+'%';return;}
  if(type==='picker'){pickCanvasColor(opt);return;}
}
function handleManualCanvasMove(opt){
  if(manualCropDragging&&manualCropStart){updateManualCropBox(manualCropStart,editorCanvas.getPointer(opt.e));return;}
  if(!manualPanning)return;const dx=opt.e.clientX-manualPanLast.x,dy=opt.e.clientY-manualPanLast.y;const v=editorCanvas.viewportTransform;v[4]+=dx;v[5]+=dy;editorCanvas.requestRenderAll();manualPanLast={x:opt.e.clientX,y:opt.e.clientY};
}
function handleManualCanvasUp(){
  if(manualCropDragging){manualCropDragging=false;applyManualCropBox();return;}
  if(manualPanning){manualPanning=false;editorCanvas.defaultCursor='grab';}
}
function pickCanvasColor(opt){const p=editorCanvas.getPointer(opt.e),c=editorCanvas.lowerCanvasEl.getContext('2d');try{const d=c.getImageData(Math.round(p.x),Math.round(p.y),1,1).data;const hex='#'+[d[0],d[1],d[2]].map(x=>x.toString(16).padStart(2,'0')).join('');const input=document.getElementById('pickedColor');if(input)input.value=hex;const prev=document.getElementById('pickedColorPreview');if(prev)prev.textContent=hex.toUpperCase();manualBrushColor=hex;}catch(e){console.warn('LookOut picker failed',e);}}

/* ---------- keyboard ---------- */
function installManualKeyboardShortcuts(){if(window.__lookoutManualKeys)return;window.__lookoutManualKeys=true;document.addEventListener('keydown',e=>{if(!document.body.classList.contains('manual-editor-active')||!editorCanvas)return;const tag=e.target?.tagName?.toLowerCase();const editing=['input','textarea','select'].includes(tag)||e.target?.isContentEditable;if(editing&&!(e.ctrlKey||e.metaKey))return;const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redoManual();else undoManual();return;}if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redoManual();return;}if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateActiveObject();return;}if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveManualProject();return;}if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();editorCanvas.discardActiveObject();const sel=new fabric.ActiveSelection(canvasObjects(),{canvas:editorCanvas});editorCanvas.setActiveObject(sel);editorCanvas.renderAll();return;}
  if(e.key==='Delete'||e.key==='Backspace'){if(!editing){e.preventDefault();deleteActiveLayer();}return;}if(e.key==='Escape'){editorCanvas.discardActiveObject();editorCanvas.isDrawingMode=false;editorCanvas.renderAll();return;}
  const key=e.key.toLowerCase();const tools={v:'select',b:'draw',e:'eraser',t:'text',r:'rect',i:'addimage',c:'crop',z:'zoom',h:'pan',g:'gradient',p:'picker'};if(!mod&&tools[key]){e.preventDefault();openToolPanel(tools[key],document.querySelector(`[data-tool="${tools[key]}"]`));return;}
  if(!editing&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){const o=activeObject();if(o){e.preventDefault();const step=e.shiftKey?10:1;o.set({left:(o.left||0)+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),top:(o.top||0)+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});o.setCoords();editorCanvas.renderAll();flushManualHistory('Nudge');}}
});}

/* ---------- public compatibility helpers ---------- */
function adjustBrightness(v){updateManualAdjust('brightness',v);}function adjustContrast(v){updateManualAdjust('contrast',v);}function adjustSaturation(v){updateManualAdjust('saturation',v);}function applyFilters(s){const img=activeImage();if(!img)return;const a=getImageAdjustments(img);if(s.brightness!==undefined)a.brightness=s.brightness*100;if(s.contrast!==undefined)a.contrast=s.contrast*100;if(s.saturation!==undefined)a.saturation=s.saturation*100;applyManualImageAdjustments(img);flushManualHistory('Adjustments');}
function applyTint(c){const img=activeImage();if(!img)return;const a=getImageAdjustments(img);a.tint=c;a.tintAmount=Math.max(a.tintAmount,30);applyManualImageAdjustments(img);flushManualHistory('Tint');}
function loadAdvancedEffectsToolbar(){openToolPanel('effects');}
function renderTextInspector(){renderManualInspector();}function renderImageInspector(){renderManualInspector();}function renderColorInspector(){renderAdjustmentInspector();}function renderRetouchInspector(){renderManualInspector();}function renderMaskInspector(){renderManualInspector();}

/* Fabric convenience methods expected by existing UI */
if(typeof window!=='undefined'){
  window.editorCanvasProxy={undo:undoManual,redo:redoManual};
  Object.defineProperty(window,'editorCanvas',{get:()=>editorCanvas});
}

/* =========================================================
   LOOKOUT MANUAL EDITOR V5 — document setup / background / fit
   ========================================================= */
let manualDocumentMeta={width:1200,height:800,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null};
let manualBackgroundObject=null;

function loDocRatioPresets(){return {'1:1':[1080,1080],'4:5':[1080,1350],'3:2':[1800,1200],'4:3':[1600,1200],'16:9':[1920,1080],'9:16':[1080,1920],'21:9':[2560,1080]};}
function loGetBackground(){if(!editorCanvas)return null;return editorCanvas.getObjects().find(o=>o.__loTool==='background')||null;}
function loEnsureBackground(){
  if(!editorCanvas)return null;
  let bg=loGetBackground();
  if(!bg){
    bg=new fabric.Rect({left:0,top:0,width:manualDocumentSize.width,height:manualDocumentSize.height,fill:manualDocumentMeta.backgroundColor||'#ffffff',originX:'left',originY:'top',selectable:false,evented:false,excludeFromExport:false});
    bg.__loTool='background'; bg.__loName='Background'; bg.__loLocked=true;
    editorCanvas.add(bg); editorCanvas.sendToBack(bg); manualBackgroundObject=bg;
  }
  manualBackgroundObject=bg; bg.set({width:manualDocumentSize.width,height:manualDocumentSize.height,left:0,top:0}); bg.setCoords(); editorCanvas.sendToBack(bg); return bg;
}
function loSetBackgroundFill(fill,type='solid'){
  const bg=loEnsureBackground(); if(!bg)return;
  manualDocumentMeta.backgroundType=type;
  bg.set({fill}); bg.setCoords(); editorCanvas.sendToBack(bg); editorCanvas.renderAll(); flushManualHistory('Background: '+type);
}
function setManualBackgroundColorV5(color){
  const c=String(color||'').trim(); if(!/^#[0-9a-f]{6}$/i.test(c))return;
  manualDocumentMeta.backgroundColor=c; manualDocumentMeta.backgroundType='solid'; loSetBackgroundFill(c,'solid');
  document.querySelectorAll('[data-setup-color]').forEach(el=>el.value=c); renderBackgroundInspector(); setManualStatus('Solid background set to '+c.toUpperCase());
}
function applyManualGradientBackgroundV5(a,b,radial=false){
  manualDocumentMeta.gradientA=a;manualDocumentMeta.gradientB=b;manualDocumentMeta.backgroundType='gradient';
  const grad=new fabric.Gradient({type:radial?'radial':'linear',gradientUnits:'pixels',coords:radial?{x1:manualDocumentSize.width/2,y1:manualDocumentSize.height/2,r1:0,x2:manualDocumentSize.width/2,y2:manualDocumentSize.height/2,r2:Math.max(manualDocumentSize.width,manualDocumentSize.height)/2}:{x1:0,y1:0,x2:manualDocumentSize.width,y2:manualDocumentSize.height},colorStops:[{offset:0,color:a},{offset:1,color:b}]});
  loSetBackgroundFill(grad,'gradient');
}
function loApplyTexture(src){
  manualDocumentMeta.backgroundType='texture';manualDocumentMeta.textureSrc=src;
  fabric.Image.fromURL(src,img=>{const pattern=new fabric.Pattern({source:img.getElement(),repeat:'repeat'});loSetBackgroundFill(pattern,'texture');setManualStatus('Texture background applied');},{crossOrigin:'anonymous'});
}
function loTextureUpload(){const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>loApplyTexture(ev.target.result);reader.readAsDataURL(file);};input.click();}
function loSetDocumentSize(w,h,dpi=96,unit='px'){
  w=Math.round(clamp(safeNum(w,1200),16,12000));h=Math.round(clamp(safeNum(h,800),16,12000));dpi=Math.round(clamp(safeNum(dpi,96),36,1200));
  manualDocumentSize={width:w,height:h};manualDocumentMeta.width=w;manualDocumentMeta.height=h;manualDocumentMeta.dpi=dpi;manualDocumentMeta.unit=unit;
  editorCanvas?.setDimensions({width:document.getElementById('manualCanvasFrame')?.clientWidth||1200,height:document.getElementById('manualCanvasFrame')?.clientHeight||800});
  const bg=loGetBackground();if(bg){bg.set({width:w,height:h});bg.setCoords();editorCanvas.sendToBack(bg);}
  editorCanvas?.renderAll();requestAnimationFrame(()=>fitManualCanvas());
  updateManualDocumentInfo();
}
function loUpdateSetupDimensions(){
  const ratio=document.getElementById('loSetupRatio')?.value||'custom', w=document.getElementById('loSetupW'),h=document.getElementById('loSetupH');
  if(ratio!=='custom'&&loDocRatioPresets()[ratio]){const p=loDocRatioPresets()[ratio];w.value=p[0];h.value=p[1];}
  updateManualDocumentInfo();
}
function loSelectRatio(r){
  const presets=loDocRatioPresets();document.querySelectorAll('.lo-ratio-btn').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));
  const p=presets[r];if(p){document.getElementById('loSetupW').value=p[0];document.getElementById('loSetupH').value=p[1];document.getElementById('loSetupRatio').value=r;}
  else document.getElementById('loSetupRatio').value='custom';updateManualDocumentInfo();
}
function loApplyPresetSize(name){const p=loDocRatioPresets()[name];if(p)loSelectRatio(name);}
function loApplyDpiPreset(dpi){const el=document.getElementById('loSetupDpi');if(el)el.value=dpi;updateManualDocumentInfo();}
function updateManualDocumentInfo(){
  const w=safeNum(document.getElementById('loSetupW')?.value,manualDocumentSize.width),h=safeNum(document.getElementById('loSetupH')?.value,manualDocumentSize.height),dpi=safeNum(document.getElementById('loSetupDpi')?.value,96);
  const label=document.getElementById('loSetupResolutionLabel');if(label)label.textContent=`${Math.round(w)} × ${Math.round(h)} px • ${Math.round(dpi)} DPI`;
  const ctx=document.getElementById('loCanvasInfo');if(ctx)ctx.textContent=`${Math.round(manualDocumentSize.width)} × ${Math.round(manualDocumentSize.height)} px`;
}
function loSetupBackgroundTab(type){
  document.querySelectorAll('.lo-bg-tab').forEach(b=>b.classList.toggle('active',b.dataset.bg===type));
  const solid=document.getElementById('loSetupSolid'),grad=document.getElementById('loSetupGradient'),tex=document.getElementById('loSetupTexture');
  if(solid)solid.style.display=type==='solid'?'block':'none';if(grad)grad.style.display=type==='gradient'?'grid':'none';if(tex)tex.style.display=type==='texture'?'grid':'none';manualDocumentMeta.backgroundType=type;
}
function loApplySetupBackground(){
  const type=manualDocumentMeta.backgroundType||'solid';
  if(type==='solid')setManualBackgroundColorV5(document.querySelector('[data-setup-color]')?.value||'#ffffff');
  else if(type==='gradient')applyManualGradientBackgroundV5(document.getElementById('loSetupGradA')?.value||'#ffffff',document.getElementById('loSetupGradB')?.value||'#dbeafe',false);
  else if(type==='texture'&&manualDocumentMeta.textureSrc)loApplyTexture(manualDocumentMeta.textureSrc);
}
function loCreateDocumentFromSetup(placeImage=false){
  const w=safeNum(document.getElementById('loSetupW')?.value,1200),h=safeNum(document.getElementById('loSetupH')?.value,800),dpi=safeNum(document.getElementById('loSetupDpi')?.value,96);
  loSetDocumentSize(w,h,dpi,'px');loApplySetupBackground();
  document.getElementById('loEmptyState')?.classList.remove('lo-setup-state');document.getElementById('loEmptyState')?.style.setProperty('display','none');
  flushManualHistory('Document setup');
  if(placeImage)triggerManualImageUpload();
}
function mountManualDocumentSetup(){
  const empty=document.getElementById('loEmptyState');if(!empty)return;
  empty.classList.add('lo-setup-state');empty.style.display='flex';
  const p=loDocRatioPresets();
  empty.innerHTML=`<div class="lo-setup-card">
    <div class="lo-setup-head"><div><span class="lo-setup-kicker">LOOKOUT CANVAS SETUP</span><h3>Start a new document</h3><p>Choose the real document resolution first. Your uploaded image will fill the canvas without distortion.</p></div><span class="lo-document-chip" id="loSetupResolutionLabel">1200 × 800 px • 96 DPI</span></div>
    <div class="lo-setup-grid">
      <section class="lo-setup-section"><h4>Canvas & resolution</h4>
        <div class="lo-setup-row"><div class="lo-setup-field"><label>Width (px)</label><input id="loSetupW" type="number" min="16" max="12000" value="1200" oninput="loUpdateSetupDimensions()"></div><div class="lo-setup-field"><label>Height (px)</label><input id="loSetupH" type="number" min="16" max="12000" value="800" oninput="loUpdateSetupDimensions()"></div></div>
        <div class="lo-setup-row"><div class="lo-setup-field"><label>Resolution / DPI</label><input id="loSetupDpi" type="number" min="36" max="1200" value="96" oninput="loUpdateSetupDimensions()"></div><div class="lo-setup-field"><label>Preset</label><select id="loSetupRatio" onchange="loUpdateSetupDimensions()"><option value="custom">Custom</option><option value="1:1">1:1</option><option value="4:5">4:5</option><option value="3:2">3:2</option><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="21:9">21:9</option></select></div></div>
        <div class="lo-ratio-grid">${Object.keys(p).map(r=>`<button class="lo-ratio-btn" data-ratio="${r}" onclick="loSelectRatio('${r}')">${r}</button>`).join('')}<button class="lo-ratio-btn active" data-ratio="custom" onclick="loSelectRatio('custom')">Custom</button></div>
        <div class="lo-doc-setup-mini"><button onclick="loApplyDpiPreset(96)">Screen 96 DPI</button><button onclick="loApplyDpiPreset(150)">Draft 150 DPI</button><button onclick="loApplyDpiPreset(300)">Print 300 DPI</button></div>
      </section>
      <section class="lo-setup-section"><h4>Background</h4>
        <div class="lo-bg-tabs"><button class="lo-bg-tab active" data-bg="solid" onclick="loSetupBackgroundTab('solid')">Solid</button><button class="lo-bg-tab" data-bg="gradient" onclick="loSetupBackgroundTab('gradient')">Gradient</button><button class="lo-bg-tab" data-bg="texture" onclick="loSetupBackgroundTab('texture')">Texture</button></div>
        <div id="loSetupSolid"><div class="lo-bg-presets">${['#ffffff','#000000','#f3f4f6','#111827','#0f172a','#1e3a8a','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#e5e7eb','#94a3b8','#334155','#fde68a'].map(c=>`<button class="lo-bg-swatch" style="background:${c}" title="${c}" onclick="document.querySelector('[data-setup-color]').value='${c}';setManualBackgroundColorV5('${c}')"></button>`).join('')}</div><div class="lo-bg-actions"><label>Custom <input data-setup-color type="color" value="#ffffff" onchange="setManualBackgroundColorV5(this.value)"></label></div></div>
        <div id="loSetupGradient" class="lo-bg-gradient-controls"><label>Start <input id="loSetupGradA" type="color" value="#ffffff"></label><label>End <input id="loSetupGradB" type="color" value="#dbeafe"></label><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(document.getElementById('loSetupGradA').value,document.getElementById('loSetupGradB').value,false)">Linear</button><button class="lo-dock-btn" onclick="applyManualGradientBackgroundV5(document.getElementById('loSetupGradA').value,document.getElementById('loSetupGradB').value,true)">Radial</button></div>
        <div id="loSetupTexture" class="lo-bg-texture-controls"><span style="font-size:8px;color:var(--lo-muted)">Built-in textures or upload your own.</span><div class="lo-background-mode-grid">${loRenderTextureButtons()}</div><button onclick="loTextureUpload()"><i class="fa-solid fa-upload"></i> Upload texture</button></div>
      </section>
    </div>
    <div class="lo-setup-footer"><span class="lo-setup-note">The image will automatically <b>Fill Canvas</b> and keep its original aspect ratio.</span><button onclick="loCreateDocumentFromSetup(false)">Create Canvas</button><button class="primary" onclick="loCreateDocumentFromSetup(true)"><i class="fa-solid fa-image"></i> Create & Place Image</button></div>
  </div>`;
}

/* Make the empty state a real document setup screen after Fabric is ready. */
(function(){const oldSetup=setupProfessionalEditor; /* retained for source readability */ setTimeout(()=>{if(document.body.classList.contains('manual-editor-active'))mountManualDocumentSetup();},0);})();

/* Uploaded images fill the document by default. The user can then resize them smaller. */
function addImageToEditor(src,name='Image'){
  fabric.Image.fromURL(src,(img)=>{
    if(!img)return;
    img.__loName=name.replace(/\.[^.]+$/,'')||'Image';img.__loOriginalSrc=src;img.__loAdjustments=cloneAdjustments();
    img.__loBaseWidth=img.width||img.getElement?.()?.naturalWidth||1;img.__loBaseHeight=img.height||img.getElement?.()?.naturalHeight||1;img.__loCrop=null;img.cropX=0;img.cropY=0;
    const scale=Math.max(manualDocumentSize.width/img.__loBaseWidth,manualDocumentSize.height/img.__loBaseHeight);
    img.set({scaleX:scale,scaleY:scale,left:(manualDocumentSize.width-(img.width||0)*scale)/2,top:(manualDocumentSize.height-(img.height||0)*scale)/2});
    editorCanvas.add(img);editorCanvas.setActiveObject(img);editorCanvas.bringToFront(img);editorCanvas.renderAll();
    document.getElementById('loEmptyState')?.style.setProperty('display','none');flushManualHistory('Place image');renderManualInspector();updateManualWorkspaceState();fitManualCanvas();
  },{crossOrigin:'anonymous'});
}

/* A real background object keeps background editable and exportable. */
function loadBackgroundToolbarV5(){
  const bg=loGetBackground();const type=manualDocumentMeta.backgroundType||'solid';
  document.getElementById('secondaryToolbar').innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">Background</span><button class="lo-dock-btn" onclick="setManualBackgroundColorV5('#ffffff')">White</button><button class="lo-dock-btn" onclick="setManualBackgroundColorV5('#000000')">Black</button><button class="lo-dock-btn" onclick="loSetupBackgroundTab('gradient')">Gradient</button><button class="lo-dock-btn" onclick="loTextureUpload()">Texture</button><button class="lo-dock-btn" onclick="triggerManualImageUpload()">Add image</button></div>`;
  renderBackgroundInspectorV5();
}
function renderBackgroundInspectorV5(){
  renderSimpleInspector('Background','Document background — editable and included in export',`<div class="lo-background-tabs"><button class="active">Solid</button><button onclick="applyManualGradientBackgroundV5('#ffffff','#dbeafe')">Gradient</button><button onclick="loBuiltInTexture('paper')">Texture</button></div><div class="lo-background-presets">${['#ffffff','#000000','#f3f4f6','#111827','#0f172a','#1e3a8a','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'].map(c=>`<button style="background:${c}" title="${c}" onclick="setManualBackgroundColorV5('${c}')"></button>`).join('')}</div><div class="lo-background-custom"><label>Custom solid color</label><input id="manualBackgroundColorInspector" type="color" value="${manualDocumentMeta.backgroundColor||'#ffffff'}" onchange="setManualBackgroundColorV5(this.value)"><input type="text" value="${manualDocumentMeta.backgroundColor||'#ffffff'}" maxlength="7" onkeydown="if(event.key==='Enter')setManualBackgroundColorV5(this.value)"></div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Background is a separate locked layer. You can change it before or after adding images.</span></div>`);
}

/* Override the old background entry point with the V5 document-background system. */
function loadBackgroundToolbar(){loadBackgroundToolbarV5();}
function renderBackgroundInspector(){renderBackgroundInspectorV5();}

/* Keep document metadata in project files. */
function saveManualProject(){
  if(!editorCanvas)return;
  const data={name:document.getElementById('loProjectName')?.textContent||'Untitled Project',width:manualDocumentSize.width,height:manualDocumentSize.height,document:manualDocumentMeta,canvas:editorCanvas.toJSON(MANUAL_CUSTOM_PROPS),savedAt:new Date().toISOString()};
  localStorage.setItem('lookoutManualProject',JSON.stringify(data));setManualStatus('Project saved locally');
}
function loadSavedManualProject(){try{const raw=localStorage.getItem('lookoutManualProject');if(!raw)return;const p=JSON.parse(raw);if(!p.canvas)return;manualDocumentSize={width:p.width||1200,height:p.height||800};manualDocumentMeta=Object.assign(manualDocumentMeta,p.document||{});editorCanvas.loadFromJSON(p.canvas,()=>{editorCanvas.renderAll();manualHistory=[];manualHistoryIndex=-1;flushManualHistory('Open saved project');if(p.name&&document.getElementById('loProjectName'))document.getElementById('loProjectName').textContent=p.name;fitManualCanvas();updateManualDocumentInfo();});}catch(e){console.warn('LookOut: saved project load failed',e);}}

/* Keep the document setup available after opening a blank project. */
function resetToDocumentSetup(){canvasObjects().forEach(o=>editorCanvas.remove(o));manualDocumentSize={width:1200,height:800};manualDocumentMeta={width:1200,height:800,dpi:96,unit:'px',backgroundType:'solid',backgroundColor:'#ffffff',gradientA:'#ffffff',gradientB:'#dbeafe',textureSrc:null};editorCanvas.renderAll();mountManualDocumentSetup();}

/* Mount setup whenever the Manual Edit shell is created (openManualEdit injects it dynamically). */
if(!window.__lookoutManualSetupObserver){
  window.__lookoutManualSetupObserver=new MutationObserver(()=>{
    if(document.body.classList.contains('manual-editor-active')&&document.getElementById('loEmptyState')&&editorCanvas&&!canvasObjects().length&&!document.querySelector('.lo-setup-card,.lo-setup-v8')){
      mountManualDocumentSetup();
    }
  });
  window.__lookoutManualSetupObserver.observe(document.body,{childList:true,subtree:true});
}
if(!window.__lookoutManualThemeObserver){window.__lookoutManualThemeObserver=new MutationObserver(()=>updateManualSidebarControls());window.__lookoutManualThemeObserver.observe(document.body,{attributes:true,attributeFilter:['class','data-ui-style']});}


/* Built-in textures: lightweight procedural patterns, plus user uploads. */
function loBuiltInTexture(kind){
  const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');
  x.clearRect(0,0,96,96);x.fillStyle='#f2f2f2';x.fillRect(0,0,96,96);
  if(kind==='paper'){x.fillStyle='rgba(120,120,120,.07)';for(let i=0;i<900;i++){x.fillRect(Math.random()*96,Math.random()*96,1,1);}}
  else if(kind==='canvas'){x.strokeStyle='rgba(80,90,100,.12)';for(let i=0;i<=96;i+=6){x.beginPath();x.moveTo(i,0);x.lineTo(i,96);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(96,i);x.stroke();}}
  else if(kind==='grid'){x.strokeStyle='rgba(80,100,120,.16)';for(let i=0;i<=96;i+=12){x.beginPath();x.moveTo(i,0);x.lineTo(i,96);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(96,i);x.stroke();}}
  else if(kind==='dots'){x.fillStyle='rgba(70,90,110,.22)';for(let yy=6;yy<96;yy+=16)for(let xx=6;xx<96;xx+=16){x.beginPath();x.arc(xx,yy,1.5,0,Math.PI*2);x.fill();}}
  else if(kind==='diagonal'){x.strokeStyle='rgba(80,100,120,.12)';x.lineWidth=5;for(let i=-96;i<192;i+=18){x.beginPath();x.moveTo(i,0);x.lineTo(i+96,96);x.stroke();}}
  else if(kind==='noise'){const d=x.getImageData(0,0,96,96);for(let i=0;i<d.data.length;i+=4){const n=225+Math.floor(Math.random()*25);d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255;}x.putImageData(d,0,0);}
  loSetBackgroundFill(new fabric.Pattern({source:c,repeat:'repeat'}),'texture');manualDocumentMeta.textureSrc='builtin:'+kind;setManualStatus('Texture: '+kind);renderBackgroundInspectorV5();
}
function loRenderTextureButtons(){return ['paper','canvas','grid','dots','diagonal','noise'].map(k=>`<button type="button" onclick="loBuiltInTexture('${k}')">${k[0].toUpperCase()+k.slice(1)}</button>`).join('');}
