/**
 * Główny plik JavaScript dla index.html
 * Importuje i inicjalizuje wszystkie moduły
 */

import { initNavigation } from './modules/navigation.js';
import { initHero } from './modules/hero.js';
import { initCarousel } from './modules/carousel.js';
import { loadBrands } from './modules/portfolio.js';
import { loadStores } from './modules/stores.js';
import { initBackToTop } from './modules/backToTop.js';

/**
 * Inicjalizacja aplikacji po załadowaniu DOM
 */
document.addEventListener('DOMContentLoaded', () => {

    // Nawigacja (menu mobilne, smooth scroll)
    initNavigation();

    // Sekcja Hero (rotacja tła)
    initHero();

    // Karuzela z logotypami
    initCarousel();

    // Portfolio (kafelki marek)
    loadBrands();

    // Sekcja "Gdzie kupić"
    loadStores();

    // Przycisk "powrót na górę"
    initBackToTop();

    // Aktualizuj rok w copyright (zamiast inline document.write dla CSP)
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
