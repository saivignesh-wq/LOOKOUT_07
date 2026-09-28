/* =========================================================
   LOOKOUT FEATURE INVENTION STUDIO
   Native visual algorithm / effect invention workspace.
   ========================================================= */
(function(){
  const STORE_KEY = "lookout.custom.features.v2";
  const DEFAULT_FEATURE = {
    name:"Untitled Feature", type:"Effect", description:"A new LookOut creation.",
    nodes:[], formula:"output = x * (1 + intensity / 100)", intensity:50,
    createdAt:null, version:1, remixAllowed:true, previewImage:null
  };
  const NODE_LIBRARY = [
    {id:"input",label:"Image Input",icon:"fa-image",category:"Inputs",desc:"Use an image or the active layer as the source."},
    {id:"color",label:"Color Grade",icon:"fa-palette",category:"Color",desc:"Remap hue, saturation and luminance."},
    {id:"contrast",label:"Contrast",icon:"fa-circle-half-stroke",category:"Color",desc:"Control tonal separation."},
    {id:"blur",label:"Blur",icon:"fa-droplet",category:"Effects",desc:"Soften pixels using a radius."},
    {id:"glow",label:"Glow",icon:"fa-sun",category:"Effects",desc:"Build a luminous layer around the image."},
    {id:"grain",label:"Film Grain",icon:"fa-braille",category:"Texture",desc:"Add procedural film texture."},
    {id:"noise",label:"Noise",icon:"fa-chart-area",category:"Texture",desc:"Generate controlled visual noise."},
    {id:"distort",label:"Distortion",icon:"fa-wand-magic-sparkles",category:"Geometry",desc:"Warp pixels with a spatial amount."},
    {id:"mask",label:"Mask",icon:"fa-shapes",category:"Masks",desc:"Limit an operation to a region."},
    {id:"blend",label:"Blend",icon:"fa-layer-group",category:"Composition",desc:"Combine the current result with another stream."},
    {id:"threshold",label:"Threshold",icon:"fa-sliders",category:"Math",desc:"Convert values through a threshold."},
    {id:"formula",label:"Math Formula",icon:"fa-square-root-variable",category:"Math",desc:"Use a controlled creator-defined formula."},
    {id:"output",label:"Output",icon:"fa-arrow-right",category:"Outputs",desc:"Define the final feature result."}
  ];
  const CATEGORIES=["All","Inputs","Color","Effects","Texture","Geometry","Masks","Composition","Math","Outputs"];
  let state=clone(DEFAULT_FEATURE), selectedNode=null, activeRightTab="parameters", activeCategory="All", previewImage=null, previewZoom=1;

  const clone=o=>JSON.parse(JSON.stringify(o));
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const studio=()=>document.querySelector(".feature-studio");
  const toast=message=>{let t=document.querySelector(".feature-toast");if(!t){t=document.createElement("div");t.className="feature-toast";document.body.appendChild(t)}t.textContent=message;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),2200)};
  const savedFeatures=()=>{try{return JSON.parse(localStorage.getItem(STORE_KEY)||"[]")}catch{return[]}};
  function persist(){
    const list=savedFeatures(); const copy={...clone(state),updatedAt:new Date().toISOString()};
    const id=state.id||"f_"+Date.now(); copy.id=id; state.id=id;
    const idx=list.findIndex(x=>x.id===id); if(idx>=0) list[idx]=copy; else list.unshift(copy);
    localStorage.setItem(STORE_KEY,JSON.stringify(list.slice(0,100))); updateSaveStatus("Saved locally");
  }
  function updateSaveStatus(text){const el=document.getElementById("featureSaveStatus");if(el)el.innerHTML=`<span class="feature-save-status">${esc(text)}</span>`}

  window.openFeatureInventionStudio=function(existing){
    window.restoreManualSidebarUtilities?.();
    document.body.classList.remove("manual-editor-active");
    window.setWorkspacePageMode?.();
    const wi=document.getElementById("workspaceIcon"); if(wi){document.querySelectorAll(".menu-item").forEach(x=>x.classList.remove("active"));wi.classList.add("active")}
    document.querySelector(".sidebar")?.classList.remove("hidden");
    document.querySelector(".main")?.classList.remove("fullscreen");
    const main=document.getElementById("mainContent"); if(!main)return;
    main.classList.remove("manual-editor-host");
    state=existing?{...clone(DEFAULT_FEATURE),...clone(existing),nodes:clone(existing.nodes||[])}:clone(DEFAULT_FEATURE);
    selectedNode=state.nodes[0]?.uid||null; activeRightTab="parameters";activeCategory="All";previewImage=null;previewZoom=1;
    renderStudio();
  };

  // Stable public entry points used by buttons across LookOut.
  // Keeping these aliases on window makes the studio resilient when the
  // workspace is rebuilt dynamically.
  window.openFeatureStudio = function(existing){
    if(typeof window.openFeatureInventionStudio === "function") return window.openFeatureInventionStudio(existing);
  };
  window.openFeatureScale = window.openFeatureStudio;
  document.body.dataset.featureStudioReady = "true";

  function renderStudio(){
    const main=document.getElementById("mainContent");if(!main)return;
    main.innerHTML=`
      <div class="feature-studio">
        <header class="feature-topbar">
          <button class="feature-back" title="Back to Manual Edit" onclick="openManualEdit()"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="feature-brand"><div class="feature-brand-mark"><i class="fa-solid fa-flask"></i></div><div class="feature-brand-text"><strong>LOOKOUT</strong><small>Feature Invention Studio</small></div></div>
          <div class="feature-title-wrap"><input id="featureNameInput" class="feature-title-input" value="${esc(state.name)}" placeholder="Name your invention"><div class="feature-meta-row"><span class="feature-type-chip"><i class="fa-solid fa-sparkles"></i> ${esc(state.type||"Effect")}</span><span id="featureSaveStatus"><span class="feature-save-status">Unsaved</span></span></div></div>
          <div class="feature-top-actions">
            <button class="feature-top-btn" onclick="openFeatureLibraryModal()"><i class="fa-solid fa-box-archive"></i><span>My Creations</span></button>
            <button class="feature-top-btn" onclick="featurePreviewAsUser()"><i class="fa-solid fa-eye"></i><span>Preview</span></button>
            <button class="feature-top-btn primary" onclick="saveCustomFeature()"><i class="fa-solid fa-floppy-disk"></i><span>Save</span></button>
          </div>
        </header>

        <div class="feature-studio-grid">
          <aside class="feature-panel">
            <div class="feature-panel-head"><strong>Algorithm Library</strong><span>BUILD</span></div>
            <div class="feature-panel-sub">Compose reusable building blocks. Click to add, or drag a block into the workflow.</div>
            <div class="feature-panel-scroll">
              <input class="feature-search" id="featureSearch" placeholder="Search algorithms, effects, math..." autocomplete="off">
              <div class="feature-category-row" id="featureCategories">${CATEGORIES.map(c=>`<button class="feature-category-chip ${c===activeCategory?'active':''}" data-category="${c}">${c}</button>`).join("")}</div>
              <div id="featureLibrary"></div>
            </div>
          </aside>

          <section class="feature-center">
            <div class="feature-canvas-toolbar">
              <button class="feature-canvas-tool active" title="Select workflow node"><i class="fa-solid fa-arrow-pointer"></i></button>
              <button class="feature-canvas-tool" title="Add preview image" onclick="openFeatureImagePicker()"><i class="fa-solid fa-image"></i></button>
              <button class="feature-canvas-tool" title="Zoom out" onclick="zoomFeaturePreview(.9)"><i class="fa-solid fa-minus"></i></button>
              <button class="feature-canvas-tool" title="Zoom in" onclick="zoomFeaturePreview(1.1)"><i class="fa-solid fa-plus"></i></button>
              <button class="feature-canvas-tool" title="Fit preview" onclick="resetFeaturePreview()"><i class="fa-solid fa-expand"></i></button>
              <span class="feature-toolbar-sep"></span><span id="featureZoomLabel" style="font-size:8px;color:#76909f">100%</span>
              <div class="feature-live"><i class="fa-solid fa-circle"></i> Live experiment</div>
              <input id="featureImagePicker" type="file" accept="image/*" hidden onchange="loadFeaturePreviewImage(this.files[0])">
            </div>
            <div class="feature-canvas-area" id="featureCanvasArea">
              <div class="feature-workflow-bar"><span class="feature-input-badge" id="featureInputBadge">Generated preview</span></div>
              <div class="feature-preview-card" id="featurePreviewCard">
                <div class="feature-empty-preview" id="featureEmptyPreview">
                  <div class="empty-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div><strong>Build your invention</strong><span>Add algorithms from the library, then tune them on the right.</span>
                  <div class="empty-icon-actions"><div class="feature-empty-actions"><button class="feature-mini-btn primary" onclick="openFeatureImagePicker()"><i class="fa-solid fa-image"></i> Use an image</button><button class="feature-mini-btn" onclick="addFeatureNode('color')"><i class="fa-solid fa-plus"></i> Add first block</button></div></div>
                </div>
                <canvas id="featurePreviewCanvas" width="960" height="600" style="display:none"></canvas>
              </div>
              <div class="feature-node-strip" id="featureNodeStrip"></div>
            </div>
            <div class="feature-chain-head"><div><strong>Experiment workflow</strong><small id="featureChainSummary"> 0 building blocks</small></div><div class="feature-chain-actions"><button class="feature-mini-btn" onclick="clearFeatureNodes()"><i class="fa-solid fa-trash"></i> Clear</button><button class="feature-mini-btn" onclick="addFeatureNode('output')"><i class="fa-solid fa-arrow-right"></i> Output</button></div></div>
          </section>

          <aside class="feature-panel right">
            <div class="feature-right-tabs"><button class="feature-right-tab active" data-tab="parameters">Parameters</button><button class="feature-right-tab" data-tab="formula">Formula</button><button class="feature-right-tab" data-tab="info">Feature</button></div>
            <div class="feature-inspector" id="featureInspector"></div>
          </aside>
        </div>

        <footer class="feature-bottom-bar"><div class="feature-step"><i class="fa-solid fa-flask"></i><b class="active">Experiment</b><span>→</span><span>Build</span><span>→</span><span>Test</span><span>→</span><span>Publish</span><div class="feature-progress"><span id="featureProgress"></span></div></div><div class="feature-bottom-actions"><button class="feature-top-btn" onclick="newFeatureExperiment()"><i class="fa-solid fa-rotate-left"></i> New Experiment</button><button class="feature-create-btn" onclick="saveCustomFeature()"><i class="fa-solid fa-sparkles"></i> Create Feature</button></div></footer>
      </div>
      <div id="featureLibraryModal" class="feature-library-modal" onclick="if(event.target===this)closeFeatureLibraryModal()"><div class="feature-library-card"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0;font-size:18px">My Creations</h2><span style="font-size:8px;color:#71899a">Reusable LookOut inventions saved on this device.</span></div><button class="feature-back" onclick="closeFeatureLibraryModal()"><i class="fa-solid fa-xmark"></i></button></div><div class="feature-library-grid-large" id="savedFeatureGrid"></div></div></div>
      <div id="featureUserPreview" class="feature-preview-user" onclick="if(event.target===this)closeFeatureUserPreview()"><div class="feature-preview-user-card"><div class="feature-preview-user-head"><div><strong id="userPreviewTitle">Feature Preview</strong><div style="font-size:7px;color:#6f8797;margin-top:3px">This is how the reusable feature can appear to a creator.</div></div><button class="feature-back" onclick="closeFeatureUserPreview()"><i class="fa-solid fa-xmark"></i></button></div><div class="feature-preview-user-body"><canvas id="userPreviewCanvas" width="960" height="600"></canvas><div class="feature-preview-user-controls"><span style="font-size:8px;color:#78909f">Intensity</span><input id="userPreviewIntensity" type="range" min="0" max="100" value="50"><span id="userPreviewValue" style="font-size:8px;color:#a9eaff">50%</span></div></div></div></div>
    `;
    document.getElementById("featureNameInput")?.addEventListener("input",e=>{state.name=e.target.value;updateSaveStatus("Unsaved changes")});
    document.getElementById("featureSearch")?.addEventListener("input",e=>renderLibrary(e.target.value));
    document.querySelectorAll(".feature-category-chip").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.category;document.querySelectorAll(".feature-category-chip").forEach(x=>x.classList.toggle("active",x===b));renderLibrary(document.getElementById("featureSearch")?.value||"")}));
    document.querySelectorAll(".feature-right-tab").forEach(b=>b.addEventListener("click",()=>{activeRightTab=b.dataset.tab;document.querySelectorAll(".feature-right-tab").forEach(x=>x.classList.toggle("active",x===b));renderInspector()}));
    renderLibrary();renderNodes();renderInspector();drawPreview();
  }

  function renderLibrary(filter=""){
    const root=document.getElementById("featureLibrary");if(!root)return;
    const q=filter.trim().toLowerCase();
    let items=NODE_LIBRARY.filter(n=>(activeCategory==="All"||n.category===activeCategory)&&(!q||(n.label+" "+n.category+" "+n.desc).toLowerCase().includes(q)));
    const groups={};items.forEach(n=>(groups[n.category]??=[]).push(n));
    root.innerHTML=Object.entries(groups).map(([cat,list])=>`<div class="feature-category">${esc(cat)}</div><div class="feature-library-grid">${list.map(n=>`<button class="feature-node-add" draggable="true" data-node-id="${n.id}" onclick="addFeatureNode('${n.id}')"><i class="fa-solid ${n.icon}"></i><span>${esc(n.label)}</span><small>${esc(n.desc)}</small></button>`).join("")}</div>`).join("")||`<div style="padding:18px 4px;color:#6d8797;font-size:8px">No building blocks match that search.</div>`;
    root.querySelectorAll(".feature-node-add").forEach(el=>{el.addEventListener("dragstart",e=>{el.classList.add("dragging");e.dataTransfer.setData("text/plain",el.dataset.nodeId)});el.addEventListener("dragend",()=>el.classList.remove("dragging"))});
    document.getElementById("featureCanvasArea")?.addEventListener("dragover",e=>e.preventDefault(),{once:true});
    document.getElementById("featureCanvasArea")?.addEventListener("drop",e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");if(id)addFeatureNode(id)},{once:true});
  }

  window.addFeatureNode=function(id){
    const meta=NODE_LIBRARY.find(n=>n.id===id);if(!meta)return;
    const uid="n_"+Date.now()+"_"+Math.random().toString(16).slice(2);
    const node={uid,type:id,label:meta.label,icon:meta.icon,amount:id==="input"||id==="output"?100:50,threshold:50,formula:"x * (1 + intensity / 100)",blend:"normal",enabled:true};
    state.nodes.push(node);selectedNode=uid;renderNodes();renderInspector();drawPreview();updateSaveStatus("Unsaved changes");toast(meta.label+" added");
  };
  window.selectFeatureNode=function(uid){selectedNode=uid;renderNodes();renderInspector()};
  window.removeFeatureNode=function(uid){state.nodes=state.nodes.filter(n=>n.uid!==uid);selectedNode=state.nodes.at(-1)?.uid||null;renderNodes();renderInspector();drawPreview();updateSaveStatus("Unsaved changes");toast("Building block removed")};
  window.moveFeatureNode=function(uid,dir){const i=state.nodes.findIndex(n=>n.uid===uid),j=i+dir;if(i<0||j<0||j>=state.nodes.length)return;[state.nodes[i],state.nodes[j]]=[state.nodes[j],state.nodes[i]];selectedNode=uid;renderNodes();drawPreview();updateSaveStatus("Unsaved changes")};
  window.duplicateFeatureNode=function(uid){const n=state.nodes.find(x=>x.uid===uid);if(!n)return;const copy={...clone(n),uid:"n_"+Date.now()+"_"+Math.random().toString(16).slice(2),label:n.label+" Copy"};const i=state.nodes.findIndex(x=>x.uid===uid);state.nodes.splice(i+1,0,copy);selectedNode=copy.uid;renderNodes();renderInspector();drawPreview();updateSaveStatus("Unsaved changes")};
  window.clearFeatureNodes=function(){if(!state.nodes.length)return;if(confirm("Clear the current experiment workflow?")){state.nodes=[];selectedNode=null;renderNodes();renderInspector();drawPreview();updateSaveStatus("Unsaved changes")}};
  function currentNode(){return state.nodes.find(n=>n.uid===selectedNode)||null}

  function renderNodes(){
    const strip=document.getElementById("featureNodeStrip"),summary=document.getElementById("featureChainSummary");if(!strip)return;
    if(summary)summary.textContent=` • ${state.nodes.length} building block${state.nodes.length===1?"":"s"}`;
    if(!state.nodes.length){strip.innerHTML=`<div style="color:#5f7788;font-size:8px;padding:10px">Your workflow is empty. Add a building block from the library.</div>`;updateProgress();return}
    strip.innerHTML=state.nodes.map((n,i)=>`${i?'<span class="feature-node-link"><i class="fa-solid fa-arrow-right"></i></span>':''}<div class="feature-node ${selectedNode===n.uid?'selected':''}" onclick="selectFeatureNode('${n.uid}')"><button class="node-remove" title="Remove" onclick="event.stopPropagation();removeFeatureNode('${n.uid}')"><i class="fa-solid fa-xmark"></i></button><div class="node-title"><i class="fa-solid ${n.icon}"></i>${esc(n.label)}</div><div class="node-sub">${n.enabled===false?"Disabled":"Intensity "+Math.round(n.amount??50)+"%"}</div><div style="display:flex;gap:3px;margin-top:7px"><button class="feature-mini-btn" style="height:22px;padding:0 6px" title="Move left" onclick="event.stopPropagation();moveFeatureNode('${n.uid}',-1)"><i class="fa-solid fa-chevron-left"></i></button><button class="feature-mini-btn" style="height:22px;padding:0 6px" title="Move right" onclick="event.stopPropagation();moveFeatureNode('${n.uid}',1)"><i class="fa-solid fa-chevron-right"></i></button><button class="feature-mini-btn" style="height:22px;padding:0 6px" title="Duplicate" onclick="event.stopPropagation();duplicateFeatureNode('${n.uid}')"><i class="fa-regular fa-copy"></i></button></div></div>`).join("");
    updateProgress();
  }
  function updateProgress(){const p=document.getElementById("featureProgress");if(p)p.style.width=Math.min(100,10+state.nodes.length*9)+"%"}

  function renderInspector(){
    const root=document.getElementById("featureInspector");if(!root)return;
    if(activeRightTab==="formula"){
      root.innerHTML=`<div class="inspector-title">Mathematical Engine</div><div class="inspector-desc">Connect creator-defined math to the live experiment. LookOut evaluates only the supported expression set.</div><div class="inspector-section"><div class="inspector-section-title">Feature Formula</div><div class="inspector-field"><label>Expression</label><textarea id="featureFormula">${esc(state.formula)}</textarea></div><div class="formula-hint"><b>Supported:</b> x, intensity, amount, brightness, contrast, saturation, sin(), cos(), abs(), min(), max().<code>output = x * (1 + intensity / 100)</code></div></div><button class="feature-create-btn" style="width:100%;margin-top:12px" onclick="applyFeatureFormula()"><i class="fa-solid fa-calculator"></i> Apply Formula</button>`;return;
    }
    if(activeRightTab==="info"){
      root.innerHTML=`<div class="inspector-title">Feature Definition</div><div class="inspector-desc">Define how this invention should be packaged and reused.</div><div class="inspector-section"><div class="inspector-section-title">Overview</div><div class="inspector-field"><label>Name</label><input id="infoName" value="${esc(state.name)}" class="feature-search"></div><div class="inspector-field"><label>Description</label><textarea id="featureDescription" placeholder="What does your invention do?">${esc(state.description)}</textarea></div><div class="inspector-field"><label>Type</label><select id="featureType"><option>Effect</option><option>Filter</option><option>Font Style</option><option>Brush</option><option>Texture</option><option>Template</option><option>Custom Tool</option><option>Workflow</option></select></div><label class="inspector-check"><input type="checkbox" id="featureRemix" ${state.remixAllowed!==false?"checked":""}> Allow this feature to be remixed</label></div><div class="feature-color-row"><div class="feature-stat"><small>Version</small><b>v${state.version||1}.0</b></div><div class="feature-stat"><small>Blocks</small><b>${state.nodes.length}</b></div><div class="feature-stat"><small>Mode</small><b>Live</b></div></div><button class="feature-create-btn" style="width:100%;margin-top:12px" onclick="saveFeatureInfo()">Save Definition</button>`;
      const ft=document.getElementById("featureType");if(ft)ft.value=state.type||"Effect";return;
    }
    const n=currentNode();
    if(!n){root.innerHTML=`<div class="inspector-title">Workflow ready</div><div class="inspector-desc">Select a building block to edit its parameters. Your changes update the preview immediately.</div><div class="inspector-section"><div class="inspector-section-title">Experiment overview</div><div class="feature-color-row"><div class="feature-stat"><small>Blocks</small><b>${state.nodes.length}</b></div><div class="feature-stat"><small>Formula</small><b>${state.formula?"On":"Off"}</b></div><div class="feature-stat"><small>Status</small><b>Live</b></div></div></div><div class="inspector-section"><div class="formula-hint">Tip: start with <b>Image Input</b>, add an effect or color operation, then finish with <b>Output</b>. You can reorder blocks below the preview.</div></div>`;return}
    root.innerHTML=`<div class="inspector-title">${esc(n.label)}</div><div class="inspector-desc">${esc(NODE_LIBRARY.find(x=>x.id===n.type)?.desc||"Creator building block.")}</div><div class="inspector-section"><div class="inspector-section-title">Core Parameters</div><div class="inspector-field"><label>Intensity <output id="nodeAmountOut">${Math.round(n.amount??50)}%</output></label><input id="nodeAmount" type="range" min="0" max="100" value="${n.amount??50}"></div><div class="inspector-field"><label>Blend Mode</label><select id="nodeBlend"><option>normal</option><option>multiply</option><option>screen</option><option>overlay</option><option>soft-light</option></select></div><label class="inspector-check"><input id="nodeEnabled" type="checkbox" ${n.enabled!==false?"checked":""}> Enable this block</label></div>${n.type==="formula"?`<div class="inspector-section"><div class="inspector-section-title">Node Formula</div><div class="inspector-field"><textarea id="nodeFormula">${esc(n.formula||"x * (1 + intensity / 100)")}</textarea></div></div>`:""}${["threshold","blur","grain","noise","distort"].includes(n.type)?`<div class="inspector-section"><div class="inspector-section-title">Specific Control</div><div class="inspector-field"><label>${n.type==="threshold"?"Threshold":"Amount"}<output id="nodeSpecificOut">${Math.round(n.threshold??n.amount??50)}%</output></label><input id="nodeSpecific" type="range" min="0" max="100" value="${n.threshold??n.amount??50}"></div></div>`:""}<div class="inspector-section"><div class="inspector-section-title">Block Actions</div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="feature-mini-btn" onclick="moveFeatureNode('${n.uid}',-1)"><i class="fa-solid fa-chevron-left"></i> Left</button><button class="feature-mini-btn" onclick="moveFeatureNode('${n.uid}',1)"><i class="fa-solid fa-chevron-right"></i> Right</button><button class="feature-mini-btn" onclick="duplicateFeatureNode('${n.uid}')"><i class="fa-regular fa-copy"></i> Duplicate</button></div></div>`;
    const amount=document.getElementById("nodeAmount");amount?.addEventListener("input",e=>{n.amount=+e.target.value;document.getElementById("nodeAmountOut").textContent=n.amount+"%";drawPreview();renderNodes();updateSaveStatus("Unsaved changes")});
    const blend=document.getElementById("nodeBlend");if(blend){blend.value=n.blend||"normal";blend.addEventListener("change",e=>{n.blend=e.target.value;drawPreview();updateSaveStatus("Unsaved changes")})}
    document.getElementById("nodeEnabled")?.addEventListener("change",e=>{n.enabled=e.target.checked;drawPreview();renderNodes();updateSaveStatus("Unsaved changes")});
    document.getElementById("nodeFormula")?.addEventListener("input",e=>{n.formula=e.target.value;drawPreview();updateSaveStatus("Unsaved changes")});
    const specific=document.getElementById("nodeSpecific");specific?.addEventListener("input",e=>{n.threshold=+e.target.value;if(document.getElementById("nodeSpecificOut"))document.getElementById("nodeSpecificOut").textContent=n.threshold+"%";drawPreview();updateSaveStatus("Unsaved changes")});
  }

  window.applyFeatureFormula=function(){const el=document.getElementById("featureFormula");if(el){state.formula=el.value.trim()||DEFAULT_FEATURE.formula;drawPreview();updateSaveStatus("Unsaved changes");toast("Formula applied to live preview")}};
  window.saveFeatureInfo=function(){const name=document.getElementById("infoName"),d=document.getElementById("featureDescription"),t=document.getElementById("featureType"),r=document.getElementById("featureRemix");if(name)state.name=name.value.trim()||"Untitled Feature";if(d)state.description=d.value;if(t)state.type=t.value;if(r)state.remixAllowed=r.checked;document.getElementById("featureNameInput")&&(document.getElementById("featureNameInput").value=state.name);persist();renderInspector();toast("Feature definition saved")};

  function makeBaseCanvas(ctx,w,h){
    if(previewImage){ctx.save();const scale=Math.max(w/previewImage.width,h/previewImage.height);const iw=previewImage.width*scale,ih=previewImage.height*scale;ctx.drawImage(previewImage,(w-iw)/2,(h-ih)/2,iw,ih);ctx.restore();return}
    const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,"#15283a");g.addColorStop(.42,"#4f6e82");g.addColorStop(1,"#17121c");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.22;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(100+i*115,130+(i%3)*95,50+(i%2)*25,0,Math.PI*2);ctx.fillStyle=`hsla(${190+i*15},75%,65%,.22)`;ctx.fill()}ctx.restore();
    ctx.fillStyle="rgba(255,255,255,.78)";ctx.font="700 30px system-ui";ctx.fillText("LOOKOUT",38,55);ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="12px system-ui";ctx.fillText("Feature invention preview",40,78);
  }
  function safeFormula(value,intensity){
    const f=String(state.formula||"").replace(/^output\s*=\s*/i,"").trim();if(!f)return value;
    if(!/^[0-9xXa-zA-Z_+\-*/().,%\s]+$/.test(f))return value;
    try{let s=f.replace(/\bintensity\b/gi,String(intensity)).replace(/\bamount\b/gi,String(intensity)).replace(/\bx\b/gi,String(value)).replace(/\babs\b/g,"Math.abs").replace(/\bsin\b/g,"Math.sin").replace(/\bcos\b/g,"Math.cos").replace(/\bmin\b/g,"Math.min").replace(/\bmax\b/g,"Math.max");if(!/^[-+*/().,%\d\sMathabsincosminx]+$/.test(s))return value;const out=Function("\"use strict\";return ("+s+")")();return Number.isFinite(out)?out:value}catch{return value}}

  function drawPreview(){
    const canvas=document.getElementById("featurePreviewCanvas"),empty=document.getElementById("featureEmptyPreview");if(!canvas)return;
    if(!state.nodes.length){canvas.style.display="none";if(empty)empty.style.display="flex";return}
    canvas.style.display="block";if(empty)empty.style.display="none";
    const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    let amount=state.nodes.filter(n=>n.enabled!==false).reduce((a,n)=>a+(n.amount??50),0)/Math.max(1,state.nodes.filter(n=>n.enabled!==false).length);amount=safeFormula(amount,amount);amount=Math.max(0,Math.min(100,amount));
    const hasBlur=state.nodes.some(n=>n.type==="blur"&&n.enabled!==false),hasGlow=state.nodes.some(n=>n.type==="glow"&&n.enabled!==false),hasGrain=state.nodes.some(n=>["grain","noise"].includes(n.type)&&n.enabled!==false),hasDistort=state.nodes.some(n=>n.type==="distort"&&n.enabled!==false),hasThreshold=state.nodes.some(n=>n.type==="threshold"&&n.enabled!==false),hasContrast=state.nodes.some(n=>n.type==="contrast"&&n.enabled!==false),hasColor=state.nodes.some(n=>n.type==="color"&&n.enabled!==false);
    ctx.save();
    const blur=hasBlur?Math.max(0,amount/14):0, contrast=hasContrast?1+amount/180:1, saturation=hasColor?1+amount/120:1;
    ctx.filter=`blur(${blur}px) contrast(${contrast}) saturate(${saturation})`;
    makeBaseCanvas(ctx,w,h);ctx.restore();ctx.filter="none";
    if(hasDistort){ctx.save();ctx.globalAlpha=.10+.20*amount/100;for(let x=0;x<w;x+=20){ctx.fillStyle="rgba(160,230,255,.45)";ctx.fillRect(x+Math.sin(x*.04)*amount/4,0,2,h)}ctx.restore()}
    if(hasGlow){ctx.save();ctx.globalAlpha=.2+.4*amount/100;ctx.shadowBlur=22+amount*.55;ctx.shadowColor="rgba(154,235,255,.85)";ctx.strokeStyle="rgba(219,249,255,.7)";ctx.lineWidth=3;ctx.strokeRect(26,26,w-52,h-52);ctx.restore()}
    if(hasThreshold){ctx.save();ctx.globalAlpha=.18+.22*amount/100;ctx.fillStyle="#ffffff";for(let y=0;y<h;y+=10){ctx.fillRect(0,y,w,2)}ctx.restore()}
    if(hasGrain){ctx.save();ctx.globalAlpha=.05+.12*amount/100;for(let i=0;i<Math.min(7000,w*h/70);i++){const x=Math.random()*w,y=Math.random()*h,v=Math.random()*255;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1,1)}ctx.restore()}
    ctx.fillStyle="rgba(3,9,14,.52)";ctx.fillRect(18,h-52,300,30);ctx.fillStyle="rgba(255,255,255,.88)";ctx.font="700 15px system-ui";ctx.fillText(state.name||"Untitled Feature",30,h-31);ctx.fillStyle="rgba(255,255,255,.45)";ctx.font="9px system-ui";ctx.fillText(`${state.nodes.length} blocks • intensity ${Math.round(amount)}%`,30,h-17);
    const badge=document.getElementById("featureInputBadge");if(badge)badge.textContent=previewImage?"Custom image preview":"Generated preview";
  }

  window.openFeatureImagePicker=function(){document.getElementById("featureImagePicker")?.click()};
  window.loadFeaturePreviewImage=function(file){if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{previewImage=img;state.previewImage=null;drawPreview();URL.revokeObjectURL(url);toast("Preview image loaded")};img.src=url};
  window.zoomFeaturePreview=function(f){previewZoom=Math.max(.6,Math.min(1.5,previewZoom*f));const card=document.getElementById("featurePreviewCard");if(card)card.style.transform=`scale(${previewZoom})`;const z=document.getElementById("featureZoomLabel");if(z)z.textContent=Math.round(previewZoom*100)+"%"};
  window.resetFeaturePreview=function(){previewZoom=1;const card=document.getElementById("featurePreviewCard");if(card)card.style.transform="scale(1)";const z=document.getElementById("featureZoomLabel");if(z)z.textContent="100%";drawPreview()};

  window.saveCustomFeature=function(){state.name=document.getElementById("featureNameInput")?.value.trim()||state.name||"Untitled Feature";state.createdAt ||= new Date().toISOString();persist();toast("Feature saved to My Creations")};
  window.newFeatureExperiment=function(){if(confirm("Start a new experiment? Save this creation first if you want to keep it.")){openFeatureInventionStudio()}};
  window.featurePreviewAsUser=function(){const modal=document.getElementById("featureUserPreview");if(!modal)return;modal.classList.add("open");document.getElementById("userPreviewTitle").textContent=state.name||"Feature Preview";const range=document.getElementById("userPreviewIntensity");range.value=state.intensity??50;document.getElementById("userPreviewValue").textContent=range.value+"%";renderUserPreview();range.oninput=()=>{document.getElementById("userPreviewValue").textContent=range.value+"%";state.nodes.forEach(n=>{if(n.enabled!==false)n.amount=+range.value});renderUserPreview();drawPreview();renderNodes();renderInspector()}};
  window.closeFeatureUserPreview=function(){document.getElementById("featureUserPreview")?.classList.remove("open")};
  function renderUserPreview(){const c=document.getElementById("userPreviewCanvas");if(!c)return;const old=document.getElementById("featurePreviewCanvas");const ctx=c.getContext("2d");if(old){ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(old,0,0,c.width,c.height)}}

  window.openFeatureLibraryModal=function(){const modal=document.getElementById("featureLibraryModal");if(!modal)return;modal.classList.add("open");const grid=document.getElementById("savedFeatureGrid"),list=savedFeatures();grid.innerHTML=list.length?list.map(f=>`<div class="saved-feature-card"><strong>${esc(f.name)}</strong><small>${esc(f.type||"Effect")} • ${(f.nodes||[]).length} blocks • updated ${f.updatedAt?new Date(f.updatedAt).toLocaleDateString():"—"}</small><div class="saved-actions"><button onclick="loadSavedFeature('${f.id}')">Open</button><button onclick="deleteSavedFeature('${f.id}')">Delete</button></div></div>`).join(""):`<div style="color:#71899a;font-size:9px">No saved inventions yet. Build something and press Save.</div>`};
  window.closeFeatureLibraryModal=function(){document.getElementById("featureLibraryModal")?.classList.remove("open")};
  window.loadSavedFeature=function(id){const f=savedFeatures().find(x=>x.id===id);if(f){closeFeatureLibraryModal();openFeatureInventionStudio(f);toast("Creation opened")}};
  window.deleteSavedFeature=function(id){const list=savedFeatures().filter(x=>x.id!==id);localStorage.setItem(STORE_KEY,JSON.stringify(list));openFeatureLibraryModal();toast("Creation deleted")};
  window.LookOutFeatureStudio={open:()=>openFeatureInventionStudio()};
})();
