document.addEventListener('DOMContentLoaded', function() {
    // --- Accordion ---
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const content = item.querySelector('.accordion-content');
            
            // Toggle active class on the item
            item.classList.toggle('active');
            
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = 0;
            }
        });
    });

document.getElementById('productDetails').addEventListener('click', function(e) {
    if (e.target.classList.contains('accordion-header')) {
        const item = e.target.closest('.accordion-item');
        const content = item.querySelector('.accordion-content');
        item.classList.toggle('active');
        if (item.classList.contains('active')) {
            content.style.maxHeight = content.scrollHeight + "px";
        } else {
            content.style.maxHeight = 0;
        }
    }
});


});
