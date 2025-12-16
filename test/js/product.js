/**
 * Główny skrypt dla product.html
 * Wyświetlanie szczegółów produktu z galerią zdjęć
 */

// Moduł IIFE - unikamy zmiennych globalnych
(function () {
    'use strict';

    // Stan galerii - zamknięty w module
    let currentIndex = 0;
    let images = [];
    let product = null;

    /**
     * Bezpieczna walidacja nazwy pliku obrazu
     * Zapobiega path traversal attacks (np. ../../../etc/passwd)
     * @param {string} filename - Nazwa pliku do walidacji
     * @returns {string|null} - Bezpieczna nazwa pliku lub null jeśli nieprawidłowa
     */
    function sanitizeImagePath(filename) {
        if (!filename || typeof filename !== 'string') return null;

        // Usuń niebezpieczne znaki, ale zostaw spacje (dozwolone w nazwach plików)
        const safeFilename = filename.trim().replace(/[^a-zA-Z0-9._\- ]/g, '');

        // Waliduj rozszerzenie (tylko dozwolone formaty obrazów)
        if (!/^[a-zA-Z0-9._\- ]+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(safeFilename)) {
            return null;
        }

        // Blokuj nazwy zaczynające się od kropki (ukryte pliki)
        if (safeFilename.startsWith('.')) {
            return null;
        }

        return safeFilename;
    }

    /**
     * Bezpieczna walidacja nazwy folderu (brand)
     * @param {string} folderName - Nazwa folderu
     * @returns {string} - Bezpieczna nazwa folderu
     */
    function sanitizeFolderName(folderName) {
        if (!folderName || typeof folderName !== 'string') return 'unknown';
        // Tylko alfanumeryczne, spacje, myślniki i podkreślenia
        return folderName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '') || 'unknown';
    }

    /**
     * Wstrzykuje JSON-LD Product Schema do istniejącego elementu <script>
     * Używa textContent zamiast tworzenia nowego skryptu - bezpieczne dla CSP
     * @param {Object} productData - Dane produktu z CSV
     */
    function injectProductSchema(productData) {
        const schemaElement = document.getElementById('product-schema');
        if (!schemaElement) return;

        // Bezpieczne parsowanie ceny (usuń przecinki, spacje, itp.)
        const priceRaw = productData.price ? productData.price.replace(/[^\d.,]/g, '').replace(',', '.') : null;
        const priceValue = priceRaw ? parseFloat(priceRaw) : null;

        // Buduj URL obrazu produktu
        const safeBrand = sanitizeFolderName(productData.brand);
        const safeImage = sanitizeImagePath(productData.image);
        const imageUrl = safeImage
            ? `https://bspolska.com.pl/img/${safeBrand}/${safeImage}`
            : 'https://bspolska.com.pl/main/img/bspolska.png';

        // Buduj obiekt JSON-LD zgodny ze schema.org/Product
        const schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": productData.name || "Produkt B&S Polska",
            "description": productData.category || `Produkt marki ${productData.brand || 'B&S Polska'}`,
            "image": imageUrl,
            "sku": productData.sku || undefined,
            "gtin13": productData.BarCode || undefined,
            "brand": {
                "@type": "Brand",
                "name": productData.brand || "B&S Polska"
            },
            "manufacturer": {
                "@type": "Organization",
                "name": "B&S Polska"
            },
            "category": productData.category || undefined,
            "color": productData.color || undefined,
            "material": productData.material || undefined
        };

        // Dodaj wymiary jeśli dostępne
        if (productData.height || productData.width || productData.depth) {
            schema.additionalProperty = [];
            if (productData.height) {
                schema.additionalProperty.push({
                    "@type": "PropertyValue",
                    "name": "Wysokość",
                    "value": productData.height,
                    "unitCode": "CMT"
                });
            }
            if (productData.width) {
                schema.additionalProperty.push({
                    "@type": "PropertyValue",
                    "name": "Szerokość",
                    "value": productData.width,
                    "unitCode": "CMT"
                });
            }
            if (productData.depth) {
                schema.additionalProperty.push({
                    "@type": "PropertyValue",
                    "name": "Głębokość",
                    "value": productData.depth,
                    "unitCode": "CMT"
                });
            }
        }

        // Dodaj wagę jeśli dostępna
        if (productData.weight) {
            schema.weight = {
                "@type": "QuantitativeValue",
                "value": productData.weight,
                "unitCode": "GRM"
            };
        }

        // Dodaj ofertę z ceną jeśli dostępna (kluczowe dla rich snippets!)
        if (priceValue && priceValue > 0) {
            schema.offers = {
                "@type": "Offer",
                "url": productData.link || window.location.href,
                "priceCurrency": "PLN",
                "price": priceValue.toFixed(2),
                "availability": "https://schema.org/InStock",
                "seller": {
                    "@type": "Organization",
                    "name": "B&S Polska"
                }
            };
        }

        // Usuń undefined wartości (czyścimy obiekt)
        const cleanSchema = JSON.parse(JSON.stringify(schema, (key, value) =>
            value === undefined ? undefined : value
        ));

        // Wstaw do istniejącego elementu script - textContent jest bezpieczne dla CSP
        schemaElement.textContent = JSON.stringify(cleanSchema, null, 0);
    }

    /**
     * Ładuje szczegóły produktu
     */
    async function loadProductDetails() {
        const params = new URLSearchParams(window.location.search);
        const prodId = params.get('id');
        const brand = params.get('brand');
        const productDetails = document.getElementById('productDetails');

        if (!prodId) {
            document.title = 'Nie podano produktu - B&S Polska';
            productDetails.innerHTML = '<p>Nie podano produktu. <a href="index.html">Wróć do strony głównej</a>.</p>';
            return;
        }

        const csvPath = brand ? `brand/brand_${brand}.csv` : await detectBrandCSV();
        const cacheKey = `productData_${brand || 'default'}`;
        const cacheTimestampKey = `productData_${brand || 'default'}_timestamp`;
        const cacheDuration = 24 * 60 * 60 * 1000; // 24 godziny

        try {
            let products;
            const cachedData = localStorage.getItem(cacheKey);
            const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
            const now = Date.now();

            if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < cacheDuration)) {
                try {
                    products = JSON.parse(cachedData);
                } catch (parseError) {
                    // Cichy błąd - usuwamy uszkodzony cache
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(cacheTimestampKey);
                    throw new Error('Uszkodzony cache - pobieranie danych ponownie');
                }
            } else {
                const response = await fetch(csvPath);
                if (!response.ok) throw new Error('Nie udało się pobrać danych produktu');
                const data = await response.text();

                const results = Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false,
                    delimiter: ';'
                });

                if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
                    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
                }

                products = results.data;
                localStorage.setItem(cacheKey, JSON.stringify(products));
                localStorage.setItem(cacheTimestampKey, now.toString());
            }

            // Odnajdź produkt
            const decodedProdId = decodeURIComponent(prodId);
            product = products.find(p => p.name === decodedProdId);

            if (!product) {
                document.title = 'Produkt nie znaleziony - B&S Polska';
                productDetails.innerHTML = '<p>Produkt nie znaleziony. <a href="index.html">Wróć do strony głównej</a>.</p>';
                return;
            }

            // Ustaw tytuł i meta description
            document.title = `${DOMPurify.sanitize(product.name)} - B&S Polska`;
            document.querySelector('meta[name="description"]').setAttribute(
                'content',
                DOMPurify.sanitize(product.category) || `Produkt marki ${DOMPurify.sanitize(product.brand)}`
            );

            // Aktualizuj Open Graph dla social sharing
            const imageUrl = `https://bspolska.com.pl/img/${DOMPurify.sanitize(product.brand)}/${DOMPurify.sanitize(product.image)}`;
            document.querySelector('meta[property="og:title"]')?.setAttribute('content', DOMPurify.sanitize(product.name));
            document.querySelector('meta[property="og:description"]')?.setAttribute('content', DOMPurify.sanitize(product.category) || '');
            document.querySelector('meta[property="og:image"]')?.setAttribute('content', imageUrl);
            document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', DOMPurify.sanitize(product.name));

            // Canonical URL - zapobiega duplicate content
            const canonicalLink = document.getElementById('canonical-link');
            if (canonicalLink) {
                const canonicalUrl = brand
                    ? `https://bspolska.com.pl/product.html?id=${encodeURIComponent(prodId)}&brand=${encodeURIComponent(brand)}`
                    : `https://bspolska.com.pl/product.html?id=${encodeURIComponent(prodId)}`;
                canonicalLink.setAttribute('href', canonicalUrl);
            }

            // JSON-LD Product Schema - aktualizujemy istniejący element (bezpieczne dla CSP)
            injectProductSchema(product);

            // Dynamiczny kolor marki - ścisła walidacja formatu koloru
            if (product.brandColor) {
                const rawColor = product.brandColor.trim();

                // Ścisłe regexy dla dozwolonych formatów kolorów
                const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
                const rgbRegex = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;
                const hslRegex = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;

                if (hexRegex.test(rawColor) || rgbRegex.test(rawColor) || hslRegex.test(rawColor)) {
                    document.documentElement.style.setProperty('--brand-color', rawColor);
                }
                // Jeśli walidacja nie przejdzie, zostaje domyślny kolor z CSS
            }

            // Generuj obrazy z walidacją bezpieczeństwa
            const safeBrand = sanitizeFolderName(product.brand);
            const imageBasePath = `img/${safeBrand}/`;
            images = [
                product.image, product.image2, product.image3,
                product.image4, product.image5, product.image6,
                product.image7, product.image8
            ]
                .map(src => sanitizeImagePath(src)) // Waliduj każdy plik
                .filter(src => src !== null) // Usuń nieprawidłowe
                .map(src => imageBasePath + src); // Dodaj ścieżkę bazową

            // Render HTML
            renderProductPage(productDetails, imageBasePath);

            // Inicjalizacja interaktywnych elementów
            initAccordion();
            initGallery();

        } catch (error) {
            handleError(error, productDetails);
        }
    }

    /**
     * Renderuje stronę produktu
     */
    function renderProductPage(container, imageBasePath) {
        const galleryHtml = generateGalleryHtml();
        const infosHtml = generateInfosHtml();
        const logosHtml = generateShopLogosHtml();
        const clubHtml = generateClubHtml(imageBasePath);

        const renderHtml = `
    <div class="header">
      <a href="brand.html?brand=${DOMPurify.sanitize(product.brandPage || 'index.html')}" class="back-button">
        <i class="fa fa-long-arrow-left" aria-hidden="true"></i>
        <span> Powrót do listy produktów marki ${DOMPurify.sanitize(product.brand)}</span>
      </a>
    </div>
    <main class="product-page">
      ${galleryHtml}
      <section class="product-details">
        <h1 class="name">${DOMPurify.sanitize(product.name)}</h1>
        <span class="sku">SKU: ${DOMPurify.sanitize(product.sku)}</span>
        <div class="category">Kategoria: ${DOMPurify.sanitize(product.category)}</div>
        <div class="brand">Marka: ${DOMPurify.sanitize(product.brand)}</div>
        <div>
          <div class="price">Cena rekomendowana: ${DOMPurify.sanitize(product.price)} zł</div>
          <h3>Produkt dostępny w sklepie:</h3>
          <div class="main-shop">
            <a href="${DOMPurify.sanitize(product.link)}" target="_blank" rel="noopener noreferrer" class="link">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Allegro.pl_sklep.svg" alt="Allegro">
            </a>
            ${clubHtml}
          </div>
          <div class="logo-sale"><h4>szukaj także w: </h4>${logosHtml}</div>
        </div>
        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-header" role="button" aria-expanded="false" aria-controls="desc-content" title="lista opisu produktu">Opis produktu</button>
            <div class="accordion-content" id="desc-content" aria-hidden="true">
              ${infosHtml}
            </div>
          </div>
          <div class="accordion-item">
            <button class="accordion-header" role="button" aria-expanded="false" aria-controls="spec-content" title="lista szczegółów produktu">Specyfikacja techniczna produktu</button>
            <div class="accordion-content" id="spec-content" aria-hidden="true">
              <p>Wysokość: ${DOMPurify.sanitize(product.height)} cm</p>
              <p>Szerokość: ${DOMPurify.sanitize(product.width)} cm</p>
              <p>Głębokość: ${DOMPurify.sanitize(product.depth)} cm</p>
              <p>Waga produktu: ${DOMPurify.sanitize(product.weight)} g</p>
              <p>Materiał: ${DOMPurify.sanitize(product.material)}</p>
              <p>Kolor dominujący: ${DOMPurify.sanitize(product.color)}</p>
              <p>EAN (GTIN) produktu: ${DOMPurify.sanitize(product.BarCode)}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

        container.innerHTML = DOMPurify.sanitize(renderHtml);
    }

    /**
     * Generuje HTML galerii z fetchpriority dla pierwszego obrazu
     * width/height zapobiegają CLS (Cumulative Layout Shift) - poprawia Core Web Vitals
     */
    function generateGalleryHtml() {
        return `
    <div class="gallery">
      <div class="thumbnails" role="tablist">
        ${images.map((src, i) => `
          <div class="thumb-box">
            <img src="${src}" data-index="${i}" alt="${DOMPurify.sanitize(product.name)} - zdjęcie ${i + 1} miniatura" 
                 tabindex="0" loading="lazy" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}"
                 width="80" height="80" decoding="async">
          </div>
        `).join('')}
      </div>
      <div class="main-image">
        <div class="image-box">
          <img id="currentImage" src="${images[0]}" alt="${DOMPurify.sanitize(product.name)} - zdjęcie 1" 
               role="img" aria-label="Zdjęcie produktu: ${DOMPurify.sanitize(product.name)}, 1 z ${images.length}"
               fetchpriority="high" width="600" height="600" decoding="async">
        </div>
      </div>
    </div>
  `;
    }

    /**
     * Generuje HTML opisu produktu
     */
    function generateInfosHtml() {
        const infoFields = [
            'info1', 'info2', 'info3', 'info4', 'info5', 'info6', 'info7', 'info8',
            'info9', 'info10', 'info11', 'info12', 'info13', 'info14', 'info15'
        ];
        return infoFields
            .map(field => product[field])
            .filter(text => text && text.trim() !== '')
            .map(text => `<p class="description">- ${DOMPurify.sanitize(text)}</p>`)
            .join('');
    }

    /**
     * Generuje HTML logotypów sklepów
     */
    function generateShopLogosHtml() {
        const shops = [
            { src: 'https://erli.pl/sprzedawcy/assets/images/logo-shop.svg', alt: 'erli', link: 'https://erli.pl/sklep/BandSPolska/33689' },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Kaufland_2016_horizontal.svg', alt: 'kaufland', link: 'https://www.kaufland.pl/shops/BandSPolska/' },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Empik.svg/330px-Empik.svg.png', alt: 'empik', link: 'https://www.empik.com/sklepy/b-s-polska,3078,m' },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/OLX_2019.svg', alt: 'OLX', link: 'https://www.olx.pl/oferty/uzytkownik/1PcRlD/' },
            { src: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', alt: 'amazon', link: 'https://www.amazon.pl/s?me=A10IUM9O23CD0Y&marketplaceID=A1C3SOZRARQ6R3' },
            { src: 'https://arena.pl/dist/img/logo-arena.svg', alt: 'arena', link: 'https://arena.pl/sprzedawca/b_and_s_polska/sklep' }
        ];
        return shops.map(shop => `
    <a href="${shop.link}" target="_blank" rel="noopener noreferrer">
      <img src="${shop.src}" alt="${shop.alt}" class="shop-logo">
    </a>
  `).join('');
    }

    /**
     * Generuje HTML linka do fanstore klubu
     */
    function generateClubHtml(imageBasePath) {
        const clubLogoPath = product.logoClub && product.logoClub.trim()
            ? `${imageBasePath}${DOMPurify.sanitize(product.logoClub)}`
            : '';

        if (product.logoClub && product.fanstoreLink && product.logoClub.trim() && product.fanstoreLink.trim()) {
            return `<h5>oraz</h5> <a class="club" href="${DOMPurify.sanitize(product.fanstoreLink)}" target="_blank" rel="noopener noreferrer">
      <img src="${clubLogoPath}" alt="Fanstore" loading="lazy">
    </a>`;
        }
        return '';
    }

    /**
     * Inicjalizuje accordion
     */
    function initAccordion() {
        document.getElementById('productDetails').addEventListener('click', function (e) {
            if (e.target.classList.contains('accordion-header')) {
                const item = e.target.closest('.accordion-item');
                const content = item.querySelector('.accordion-content');
                const isExpanded = item.classList.contains('active');

                item.classList.toggle('active');
                e.target.setAttribute('aria-expanded', String(!isExpanded));
                content.setAttribute('aria-hidden', String(isExpanded));
                content.style.maxHeight = isExpanded ? '0' : `${content.scrollHeight}px`;
            }
        });
    }

    /**
     * Preload następnego obrazu w tle
     */
    function preloadImage(index) {
        if (index >= 0 && index < images.length) {
            const img = new Image();
            img.src = images[index];
        }
    }

    /**
     * Inicjalizuje obsługę swipe (współdzielona funkcja)
     */
    function initSwipe(element, onSwipeLeft, onSwipeRight) {
        let touchStartX = 0;
        let touchEndX = 0;

        element.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.changedTouches[0].screenX;
            }
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > 50) {
                if (swipeDistance > 0) {
                    onSwipeRight();
                } else {
                    onSwipeLeft();
                }
            }
        }, { passive: true });
    }

    /**
     * Inicjalizuje galerię
     */
    function initGallery() {
        const thumbs = document.querySelectorAll('.thumb-box img');
        const thumbBoxes = document.querySelectorAll('.thumb-box');
        const currentImg = document.getElementById('currentImage');
        const imageBox = document.querySelector('.main-image .image-box');

        if (!currentImg || !imageBox) return;

        // Obsługa błędów ładowania obrazów
        currentImg.onerror = function () {
            this.alt = 'Obraz niedostępny';
            this.style.opacity = '0.3';
        };

        // Preload drugiego obrazu od razu
        if (images.length > 1) {
            preloadImage(1);
        }

        // Aktualizacja obrazu
        function updateImage(index) {
            if (index < 0 || index >= images.length) return;

            currentImg.src = images[index];
            thumbBoxes.forEach(b => b.classList.remove('active'));
            thumbBoxes[index].classList.add('active');
            currentIndex = index;
            currentImg.alt = `${DOMPurify.sanitize(product.name)} - zdjęcie ${index + 1}`;
            currentImg.setAttribute('aria-label', `Zdjęcie produktu: ${DOMPurify.sanitize(product.name)}, ${index + 1} z ${images.length}`);
            thumbs.forEach(t => t.setAttribute('aria-selected', 'false'));
            thumbs[index].setAttribute('aria-selected', 'true');

            // Preload następnego obrazu
            preloadImage((index + 1) % images.length);
        }

        // Obsługa miniatur
        thumbs.forEach((thumb, i) => {
            thumb.setAttribute('tabindex', '0');

            // Error handling dla miniatur
            thumb.onerror = function () {
                this.alt = 'Miniatura niedostępna';
                this.style.opacity = '0.3';
            };

            thumb.addEventListener('click', () => updateImage(i));
            thumb.addEventListener('mouseenter', () => {
                if (!('ontouchstart' in window)) updateImage(i);
            });
            thumb.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') updateImage(i);
            });
        });

        // Zoom na desktop
        if (!('ontouchstart' in window)) {
            imageBox.addEventListener('mousemove', (e) => {
                const rect = imageBox.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                currentImg.style.transformOrigin = `${x}% ${y}%`;
                currentImg.style.transform = "scale(2)";
            });
            imageBox.addEventListener('mouseleave', () => {
                currentImg.style.transform = "scale(1)";
                currentImg.style.transformOrigin = "center center";
            });
        }

        // Fullscreen
        imageBox.addEventListener('click', () => openFullscreen(updateImage));

        // Swipe na głównym obrazie (używamy współdzielonej funkcji)
        initSwipe(
            imageBox,
            () => { if (currentIndex < images.length - 1) updateImage(currentIndex + 1); },
            () => { if (currentIndex > 0) updateImage(currentIndex - 1); }
        );
    }

    /**
     * Otwiera fullscreen galerię
     */
    function openFullscreen(updateCallback) {
        const fullscreenDiv = document.createElement('div');
        fullscreenDiv.className = 'fullscreen-image';
        fullscreenDiv.innerHTML = DOMPurify.sanitize(`
    <img src="${images[currentIndex]}" alt="${DOMPurify.sanitize(product.name)} - zdjęcie ${currentIndex + 1}">
    <button title="Zamknij galerię" aria-label="Zamknij galerię" class="close-button"><i class="fa fa-times"></i></button>
    <button title="Poprzednie zdjęcie" aria-label="Poprzednie zdjęcie" class="nav-arrow prev"><i class="fa fa-arrow-left"></i></button>
    <button title="Następne zdjęcie" aria-label="Następne zdjęcie" class="nav-arrow next"><i class="fa fa-arrow-right"></i></button>
  `);
        document.body.appendChild(fullscreenDiv);

        const fullscreenImg = fullscreenDiv.querySelector('img');
        const closeButton = fullscreenDiv.querySelector('.close-button');
        const prevButton = fullscreenDiv.querySelector('.nav-arrow.prev');
        const nextButton = fullscreenDiv.querySelector('.nav-arrow.next');
        const thumbBoxes = document.querySelectorAll('.thumb-box');
        const currentImg = document.getElementById('currentImage');

        // ARIA
        fullscreenDiv.setAttribute('role', 'dialog');
        fullscreenDiv.setAttribute('aria-modal', 'true');
        fullscreenDiv.setAttribute('aria-label', 'Galeria pełnoekranowa produktu');
        closeButton.focus();

        // Error handling dla fullscreen image
        fullscreenImg.onerror = function () {
            this.alt = 'Obraz niedostępny';
            this.style.opacity = '0.3';
        };

        // Pinch-to-zoom
        let scale = 1;
        let lastDistance = 0;
        fullscreenImg.style.transform = `scale(${scale})`;

        fullscreenDiv.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            }
        }, { passive: true });

        fullscreenDiv.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                const delta = currentDistance - lastDistance;
                scale = Math.max(1, Math.min(scale + delta * 0.01, 3));
                fullscreenImg.style.transform = `scale(${scale})`;
                lastDistance = currentDistance;
            }
        }, { passive: false });

        function updateFullscreenImage(index) {
            // Circular navigation
            if (index < 0) index = images.length - 1;
            if (index >= images.length) index = 0;

            currentIndex = index;
            fullscreenImg.src = images[currentIndex];
            fullscreenImg.alt = `${DOMPurify.sanitize(product.name)} - zdjęcie ${currentIndex + 1}`;
            thumbBoxes.forEach(b => b.classList.remove('active'));
            thumbBoxes[currentIndex].classList.add('active');
            currentImg.src = images[currentIndex];
            scale = 1;
            fullscreenImg.style.transform = `scale(${scale})`;

            // Preload następnego
            preloadImage((currentIndex + 1) % images.length);
        }

        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateFullscreenImage(currentIndex - 1);
        });
        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            updateFullscreenImage(currentIndex + 1);
        });

        // Funkcja czyszcząca - rozwiązuje memory leak
        function cleanup() {
            fullscreenDiv.remove();
            document.removeEventListener('keydown', handleKeyNavigation);
        }

        function handleKeyNavigation(e) {
            if (e.key === 'ArrowLeft') {
                updateFullscreenImage(currentIndex - 1);
            } else if (e.key === 'ArrowRight') {
                updateFullscreenImage(currentIndex + 1);
            } else if (e.key === 'Escape') {
                cleanup();
            }
        }

        // Swipe w fullscreen (używamy współdzielonej funkcji)
        initSwipe(
            fullscreenDiv,
            () => updateFullscreenImage(currentIndex + 1),
            () => updateFullscreenImage(currentIndex - 1)
        );

        // Zamknij - teraz używamy cleanup()
        fullscreenDiv.addEventListener('click', (e) => {
            if (e.target === fullscreenDiv || e.target === closeButton) {
                cleanup();
            }
        });

        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            cleanup();
        });

        document.addEventListener('keydown', handleKeyNavigation);
    }

    /**
     * Obsługa błędów - bez ujawniania struktury plików
     */
    function handleError(error, container) {
        let errorMessage = '';
        if (error.message.includes('Nie udało się pobrać')) {
            errorMessage = `Nie można załadować danych produktu. <button onclick="window.location.reload()">Spróbuj ponownie</button> lub <a href="index.html">wróć do strony głównej</a>.`;
        } else if (error.message.includes('Failed to parse') || error.message.includes('Plik CSV jest pusty')) {
            errorMessage = `Błąd ładowania danych produktu. Skontaktuj się z administratorem lub <a href="index.html">wróć do strony głównej</a>.`;
        } else {
            errorMessage = `Wystąpił nieoczekiwany błąd. <a href="index.html">Wróć do strony głównej</a>.`;
        }
        container.innerHTML = `<p>${errorMessage}</p>`;
    }

    /**
     * Wykrywa plik CSV marki
     */
    async function detectBrandCSV() {
        try {
            const response = await fetch('brand/');
            const html = await response.text();
            const match = html.match(/brand_[\w-]+\.csv/);
            return match ? `brand/${match[0]}` : 'brand/brand_default.csv';
        } catch {
            return 'brand/brand_South.csv';
        }
    }

    // Inicjalizacja
    loadProductDetails();
})();

