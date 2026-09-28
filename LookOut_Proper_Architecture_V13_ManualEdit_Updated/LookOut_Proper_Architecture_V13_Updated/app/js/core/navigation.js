/* =====================================================
   LOOKOUT NAVIGATION + HOME REDESIGN
   ===================================================== */

/* =====================================================
   LOOKOUT FEATURE STUDIO NAVIGATION BRIDGE
   Ensures Feature Studio can always be opened from dynamically
   rebuilt workspaces, even if its feature module has not finished
   loading yet.
   ===================================================== */
(function(){
  let loading = null;
  window.LookOutOpenFeatureStudio = function(existing){
    const invoke = () => {
      if (typeof window.openFeatureInventionStudio === "function") {
        window.openFeatureInventionStudio(existing);
        return true;
      }
      return false;
    };
    if (invoke()) return;
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const current = document.querySelector('script[src$="js/features/feature-invention-studio.js"]');
        if (current) {
          const done = () => { loading = null; resolve(); };
          current.addEventListener('load', done, {once:true});
          current.addEventListener('error', () => { loading = null; reject(new Error('Feature Studio module failed to load')); }, {once:true});
          // If the script already executed but did not expose the function,
          // give it one microtask/frame before attempting a second load.
          setTimeout(done, 80);
        } else {
          const script=document.createElement('script');
          script.src='js/features/feature-invention-studio.js';
          script.onload=()=>{loading=null;resolve()};
          script.onerror=()=>{loading=null;reject(new Error('Feature Studio module failed to load'))};
          document.head.appendChild(script);
        }
      });
    }
    loading.then(()=>{
      if (!invoke()) alert('Feature Studio is still loading. Please try again.');
    }).catch(()=>alert('Feature Studio could not be loaded. Please refresh the page and try again.'));
  };
  // Public aliases used by buttons throughout LookOut.
  window.openFeatureScale = window.LookOutOpenFeatureStudio;
})();

const workspaceIcon = document.getElementById("workspaceIcon");
const homeIcon = document.getElementById("homeIcon");
const mainContent = document.getElementById("mainContent");

function homeMarkup(){
return `
  <div class="home-grid">
    <section class="wheel-stage"><div class="feature-wheel" id="featureWheel">
      <button class="wheel-node lk-glass active" style="--angle:0deg" data-action="generator"><i class="fa-regular fa-image"></i><strong>AI Generator</strong><small>Create stunning visuals using AI</small></button>
      <button class="wheel-node lk-glass" style="--angle:90deg" data-action="manual"><i class="fa-solid fa-crop-simple"></i><strong>Manual Edit</strong><small>Edit with advanced tools</small></button>
      <button class="wheel-node lk-glass" style="--angle:180deg" data-action="more"><i class="fa-solid fa-grip"></i><strong>More Features</strong><small>Explore and download tools</small></button>
      <button class="wheel-node lk-glass" style="--angle:270deg" data-action="ai-edit"><i class="fa-solid fa-wand-magic-sparkles"></i><strong>AI Edit</strong><small>Enhance and transform images</small></button>
      <div class="wheel-center"><i class="fa-solid fa-mountain"></i><strong>LOOKOUT</strong><span>CREATE FURTHER</span></div>
      <div class="wheel-controls"><button class="wheel-arrow" id="wheelPrev" type="button"><i class="fa-solid fa-chevron-left"></i></button><div class="wheel-dots" id="wheelDots"><span class="wheel-dot active"></span><span class="wheel-dot"></span><span class="wheel-dot"></span><span class="wheel-dot"></span></div><button class="wheel-arrow" id="wheelNext" type="button"><i class="fa-solid fa-chevron-right"></i></button></div>
      <div class="wheel-hint">Drag, click or use the arrows to explore</div>
    </div></section>
    <section class="home-side">
      <div class="quick-panel lk-glass"><div class="panel-title"><h3>Quick Actions</h3><span>Everything you need</span></div><div class="quick-grid">
        <button class="quick-action" onclick="openGenerator()"><i class="fa-regular fa-file-circle-plus"></i><span>New Project</span></button>
        <button class="quick-action" onclick="window.LookOutRAG?.open()"><i class="fa-regular fa-folder-open"></i><span>Open File</span></button>
        <button class="quick-action" onclick="openSavedProjects()"><i class="fa-solid fa-database"></i><span>Saved Projects</span></button>
        <button class="quick-action" id="virtualMouseQuick"><i class="fa-regular fa-hand-pointer"></i><span>Virtual Mouse</span><span class="toggle-dot"></span></button>
        <button class="quick-action" id="voiceQuick"><i class="fa-solid fa-wave-square"></i><span>Voice Command</span><span class="toggle-dot"></span></button>
        <button class="quick-action" onclick="openFeatureStore()"><i class="fa-solid fa-cart-shopping"></i><span>Feature Store</span></button>
      </div></div>
      <div class="explore-panel lk-glass"><div class="panel-title"><h3>Explore Features</h3><span>Resources & updates</span></div><div class="explore-grid">
        <a class="explore-card" href="https://github.com/nikh2951/lookout" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i><strong>Visit Website</strong><small>Go to the official LOOKOUT page</small><span class="arrow">↗</span></a>
        <a class="explore-card" href="javascript:void(0)" onclick="openSavedProjects();return false;"><i class="fa-regular fa-book-open"></i><strong>Open Library</strong><small>Access your saved creations</small><span class="arrow">→</span></a>
        <a class="explore-card" href="javascript:void(0)" onclick="openFeatureStore();return false;"><i class="fa-solid fa-grip"></i><strong>Feature Store</strong><small>Download and install new tools</small><span class="arrow">→</span></a>
      </div></div>
      <div class="recent-panel lk-glass"><div class="panel-title"><h3>Recently Used</h3><span>Your creative space</span></div><div class="recent-grid" id="recentProjects"><div class="recent-item recent-open" onclick="openSavedProjects()"><i class="fa-solid fa-plus"></i><span>Open Project</span></div></div></div>
    </section>
  </div>
</div>`;
}

function initializeNavigation(){
  moveIndicator(homeIcon);
}

function goHome(){
  window.restoreManualSidebarUtilities?.();
  document.body.classList.remove('manual-editor-active');
  moveIndicator(homeIcon);
  document.querySelector('.sidebar')?.classList.remove('hidden');
  document.querySelector('.main')?.classList.remove('fullscreen');
  mainContent.classList.remove('manual-editor-host');
  mainContent.innerHTML = homeMarkup();
  mainContent.classList.add("home-redesign");
  window.LookOutWorkspaceUI?.setHomeMode(true);
  window.LookOutRAG?.setHomeMode?.(true);
  initializeHomeRedesign();
}

function setWorkspacePageMode(){
  window.LookOutWorkspaceUI?.setHomeMode(false);
  window.LookOutRAG?.setHomeMode?.(false);
  // Workspace pages must always use the Workspace navigation state.
  const selectWorkspace = () => moveIndicator(document.getElementById("workspaceIcon"));
  requestAnimationFrame(selectWorkspace);
  setTimeout(selectWorkspace, 80);
}

function openSavedProjects(){
  const imgs = (window.getStoredGeneratedImages && getStoredGeneratedImages()) || [];
  if(!imgs.length){ alert('No saved projects are available yet.'); return; }
  const panel = document.getElementById('recentProjects');
  if(!panel) return;
  panel.innerHTML = imgs.slice(-4).reverse().map((url,i)=>`<button class="recent-item" type="button" onclick="openGenerator()"><img class="recent-thumb" src="${url}" alt="Saved project"><span><strong>Project ${imgs.length-i}</strong><small>Saved creation</small></span></button>`).join('');
  panel.scrollIntoView({behavior:'smooth',block:'center'});
}
function openFeatureStore(){
  const existing=document.getElementById('lookoutFeatureStoreModal');
  if(existing){existing.classList.add('open');return;}
  const modal=document.createElement('div');
  modal.id='lookoutFeatureStoreModal';
  modal.className='lookout-feature-store-modal';
  modal.innerHTML=`<div class="lookout-feature-store-card" role="dialog" aria-modal="true" aria-label="Feature Store">
    <div class="lookout-feature-store-head"><div><span class="store-kicker">LOOKOUT</span><h2>Feature Store</h2><p>Discover reusable editing features and inventions.</p></div><button type="button" class="store-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="lookout-feature-store-grid">
      <button type="button" class="store-tile" data-store-action="studio"><i class="fa-solid fa-flask"></i><strong>Feature Studio</strong><small>Invent your own effects, styles and editing workflows.</small><span>Open Studio →</span></button>
      <button type="button" class="store-tile" data-store-action="library"><i class="fa-solid fa-layer-group"></i><strong>My Creations</strong><small>Open inventions you have already saved.</small><span>Open Library →</span></button>
      <div class="store-tile disabled"><i class="fa-solid fa-store"></i><strong>Marketplace</strong><small>Creator-made features will appear here when publishing is enabled.</small><span>Coming next</span></div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.classList.remove('open');
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.querySelector('.store-close')?.addEventListener('click',close);
  modal.querySelector('[data-store-action="studio"]')?.addEventListener('click',()=>{close();window.LookOutOpenFeatureStudio?.();});
  modal.querySelector('[data-store-action="library"]')?.addEventListener('click',()=>{close();window.LookOutOpenFeatureStudio?.();setTimeout(()=>window.openFeatureLibraryModal?.(),80);});
  requestAnimationFrame(()=>modal.classList.add('open'));
}

function initializeHomeRedesign(){
  const nodes=[...document.querySelectorAll('.wheel-node')]; let selected=0; let rotation=0;
  const actions={generator:openGenerator,manual:openManualEdit,'ai-edit':openAIEdit,more:openFeatureStore};
  function paint(){nodes.forEach((n,i)=>{n.classList.toggle('active',i===selected);n.style.setProperty('--angle',`${i*90+rotation}deg`);});document.querySelectorAll('.wheel-dot').forEach((d,i)=>d.classList.toggle('active',i===selected));}
  function step(dir){selected=(selected+dir+nodes.length)%nodes.length;rotation=(selected*90)*-1;paint();}
  document.getElementById('wheelNext')?.addEventListener('click',()=>step(1)); document.getElementById('wheelPrev')?.addEventListener('click',()=>step(-1));
  nodes.forEach((n,i)=>n.addEventListener('click',()=>{selected=i;paint();actions[n.dataset.action]?.();})); paint();
  const vm=document.getElementById('virtualMouseQuick');
  vm?.addEventListener('click', async()=>{
    if(typeof window.toggleVirtualMouse === 'function'){
      await window.toggleVirtualMouse();
      vm.classList.toggle('active', document.body.classList.contains('virtual-cursor-enabled'));
    } else {
      alert('Virtual mouse control is still loading.');
    }
  });
  const voice=document.getElementById('voiceQuick'); voice?.addEventListener('click',()=>{ if(window.LookOutRAG?.open){window.LookOutRAG.open(); setTimeout(()=>{const q=document.getElementById('ragQuestion'); const b=document.getElementById('ragVoiceBtn'); if(q&&b&&window.startVoiceInput) window.startVoiceInput(b,'ragQuestion');},180);} else alert('Voice command is not loaded yet.'); });
  const search=null;
  window.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      if(window.LookOutRAG?.open) window.LookOutRAG.open();
    }
  });
}

document.addEventListener('click',e=>{const menuBtn=e.target.closest('.workspace-menu-btn,.mobile-menu-btn');if(!menuBtn)return;const sidebar=document.querySelector('.sidebar'),main=document.querySelector('.main');if(!sidebar)return;if(window.innerWidth<=768){sidebar.classList.remove('hidden');sidebar.classList.toggle('active');return;}sidebar.classList.toggle('hidden');main?.classList.toggle('fullscreen');});

document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('featureWheel'))initializeHomeRedesign();});


// Public navigation helpers used by dynamically rendered workspace screens.
window.LookOutNavigation = {
  selectHome: () => moveIndicator(document.getElementById("homeIcon")),
  selectWorkspace: () => moveIndicator(document.getElementById("workspaceIcon"))
};
