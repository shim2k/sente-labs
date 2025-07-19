// Global state
let navOpen = false;
let loading = false;

// DOM elements
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');
const waitlistForm = document.getElementById('waitlist-form');
const emailInput = document.getElementById('email-input');
const submitBtn = document.getElementById('submit-btn');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const successText = document.getElementById('success-text');
const errorText = document.getElementById('error-text');

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    console.log('mobileMenuBtn element:', mobileMenuBtn);
    console.log('mobileNav element:', mobileNav);
    initializeMobileMenu();
    initializeWaitlistForm();
    initializeSmoothScrolling();
});

// Mobile menu functionality
function initializeMobileMenu() {
    if (mobileMenuBtn && mobileNav) {
        // Add both click and touchstart for better iOS compatibility
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        mobileMenuBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleMobileMenu();
        });
        
        // Ensure the button is focusable and has proper cursor
        mobileMenuBtn.style.cursor = 'pointer';
        mobileMenuBtn.setAttribute('role', 'button');
        mobileMenuBtn.setAttribute('aria-label', 'Toggle navigation menu');
    }
}

function toggleMobileMenu() {
    navOpen = !navOpen;
    
    if (navOpen) {
        // Animate hamburger to X
        animateHamburgerToX();
        // Show menu
        mobileNav.classList.add('menu-open');
    } else {
        // Animate hamburger back to normal
        animateHamburgerToNormal();
        // Hide menu
        mobileNav.classList.remove('menu-open');
    }
}

function animateHamburgerToX() {
    const lines = mobileMenuBtn.querySelectorAll('.hamburger-line');
    if (lines.length >= 3) {
        lines[0].style.transform = 'translateY(0px) rotate(45deg)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'translateY(0px) rotate(-45deg)';
    }
}

function animateHamburgerToNormal() {
    const lines = mobileMenuBtn.querySelectorAll('.hamburger-line');
    if (lines.length >= 3) {
        lines[0].style.transform = 'translateY(-8px) rotate(0deg)';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'translateY(8px) rotate(0deg)';
    }
}

function closeMobileMenu() {
    if (navOpen) {
        toggleMobileMenu();
    }
}

// Smooth scrolling functionality
function initializeSmoothScrolling() {
    // Enable smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
}

function scrollToSection(sectionId) {
    // Close mobile menu if open
    closeMobileMenu();
    
    // Handle local page navigation for terms only
    if (sectionId === 'terms') {
        window.location.href = 'terms.html';
        return;
    }

    // Scroll to section on same page (including pricing)
    const element = document.getElementById(sectionId);
    if (element) {
        // Different offset for mobile vs desktop
        const yOffset = window.innerWidth < 768 ? -65 : -20;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

// Waitlist form functionality
function initializeWaitlistForm() {
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    hideMessages();

    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter a valid email address.');
        setLoading(false);
        return;
    }

    try {
        // Determine API base URL - use the backend API domain
        const apiBaseUrl = 'https://api-aoe4.senteai.com';
        
        const response = await fetch(`${apiBaseUrl}/api/v1/waitlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: email,
                source: 'landing_page'
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Thank you for joining our waitlist! We\'ll notify you when we expand beyond AOE4.');
            emailInput.value = '';
        } else {
            // Handle specific error cases
            if (response.status === 409) {
                showError('This email is already subscribed to our waitlist.');
            } else {
                showError(data.message || 'Unable to process request. Please try again later.');
            }
        }
    } catch (error) {
        console.error('Waitlist signup error:', error);
        showError('Unable to connect to the server. Please try again later.');
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    loading = isLoading;
    
    if (submitBtn) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.remove('hover:shadow-blue-500/30', 'transform', 'hover:scale-105');
            submitBtn.innerHTML = `
                <span class="relative z-10 whitespace-nowrap flex items-center justify-center gap-2">
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                </span>
            `;
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.add('hover:shadow-blue-500/30', 'transform', 'hover:scale-105');
            submitBtn.innerHTML = `
                <span class="relative z-10 whitespace-nowrap">Get Early Access</span>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-all duration-700"></div>
            `;
        }
    }
}

function showSuccess(message) {
    hideMessages();
    if (successMessage && successText) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
    }
}

function showError(message) {
    hideMessages();
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

function hideMessages() {
    if (successMessage) {
        successMessage.classList.add('hidden');
    }
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

// Global functions for onclick handlers
window.scrollToSection = scrollToSection;
window.toggleMobileMenu = toggleMobileMenu;

// Handle window resize for mobile menu
window.addEventListener('resize', function() {
    if (window.innerWidth >= 768 && navOpen) {
        closeMobileMenu();
    }
});

// Handle click outside mobile menu to close it
document.addEventListener('click', function(event) {
    if (navOpen && 
        !mobileMenuBtn.contains(event.target) && 
        !mobileNav.contains(event.target)) {
        closeMobileMenu();
    }
});

// Add scroll event listener for header backdrop blur effect
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (header) {
        if (window.scrollY > 100) {
            header.classList.add('backdrop-blur-md');
        } else {
            header.classList.remove('backdrop-blur-md');
        }
    }
});

// Intersection Observer for animation triggers
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
            // Stop observing this element once it's animated
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Initialize animation system to prevent flickering
document.addEventListener('DOMContentLoaded', function() {
    // Add initial hidden state to prevent flash
    const style = document.createElement('style');
    style.textContent = `
        .fade-in-element {
            opacity: 0;
            transform: translateY(20px);
            transition: none;
        }
        .fade-in-element.animate-fade-in-up {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
    `;
    document.head.appendChild(style);
    
    // Set up elements for animation
    const animateElements = document.querySelectorAll('.animate-fade-in-up');
    animateElements.forEach(el => {
        // Remove the animation class and add our custom class
        el.classList.remove('animate-fade-in-up');
        el.classList.add('fade-in-element');
        observer.observe(el);
    });
});

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}