/**
 * Moduł Stores - sekcja "Gdzie kupić"
 */

import { isValidUrl, sanitizeString } from './utils.js';

/**
 * Ładuje sklepy z CSV i wyświetla w sekcji "Gdzie kupić"
 */
export function loadStores() {
    const buyLinks = document.querySelector('.buy-links');

    if (!buyLinks) {
        return;
    }

    if (typeof Papa === 'undefined') {
        buyLinks.innerHTML = '<p>Nie udało się załadować listy sklepów.</p>';
        return;
    }

    const imageBasePath = 'main/img/';
    const cacheKey = 'storesData';
    const cacheTimeKey = 'storesCacheTime';
    const cacheDuration = 6 * 60 * 60 * 1000; // 6 godzin

    /**
     * Renderuje sklepy w DOM
     * @param {Array} data - Dane sklepów
     */
    function renderStores(data) {
        buyLinks.innerHTML = '';
        let validRows = 0;

        data.forEach(function (row) {
            const sanitizedLink = sanitizeString(row.link);
            const sanitizedImage = sanitizeString(row.image);

            if (row.image && row.link && isValidUrl(row.link)) {
                validRows++;

                const a = document.createElement('a');
                a.href = sanitizedLink;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('aria-label', `Przejdź do sklepu ${row.alt || row.link}`);

                const span = document.createElement('span');
                span.className = 'container';
                span.setAttribute('role', 'presentation');

                const img = document.createElement('img');
                img.src = isValidUrl(sanitizedImage) ? sanitizedImage : imageBasePath + sanitizedImage;
                img.alt = row.alt || `Logo sklepu ${row.link}`;
                img.setAttribute('loading', 'lazy');

                span.appendChild(img);
                a.appendChild(span);
                buyLinks.appendChild(a);
            } else {
                // Pomijamy nieprawidłowy wiersz
            }
        });

        if (validRows === 0) {
            buyLinks.innerHTML = '<p>Brak dostępnych sklepów w tej chwili.</p>';
        }
    }

    /**
     * Ładuje dane sklepów (z cache lub CSV)
     */
    function loadData() {
        // Sprawdź cache
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);

        if (cached && cacheTime && (Date.now() - parseInt(cacheTime) < cacheDuration)) {
            try {
                const data = JSON.parse(cached);
                renderStores(data);
                return;
            } catch (e) {
                // Uszkodzony cache - usuwamy
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(cacheTimeKey);
            }
        }

        // Pobierz z CSV
        Papa.parse('main/csv/stores.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.data.length > 0) {
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(results.data));
                        localStorage.setItem(cacheTimeKey, Date.now().toString());
                    } catch (e) {
                        // Nie można zapisać do cache
                    }
                    renderStores(results.data);
                } else {
                    buyLinks.innerHTML = '<p>Brak dostępnych danych w pliku.</p>';
                }
            },
            error: function () {
                buyLinks.innerHTML = '<p>Nie udało się załadować listy sklepów.</p>';
            }
        });
    }

    loadData();
}
