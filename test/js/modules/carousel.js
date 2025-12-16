/**
 * Moduł Carousel - karuzela z logotypami
 */

import { debounce } from './utils.js';

/**
 * Inicjalizuje karuzelę z logotypami
 * Ładuje loga z CSV i animuje je w nieskończonej pętli
 */
export function initCarousel() {
    const config = {
        csvUrl: 'main/csv/carousel.csv',
        imageBasePath: 'main/img/',
        // Prędkość w pikselach na sekundę (niezależna od Hz monitora)
        // 72px/s = taka sama prędkość jak 1.2px/klatkę na 60Hz
        speedPerSecond: 72,
        direction: 'left',
        logos: [],
        cycleWidth: 0,
    };

    const carousel = document.getElementById('logoTrack');
    const wrapper = carousel?.parentNode;

    if (!carousel || !wrapper) {
        return;
    }

    // Asynchroniczna funkcja wypełniania logotypów
    async function fillLogos() {
        if (config.logos.length === 0) {
            return;
        }

        let repetitions = 0;
        carousel.innerHTML = '';
        const allImgs = [];

        do {
            config.logos.forEach((item) => {
                const img = document.createElement('img');
                img.src = item.src;
                img.alt = item.alt || 'Logo';
                img.onerror = () => {
                    img.style.display = 'none'; // Ukryj uszkodzony obraz
                };
                carousel.appendChild(img);
                allImgs.push(img);
            });
            repetitions++;
        } while (carousel.scrollWidth < wrapper.offsetWidth * 2);

        // Czekaj na załadowanie wszystkich obrazów
        await Promise.all(allImgs.map(img => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            if (img.complete) resolve();
        })));

        config.cycleWidth = carousel.scrollWidth / repetitions;
    }

    // Funkcja animacji z delta time (niezależna od Hz monitora)
    let position = 0;
    let speedLocked = false;
    let lastTime = 0;

    function animate(currentTime) {
        // Oblicz delta time (czas od ostatniej klatki w sekundach)
        if (lastTime === 0) {
            lastTime = currentTime;
        }
        const deltaTime = (currentTime - lastTime) / 1000; // konwersja ms -> s
        lastTime = currentTime;

        if (!speedLocked && config.cycleWidth > 0) {
            // Przesunięcie = prędkość (px/s) × czas (s)
            const movement = config.speedPerSecond * deltaTime;
            const effectiveSpeed = config.direction === 'left' ? -movement : movement;
            position += effectiveSpeed;

            if (config.direction === 'left') {
                if (position <= -config.cycleWidth) {
                    position += config.cycleWidth;
                }
            } else {
                if (position >= config.cycleWidth) {
                    position -= config.cycleWidth;
                }
            }
        }
        carousel.style.transform = `translateX(${position}px)`;
        requestAnimationFrame(animate);
    }

    // Obsługa hover
    wrapper.addEventListener('mouseenter', () => { speedLocked = true; });
    wrapper.addEventListener('mouseleave', () => { speedLocked = false; });

    // Obsługa dotyku (swipe)
    let touchStartX = 0;
    wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        speedLocked = true;
    });

    wrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - touchStartX;
        position += deltaX;
        touchStartX = touchX;

        position = ((position % config.cycleWidth) + config.cycleWidth) % config.cycleWidth;
        if (config.direction === 'left' && position > 0) position -= config.cycleWidth;

        carousel.style.transform = `translateX(${position}px)`;
    });

    wrapper.addEventListener('touchend', () => { speedLocked = false; });

    // Obsługa resize
    const debouncedResize = debounce(async () => {
        await fillLogos();
        position = 0;
    }, 200);
    window.addEventListener('resize', debouncedResize);

    // Ładowanie CSV za pomocą PapaParse
    if (typeof Papa === 'undefined') {
        return;
    }

    Papa.parse(config.csvUrl, {
        download: true,
        header: true,
        delimiter: ';', // CSV używa średnika jako separatora
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
            if (results.errors?.length > 0) {
                return;
            }

            config.logos = results.data
                .map((row) => ({
                    src: row.image?.trim() ? `${config.imageBasePath}${row.image.trim()}` : '',
                    alt: row.alt?.trim() || 'Logo',
                }))
                .filter((item) => item.src && item.src.length > 0);

            if (config.logos.length === 0) {
                return;
            }

            fillLogos().then(() => {
                requestAnimationFrame(animate);
            }).catch(() => {
                // Cichy błąd inicjalizacji
            });
        },
        error: () => {
            // Cichy błąd ładowania danych
        },
    });
}
