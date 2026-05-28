// Theme toggle logic
const themeToggleButton = document.getElementById('theme-toggle-button');
const themeIcon = document.getElementById('theme-icon');
const htmlElement = document.documentElement; // This refers to the <html> tag

// Function to set the theme
function setTheme(theme) {
    if (theme === 'light') {
        htmlElement.classList.add('light-mode');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        htmlElement.classList.remove('light-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    localStorage.setItem('theme', theme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
        } else {
            setTheme('dark'); // Default to dark if no preference or system is dark
        }
    }
});

// Toggle theme on button click
themeToggleButton.addEventListener('click', () => {
    const currentTheme = htmlElement.classList.contains('light-mode') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

// Mobile menu toggle
document.getElementById('mobile-menu-button').addEventListener('click', function() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
            // Close mobile menu if open
            document.getElementById('mobile-menu').classList.add('hidden');
        }
    });
});

// Highlight active section in navigation and show/hide back-to-top button
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav a');
    const backToTopButton = document.getElementById('back-to-top');
    
    let currentSection = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        // Adjust offset to trigger active state a bit before the section fully enters view
        if (pageYOffset >= sectionTop - 300) { 
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active-section'); // Remove custom class
        link.classList.remove('text-blue-600'); // Remove Tailwind class
        // Ensure active state for nav links considers the light/dark theme color
        if (htmlElement.classList.contains('light-mode')) {
            link.style.color = ''; // Reset inline style
        } else {
            link.style.color = ''; // Reset inline style
        }

        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active-section'); // Add custom class
            link.classList.add('text-blue-600'); // Add Tailwind class
        }
    });

    // Show/hide back to top button
    if (window.pageYOffset > 300) { // Show button after scrolling 300px
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
});

// Scroll to top when back-to-top button is clicked
document.getElementById('back-to-top').addEventListener('click', function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Photo Carousel Logic
const images = [
    { src: "assets/photos/upperbound-2026.jpeg", title: "Talk at Upper Bound 2026, Edmonton" },
    { src: "assets/photos/group-2023-cvpr.jpg", title: "CVPR 2023 Group Photo" },
    { src: "assets/photos/group-2022-sfu.jpg", title: "SFU Lab Group Photo 2022" },
];
let currentImageIndex = 0;
const carouselImage = document.getElementById('carousel-image');
const photoTitleElement = document.getElementById('photo-title'); // Get the new title element
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const carouselDotsContainer = document.getElementById('carousel-dots');
let autoSlideInterval;

function showImage(index) {
    // Ensure index wraps around
    currentImageIndex = (index + images.length) % images.length;
    carouselImage.src = images[currentImageIndex].src;
    photoTitleElement.textContent = images[currentImageIndex].title; // Set the title text
    updateDots();
}

function nextImage() {
    showImage(currentImageIndex + 1);
}

function prevImage() {
    showImage(currentImageIndex - 1);
}

function createDots() {
    carouselDotsContainer.innerHTML = ''; // Clear existing dots
    images.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            showImage(index);
            resetAutoSlide();
        });
        carouselDotsContainer.appendChild(dot);
    });
    updateDots();
}

function updateDots() {
    const dots = carouselDotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index === currentImageIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function startAutoSlide() {
    autoSlideInterval = setInterval(nextImage, 5000); // Change image every 5 seconds
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Event listeners for navigation buttons
prevButton.addEventListener('click', () => {
    prevImage();
    resetAutoSlide();
});
nextButton.addEventListener('click', () => {
    nextImage();
    resetAutoSlide();
});

// Initialize carousel on page load
window.addEventListener('load', () => {
    if (images.length > 0) {
        showImage(currentImageIndex);
        createDots();
        startAutoSlide();
    }
});

// Image Pop-up Modal Logic
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeImageModalButton = document.getElementById('close-image-modal');
// Select all images within publication-item divs
const publicationImages = document.querySelectorAll('#publications .publication-item img');

// Function to open the modal
function openImageModal(src) {
    modalImage.src = src;
    imageModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Function to close the modal
function closeImageModal() {
    imageModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore background scrolling
}

// Event listener for closing the modal via the close button
closeImageModalButton.addEventListener('click', closeImageModal);

// Event listener for closing the modal by clicking on the overlay (outside the image)
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) { // Check if the click was directly on the modal background
        closeImageModal();
    }
});

// Add click listeners to publication images to open the modal
publicationImages.forEach(img => {
    img.addEventListener('click', () => {
        openImageModal(img.src);
    });
});
