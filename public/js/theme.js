// public/js/theme.js

// Function to set the theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);

    // Update the toggle button icon if it exists
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
        if (theme === 'dark') {
            toggleBtn.innerHTML = '<i class="bi bi-moon-fill"></i>';
        } else {
            toggleBtn.innerHTML = '<i class="bi bi-sun-fill"></i>';
        }
    }
}

// Function to toggle the theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark mode if no saved preference, or use saved preference
    const initialTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
});

// Immediately apply theme to prevent flashing before DOMContentLoaded
(function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', initialTheme);
})();
