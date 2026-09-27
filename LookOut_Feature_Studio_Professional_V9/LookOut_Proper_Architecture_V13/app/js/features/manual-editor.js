/* =====================================================
   LOOKOUT MANUAL EDITOR
   ===================================================== */

/* Manual editor page */
/* ================= PROFESSIONAL MANUAL EDITOR ================= */

function mountManualSidebarUtilities(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    let utilities=document.getElementById('manualSidebarUtilities');
    if(!utilities){
      utilities=document.createElement('div');
      utilities.id='manualSidebarUtilities';
      utilities.className='manual-sidebar-utilities';
      utilities.innerHTML=`
        <button class="manual-sidebar-util" type="button" title="Light / Dark" onclick="toggleTheme();updateManualSidebarControls()">
          <i id="manualThemeIcon" class="fa-solid fa-moon"></i><span>Theme</span>
        </button>
        <button class="manual-sidebar-util" type="button" title="LookOut UI style" onclick="toggleUIStyle();updateManualSidebarControls()">
          <i id="manualStyleIcon" class="fa-solid fa-sliders"></i><span id="manualStyleText">Pro</span>
        </button>
        <button class="manual-sidebar-util" type="button" title="Quick Actions" data-manual-action="quick" onclick="toggleManualSidebarPanel('quick',this)">
          <i class="fa-solid fa-bolt"></i><span>Quick</span>
        </button>
        <button class="manual-sidebar-util" type="button" title="Explore Features" data-manual-action="explore" onclick="toggleManualSidebarPanel('explore',this)">
          <i class="fa-solid fa-grip"></i><span>Explore</span>
        </button>
        <div class="manual-sidebar-popover" id="manualSidebarPopover" aria-hidden="true"></div>`;
      const bottom=sidebar.querySelector('.bottom-icons');
      if(bottom){
        sidebar.insertBefore(utilities,bottom);
        let assistant=bottom.querySelector('.manual-sidebar-assistant');
        if(!assistant){
          assistant=document.createElement('button');
          assistant.className='manual-sidebar-util manual-sidebar-assistant';
          assistant.type='button';
          assistant.title='AI Assistant';
          assistant.setAttribute('aria-label','Open AI Assistant');
          assistant.innerHTML='<i class="fa-solid fa-microphone"></i><span>Assistant</span>';
          bottom.insertBefore(assistant,bottom.querySelector('.logout')||null);
        }
        assistant.onclick=()=>openManualAssistant();
      } else sidebar.appendChild(utilities);
    }
    utilities.hidden=false;
    document.getElementById('themeToggle')?.classList.add('manual-control-hidden');
    document.getElementById('uiStyleToggle')?.classList.add('manual-control-hidden');
    document.getElementById('lookoutWorkspaceDock')?.classList.add('manual-dock-hidden');
    updateManualSidebarControls();
}

function updateManualSidebarControls(){
    const themeIcon=document.getElementById('manualThemeIcon');
    const styleIcon=document.getElementById('manualStyleIcon');
    const styleText=document.getElementById('manualStyleText');
    if(themeIcon) themeIcon.className=document.body.classList.contains('dark-mode')?'fa-solid fa-sun':'fa-solid fa-moon';
    if(styleIcon) styleIcon.className=document.body.classList.contains('professional-mode')?'fa-solid fa-layer-group':'fa-solid fa-sliders';
    if(styleText) styleText.textContent=document.body.classList.contains('professional-mode')?'Glass':'Pro';
}

function positionManualSidebarPopover(anchor, pop){
    if(!anchor || !pop) return;
    const rect=anchor.getBoundingClientRect();
    const margin=10;
    const width=Math.min(280, Math.max(230, pop.offsetWidth || 250));
    const height=pop.offsetHeight || 180;
    let left=rect.right + margin;
    let top=rect.top;
    if(left + width > window.innerWidth - margin) left=Math.max(margin, rect.left - width - margin);
    if(top + height > window.innerHeight - margin) top=Math.max(margin, window.innerHeight - height - margin);
    pop.style.left=`${left}px`;
    pop.style.top=`${top}px`;
    pop.style.bottom='auto';
}

function toggleManualSidebarPanel(type, anchorEl=null){
    const pop=document.getElementById('manualSidebarPopover');
    if(!pop) return;
    const anchor=anchorEl || document.querySelector(`.manual-sidebar-util[data-manual-action="${type}"]`);
    const isOpen=pop.dataset.type===type && !pop.hidden;
    if(isOpen){ closeManualSidebarPanel(); return; }

    pop.dataset.type=type;
    pop.hidden=false;
    pop.setAttribute('aria-hidden','false');

    if(type==='quick'){
      pop.innerHTML=`<div class="manual-popover-title"><strong>Quick Actions</strong><span>Everything you need</span></div>
        <div class="manual-popover-grid">
          <button type="button" onclick="openGenerator();closeManualSidebarPanel()"><i class="fa-regular fa-file-circle-plus"></i><span>New Project</span></button>
          <button type="button" onclick="window.LookOutRAG?.open();closeManualSidebarPanel()"><i class="fa-regular fa-folder-open"></i><span>Open File</span></button>
          <button type="button" onclick="openSavedProjects();closeManualSidebarPanel()"><i class="fa-solid fa-database"></i><span>Saved Projects</span></button>
          <button type="button" onclick="if(typeof window.toggleVirtualMouse==='function'){window.toggleVirtualMouse();}else{alert('Virtual mouse control is still loading.');}"><i class="fa-regular fa-hand-pointer"></i><span>Virtual Mouse</span></button>
          <button type="button" onclick="openManualAssistant();closeManualSidebarPanel()"><i class="fa-solid fa-wave-square"></i><span>Voice Command</span></button>
          <button type="button" onclick="openFeatureStore();closeManualSidebarPanel()"><i class="fa-solid fa-cart-shopping"></i><span>Feature Store</span></button>
        </div>`;
    }else{
      pop.innerHTML=`<div class="manual-popover-title"><strong>Explore Features</strong><span>Resources &amp; updates</span></div>
        <div class="manual-popover-links">
          <a href="https://github.com/nikh2951/lookout" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i><span>Visit Website</span><b>↗</b></a>
          <button type="button" onclick="openSavedProjects();closeManualSidebarPanel()"><i class="fa-regular fa-book-open"></i><span>Open Library</span><b>→</b></button>
          <button type="button" onclick="openFeatureStore();closeManualSidebarPanel()"><i class="fa-solid fa-grip"></i><span>Feature Store</span><b>→</b></button>
          <button type="button" onclick="window.LookOutOpenFeatureStudio?.();closeManualSidebarPanel()"><i class="fa-solid fa-flask"></i><span>Feature Studio</span><b>→</b></button>
        </div>`;
    }

    // The popover is fixed to the viewport so it cannot be hidden behind the editor canvas.
    requestAnimationFrame(()=>positionManualSidebarPopover(anchor, pop));
}

function closeManualSidebarPanel(){
    const p=document.getElementById('manualSidebarPopover');
    if(p){p.hidden=true;p.dataset.type='';p.setAttribute('aria-hidden','true');p.style.left='';p.style.top='';}
}

document.addEventListener('click',e=>{
    const pop=document.getElementById('manualSidebarPopover');
    if(!pop || pop.hidden || !document.body.classList.contains('manual-editor-active')) return;
    if(e.target.closest('#manualSidebarPopover,.manual-sidebar-util')) return;
    closeManualSidebarPanel();
}, true);
window.addEventListener('resize',()=>{
    const pop=document.getElementById('manualSidebarPopover');
    if(!pop || pop.hidden) return;
    const type=pop.dataset.type;
    const anchor=document.querySelector(`.manual-sidebar-util[data-manual-action="${type}"]`);
    positionManualSidebarPopover(anchor,pop);
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeManualSidebarPanel(); });
function openManualAssistant(prefill=''){
    if(window.LookOutRAG?.open){ window.LookOutRAG.open(prefill); return; }
    alert('AI Assistant is still loading.');
}
function restoreManualSidebarUtilities(){
    // Manual Edit owns its extra sidebar controls only while the editor is active.
    // Completely remove the injected controls when leaving Manual Edit so Home,
    // AI Generator, AI Edit and Feature Studio return to the original LookOut sidebar.
    closeManualSidebarPanel();
    const utilities=document.getElementById('manualSidebarUtilities');
    if(utilities) utilities.remove();
    document.querySelectorAll('.manual-sidebar-assistant').forEach(el=>el.remove());
    document.body.classList.remove('manual-editor-active');
    document.getElementById('themeToggle')?.classList.remove('manual-control-hidden');
    document.getElementById('uiStyleToggle')?.classList.remove('manual-control-hidden');
    document.getElementById('lookoutWorkspaceDock')?.classList.remove('manual-dock-hidden');
}

// Delegated click fallback: protects Feature Studio buttons from stale inline handlers
// after the Manual Edit DOM is rebuilt.
document.addEventListener('click', function(e){
    const btn=e.target.closest('[data-feature-studio="true"]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    window.LookOutOpenFeatureStudio?.();
}, true);

function openManualEdit(mode = "simple") {
    window.setWorkspacePageMode?.();
    moveIndicator(document.getElementById("workspaceIcon"));

    // Manual Edit keeps the native LookOut navigation visible so the user can
    // always return to Home / Workspace / Saved Works.
    document.querySelector(".sidebar")?.classList.remove("hidden");
    document.querySelector(".main")?.classList.remove("fullscreen");
    mainContent.classList.add("manual-editor-host");
    document.body.classList.add('manual-editor-active');
    mountManualSidebarUtilities();
    mainContent.classList.remove("home-redesign");

    const advanced = mode === "advanced";
    mainContent.innerHTML = `
    <div class="lo-editor-app ${advanced ? "is-advanced" : "is-simple"}" id="manualWorkspaceShell">
      <header class="lo-editor-topbar">
        <div class="lo-brand-mini">
          <span class="lo-brand-symbol">L</span>
          <div class="lo-brand-copy"><strong>LOOKOUT</strong><span>Manual Edit</span></div>
        </div>
        <div class="lo-project-chip"><i class="fa-regular fa-image"></i><span>Untitled Project</span><small id="loTopLayerCount">0 layers</small></div>
        <div class="lo-top-actions">
          <button class="lo-icon-btn" title="Undo" onclick="editorCanvas?.undo?.()"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="lo-icon-btn" title="Redo" onclick="editorCanvas?.redo?.()"><i class="fa-solid fa-rotate-right"></i></button>
          <span class="lo-top-divider"></span>
          <button class="lo-mode-switch" onclick="openManualEdit('${advanced ? "simple" : "advanced"}')"><i class="fa-solid ${advanced ? "fa-feather-pointed" : "fa-sliders"}"></i>${advanced ? "Simple" : "Advanced"}</button>
          <button class="lo-create-btn" data-feature-studio="true" onclick="window.LookOutOpenFeatureStudio?.()"><i class="fa-solid fa-flask"></i><span>Feature Studio</span></button>
          <button class="lo-export-btn" onclick="downloadManualEdit()">Export <i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        </div>
      </header>

      <div class="lo-contextbar">
        <div class="lo-context-left">
          <span class="lo-context-badge">${advanced ? "ADVANCED WORKSPACE" : "QUICK WORKSPACE"}</span>
          <span class="lo-context-muted">RGB / 8-bit</span>
          <span class="lo-context-muted">•</span>
          <span class="lo-context-muted" id="loCanvasInfo">0 layers</span>
        </div>
        <div class="lo-context-tools">
          <button onclick="openToolPanel('adjust',this)"><i class="fa-solid fa-wand-magic-sparkles"></i> Adjust</button>
          <button onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i> Place</button>
          <button onclick="addText()"><i class="fa-solid fa-font"></i> Type</button>
          <button onclick="window.LookOutOpenFeatureStudio?.()"><i class="fa-solid fa-flask"></i> Invent</button>
        </div>
      </div>

      <main class="lo-editor-body">
        <aside class="lo-tools-panel">
          <div class="lo-panel-label">EDIT</div>
          <div class="lo-tool-group">
            <span class="lo-group-label">NAVIGATE</span>
            <button class="lo-tool active" onclick="openToolPanel('select',this)" title="Select"><i class="fa-solid fa-arrow-pointer"></i><span>Select</span></button>
            <button class="lo-tool" onclick="openToolPanel('move',this)" title="Move"><i class="fa-solid fa-up-down-left-right"></i><span>Move</span></button>
          </div>
          <div class="lo-tool-group">
            <span class="lo-group-label">CREATE</span>
            <button class="lo-tool" onclick="openToolPanel('crop',this)" title="Crop"><i class="fa-solid fa-crop-simple"></i><span>Crop</span></button>
            <button class="lo-tool" onclick="openToolPanel('text',this)" title="Type"><i class="fa-solid fa-font"></i><span>Type</span></button>
            <button class="lo-tool" onclick="openToolPanel('addimage',this)" title="Image"><i class="fa-regular fa-image"></i><span>Image</span></button>
            <button class="lo-tool" onclick="openToolPanel('draw',this)" title="Brush"><i class="fa-solid fa-paintbrush"></i><span>Brush</span></button>
            <button class="lo-tool" onclick="openToolPanel('shape',this)" title="Shape"><i class="fa-regular fa-square"></i><span>Shape</span></button>
          </div>
          <div class="lo-tool-group">
            <span class="lo-group-label">ENHANCE</span>
            <button class="lo-tool" onclick="openToolPanel('adjust',this)" title="Adjust"><i class="fa-solid fa-sliders"></i><span>Adjust</span></button>
            ${advanced ? `
            <button class="lo-tool" onclick="openToolPanel('effects',this)" title="Effects"><i class="fa-solid fa-sparkles"></i><span>Effects</span></button>
            <button class="lo-tool" onclick="openToolPanel('color',this)" title="Color"><i class="fa-solid fa-circle-half-stroke"></i><span>Color</span></button>
            <button class="lo-tool" onclick="openToolPanel('retouch',this)" title="Retouch"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Retouch</span></button>
            </div>
            <div class="lo-tool-group">
              <span class="lo-group-label">COMPOSE</span>
              <button class="lo-tool" onclick="openToolPanel('mask',this)" title="Mask"><i class="fa-solid fa-shapes"></i><span>Mask</span></button>
              <button class="lo-tool" onclick="openToolPanel('transform',this)" title="Transform"><i class="fa-solid fa-expand"></i><span>Transform</span></button>
              <button class="lo-tool" onclick="openToolPanel('layers',this)" title="Layers"><i class="fa-solid fa-layer-group"></i><span>Layers</span></button>
            </div>` : `</div>`}
          <div class="lo-tool-bottom">
            <button class="lo-tool lo-tool-accent" onclick="window.LookOutOpenFeatureStudio?.()" title="Invent"><i class="fa-solid fa-flask"></i><span>Invent</span></button>
            <button class="lo-tool" onclick="openSavedProjects()" title="Library"><i class="fa-solid fa-folder-open"></i><span>Library</span></button>
          </div>
        </aside>

        <section class="lo-canvas-workspace">
          <div class="lo-workspace-toolbar">
            <div class="lo-tool-context" id="loToolContext"><strong>Canvas</strong><span>Choose a tool or select an object to begin</span></div>
            <div class="lo-view-controls">
              <button onclick="setManualCanvasZoom(.5)">50%</button><button onclick="setManualCanvasZoom(1)">100%</button><button onclick="fitManualCanvas()"><i class="fa-solid fa-expand"></i> Fit</button>
              <span class="lo-view-divider"></span><button title="Grid" onclick="toggleManualGrid()"><i class="fa-solid fa-table-cells-large"></i></button><button title="Snap"><i class="fa-solid fa-magnet"></i></button>
            </div>
          </div>
          <div class="lo-canvas-stage" id="manualCanvasStage">
            <div class="lo-stage-ruler lo-ruler-top"></div><div class="lo-stage-ruler lo-ruler-left"></div>
            <div class="lo-canvas-frame">
              <canvas id="editorCanvas"></canvas>
              <div class="lo-empty-state" id="loEmptyState">
                <div class="lo-empty-icon"><i class="fa-regular fa-image"></i></div>
                <div class="lo-empty-copy"><span>LOOKOUT CANVAS</span><h3>Start creating</h3><p>Place an image, add type, or open a saved project.</p></div>
                <div><button class="lo-primary-soft" onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i> Place image</button><button class="lo-secondary-soft" onclick="addText()"><i class="fa-solid fa-font"></i> Add text</button></div>
              </div>
            </div>
          </div>
          <div class="lo-bottom-dock" id="secondaryToolbar"><div class="lo-dock-inner"><span class="lo-dock-title">Context</span><span class="lo-dock-note">Tool controls will appear here when needed.</span></div></div>
          <div class="lo-statusbar"><span><i class="fa-solid fa-circle lo-ready-dot"></i> Ready</span><span id="loSelectionStatus">No selection</span><span>LookOut workspace</span><div class="lo-status-spacer"></div><span>Zoom <strong id="loZoomLabel">Fit</strong></span><button onclick="fitManualCanvas()"><i class="fa-solid fa-expand"></i></button></div>
        </section>

        <aside class="lo-inspector">
          <div class="lo-inspector-head"><div><span>INSPECTOR</span><strong id="loInspectorTitle">Properties</strong></div><button title="Collapse inspector"><i class="fa-solid fa-ellipsis"></i></button></div>
          <div class="lo-inspector-tabs"><button class="active" onclick="switchInspector('properties',this)">Properties</button><button onclick="switchInspector('layers',this)">Layers</button><button onclick="switchInspector('history',this)">History</button></div>
          <div id="loInspectorContent" class="lo-inspector-content"></div>
        </aside>
      </main>
    </div>`;

    setupProfessionalEditor();
    openToolPanel('select', document.querySelector('.lo-tool.active'));
    renderManualInspector();
    updateManualWorkspaceState();
}

function setManualCanvasZoom(scale){
    if(!editorCanvas) return;
    const s=Math.max(.25,Math.min(2,Number(scale)||1));
    editorCanvas.setZoom(s); editorCanvas.renderAll();
    const z=document.getElementById('loZoomLabel'); if(z) z.textContent=Math.round(s*100)+'%';
}
function fitManualCanvas(){
    if(!editorCanvas) return;
    editorCanvas.setZoom(1); editorCanvas.renderAll();
    const z=document.getElementById('loZoomLabel'); if(z) z.textContent='Fit';
}
function toggleManualGrid(){ document.getElementById('manualCanvasStage')?.classList.toggle('show-grid'); }
function switchInspector(panel,btn){
    document.querySelectorAll('.lo-inspector-tabs button').forEach(b=>b.classList.remove('active')); btn?.classList.add('active');
    if(panel==='layers') renderLayerInspector(); else if(panel==='history') renderHistoryInspector(); else renderManualInspector();
}
function renderManualInspector(){
    const box=document.getElementById('loInspectorContent'); if(!box) return;
    const o=getActiveCanvasObject();
    if(!o){ box.innerHTML=`<div class="lo-inspector-empty"><div class="lo-inspector-icon"><i class="fa-solid fa-sliders"></i></div><h3>Properties</h3><p>Select an object on the canvas to edit its exact properties.</p><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Use the tools on the left for quick editing, or switch to Advanced for deeper controls.</span></div></div>`; return; }
    box.innerHTML=`<div class="lo-inspector-section"><div class="lo-section-title">${o.type==='image'?'IMAGE':o.type==='i-text'?'TYPOGRAPHY':'OBJECT'}<span>${o.type}</span></div>
      <div class="lo-field-row"><label>X</label><input type="number" value="${Math.round(o.left||0)}" onchange="setActiveProp('left',this.value)"><label>Y</label><input type="number" value="${Math.round(o.top||0)}" onchange="setActiveProp('top',this.value)"></div>
      <div class="lo-field-row"><label>W</label><input type="number" value="${Math.round((o.width||0)*(o.scaleX||1))}" onchange="setActiveSize('width',this.value)"><label>H</label><input type="number" value="${Math.round((o.height||0)*(o.scaleY||1))}" onchange="setActiveSize('height',this.value)"></div>
      <div class="lo-range-field"><div><span>Opacity</span><strong>${Math.round((o.opacity??1)*100)}%</strong></div><input type="range" min="0" max="100" value="${Math.round((o.opacity??1)*100)}" oninput="changeObjectOpacity(this.value);renderManualInspector()"></div>
      <div class="lo-range-field"><div><span>Rotation</span><strong>${Math.round(o.angle||0)}°</strong></div><input type="range" min="-180" max="180" value="${Math.round(o.angle||0)}" oninput="setActiveProp('angle',this.value)"></div>
      <div class="lo-select-field"><label>Blend mode</label><select onchange="changeBlend(this.value)"><option>source-over</option><option>multiply</option><option>screen</option><option>overlay</option><option>darken</option><option>lighten</option></select></div>
      ${o.type==='i-text'||o.type==='text'||o.type==='textbox'?`<div class="lo-divider-line"></div><div class="lo-section-title">TYPE</div><div class="lo-select-field"><label>Font</label><select onchange="setActiveProp('fontFamily',this.value)"><option>Segoe UI</option><option>Arial</option><option>Georgia</option><option>Inter</option><option>Courier New</option></select></div><div class="lo-field-row"><label>Size</label><input type="number" value="${o.fontSize||50}" onchange="changeTextSize(this.value)"><button onclick="toggleTextStyle('fontWeight','bold','normal')"><i class="fa-solid fa-bold"></i></button><button onclick="toggleTextStyle('fontStyle','italic','normal')"><i class="fa-solid fa-italic"></i></button></div>`:''}</div>
      <div class="lo-inspector-actions"><button onclick="deleteActiveLayer()"><i class="fa-solid fa-trash"></i> Delete</button><button onclick="duplicateActiveObject()"><i class="fa-regular fa-copy"></i> Duplicate</button></div>`;
}
function renderLayerInspector(){
    const box=document.getElementById('loInspectorContent'); if(!box) return;
    const items=editorCanvas?editorCanvas.getObjects():[];
    box.innerHTML=`<div class="lo-layer-header"><strong>Layers</strong><button onclick="triggerManualImageUpload()"><i class="fa-solid fa-plus"></i></button></div><div class="lo-layer-list">${items.slice().reverse().map((o,i)=>`<button class="lo-layer-item" onclick="selectLayerByIndex(${items.length-1-i})"><i class="fa-solid ${o.type==='image'?'fa-image':o.type.includes('text')?'fa-font':'fa-square'}"></i><span>${o.type==='image'?'Image':(o.text||'Shape').slice(0,22)}</span><i class="fa-regular fa-eye"></i></button>`).join('') || '<div class="lo-no-layers">No layers yet</div>'}</div>`;
}
function renderHistoryInspector(){
    const box=document.getElementById('loInspectorContent'); if(!box) return;
    box.innerHTML=`<div class="lo-history-head"><strong>History</strong><span>Recent actions</span></div><div class="lo-history-list"><div class="active"><i class="fa-solid fa-circle"></i> Current document</div><div><i class="fa-regular fa-circle"></i> Place image</div><div><i class="fa-regular fa-circle"></i> Add text</div><div><i class="fa-regular fa-circle"></i> Adjust image</div></div>`;
}
function selectLayerByIndex(i){ const o=editorCanvas?.getObjects()[i]; if(!o)return; editorCanvas.setActiveObject(o); editorCanvas.renderAll(); renderManualInspector(); updateManualWorkspaceState(); }
function setActiveProp(prop,value){const o=getActiveCanvasObject(); if(!o)return; o.set(prop, prop==='left'||prop==='top'||prop==='angle'?Number(value):value); editorCanvas.renderAll(); renderManualInspector();}
function setActiveSize(prop,value){const o=getActiveCanvasObject(); if(!o)return; const base=o[prop]||1; o.set(prop==='width'?'scaleX':'scaleY',Number(value)/base); editorCanvas.renderAll(); renderManualInspector();}
function duplicateActiveObject(){const o=getActiveCanvasObject(); if(!o)return; o.clone(clone=>{clone.set({left:(o.left||0)+24,top:(o.top||0)+24});editorCanvas.add(clone);editorCanvas.setActiveObject(clone);editorCanvas.renderAll();renderManualInspector();});}
function updateManualWorkspaceState(){
    const o=getActiveCanvasObject(); const empty=document.getElementById('loEmptyState'); if(empty) empty.style.display=(editorCanvas?.getObjects().length?'none':'flex');
    const s=document.getElementById('loSelectionStatus'); if(s) s.textContent=o ? `Selected: ${o.type}` : 'No selection';
    const layerCount=editorCanvas?.getObjects().length||0; const info=document.getElementById('loCanvasInfo'); if(info) info.textContent=`${layerCount} layers`; const topCount=document.getElementById('loTopLayerCount'); if(topCount) topCount.textContent=`${layerCount} layers`;
    const ctx=document.getElementById('loToolContext'); if(ctx) ctx.innerHTML=o?`<strong>${o.type==='image'?'Image':o.type.includes('text')?'Typography':'Object'}</strong><span>Selected object • Use Properties to refine</span>`:`<strong>Canvas</strong><span>Select an object to inspect it</span>`;
}

/* Fabric canvas instance */
let editorCanvas;

/* ================= SETUP ================= */

/* Final manual editor implementation */
/* ================= MANUAL EDITOR UPGRADE ================= */

const manualAdjustState = {
    brightness:0,
    exposure:0,
    tint:"#ffffff",
    tintAmount:0,
    saturation:0,
    sharpness:0,
    softness:0,
    shadow:"#000000",
    shadowAmount:0,
    midtone:"#808080",
    midtoneAmount:0,
    highlight:"#ffffff",
    highlightAmount:0,
    curveBlack:0,
    curveMid:0,
    curveWhite:0
};

let manualImageInput = null;

function getActiveCanvasObject(){
    if(!editorCanvas) return null;
    return editorCanvas.getActiveObject();
}

function getActiveImage(){
    const obj = getActiveCanvasObject();
    if(!obj || obj.type !== "image"){
        return null;
    }
    return obj;
}

function updateManualAdjust(key,value){
    manualAdjustState[key] = Number(value);
    applyManualImageAdjustments();
}

function updateManualColor(key,value){
    manualAdjustState[key] = value;
    applyManualImageAdjustments();
}

function addFilter(filters,FilterClass,settings){
    if(FilterClass){
        filters.push(new FilterClass(settings));
    }
}

function applyManualImageAdjustments(){
    const obj = getActiveImage();
    if(!obj) return;

    const filters = [];
    const f = fabric.Image.filters;
    const brightness = manualAdjustState.brightness / 100;
    const exposure = manualAdjustState.exposure / 100;
    const saturation = manualAdjustState.saturation / 100;
    const softness = manualAdjustState.softness / 100;
    const sharpness = manualAdjustState.sharpness / 100;
    const tintAmount = manualAdjustState.tintAmount / 100;
    const shadowAmount = manualAdjustState.shadowAmount / 100;
    const midtoneAmount = manualAdjustState.midtoneAmount / 100;
    const highlightAmount = manualAdjustState.highlightAmount / 100;
    const curveBlack = manualAdjustState.curveBlack / 100;
    const curveMid = manualAdjustState.curveMid / 100;
    const curveWhite = manualAdjustState.curveWhite / 100;

    if(brightness !== 0){
        addFilter(filters,f.Brightness,{ brightness });
    }

    if(exposure !== 0 || curveBlack !== 0 || curveWhite !== 0){
        addFilter(filters,f.Contrast,{
            contrast: Math.max(-1,Math.min(1,exposure + curveWhite - curveBlack))
        });
    }

    if(saturation !== 0 || curveMid !== 0){
        addFilter(filters,f.Saturation,{
            saturation: Math.max(-1,Math.min(1,saturation + curveMid * 0.5))
        });
    }

    if(softness > 0){
        addFilter(filters,f.Blur,{ blur: Math.min(0.9,softness) });
    }

    if(sharpness > 0 && f.Convolute){
        const s = sharpness;
        addFilter(filters,f.Convolute,{
            matrix:[0,-s,0,-s,1 + 4 * s,-s,0,-s,0]
        });
    }

    if(tintAmount > 0){
        addFilter(filters,f.BlendColor,{
            color:manualAdjustState.tint,
            mode:"tint",
            alpha:tintAmount
        });
    }

    if(shadowAmount > 0){
        addFilter(filters,f.BlendColor,{
            color:manualAdjustState.shadow,
            mode:"multiply",
            alpha:shadowAmount * 0.45
        });
    }

    if(midtoneAmount > 0){
        addFilter(filters,f.BlendColor,{
            color:manualAdjustState.midtone,
            mode:"overlay",
            alpha:midtoneAmount * 0.45
        });
    }

    if(highlightAmount > 0){
        addFilter(filters,f.BlendColor,{
            color:manualAdjustState.highlight,
            mode:"screen",
            alpha:highlightAmount * 0.45
        });
    }

    obj.filters = filters;
    obj.applyFilters();
    editorCanvas.renderAll();
}

function loadAdjustToolbar(){
    const toolbar = document.getElementById("secondaryToolbar");
    if(!toolbar) return;
    toolbar.innerHTML = `<div class="lo-dock-inner"><span class="lo-dock-title">Adjust</span><button class="lo-dock-btn" onclick="focusInspectorSection('light')">Light</button><button class="lo-dock-btn" onclick="focusInspectorSection('color')">Color</button><button class="lo-dock-btn" onclick="focusInspectorSection('detail')">Detail</button><button class="lo-dock-btn" onclick="focusInspectorSection('curves')">Curves</button><button class="lo-dock-btn" onclick="resetManualAdjustments()"><i class="fa-solid fa-rotate-left"></i> Reset</button><span class="lo-dock-note">Fine controls are in the Inspector.</span></div>`;
    renderAdjustmentInspector();
}
function focusInspectorSection(section){
    const el=document.querySelector(`[data-inspector-section="${section}"]`);
    el?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderAdjustmentInspector(){
    const box=document.getElementById('loInspectorContent');
    if(!box) return;
    const a=manualAdjustState;
    box.innerHTML=`
      <div class="lo-inspector-section adjustment-inspector">
        <div class="lo-inspector-summary"><span>IMAGE ADJUSTMENT</span><small>Non-destructive controls</small></div>
        <div class="lo-adjust-group" data-inspector-section="light"><div class="lo-adjust-heading"><strong>Light</strong><span>Exposure & tone</span></div>
          ${adjustRange('Brightness','brightness',a.brightness,-100,100,'fa-sun')}
          ${adjustRange('Exposure','exposure',a.exposure,-100,100,'fa-circle-half-stroke')}
          ${adjustRange('Contrast','curveWhite',a.curveWhite,-100,100,'fa-adjust')}
          ${adjustRange('Highlights','highlightAmount',a.highlightAmount,0,100,'fa-lightbulb')}
          ${adjustRange('Shadows','shadowAmount',a.shadowAmount,0,100,'fa-moon')}
        </div>
        <div class="lo-adjust-group" data-inspector-section="color"><div class="lo-adjust-heading"><strong>Color</strong><span>Chromatic balance</span></div>
          ${adjustRange('Saturation','saturation',a.saturation,-100,100,'fa-droplet')}
          ${adjustColorRange('Tint','tint','tintAmount',a.tint,a.tintAmount,'fa-eye-dropper')}
          ${adjustColorRange('Shadows','shadow','shadowAmount',a.shadow,a.shadowAmount,'fa-circle')}
          ${adjustColorRange('Midtones','midtone','midtoneAmount',a.midtone,a.midtoneAmount,'fa-circle-half-stroke')}
          ${adjustColorRange('Highlights','highlight','highlightAmount',a.highlight,a.highlightAmount,'fa-sun')}
        </div>
        <div class="lo-adjust-group" data-inspector-section="detail"><div class="lo-adjust-heading"><strong>Detail</strong><span>Clarity & texture</span></div>
          ${adjustRange('Sharpness','sharpness',a.sharpness,0,100,'fa-wand-magic-sparkles')}
          ${adjustRange('Softness','softness',a.softness,0,100,'fa-feather')}
        </div>
        <div class="lo-adjust-group" data-inspector-section="curves"><div class="lo-adjust-heading"><strong>Curves</strong><span>Three-point tone shaping</span></div>
          ${adjustRange('Black point','curveBlack',a.curveBlack,-100,100,'fa-circle')}
          ${adjustRange('Mid point','curveMid',a.curveMid,-100,100,'fa-circle-half-stroke')}
          ${adjustRange('White point','curveWhite',a.curveWhite,-100,100,'fa-circle')}
        </div>
        <button class="lo-wide-action" onclick="resetManualAdjustments()"><i class="fa-solid fa-rotate-left"></i> Reset all adjustments</button>
      </div>`;
}
function adjustRange(label,key,value,min,max,icon){
    return `<label class="lo-inspector-range"><div><span><i class="fa-solid ${icon}"></i>${label}</span><strong>${Math.round(Number(value)||0)}</strong></div><input type="range" min="${min}" max="${max}" value="${value}" oninput="updateManualAdjust('${key}',this.value);renderAdjustmentInspector()"></label>`;
}
function adjustColorRange(label,colorKey,amountKey,color,amount,icon){
    return `<div class="lo-color-range"><div class="lo-inspector-range"><div><span><i class="fa-solid ${icon}"></i>${label}</span><strong>${Math.round(Number(amount)||0)}</strong></div><input type="range" min="0" max="100" value="${amount}" oninput="updateManualAdjust('${amountKey}',this.value);renderAdjustmentInspector()"></div><input class="lo-color-swatch" type="color" value="${color}" title="${label} color" onchange="updateManualColor('${colorKey}',this.value);renderAdjustmentInspector()"></div>`;
}

function resetManualAdjustments(){
    Object.assign(manualAdjustState,{brightness:0,exposure:0,tint:"#ffffff",tintAmount:0,saturation:0,sharpness:0,softness:0,shadow:"#000000",shadowAmount:0,midtone:"#808080",midtoneAmount:0,highlight:"#ffffff",highlightAmount:0,curveBlack:0,curveMid:0,curveWhite:0});
    const obj = getActiveImage();
    if(obj){
        obj.filters = [];
        obj.applyFilters();
        editorCanvas.renderAll();
    }
    loadAdjustToolbar();
}

function loadCropToolbar(){
    const toolbar = document.getElementById("secondaryToolbar");
    toolbar.innerHTML = `
    <div class="editor-panel compact-panel">
        <div class="panel-section-title">Crop</div>
        <button class="crop-btn" onclick="applyCropPreset('free')">Free</button>
        <button class="crop-btn" onclick="applyCropPreset('1:1')">1:1</button>
        <button class="crop-btn" onclick="applyCropPreset('4:5')">4:5</button>
        <button class="crop-btn" onclick="applyCropPreset('16:9')">16:9</button>
        <button class="crop-btn" onclick="applyCropPreset('circle')">Circle</button>
        <button class="crop-btn danger-soft" onclick="clearCrop()">Clear</button>
    </div>
    `;
}

function applyCropPreset(type){
    const obj = getActiveImage();
    if(!obj) return;
    if(type === "free"){
        obj.clipPath = null;
        editorCanvas.renderAll();
        return;
    }
    if(type === "circle"){
        const radius = Math.min(obj.width,obj.height) / 2;
        obj.clipPath = new fabric.Circle({ radius, originX:"center", originY:"center" });
        editorCanvas.renderAll();
        return;
    }
    const ratios = { "1:1":1, "4:5":4/5, "16:9":16/9 };
    const ratio = ratios[type] || 1;
    let cropWidth = obj.width;
    let cropHeight = cropWidth / ratio;
    if(cropHeight > obj.height){
        cropHeight = obj.height;
        cropWidth = cropHeight * ratio;
    }
    obj.clipPath = new fabric.Rect({ width:cropWidth, height:cropHeight, originX:"center", originY:"center", rx:type === "1:1" ? 12 : 0, ry:type === "1:1" ? 12 : 0 });
    editorCanvas.renderAll();
}

function clearCrop(){
    const obj = getActiveImage();
    if(!obj) return;
    obj.clipPath = null;
    editorCanvas.renderAll();
}

function loadTextToolbar(){
    const toolbar = document.getElementById("secondaryToolbar");
    toolbar.innerHTML = `
    <div class="editor-panel compact-panel">
        <div class="panel-section-title">Text</div>
        <button class="text-tool" onclick="addText()"><i class="fa-solid fa-plus"></i></button>
        <button class="text-tool" onclick="toggleTextStyle('fontWeight','bold','normal')"><i class="fa-solid fa-bold"></i></button>
        <button class="text-tool" onclick="toggleTextStyle('fontStyle','italic','normal')"><i class="fa-solid fa-italic"></i></button>
        <button class="text-tool" onclick="toggleTextUnderline()"><i class="fa-solid fa-underline"></i></button>
        <label class="control-pill small-control"><span>Size</span><input type="range" min="16" max="160" value="50" oninput="changeTextSize(this.value)"></label>
        <label class="text-tool color-square"><input type="color" value="#ffffff" onchange="changeTextColor(this.value)"></label>
        <button class="text-tool" onclick="setTextAlign('left')"><i class="fa-solid fa-align-left"></i></button>
        <button class="text-tool" onclick="setTextAlign('center')"><i class="fa-solid fa-align-center"></i></button>
        <button class="text-tool" onclick="setTextAlign('right')"><i class="fa-solid fa-align-right"></i></button>
    </div>
    `;
}

function loadAddImageToolbar(){
    const toolbar = document.getElementById("secondaryToolbar");
    toolbar.innerHTML = `
    <div class="editor-panel compact-panel">
        <div class="panel-section-title">Add Image</div>
        <button class="editor-action-btn" onclick="triggerManualImageUpload()"><i class="fa-solid fa-image"></i> Add</button>
        <button class="crop-btn" onclick="applyCropPreset('1:1')">Crop 1:1</button>
        <button class="crop-btn" onclick="applyCropPreset('4:5')">Crop 4:5</button>
        <label class="control-pill small-control"><span>Opacity</span><input type="range" min="0" max="100" value="100" oninput="changeObjectOpacity(this.value)"></label>
        <select class="editor-select" onchange="changeBlend(this.value)">
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
        </select>
    </div>
    `;
}

function openToolPanel(type,element){
    document.querySelectorAll(".lo-tool,.tool-icon,.manual-rail-btn").forEach(icon => icon.classList.remove("active-tool","active"));
    if(element) element.classList.add(element.classList.contains("lo-tool") || element.classList.contains("manual-rail-btn") ? "active" : "active-tool");
    const titleMap={select:'Selection',move:'Move',crop:'Crop',text:'Typography',addimage:'Image',draw:'Brush',shape:'Shape',adjust:'Adjust',effects:'Effects',mask:'Mask',layers:'Layers',color:'Color',transform:'Transform',retouch:'Retouch'};
    const descMap={select:'Select and refine an object',move:'Move, align and duplicate objects',crop:'Frame the composition',text:'Create and style typography',addimage:'Place image content',draw:'Paint with a LookOut brush',shape:'Create vector-like shapes',adjust:'Balance light, color and detail',effects:'Apply visual treatments',mask:'Control visibility and composition',layers:'Organize your project',color:'Shape the color language',transform:'Scale, rotate and flip',retouch:'Refine image surfaces'};
    const ctx=document.getElementById('loToolContext');
    if(ctx) ctx.innerHTML=`<strong>${titleMap[type]||'Tool'}</strong><span>${descMap[type]||'Contextual editing controls'}</span>`;
    const bottom=document.getElementById('secondaryToolbar');
    if(bottom && type!=='adjust') bottom.innerHTML=`<div class="lo-dock-inner"><span class="lo-dock-title">${titleMap[type]||'Context'}</span><span class="lo-dock-note">Contextual options are shown in the Inspector.</span></div>`;
    if(type === "select" || type === "move") { loadSelectToolbar(type); renderManualInspector(); }
    else if(type === "draw") { loadDrawToolbar(); renderManualInspector(); }
    else if(type === "shape") { loadShapeToolbar(); renderManualInspector(); }
    else if(type === "color") { loadColorToolbar(); renderColorInspector(); }
    else if(type === "transform") { loadTransformToolbar(); renderTransformInspector(); }
    else if(type === "retouch") { loadRetouchToolbar(); renderRetouchInspector(); }
    else if(type === "adjust") { loadAdjustToolbar(); }
    else if(type === "crop") { loadCropToolbar(); renderCropInspector(); }
    else if(type === "text") { loadTextToolbar(); renderTextInspector(); }
    else if(type === "addimage") { loadAddImageToolbar(); renderImageInspector(); }
    else if(type === "layers") { loadAdvancedLayersToolbar(); renderLayerInspector(); }
    else if(type === "effects") { loadAdvancedEffectsToolbar(); renderEffectsInspector(); }
    else if(type === "mask") { loadAdvancedMaskToolbar(); renderMaskInspector(); }
}

function renderSimpleInspector(title,description,content){
    const box=document.getElementById('loInspectorContent'); if(!box)return;
    box.innerHTML=`<div class="lo-inspector-section"><div class="lo-inspector-summary"><span>${title.toUpperCase()}</span><small>${description}</small></div>${content}</div>`;
}
function renderTextInspector(){ renderManualInspector(); }
function renderImageInspector(){ renderManualInspector(); }
function renderCropInspector(){ renderSimpleInspector('Crop','Choose a framing method',`<div class="lo-option-grid"><button onclick="applyCropPreset('free')">Free</button><button onclick="applyCropPreset('1:1')">1:1</button><button onclick="applyCropPreset('4:5')">4:5</button><button onclick="applyCropPreset('16:9')">16:9</button><button onclick="applyCropPreset('circle')">Circle</button><button onclick="clearCrop()">Clear</button></div>`); }
function renderEffectsInspector(){ renderSimpleInspector('Effects','Fast visual treatments',`<div class="lo-option-grid"><button onclick="applyAdvancedEffect('grayscale')">Grayscale</button><button onclick="applyAdvancedEffect('sepia')">Sepia</button><button onclick="applyAdvancedEffect('invert')">Invert</button></div>`); }
function renderMaskInspector(){ renderSimpleInspector('Masks','Shape the visible area',`<div class="lo-option-grid"><button onclick="applyCropPreset('circle')">Circle</button><button onclick="applyCropPreset('1:1')">Square</button><button onclick="clearCrop()">Clear</button></div>`); }
function renderColorInspector(){ renderAdjustmentInspector(); }
function renderTransformInspector(){ renderSimpleInspector('Transform','Precise object movement',`<div class="lo-option-grid"><button onclick="setActiveProp('angle',0)">Reset rotation</button><button onclick="flipActive('x')">Flip X</button><button onclick="flipActive('y')">Flip Y</button></div>`); }
function renderRetouchInspector(){ renderSimpleInspector('Retouch','Refine an image surface',`<div class="lo-option-grid"><button onclick="loadAdvancedEffectsToolbar()">Surface smooth</button><button onclick="loadAdvancedEffectsToolbar()">Enhance detail</button><button onclick="loadAdvancedEffectsToolbar()">Recover highlights</button></div><div class="lo-inspector-hint"><i class="fa-solid fa-circle-info"></i><span>Retouch operations can be expanded with feature modules later.</span></div>`); }


function loadSelectToolbar(type){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">${type==='move'?'Move & Align':'Selection'}</div><button class="lo-dock-btn" onclick="duplicateActiveObject()"><i class="fa-regular fa-copy"></i> Duplicate</button><button class="lo-dock-btn" onclick="moveActiveLayer('up')"><i class="fa-solid fa-arrow-up"></i> Bring forward</button><button class="lo-dock-btn" onclick="moveActiveLayer('down')"><i class="fa-solid fa-arrow-down"></i> Send backward</button><button class="lo-dock-btn" onclick="deleteActiveLayer()"><i class="fa-solid fa-trash"></i> Delete</button></div>`;
}
function loadDrawToolbar(){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">Brush</div><label class="lo-dock-control">Size <input type="range" min="1" max="80" value="12"></label><label class="lo-dock-control">Opacity <input type="range" min="1" max="100" value="100"></label><button class="lo-dock-btn"><i class="fa-solid fa-droplet"></i> Color</button><button class="lo-dock-btn"><i class="fa-solid fa-feather"></i> Soft brush</button></div>`;
}
function loadShapeToolbar(){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">Shapes</div><button class="lo-dock-btn" onclick="addShape('rect')"><i class="fa-regular fa-square"></i> Rectangle</button><button class="lo-dock-btn" onclick="addShape('circle')"><i class="fa-regular fa-circle"></i> Circle</button><button class="lo-dock-btn" onclick="addShape('triangle')"><i class="fa-solid fa-play"></i> Triangle</button><button class="lo-dock-btn" onclick="addShape('line')"><i class="fa-solid fa-minus"></i> Line</button></div>`;
}
function addShape(type){
 if(!editorCanvas)return; let o; const common={left:240,top:180,fill:'#ffffff',stroke:'rgba(255,255,255,.7)',strokeWidth:1};
 if(type==='rect') o=new fabric.Rect({...common,width:180,height:120,rx:16,ry:16});
 else if(type==='circle') o=new fabric.Circle({...common,radius:70});
 else if(type==='triangle') o=new fabric.Triangle({...common,width:150,height:130});
 else o=new fabric.Line([0,0,180,0],{left:240,top:220,stroke:'#fff',strokeWidth:4});
 editorCanvas.add(o);editorCanvas.setActiveObject(o);editorCanvas.renderAll();renderManualInspector();updateManualWorkspaceState();
}
function loadColorToolbar(){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">Color Lab</div><label class="lo-dock-control">Saturation <input type="range" min="-100" max="100" value="0" oninput="updateManualAdjust('saturation',this.value)"></label><label class="lo-dock-control">Temperature <input type="range" min="-100" max="100" value="0"></label><button class="lo-dock-btn" onclick="loadAdjustToolbar()"><i class="fa-solid fa-sliders"></i> Open full color controls</button></div>`;
}
function loadTransformToolbar(){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">Transform</div><button class="lo-dock-btn" onclick="setActiveProp('angle',0)">Reset rotation</button><button class="lo-dock-btn" onclick="flipActive('x')"><i class="fa-solid fa-left-right"></i> Flip X</button><button class="lo-dock-btn" onclick="flipActive('y')"><i class="fa-solid fa-up-down"></i> Flip Y</button></div>`;
}
function flipActive(axis){const o=getActiveCanvasObject();if(!o)return;o.set(axis==='x'?'flipX':'flipY',!(axis==='x'?o.flipX:o.flipY));editorCanvas.renderAll();renderManualInspector();}
function loadRetouchToolbar(){
 const t=document.getElementById("secondaryToolbar"); if(!t)return;
 t.innerHTML=`<div class="lo-dock-inner"><div class="lo-dock-title">Retouch</div><button class="lo-dock-btn" onclick="loadAdvancedEffectsToolbar()"><i class="fa-solid fa-sparkles"></i> Surface smooth</button><button class="lo-dock-btn" onclick="loadAdvancedEffectsToolbar()"><i class="fa-solid fa-wand-magic-sparkles"></i> Enhance detail</button><button class="lo-dock-btn" onclick="loadAdvancedEffectsToolbar()"><i class="fa-solid fa-lightbulb"></i> Recover highlights</button><span class="lo-dock-note">Retouch operations are non-destructive where supported.</span></div>`;
}
function loadAdvancedLayersToolbar(){
    const toolbar=document.getElementById("secondaryToolbar");
    if(!toolbar)return;
    toolbar.innerHTML=`
      <div class="editor-panel compact-panel">
        <div class="panel-section-title">Layers</div>
        <button class="editor-action-btn" onclick="addText()"><i class="fa-solid fa-plus"></i> Add Text</button>
        <button class="editor-action-btn" onclick="triggerManualImageUpload()"><i class="fa-solid fa-image"></i> Add Layer</button>
        <button class="editor-action-btn" onclick="moveActiveLayer('up')"><i class="fa-solid fa-arrow-up"></i> Up</button>
        <button class="editor-action-btn" onclick="moveActiveLayer('down')"><i class="fa-solid fa-arrow-down"></i> Down</button>
        <button class="editor-action-btn danger-soft" onclick="deleteActiveLayer()"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`;
}
function moveActiveLayer(direction){
    const obj=getActiveCanvasObject(); if(!obj||!editorCanvas)return;
    if(direction==="up") editorCanvas.bringForward(obj); else editorCanvas.sendBackwards(obj);
    editorCanvas.renderAll();
}
function deleteActiveLayer(){
    const obj=getActiveCanvasObject(); if(!obj||!editorCanvas)return;
    editorCanvas.remove(obj); editorCanvas.discardActiveObject(); editorCanvas.renderAll();
}
function loadAdvancedEffectsToolbar(){
    const toolbar=document.getElementById("secondaryToolbar");
    if(!toolbar)return;
    toolbar.innerHTML=`
      <div class="editor-panel wide-panel">
        <div class="panel-section-title">Advanced Effects</div>
        <button class="editor-action-btn" onclick="applyAdvancedEffect('grayscale')"><i class="fa-solid fa-circle-half-stroke"></i> Grayscale</button>
        <button class="editor-action-btn" onclick="applyAdvancedEffect('sepia')"><i class="fa-solid fa-sun"></i> Sepia</button>
        <button class="editor-action-btn" onclick="applyAdvancedEffect('invert')"><i class="fa-solid fa-circle-dot"></i> Invert</button>
        <label class="control-pill"><span>Opacity</span><input type="range" min="0" max="100" value="100" oninput="changeObjectOpacity(this.value)"></label>
        <button class="editor-action-btn" onclick="loadAdjustToolbar()"><i class="fa-solid fa-sliders"></i> More Adjustments</button>
      </div>`;
}
function applyAdvancedEffect(type){
    const obj=getActiveImage(); if(!obj||!fabric?.Image?.filters)return;
    const f=fabric.Image.filters;
    const map={grayscale:f.Grayscale,sepia:f.Sepia,invert:f.Invert};
    const C=map[type]; if(!C)return;
    obj.filters=[new C()]; obj.applyFilters(); editorCanvas.renderAll();
}
function loadAdvancedMaskToolbar(){
    const toolbar=document.getElementById("secondaryToolbar");
    if(!toolbar)return;
    toolbar.innerHTML=`
      <div class="editor-panel compact-panel">
        <div class="panel-section-title">Masks & Composition</div>
        <button class="editor-action-btn" onclick="applyCropPreset('circle')"><i class="fa-solid fa-circle"></i> Circle Mask</button>
        <button class="editor-action-btn" onclick="applyCropPreset('1:1')"><i class="fa-solid fa-square"></i> Square Mask</button>
        <button class="editor-action-btn" onclick="clearCrop()"><i class="fa-solid fa-eraser"></i> Clear Mask</button>
        <select class="editor-select" onchange="changeBlend(this.value)">
          <option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option>
        </select>
      </div>`;
}

function setupProfessionalEditor(){
    editorCanvas = new fabric.Canvas("editorCanvas",{ preserveObjectStacking:true });
    editorCanvas.backgroundColor = "#111";
    resizeManualEditorCanvas();
    window.removeEventListener("resize",resizeManualEditorCanvas);
    window.addEventListener("resize",resizeManualEditorCanvas);
    setupImageUpload();
    loadManualSelectedImages();
    editorCanvas.on('selection:created', ()=>{ renderManualInspector(); updateManualWorkspaceState(); });
    editorCanvas.on('selection:updated', ()=>{ renderManualInspector(); updateManualWorkspaceState(); });
    editorCanvas.on('selection:cleared', ()=>{ renderManualInspector(); updateManualWorkspaceState(); });
    editorCanvas.on('object:modified', ()=>{ renderManualInspector(); updateManualWorkspaceState(); });
    updateManualWorkspaceState();
}

function resizeManualEditorCanvas(){
    if(!editorCanvas) return;

    const container = document.querySelector(".lo-canvas-stage");
    if(!container) return;

    const width = Math.max(320,Math.floor(container.clientWidth));
    const height = Math.max(360,Math.floor(container.clientHeight));

    editorCanvas.setWidth(width);
    editorCanvas.setHeight(height);
    editorCanvas.calcOffset();
    editorCanvas.renderAll();
}

function setupImageUpload(){
    manualImageInput = document.createElement("input");
    manualImageInput.type = "file";
    manualImageInput.accept = "image/*";
    manualImageInput.multiple = true;
    const uploadButton = document.getElementById("uploadImageBtn");
    if(uploadButton) uploadButton.onclick = triggerManualImageUpload;
    manualImageInput.onchange = (e) => {
        Array.from(e.target.files || []).forEach(file => {
            const reader = new FileReader();
            reader.onload = event => addImageToEditor(event.target.result);
            reader.readAsDataURL(file);
        });
        manualImageInput.value = "";
    };
}

function triggerManualImageUpload(){
    if(manualImageInput) manualImageInput.click();
}

function addImageToEditor(src){
    fabric.Image.fromURL(src,function(img){
        img.scaleToWidth(Math.min(editorCanvas.getWidth() * 0.86, img.width));
        editorCanvas.add(img);
        editorCanvas.centerObject(img);
        editorCanvas.setActiveObject(img);
        editorCanvas.renderAll();
    },{ crossOrigin:"anonymous" });
}

function downloadManualEdit(){
    if(!editorCanvas) return;

    const dataUrl =
    editorCanvas.toDataURL({
        format:"png",
        multiplier:2
    });

    triggerDownload(
        dataUrl,
        "lookout-manual-edit.png"
    );
}

function loadManualSelectedImages(){
    const images = JSON.parse(localStorage.getItem("editImages") || "null");
    if(!images || !images.length) return;
    images.forEach(src => addImageToEditor(src));
}

function addText(){
    const text = new fabric.IText("LOOKOUT",{ left:200, top:200, fill:"#fff", fontSize:50, fontFamily:"Segoe UI", fontWeight:"normal", fontStyle:"normal", underline:false });
    editorCanvas.add(text);
    editorCanvas.setActiveObject(text);
    editorCanvas.renderAll();
}

function getActiveText(){
    const obj = getActiveCanvasObject();
    if(!obj || (obj.type !== "i-text" && obj.type !== "textbox" && obj.type !== "text")) return null;
    return obj;
}

function toggleTextStyle(property,onValue,offValue){
    const obj = getActiveText();
    if(!obj) return;
    obj.set(property,obj[property] === onValue ? offValue : onValue);
    editorCanvas.renderAll();
}

function toggleTextUnderline(){
    const obj = getActiveText();
    if(!obj) return;
    obj.set("underline",!obj.underline);
    editorCanvas.renderAll();
}

function changeTextSize(value){
    const obj = getActiveText();
    if(!obj) return;
    obj.set("fontSize",Number(value));
    editorCanvas.renderAll();
}

function changeTextColor(color){
    const obj = getActiveText();
    if(!obj) return;
    obj.set("fill",color);
    editorCanvas.renderAll();
}

function setTextAlign(align){
    const obj = getActiveText();
    if(!obj) return;
    obj.set("textAlign",align);
    editorCanvas.renderAll();
}

function changeBlend(mode){
    const obj = getActiveCanvasObject();
    if(!obj) return;
    obj.globalCompositeOperation = mode;
    editorCanvas.renderAll();
}

function changeObjectOpacity(value){
    const obj = getActiveCanvasObject();
    if(!obj) return;
    obj.set("opacity",Number(value) / 100);
    editorCanvas.renderAll();
}

function adjustBrightness(value){ updateManualAdjust("brightness",value); }
function adjustContrast(value){ updateManualAdjust("exposure",value); }
function adjustSaturation(value){ updateManualAdjust("saturation",value); }

function applyFilters(settings){
    if(settings.brightness !== undefined) manualAdjustState.brightness = settings.brightness * 100;
    if(settings.contrast !== undefined) manualAdjustState.exposure = settings.contrast * 100;
    if(settings.saturation !== undefined) manualAdjustState.saturation = settings.saturation * 100;
    applyManualImageAdjustments();
}

function applyTint(color){
    manualAdjustState.tint = color;
    manualAdjustState.tintAmount = Math.max(manualAdjustState.tintAmount,30);
    applyManualImageAdjustments();
}
