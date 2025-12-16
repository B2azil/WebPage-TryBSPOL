/**
 * Moduł Hero - rotacja tła w sekcji hero
 * Zoptymalizowany pod kątem wydajności
 */

/**
 * Inicjalizuje rotację tła w sekcji hero
 * Ładuje obrazy z CSV i przełącza je co kilka sekund
 */
export function initHero() {
    const bg1 = document.getElementById('bg1');
    const bg2 = document.getElementById('bg2');
    const heroImg = document.getElementById('hero-img');

    if (!bg1 || !bg2) {
        return;
    }

    let activeBg = bg1;
    let inactiveBg = bg2;
    let currentIndex = 0;
    let intervalId = null;
    let preloadedImages = new Map(); // Cache załadowanych obrazów

    const intervalTime = 5000;
    const maxRunTime = 30 * 60 * 1000; // 30 minut

    // Obsługa błędu ładowania
    function handleLoadError() {
        // Ustaw gradient jako tło awaryjne
        activeBg.style.backgroundImage = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
        if (heroImg) {
            heroImg.alt = "Tło niedostępne";
        }
    }

    /**
     * Preload tylko następnego obrazu (nie wszystkich naraz)
     * Znacznie zmniejsza obciążenie przy starcie strony
     */
    function preloadNextImage(images) {
        if (document.hidden) return; // Nie ładuj gdy karta nieaktywna

        const nextIndex = (currentIndex + 1) % images.length;
        const nextImage = images[nextIndex];

        // Sprawdź czy już załadowany
        if (preloadedImages.has(nextImage.url)) return;

        const img = new Image();
        img.src = nextImage.url;
        img.onload = () => {
            preloadedImages.set(nextImage.url, true);
        };
        img.onerror = () => { /* Cichy błąd */ };
    }

    // Funkcja zmiany tła
    function changeBackground(images) {
        const nextImage = images[currentIndex];
        inactiveBg.style.backgroundImage =
            `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${nextImage.url}')`;
        inactiveBg.style.opacity = 1;
        activeBg.style.opacity = 0;

        if (heroImg) {
            heroImg.src = nextImage.url;
            heroImg.alt = nextImage.desc;
        }

        setTimeout(() => {
            [activeBg, inactiveBg] = [inactiveBg, activeBg];
        }, 1000);

        currentIndex = (currentIndex + 1) % images.length;

        // Preload następnego obrazu (inteligentnie, tylko jeden)
        preloadNextImage(images);
    }

    // Ładuj CSV
    fetch("main/csv/images.csv")
        .then(response => {
            if (!response.ok) throw new Error("Błąd ładowania CSV");
            return response.text();
        })
        .then(text => {
            const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length <= 1) {
                handleLoadError('Brak danych w CSV');
                return;
            }

            // Usuń nagłówek
            lines.shift();

            const images = lines.map(line => {
                const parts = line.split(";");
                if (parts.length < 2) {
                    return null;
                }
                return { url: parts[0].trim(), desc: parts.slice(1).join(";").trim() };
            }).filter(Boolean);

            if (images.length === 0) {
                handleLoadError('Brak poprawnych obrazów w CSV');
                return;
            }

            // Inicjalizacja pierwszego tła
            const firstImage = images[0];
            activeBg.style.backgroundImage =
                `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${firstImage.url}')`;
            activeBg.style.opacity = 1;
            inactiveBg.style.opacity = 0;

            // Oznacz pierwszy obraz jako załadowany
            preloadedImages.set(firstImage.url, true);

            if (heroImg) {
                heroImg.src = firstImage.url;
                heroImg.alt = firstImage.desc;
            }
            currentIndex = 1;

            // Preload tylko DRUGIEGO obrazu (następnego w kolejce)
            // Zamiast ładować wszystkie 5 na raz!
            if (images.length > 1) {
                preloadNextImage(images);
            }

            // Uruchom interwał, jeśli więcej niż 1 obraz
            if (images.length > 1) {
                intervalId = setInterval(() => changeBackground(images), intervalTime);
            }

            // Limit działania
            setTimeout(() => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
            }, maxRunTime);

            // Pauza, gdy karta nieaktywna
            document.addEventListener("visibilitychange", () => {
                if (document.hidden && intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                } else if (!document.hidden && !intervalId && images.length > 1) {
                    intervalId = setInterval(() => changeBackground(images), intervalTime);
                    // Wznów preloading
                    preloadNextImage(images);
                }
            });
        })
        .catch(err => {
            handleLoadError(`Błąd ładowania CSV: ${err.message}`);
        });
}
