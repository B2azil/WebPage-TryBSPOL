/**
 * Moduł Portfolio - ładowanie i wyświetlanie marek
 */

import { slugify, isValidColor } from './utils.js';

/**
 * Ładuje marki z CSV i renderuje kafelki w sekcji portfolio
 */
export function loadBrands() {
    const gridContainer = document.querySelector('.brand-grid');

    if (!gridContainer) {
        return;
    }

    /**
     * Tworzy kafelek marki
     * @param {Object} row - Wiersz z CSV
     * @returns {HTMLElement|null}
     */
    function createBrandTile(row) {
        if (!row.name) return null;

        const tile = document.createElement('a');
        tile.className = 'brand-tile';

        const slug = slugify(row.name) || 'unknown';
        tile.href = `brand.html?brand=${encodeURIComponent(slug)}`;
        tile.setAttribute("aria-label", row.name);
        tile.setAttribute('title', `Przejdź do listy produktów marki ${row.name}`);

        // Ustawienie kolorów z fallbackami
        tile.style.setProperty('--color1', row.color1 && isValidColor(row.color1) ? row.color1 : '#f9f9f9');
        tile.style.setProperty('--color2', row.color2 && isValidColor(row.color2) ? row.color2 : '#f9f9f9');
        tile.style.setProperty('--color3', row.color3 && isValidColor(row.color3) ? row.color3 : '#f9f9f9');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = row.name;
        tile.appendChild(nameSpan);

        return tile;
    }

    /**
     * Główna funkcja ładowania i renderowania
     */
    async function loadAndRender() {
        if (typeof Papa === 'undefined') {
            gridContainer.innerHTML = '<p>❌ Błąd ładowania biblioteki.</p>';
            return;
        }

        try {
            const response = await fetch('main/csv/brands.csv');
            if (!response.ok) throw new Error('Nie udało się załadować pliku CSV');

            const text = await response.text();
            const results = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                delimiter: ";"
            });

            if (results.errors.length > 0) {
                throw new Error('Błąd parsowania CSV: ' + results.errors[0].message);
            }

            gridContainer.innerHTML = '';

            const fragment = document.createDocumentFragment();

            results.data.forEach(row => {
                const tile = createBrandTile(row);
                if (tile) fragment.appendChild(tile);
            });

            gridContainer.appendChild(fragment);
        } catch (error) {
            gridContainer.innerHTML = '<p>❌ Nie udało się załadować marek.</p>';
        }
    }

    loadAndRender();
}
