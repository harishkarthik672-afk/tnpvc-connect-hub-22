
function openWaModal() {
    window.location.href = 'membership-registration.html';
}

// Keep the global binding for floating-whatsapp buttons
document.addEventListener('DOMContentLoaded', () => {
    const waButtons = document.querySelectorAll('.floating-whatsapp');
    waButtons.forEach(btn => {
        // Only bind if it hasn't been manually set in the HTML
        if (!btn.getAttribute('onclick')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openWaModal();
            });
            btn.href = "javascript:void(0)";
        }
    });
});
