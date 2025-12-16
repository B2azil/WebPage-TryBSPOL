/**
 * Moduł Back To Top - przycisk powrotu na górę strony
 */

/**
 * Inicjalizuje przycisk "powrót na górę"
 * Pokazuje go po przewinięciu strony w dół
 */
export function initBackToTop() {
    const btn = document.getElementById("backToTop");

    if (!btn) {
        return;
    }

    // Pokaż/ukryj przycisk w zależności od scroll
    window.addEventListener("scroll", () => {
        if (window.scrollY > 400) {
            btn.classList.add("visible");
        } else {
            btn.classList.remove("visible");
        }
    });

    // Przewiń do góry na klik
    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
