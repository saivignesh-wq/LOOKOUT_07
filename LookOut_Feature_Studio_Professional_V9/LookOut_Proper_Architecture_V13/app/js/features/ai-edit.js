/* =====================================================
   LOOKOUT AI EDIT - UPDATED
   ===================================================== */

const AI_EDIT_MAX_IMAGES = 2;

const AI_EDIT_OPERATIONS = {
    custom: {
        label: "Custom",
        icon: "fa-wand-magic-sparkles",
        placeholder: "Describe exactly what you want to change...",
        hint: "Edit with your own prompt"
    },
    enhance: {
        label: "Enhance",
        icon: "fa-sparkles",
        placeholder: "Example: improve sharpness, skin detail and lighting...",
        hint: "Improve quality, clarity and details"
    },
    remove_object: {
        label: "Remove Object",
        icon: "fa-eraser",
        placeholder: "Example: remove the person standing on the left...",
        hint: "Remove unwanted objects"
    },
    add_object: {
        label: "Add Object",
        icon: "fa-plus",
        placeholder: "Example: add a red sports car beside the subject...",
        hint: "Add a new object to the image"
    },
    background_remove: {
        label: "Remove Background",
        icon: "fa-scissors",
        placeholder: "Optional: describe how the isolated subject should look...",
        hint: "Remove the image background"
    },
    background_replace: {
        label: "Replace Background",
        icon: "fa-image",
        placeholder: "Example: replace the background with a modern studio...",
        hint: "Change to a new background"
    },
    sky_replace: {
        label: "Replace Sky",
        icon: "fa-cloud-sun",
        placeholder: "Example: replace the sky with a dramatic sunset...",
        hint: "Change the sky in the image"
    },
    age: {
        label: "Age Transform",
        icon: "fa-hourglass-half",
        placeholder: "Example: make the person look about 60 years old...",
        hint: "Make the subject older or younger"
    },
    gender: {
        label: "Gender Transform",
        icon: "fa-venus-mars",
        placeholder: "Example: create a feminine presentation while preserving identity...",
        hint: "Transform gender presentation"
    },
    cartoon: {
        label: "Cartoon / Animated",
        icon: "fa-palette",
        placeholder: "Example: transform into a polished 3D animated movie style...",
        hint: "Convert to a cartoon or animated style"
    },
    merge: {
        label: "Merge Images",
        icon: "fa-object-group",
        placeholder: "Example: combine both people into one realistic group photo...",
        hint: "Combine two images together"
    }
};

let aiEditFiles = [];
let aiEditOriginalData = null;
let aiEditResultUrl = null;

function openAIEdit(){
    window.restoreManualSidebarUtilities?.();
    document.body.classList.remove('manual-editor-active');
    window.setWorkspacePageMode?.();
    moveIndicator(document.getElementById("workspaceIcon"));

    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector(".main");

    if (window.innerWidth <= 768) {
        sidebar?.classList.add("hidden");
        main?.classList.remove("fullscreen");
        mainContent.classList.remove("manual-editor-host");
    } else {
        sidebar?.classList.remove("hidden");
        main?.classList.remove("fullscreen");
    }

    requestAnimationFrame(() => moveIndicator(document.getElementById("workspaceIcon")));

    // AI Edit uses the global workspace dock for Quick Actions / Explore so
    // those controls keep exactly the same behavior as the Home page.
    window.LookOutWorkspaceUI?.setHomeMode(false);

    mainContent.innerHTML = `
        <div class="ai-edit-page mobile-ai-edit-page">
            <button class="workspace-menu-btn" id="aiEditMenuBtn" aria-label="Toggle sidebar">
                <i class="fa-solid fa-bars"></i>
            </button>

            <div class="ai-edit-top-controls">
                <div class="ai-edit-mode" role="tablist" aria-label="Edit mode">
                    <button class="mode-btn active" data-mode="simple" type="button">Simple</button>
                    <button class="mode-btn" data-mode="advanced" type="button">Advanced</button>
                </div>
            </div>

            <div class="ai-edit-workspace">
                <section class="edit-preview-area" id="editPreviewArea">
                    <div class="center-upload" id="centerUpload">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <h2>Upload Images</h2>
                        <p>Upload 1 image, or 2 images for Merge</p>
                        <span>Drag &amp; drop images here, or click to browse</span>
                        <button class="browse-images-btn" id="browseImagesBtn" type="button" aria-label="Browse images">
                            <i class="fa-regular fa-image"></i> Browse Images
                        </button>
                        <input type="file" id="imageUpload" multiple accept="image/*" aria-label="Choose images" tabindex="-1">
                    </div>

                    <div class="uploaded-images" id="uploadedImages"></div>

                    <div class="comparison-panel hidden" id="comparisonPanel">
                        <div class="comparison-card"><span>Original</span><img id="comparisonOriginal" alt="Original image"></div>
                        <div class="comparison-card"><span>Edited</span><img id="comparisonEdited" alt="Edited image"></div>
                    </div>
                    <div class="edit-status hidden" id="editStatus"></div>
                </section>

                <aside class="ai-custom-features" aria-label="Editing features">
                    <div class="feature-grid" id="featureGrid">
                        ${Object.entries(AI_EDIT_OPERATIONS).map(([key, value]) => `
                            <button type="button" class="feature-card ${key === "custom" ? "active" : ""}" data-operation="${key}" aria-pressed="${key === "custom"}">
                                <span class="feature-icon"><i class="fa-solid ${value.icon}"></i></span>
                                <span class="feature-copy"><strong>${value.label}</strong><small>${value.hint}</small></span>
                                <span class="feature-arrow"><i class="fa-solid fa-chevron-right"></i></span>
                            </button>
                        `).join("")}
                    </div>
                </aside>
            </div>

            <div class="edit-bottom-bar hidden" id="editBottomBar" aria-hidden="true">
                        <div class="edit-control-row">
                            <label class="upload-again-btn" title="Add image" aria-label="Add image">
                                <i class="fa-solid fa-plus"></i>
                                <input type="file" multiple accept="image/*" id="replaceUpload">
                            </label>

                            <textarea id="editPrompt" placeholder="Add a prompt (optional)..." maxlength="2000" aria-label="Describe your edit"></textarea>

                            <button class="generate-btn" id="editGenerateBtn" type="button" title="Generate edit" aria-label="Generate edit">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                            </button>
                        </div>

                        <div class="advanced-controls hidden" id="advancedControls">
                            <span><i class="fa-solid fa-circle-info"></i> Advanced mode preserves unrelated details and prioritizes precise local edits.</span>
                            <span>Precise edit mode</span>
                        </div>

                        <select id="editOperation" aria-hidden="true" tabindex="-1">
                            ${Object.entries(AI_EDIT_OPERATIONS).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join("")}
                        </select>
                    </div>
        </div>
    `;

    document.getElementById("aiEditMenuBtn")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.toggle("hidden");
    });

    const promptBar = document.getElementById("editBottomBar");
    const promptInput = document.getElementById("editPrompt");
    promptInput?.addEventListener("focus", () => promptBar?.classList.add("expanded"));
    promptInput?.addEventListener("click", () => promptBar?.classList.add("expanded"));
    document.addEventListener("click", event => {
        if (!promptBar || promptBar.classList.contains("hidden")) return;
        if (!promptBar.contains(event.target)) promptBar.classList.remove("expanded");
    });

    setupAIEditUpload();
    setupAIEditControls();
    setupEditGenerate();
    loadSelectedImages();
}

function selectAIEditOperation(operation){
    const select = document.getElementById("editOperation");
    if(!select) return;
    if(operation === "merge" && aiEditFiles.length !== 2) return;
    select.value = operation;
    select.dispatchEvent(new Event("change", { bubbles:true }));
}

function setupAIEditUpload(){

    const uploadInput = document.getElementById("imageUpload");
    const replaceUpload = document.getElementById("replaceUpload");
    const browseButton = document.getElementById("browseImagesBtn");
    const uploadZone = document.getElementById("centerUpload");

    if(!uploadInput){
        console.error("AI Edit upload input was not created.");
        return;
    }

    // Keep the native input as the single source of truth. The visible button
    // only opens it from a direct user gesture, which is the most reliable
    // approach for local-file pages in Chromium/Edge.
    const openFilePicker = (event) => {
        event?.preventDefault();
        event?.stopPropagation();

        try{
            if(typeof uploadInput.showPicker === "function") uploadInput.showPicker();
            else uploadInput.click();
        }catch(error){
            // Some browsers/security contexts do not expose showPicker().
            // The normal click() fallback still opens the native picker.
            try{ uploadInput.click(); }
            catch(fallbackError){ console.error("Could not open image picker:", fallbackError); }
        }
    };

    browseButton?.addEventListener("click", openFilePicker);

    uploadZone?.addEventListener("click", event => {
        if(event.target.closest("#browseImagesBtn")) return;
        openFilePicker(event);
    });

    uploadInput.addEventListener("change", event => {
        const files = Array.from(event.target.files || []);
        if(files.length) addAIEditFiles(files);
        // Reset so selecting the same file again still fires change.
        event.target.value = "";
    });

    replaceUpload?.addEventListener("change", event => {
        const files = Array.from(event.target.files || []);
        if(files.length) addAIEditFiles(files);
        event.target.value = "";
    });
}

function addAIEditFiles(files){

    const valid = files.filter(file => file.type.startsWith("image/"));

    for(const file of valid){
        if(aiEditFiles.length >= AI_EDIT_MAX_IMAGES) break;
        aiEditFiles.push(file);
    }

    renderAIEditFiles();
}

function removeAIEditFile(index){
    aiEditFiles.splice(index, 1);
    renderAIEditFiles();
}

function renderAIEditFiles(){
    const uploadedImages = document.getElementById("uploadedImages");
    const centerUpload = document.getElementById("centerUpload");
    const countLabel = document.getElementById("imageCountLabel");
    if(!uploadedImages) return;

    uploadedImages.innerHTML = "";
    uploadedImages.dataset.count = String(aiEditFiles.length);
    if(centerUpload){
        centerUpload.style.setProperty("display", aiEditFiles.length ? "none" : "flex", "important");
        centerUpload.setAttribute("aria-hidden", String(aiEditFiles.length > 0));
    }

    const promptBar = document.getElementById("editBottomBar");
    if(promptBar){
        const hasImages = aiEditFiles.length > 0;
        promptBar.classList.toggle("hidden", !hasImages);
        promptBar.setAttribute("aria-hidden", String(!hasImages));
        if(!hasImages) promptBar.classList.remove("expanded");
    }

    if(countLabel) countLabel.textContent = `${aiEditFiles.length} / ${AI_EDIT_MAX_IMAGES} images`;

    aiEditFiles.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "image-wrapper";
        const img = document.createElement("img");
        img.className = "preview-image";
        img.alt = `Uploaded image ${index + 1}`;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-image-btn";
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.title = "Remove image";
        removeBtn.onclick = () => removeAIEditFile(index);

        const reader = new FileReader();
        reader.onload = event => {
            img.src = event.target.result;
            img.addEventListener("load", () => {
                if (img.naturalWidth && img.naturalHeight) {
                    wrapper.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                }
            }, { once: true });
            wrapper.appendChild(img);
            if(typeof createDownloadButton === "function") wrapper.appendChild(createDownloadButton(event.target.result, `lookout-upload-${index + 1}.png`));
            wrapper.appendChild(removeBtn);
            uploadedImages.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });

    updateMergeAvailability(document.getElementById("editOperation")?.value || "custom");
}

function setupAIEditControls(){
    const operationSelect = document.getElementById("editOperation");
    const promptInput = document.getElementById("editPrompt");
    const cards = document.querySelectorAll(".feature-card");

    function syncOperation(operation){
        const info = AI_EDIT_OPERATIONS[operation] || AI_EDIT_OPERATIONS.custom;
        if(operation === "merge" && aiEditFiles.length !== 2) return;

        operationSelect.value = operation;
        promptInput.placeholder = info.placeholder;

        cards.forEach(card => {
            const active = card.dataset.operation === operation;
            card.classList.toggle("active", active);
            card.setAttribute("aria-pressed", String(active));
        });
        updateMergeAvailability(operation);
    }

    cards.forEach(card => {
        card.addEventListener("click", () => syncOperation(card.dataset.operation));
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            document.getElementById("advancedControls")?.classList.toggle("hidden", button.dataset.mode !== "advanced");
        });
    });

    operationSelect?.addEventListener("change", () => {
        const operation = operationSelect.value;
        const info = AI_EDIT_OPERATIONS[operation] || AI_EDIT_OPERATIONS.custom;
        promptInput.placeholder = info.placeholder;
        cards.forEach(card => {
            const active = card.dataset.operation === operation;
            card.classList.toggle("active", active);
            card.setAttribute("aria-pressed", String(active));
        });
        updateMergeAvailability(operation);
    });

    syncOperation("custom");
}

function updateMergeAvailability(operation){
    const operationSelect = document.getElementById("editOperation");
    const mergeCard = document.querySelector('.feature-card[data-operation="merge"]');
    if(!operationSelect) return;

    const canMerge = aiEditFiles.length === 2;
    const mergeOption = operationSelect.querySelector('option[value="merge"]');
    if(mergeOption) mergeOption.disabled = !canMerge;
    if(mergeCard){
        mergeCard.disabled = !canMerge;
        mergeCard.classList.toggle("disabled", !canMerge);
        mergeCard.setAttribute("aria-disabled", String(!canMerge));
    }

    if(operation === "merge" && !canMerge){
        operationSelect.value = "custom";
        const custom = AI_EDIT_OPERATIONS.custom;
        const promptInput = document.getElementById("editPrompt");
        if(promptInput) promptInput.placeholder = custom.placeholder;
        document.querySelectorAll(".feature-card").forEach(card => {
            const active = card.dataset.operation === "custom";
            card.classList.toggle("active", active);
            card.setAttribute("aria-pressed", String(active));
        });
    }
}

async function getSavedEditImage(){

    try{
        const savedImages = JSON.parse(localStorage.getItem("editImages") || "null");

        if(!savedImages?.length) return null;

        const response = await fetch(savedImages[0]);

        if(!response.ok) return null;

        const blob = await response.blob();

        return new File(
            [blob],
            "selected.png",
            { type: blob.type || "image/png" }
        );

    }catch(error){
        console.warn("Could not load saved edit image:", error);
        return null;
    }
}

function getSelectedMode(){
    return document.querySelector(".mode-btn.active")?.dataset.mode || "simple";
}

function setEditStatus(message, loading = false){

    const status = document.getElementById("editStatus");

    if(!status) return;

    status.classList.remove("hidden", "success", "error");

    if(loading){
        status.innerHTML = `
            <span class="status-spinner"></span>
            ${message}
        `;
    }else{
        status.textContent = message;
    }
}

function clearEditStatus(){
    document.getElementById("editStatus")?.classList.add("hidden");
}

function showComparison(originalUrl, editedUrl){

    const panel = document.getElementById("comparisonPanel");

    if(!panel) return;

    document.getElementById("comparisonOriginal").src = originalUrl;
    document.getElementById("comparisonEdited").src = editedUrl;

    panel.classList.remove("hidden");
}

function displayEditedResult(url){

    const uploadedImages = document.getElementById("uploadedImages");

    if(!uploadedImages) return;

    uploadedImages.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper result-wrapper";

    const img = document.createElement("img");
    img.className = "preview-image edited-result";
    img.alt = "AI edited result";
    img.src = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;

    wrapper.appendChild(img);

    if(typeof createDownloadButton === "function"){
        wrapper.appendChild(
            createDownloadButton(img.src, "lookout-edited.png")
        );
    }

    const resetBtn = document.createElement("button");
    resetBtn.className = "result-reset-btn";
    resetBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i>';
    resetBtn.title = "Back to uploaded images";
    resetBtn.onclick = () => {
        document.getElementById("comparisonPanel")?.classList.add("hidden");
        renderAIEditFiles();
        clearEditStatus();
    };

    wrapper.appendChild(resetBtn);
    uploadedImages.appendChild(wrapper);
}

function setupEditGenerate(){

    const generateBtn = document.getElementById("editGenerateBtn");
    const promptInput = document.getElementById("editPrompt");
    const operationSelect = document.getElementById("editOperation");

    generateBtn?.addEventListener("click", async () => {

        let files = [...aiEditFiles];

        if(!files.length){
            const saved = await getSavedEditImage();

            if(saved){
                files = [saved];
                aiEditFiles = [saved];
                renderAIEditFiles();
            }
        }

        if(!files.length){
            alert("Upload an image first.");
            return;
        }

        const operation = operationSelect?.value || "custom";
        const mode = getSelectedMode();
        const prompt = promptInput?.value.trim() || "";

        if(operation === "merge" && files.length !== 2){
            alert("Merge requires exactly 2 images.");
            return;
        }

        if(operation === "custom" && !prompt){
            alert("Describe the edit you want.");
            return;
        }

        if(files.length > 1 && operation !== "merge"){
            alert("For two images, choose Merge Images.");
            return;
        }

        const formData = new FormData();

        formData.append("prompt", prompt);
        formData.append("operation", operation);
        formData.append("mode", mode);

        const email = localStorage.getItem("userEmail");
        if(email) formData.append("email", email);

        files.forEach(file => {
            formData.append("images", file);
        });

        generateBtn.disabled = true;
        setEditStatus("Editing image...", true);

        try{

            const response = await fetch(
                `${AI_API_BASE}/edit`,
                {
                    method: "POST",
                    body: formData
                }
            );

            let data;

            try{
                data = await response.json();
            }catch{
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            if(!response.ok || !data.success){
                throw new Error(data.error || "Failed to edit image.");
            }

            const resultUrl = resolveGeneratedImageUrl(data);

            if(!resultUrl){
                throw new Error("The server did not return an image URL.");
            }

            aiEditOriginalData = files[0];
            aiEditResultUrl = resultUrl;

            const originalUrl = URL.createObjectURL(files[0]);

            displayEditedResult(resultUrl);
            showComparison(originalUrl, resultUrl);
            setEditStatus(
                `Completed: ${AI_EDIT_OPERATIONS[operation]?.label || "AI Edit"}`
            );

        }catch(error){

            console.error("AI Edit failed:", error);

            setEditStatus(error.message || "AI Edit failed.", false);
            document.getElementById("editStatus")?.classList.add("error");

        }finally{
            generateBtn.disabled = false;
        }
    });
}
