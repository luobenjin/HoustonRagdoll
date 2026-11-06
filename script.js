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

const pastLitters = [
    // Add each kitten like this:
    // { image: "images/kitten-name.jpg", name: "Kitten name", caption: "Found a loving home" }
];

const supabaseGalleryConfig = {
    projectUrl: "https://oiyclihezrhhvncyumds.supabase.co",
    bucket: "Ragdoll Pics",
    folder: "Gallery",
    anonKey: "sb_publishable_zKqOp6hILe9SbOtvrysyrw_hN5NLNA_"
};

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
                Authorization: `Bearer ${supabaseGalleryConfig.anonKey}`,
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
        throw new Error(`Supabase Storage returned HTTP ${response.status}`);
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

    return imagePaths.sort((first, second) => first.localeCompare(second));
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
        showGalleryMessage(container, "Couldn't load photos. Check the Supabase key and Storage read/list permissions, then see the browser console for details.");
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
    { name: "Queen", color: "-", photoName: null }
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

    // Dynamic Generator: Allocates spaces inside Available Kittens view
    if (availableContainer) {
        for (let i = 1; i <= 6; i++) {
            const card = document.createElement("div");
            card.className = "media-card";
            card.innerHTML = `
                <div class="media-placeholder"><span>[ Kitten Showcase Photo #${i} ]</span></div>
                <div class="media-info">
                    <h3>Kitten Listing #${i}</h3>
                    <p>Status: Coming Soon</p>
                </div>
            `;
            availableContainer.appendChild(card);
        }
    }

    if (pastLittersContainer) {
        if (pastLitters.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "past-litters-empty";
            emptyMessage.textContent = "Past litter photos will appear here. Add a kitten to the pastLitters list in script.js to get started.";
            pastLittersContainer.appendChild(emptyMessage);
        } else {
            pastLitters.forEach(kitten => {
                const card = document.createElement("article");
                card.className = "media-card";

                const photo = document.createElement("div");
                photo.className = "media-placeholder";

                const image = document.createElement("img");
                image.className = "past-litter-photo";
                image.src = kitten.image;
                image.alt = kitten.name;
                photo.appendChild(image);

                const info = document.createElement("div");
                info.className = "media-info";

                const name = document.createElement("h3");
                name.textContent = kitten.name;

                const caption = document.createElement("p");
                caption.textContent = kitten.caption;

                info.append(name, caption);
                card.append(photo, info);
                pastLittersContainer.appendChild(card);
            });
        }
    }
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