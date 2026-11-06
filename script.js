// Tab Switching Controller Engine
function switchTab(tabName) {
    // 1. Hide all main content views
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active-tab'));

    // 2. Remove highlighted active status from navigation options
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 3. Reveal targeted tab structure
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active-tab');
    }

    // 4. Highlight current navigation tab label
    const selectedNav = document.getElementById(`nav-${tabName}`);
    if (selectedNav) {
        selectedNav.classList.add('active');
    }

    // Automatically reset viewpoint scroll back to modern layout crest top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const supabaseGalleryConfig = {
    projectUrl: "https://oiyclihezrhhvncyumds.supabase.co",
    bucket: "Ragdoll Pics",
    folder: "Gallery",
    anonKey: "sb_publishable_zKqOp6hILe9SbOtvrysyrw_hN5NLNA_"
};

const adminSessionKey = "houston-ragdoll-admin-session";
const kittenStatuses = ["available", "reserved", "adopted"];

function encodeStoragePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}

async function listStorageObjects(prefix, offset) {
    const response = await fetch(
        `${supabaseGalleryConfig.projectUrl}/storage/v1/object/list/${encodeURIComponent(supabaseGalleryConfig.bucket)}`,
        {
            method: "POST",
            headers: {
                apikey: supabaseGalleryConfig.anonKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prefix,
                limit: 100,
                offset,
                sortBy: { column: "name", order: "asc" }
            })
        }
    );

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Supabase Storage returned HTTP ${response.status}: ${details.slice(0, 400)}`);
    }

    const objects = await response.json();
    if (!Array.isArray(objects)) {
        throw new Error("Supabase Storage returned an unexpected listing response");
    }
    return objects;
}

async function getStorageImagePaths(folder) {
    const pendingFolders = [folder];
    const visitedFolders = new Set();
    const imagePaths = [];

    while (pendingFolders.length > 0) {
        const prefix = pendingFolders.pop();
        if (visitedFolders.has(prefix)) {
            continue;
        }
        visitedFolders.add(prefix);

        for (let offset = 0; ; offset += 100) {
            const objects = await listStorageObjects(prefix, offset);
            for (const object of objects) {
                if (!object || typeof object.name !== "string") {
                    continue;
                }

                const path = `${prefix}/${object.name}`;
                if (object.id == null && object.metadata == null) {
                    pendingFolders.push(path);
                } else if (/\.(avif|gif|jpe?g|png|webp)$/i.test(object.name)) {
                    imagePaths.push(path);
                }
            }

            if (objects.length < 100) {
                break;
            }
        }
    }

    return [...new Set(imagePaths)].sort((first, second) => first.localeCompare(second));
}

function showGalleryMessage(container, message) {
    const notice = document.createElement("p");
    notice.className = "past-litters-empty";
    notice.textContent = message;
    container.replaceChildren(notice);
}

async function loadSupabaseFolder(container, folder, renderImages) {
    if (supabaseGalleryConfig.anonKey === "ADD_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY") {
        showGalleryMessage(container, "Add your Supabase publishable (anon) key in script.js to load gallery photos.");
        return;
    }

    showGalleryMessage(container, "Loading gallery photos…");

    try {
        const imagePaths = await getStorageImagePaths(folder);
        if (imagePaths.length === 0) {
            showGalleryMessage(container, `No image files were found in the ${folder} folder.`);
            return;
        }

        renderImages(container, imagePaths);
    } catch (error) {
        console.error(`Could not load photos from the ${folder} folder in Supabase Storage.`, error);
        showGalleryMessage(container, `Couldn't load photos from ${folder}. ${error.message}. Check the Supabase Storage list policy and bucket settings.`);
    }
}

function getPublicStorageUrl(path) {
    return `${supabaseGalleryConfig.projectUrl}/storage/v1/object/public/${encodeURIComponent(supabaseGalleryConfig.bucket)}/${encodeStoragePath(path)}`;
}

function renderGalleryImages(container, imagePaths) {
    const cards = imagePaths.map(path => {
        const card = document.createElement("article");
        card.className = "media-card";

        const photo = document.createElement("div");
        photo.className = "media-placeholder";

        const image = document.createElement("img");
        image.src = getPublicStorageUrl(path);
        image.alt = path.split("/").pop();
        image.loading = "lazy";
        image.onerror = () => {
            photo.replaceChildren(document.createTextNode("Image failed to load — verify that the bucket is public."));
            console.error("Supabase image could not load:", image.src);
        };
        photo.appendChild(image);

        const info = document.createElement("div");
        info.className = "media-info";
        const title = document.createElement("h3");
        title.textContent = path.split("/").pop();
        info.appendChild(title);

        card.append(photo, info);
        return card;
    });

    container.replaceChildren(...cards);
}

const kingsAndQueens = [
    { name: "King Chen Chen Champion descendant [New Face Type]", color: "Seal Bicolor", photoName: "Chen Chen" },
    { name: "King Dan Dan [Modern]", color: "Blue Lynx Bicolor", photoName: "Dan Dan" },
    { name: "King Pang Pang [Traditional]", color: "Seal Bicolor", photoName: "Pang Pang" },
    { name: "Queen Yue Yue Champion descendant [Modern]", color: "Blue Lynx Bicolor", photoName: "Yue Yue" },
    { name: "Queen Nian Nian [Traditional]", color: "Seal Bicolor", photoName: "Nian Nian" },
    { name: "Queen Wen Wen [Mix]", color: "Lynx Bicolor", photoName: "Wen Wen" }
];

function normalizePhotoName(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function renderKingsAndQueens(container, imagePaths) {
    const unusedPaths = new Set(imagePaths);
    const catPhotos = kingsAndQueens.map(cat => {
        if (!cat.photoName) {
            return null;
        }

        const searchName = normalizePhotoName(cat.photoName);
        const match = imagePaths.find(path =>
            unusedPaths.has(path) &&
            normalizePhotoName(path.split("/").pop()).includes(searchName)
        );
        if (match) {
            unusedPaths.delete(match);
        }
        return match || null;
    });

    const unnamedQueenIndex = kingsAndQueens.findIndex(cat => cat.photoName === null);
    if (unnamedQueenIndex !== -1 && unusedPaths.size === 1) {
        catPhotos[unnamedQueenIndex] = unusedPaths.values().next().value;
    }

    const cards = kingsAndQueens.map((cat, index) => {
        const card = document.createElement("article");
        card.className = "media-card";

        const photo = document.createElement("div");
        photo.className = "media-placeholder";
        const imagePath = catPhotos[index];
        if (imagePath) {
            const image = document.createElement("img");
            image.src = getPublicStorageUrl(imagePath);
            image.alt = cat.name;
            image.loading = "lazy";
            image.onerror = () => {
                photo.replaceChildren(document.createTextNode("Image unavailable — check public bucket setting and filename."));
                console.error("Supabase image could not load:", image.src);
            };
            photo.appendChild(image);
        } else {
            const message = document.createElement("span");
            message.textContent = cat.photoName
                ? `No matching photo filename for ${cat.photoName}`
                : "Add a name to match this queen's photo";
            photo.appendChild(message);
        }

        const info = document.createElement("div");
        info.className = "media-info";
        const name = document.createElement("h3");
        name.textContent = cat.name;
        const color = document.createElement("p");
        color.textContent = cat.color;
        info.append(name, color);
        card.append(photo, info);
        return card;
    });

    container.replaceChildren(...cards);
}

async function supabaseRequest(path, { method = "GET", body, session, prefer } = {}) {
    const headers = { apikey: supabaseGalleryConfig.anonKey };
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    if (prefer) {
        headers.Prefer = prefer;
    }

    const response = await fetch(`${supabaseGalleryConfig.projectUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const responseText = await response.text();
    if (!response.ok) {
        let message = responseText;
        try {
            const details = JSON.parse(responseText);
            message = details.message || details.msg || details.error_description || details.error || responseText;
        } catch {
            // Keep the response text when the server does not return JSON.
        }
        throw new Error(`Supabase returned HTTP ${response.status}: ${message}`);
    }
    return responseText ? JSON.parse(responseText) : null;
}

function saveAdminSession(session) {
    sessionStorage.setItem(adminSessionKey, JSON.stringify(session));
    adminState.session = session;
}

function clearAdminSession() {
    sessionStorage.removeItem(adminSessionKey);
    adminState.session = null;
}

async function refreshAdminSession(session) {
    const result = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token }
    });
    const refreshed = {
        ...result,
        expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in
    };
    saveAdminSession(refreshed);
    return refreshed;
}

async function getAdminSession() {
    if (!adminState.session) {
        try {
            adminState.session = JSON.parse(sessionStorage.getItem(adminSessionKey));
        } catch {
            clearAdminSession();
        }
    }
    if (!adminState.session) {
        return null;
    }
    if (adminState.session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
        return refreshAdminSession(adminState.session);
    }
    return adminState.session;
}

async function requireSiteAdmin(session) {
    const rows = await supabaseRequest(
        `/rest/v1/site_admins?select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
        { session }
    );
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("This Supabase account is not authorized as a site admin. Add its user ID to public.site_admins in Supabase.");
    }
}

function showAdminMessage(message, isError = false) {
    const output = document.getElementById("admin-message");
    if (!output) {
        return;
    }
    output.textContent = message;
    output.classList.toggle("is-error", isError);
}

function setAdminView(isAdmin) {
    document.getElementById("admin-login").hidden = isAdmin;
    document.getElementById("admin-tools").hidden = !isAdmin;
    document.getElementById("admin-logout").hidden = !isAdmin;
    document.getElementById("admin-login-email").required = !isAdmin;
    document.getElementById("admin-login-password").required = !isAdmin;
}

const adminState = {
    session: null,
    kittens: [],
    notes: []
};

function renderAvailableKittens(container, kittens) {
    if (kittens.length === 0) {
        showGalleryMessage(container, "No kittens are listed right now. Please check back soon.");
        return;
    }
    const cards = kittens.map(kitten => {
        const card = document.createElement("article");
        card.className = "media-card kitten-card";
        const info = document.createElement("div");
        info.className = "media-info";
        const name = document.createElement("h3");
        name.textContent = kitten.name;
        const status = document.createElement("span");
        status.className = `kitten-status status-${kitten.status}`;
        status.textContent = kitten.status[0].toUpperCase() + kitten.status.slice(1);
        const description = document.createElement("p");
        description.textContent = kitten.description || "";
        info.append(name, status, description);
        card.appendChild(info);
        return card;
    });
    container.replaceChildren(...cards);
}

async function loadAvailableKittens() {
    const container = document.getElementById("available-container");
    showGalleryMessage(container, "Loading kitten listings…");
    try {
        const kittens = await supabaseRequest(
            "/rest/v1/available_kittens?select=id,name,description,status,created_at&order=created_at.desc"
        );
        if (!Array.isArray(kittens)) {
            throw new Error("Supabase returned an unexpected kitten listing.");
        }
        renderAvailableKittens(container, kittens);
    } catch (error) {
        console.error("Could not load available kittens.", error);
        showGalleryMessage(container, `Couldn't load kitten listings. ${error.message}`);
    }
}

function renderPastLitterImages(container, imagePaths) {
    const cards = imagePaths.map(path => {
        const card = document.createElement("article");
        card.className = "media-card";
        const photo = document.createElement("div");
        photo.className = "media-placeholder";
        const image = document.createElement("img");
        image.className = "past-litter-photo";
        image.src = getPublicStorageUrl(path);
        image.alt = path.split("/").pop();
        image.loading = "lazy";
        image.onerror = () => {
            photo.replaceChildren(document.createTextNode("Image unavailable — check that the photo bucket is public."));
            console.error("Past litter photo could not load:", image.src);
        };
        photo.appendChild(image);
        const info = document.createElement("div");
        info.className = "media-info";
        const title = document.createElement("h3");
        title.textContent = path.split("/").pop().replace(/\.[^.]+$/, "");
        info.appendChild(title);
        card.append(photo, info);
        return card;
    });
    container.replaceChildren(...cards);
}

function renderAdminKittens() {
    const list = document.getElementById("admin-kitten-list");
    if (adminState.kittens.length === 0) {
        list.textContent = "No kitten listings yet.";
        return;
    }
    list.replaceChildren(...adminState.kittens.map(kitten => {
        const row = document.createElement("div");
        row.className = "admin-list-row";
        const details = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = kitten.name;
        const status = document.createElement("span");
        status.className = `kitten-status status-${kitten.status}`;
        status.textContent = kitten.status[0].toUpperCase() + kitten.status.slice(1);
        details.append(name, status);
        const actions = document.createElement("div");
        actions.className = "admin-row-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            document.getElementById("admin-kitten-id").value = kitten.id;
            document.getElementById("admin-kitten-name").value = kitten.name;
            document.getElementById("admin-kitten-description").value = kitten.description || "";
            document.getElementById("admin-kitten-status").value = kitten.status;
            document.getElementById("admin-kitten-save").textContent = "Save changes";
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-danger-button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => deleteKitten(kitten.id, kitten.name));
        actions.append(edit, remove);
        row.append(details, actions);
        return row;
    }));
}

async function loadAdminKittens() {
    const session = await getAdminSession();
    adminState.kittens = await supabaseRequest(
        "/rest/v1/available_kittens?select=id,name,description,status,created_at&order=created_at.desc",
        { session }
    );
    renderAdminKittens();
    renderAvailableKittens(document.getElementById("available-container"), adminState.kittens);
}

function renderAdminNotes() {
    const list = document.getElementById("admin-note-list");
    if (adminState.notes.length === 0) {
        list.textContent = "No saved notes yet.";
        return;
    }
    list.replaceChildren(...adminState.notes.map(note => {
        const row = document.createElement("article");
        row.className = "admin-note-row";
        const title = document.createElement("h4");
        title.textContent = note.title;
        const content = document.createElement("p");
        content.textContent = note.content;
        const actions = document.createElement("div");
        actions.className = "admin-row-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            document.getElementById("admin-note-id").value = note.id;
            document.getElementById("admin-note-title").value = note.title;
            document.getElementById("admin-note-content").value = note.content;
            document.getElementById("admin-note-save").textContent = "Save changes";
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-danger-button";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteNote(note.id));
        actions.append(edit, remove);
        row.append(title, content, actions);
        return row;
    }));
}

async function loadAdminNotes() {
    const session = await getAdminSession();
    adminState.notes = await supabaseRequest(
        "/rest/v1/notes?select=id,title,content,created_at,updated_at&order=updated_at.desc",
        { session }
    );
    renderAdminNotes();
}

async function loadAdminData() {
    try {
        await Promise.all([loadAdminKittens(), loadAdminNotes()]);
        showAdminMessage("Signed in. Your changes are saved to Supabase.");
    } catch (error) {
        console.error("Could not load admin data.", error);
        showAdminMessage(error.message, true);
    }
}

async function deleteKitten(id, name) {
    if (!window.confirm(`Remove ${name} from the kitten listings?`)) {
        return;
    }
    try {
        const session = await getAdminSession();
        await supabaseRequest(`/rest/v1/available_kittens?id=eq.${encodeURIComponent(id)}`, {
            method: "DELETE",
            session
        });
        await loadAdminKittens();
        showAdminMessage("Kitten listing removed.");
    } catch (error) {
        showAdminMessage(error.message, true);
    }
}

async function deleteNote(id) {
    if (!window.confirm("Delete this saved note?")) {
        return;
    }
    try {
        const session = await getAdminSession();
        await supabaseRequest(`/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
            method: "DELETE",
            session
        });
        await loadAdminNotes();
        showAdminMessage("Note deleted.");
    } catch (error) {
        showAdminMessage(error.message, true);
    }
}

function resetKittenForm() {
    document.getElementById("admin-kitten-form").reset();
    document.getElementById("admin-kitten-id").value = "";
    document.getElementById("admin-kitten-save").textContent = "Add kitten";
}

function resetNoteForm() {
    document.getElementById("admin-note-form").reset();
    document.getElementById("admin-note-id").value = "";
    document.getElementById("admin-note-save").textContent = "Save note";
}

async function signOutAdmin() {
    const session = await getAdminSession();
    try {
        if (session) {
            await supabaseRequest("/auth/v1/logout", { method: "POST", session });
        }
    } finally {
        clearAdminSession();
        setAdminView(false);
        showAdminMessage("Signed out.");
        resetKittenForm();
        resetNoteForm();
        document.getElementById("admin-dialog").close();
    }
}

function connectAdminControls() {
    const dialog = document.getElementById("admin-dialog");
    document.getElementById("admin-access-trigger").addEventListener("click", () => {
        setAdminView(Boolean(adminState.session));
        dialog.showModal();
        if (adminState.session) {
            loadAdminData();
        }
    });
    document.getElementById("admin-close").addEventListener("click", () => dialog.close());
    document.getElementById("admin-login-form").addEventListener("submit", async event => {
        event.preventDefault();
        const button = document.getElementById("admin-login-submit");
        button.disabled = true;
        showAdminMessage("Signing in…");
        try {
            const result = await supabaseRequest("/auth/v1/token?grant_type=password", {
                method: "POST",
                body: {
                    email: document.getElementById("admin-login-email").value.trim(),
                    password: document.getElementById("admin-login-password").value
                }
            });
            const session = {
                ...result,
                expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in
            };
            await requireSiteAdmin(session);
            saveAdminSession(session);
            setAdminView(true);
            document.getElementById("admin-login-password").value = "";
            await loadAdminData();
        } catch (error) {
            clearAdminSession();
            console.error("Admin sign-in failed.", error);
            showAdminMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });
    document.getElementById("admin-logout").addEventListener("click", signOutAdmin);
    document.getElementById("admin-kitten-cancel").addEventListener("click", resetKittenForm);
    document.getElementById("admin-note-cancel").addEventListener("click", resetNoteForm);

    document.getElementById("admin-kitten-form").addEventListener("submit", async event => {
        event.preventDefault();
        const id = document.getElementById("admin-kitten-id").value;
        const payload = {
            name: document.getElementById("admin-kitten-name").value.trim(),
            description: document.getElementById("admin-kitten-description").value.trim(),
            status: document.getElementById("admin-kitten-status").value,
            updated_at: new Date().toISOString()
        };
        if (!kittenStatuses.includes(payload.status)) {
            showAdminMessage("Choose a valid kitten status.", true);
            return;
        }
        try {
            const session = await getAdminSession();
            await supabaseRequest(
                id ? `/rest/v1/available_kittens?id=eq.${encodeURIComponent(id)}` : "/rest/v1/available_kittens",
                {
                    method: id ? "PATCH" : "POST",
                    body: payload,
                    session,
                    prefer: "return=representation"
                }
            );
            resetKittenForm();
            await loadAdminKittens();
            showAdminMessage(id ? "Kitten listing updated." : "Kitten added.");
        } catch (error) {
            showAdminMessage(error.message, true);
        }
    });

    document.getElementById("admin-note-form").addEventListener("submit", async event => {
        event.preventDefault();
        const id = document.getElementById("admin-note-id").value;
        const payload = {
            title: document.getElementById("admin-note-title").value.trim() || "Untitled",
            content: document.getElementById("admin-note-content").value.trim(),
            updated_at: new Date().toISOString()
        };
        try {
            const session = await getAdminSession();
            await supabaseRequest(
                id ? `/rest/v1/notes?id=eq.${encodeURIComponent(id)}` : "/rest/v1/notes",
                {
                    method: id ? "PATCH" : "POST",
                    body: payload,
                    session,
                    prefer: "return=representation"
                }
            );
            resetNoteForm();
            await loadAdminNotes();
            showAdminMessage(id ? "Note updated." : "Note saved.");
        } catch (error) {
            showAdminMessage(error.message, true);
        }
    });

    const savedSession = sessionStorage.getItem(adminSessionKey);
    if (savedSession) {
        getAdminSession()
            .then(async session => {
                await requireSiteAdmin(session);
                setAdminView(true);
            })
            .catch(error => {
                clearAdminSession();
                console.error("Could not restore the admin session.", error);
            });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const galleryContainer = document.getElementById("gallery-container");
    const kingsAndQueensContainer = document.getElementById("kings-queens-container");
    const availableContainer = document.getElementById("available-container");
    const pastLittersContainer = document.getElementById("past-litters-container");

    if (galleryContainer) {
        loadSupabaseFolder(galleryContainer, supabaseGalleryConfig.folder, renderGalleryImages);
    }
    if (kingsAndQueensContainer) {
        loadSupabaseFolder(kingsAndQueensContainer, "Kings_Queens", renderKingsAndQueens);
    }
    if (availableContainer) {
        loadAvailableKittens();
    }
    if (pastLittersContainer) {
        loadSupabaseFolder(pastLittersContainer, "Kittens", renderPastLitterImages);
    }
    connectAdminControls();
});

document.addEventListener("DOMContentLoaded", () => {
    // Elegant fade-in effect on scroll (Apple Style)
    const fadeElements = document.querySelectorAll(".fading-in");

    const appearanceOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearanceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target); // Triggers once
            }
        });
    }, appearanceOptions);

    fadeElements.forEach(element => {
        appearanceObserver.observe(element);
    });
});
