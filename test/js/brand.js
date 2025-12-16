/**
 * Główny skrypt dla brand.html
 * Ładowanie i wyświetlanie produktów marki
 */

import { debounce } from './modules/utils.js';

let products = [];
let activeCategory = '';

/**
 * Pobiera parametr brand z URL
 * @returns {string|null}
 */
function getBrandFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('brand');
}

/**
 * Generuje ścieżkę do pliku CSV dla marki
 * @param {string} brand - Nazwa marki
 * @returns {string}
 */
function csvPathForBrand(brand) {
    return `brand/brand_${brand}.csv`;
}

/**
 * Ładuje produkty z CSV
 */
async function loadProducts() {
    const brand = getBrandFromQuery();
    const productList = document.getElementById('productList');

    if (!brand) {
        productList.innerHTML = '<p>Brak parametru brand.</p>';
        document.title = 'B&S Polska produkty - Błąd';
        return;
    }

    if (typeof Papa === 'undefined') {
        productList.innerHTML = '<p>Błąd ładowania biblioteki.</p>';
        return;
    }

    try {
        const response = await fetch(csvPathForBrand(brand));
        if (!response.ok) throw new Error('Nie udało się pobrać CSV');

        const data = await response.text();
        const results = Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            delimiter: ";"
        });

        products = results.data;
        const brandName = products[0]?.brand;
        document.title = `${brandName} - produkty B&S Polska`;

        generateCategories();
        render();
    } catch (e) {
        productList.innerHTML = '<p>Nie udało się wczytać danych.</p>';
    }
}

/**
 * Generuje przyciski kategorii
 */
function generateCategories() {
    const categoryBar = document.getElementById('categoryBar');
    if (!categoryBar) return;

    categoryBar.innerHTML = '';

    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            if (activeCategory === cat) {
                activeCategory = '';
            } else {
                activeCategory = cat;
            }
            updateCategoryButtons();
            render();
        });
        categoryBar.appendChild(btn);
    });
}

/**
 * Aktualizuje stan przycisków kategorii
 */
function updateCategoryButtons() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.textContent === activeCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Renderuje listę produktów
 */
function render() {
    const searchInput = document.getElementById('search');
    const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
    const productList = document.getElementById('productList');

    if (!productList) return;

    productList.innerHTML = '';

    products
        .filter(p =>
            (!activeCategory || p.category === activeCategory) &&
            (p.name.toLowerCase().includes(searchValue) ||
                p.category.toLowerCase().includes(searchValue))
        )
        .forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
        <img src="img/${p.brand}/${p.image}" alt="${p.name}" class="product-image" loading="lazy">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-BarCode">${p.BarCode}</div>
          <div class="product-category">${p.category}</div>
          <div class="product-price">cena sugerowana: ${p.price} PLN</div>
          <div class="product-dimensions">
            <span>${p.height}</span>
            <span>${p.width}</span>
            <span>${p.depth} cm</span>
          </div>
        </div>
      `;

            card.addEventListener('click', function () {
                const currentBrand = new URLSearchParams(window.location.search).get('brand');
                const link = `product.html?id=${encodeURIComponent(p.name)}&brand=${encodeURIComponent(currentBrand)}`;
                window.location.href = link;
            });

            productList.appendChild(card);
        });
}

/**
 * Inicjalizacja strony
 */
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Wyszukiwarka z debounce
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(render, 300));
    }
});
