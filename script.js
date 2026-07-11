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

document.addEventListener("DOMContentLoaded", () => {

    const galleryContainer = document.getElementById("gallery-container");
    const availableContainer = document.getElementById("available-container");

    // Dynamic Generator: Generates 40 Clean Asset Placeholder Boxes for the Gallery
    if (galleryContainer) {
        for (let i = 1; i <= 40; i++) {
            const card = document.createElement("div");
            card.className = "media-card";
            card.innerHTML = `
                <div class="media-placeholder"><span>[ Gallery Image Placeholder #${i} ]</span></div>
                <div class="media-info">
                    <h3>Gallery Asset #${i}</h3>
                    <p>Click to modify photo path inside source code</p>
                </div>
            `;
            galleryContainer.appendChild(card);
        }
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