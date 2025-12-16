/**
 * Moduł nawigacji - obsługa menu mobilnego i smooth scroll
 */

/**
 * Inicjalizuje nawigację strony
 * - Płynne przewijanie do sekcji
 * - Menu mobilne (hamburger)
 * - Efekt glassmorphism na scroll
 * - Podświetlanie aktywnej sekcji w nawigacji
 */
export function initNavigation() {
    const header = document.querySelector('#main-header');
    const hamburger = document.querySelector('#hamburgerBtn');
    const mobileNav = document.querySelector('#mobileNav');
    const menuOverlay = document.querySelector('#menuOverlay');
    const navLinks = document.querySelectorAll('.mobile-nav .nav-link');

    if (!header || !hamburger || !mobileNav) {
        return;
    }

    const headerHeight = header.offsetHeight;

    // Funkcja otwierania menu
    function openMenu() {
        mobileNav.classList.add('open');
        menuOverlay?.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        mobileNav.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    // Funkcja zamykania menu
    function closeMenu() {
        mobileNav.classList.remove('open');
        menuOverlay?.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // Toggle menu na klik hamburger
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mobileNav.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Zamknij menu po kliknięciu na link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            closeMenu();
        });
    });

    // Zamknij menu po kliknięciu na overlay
    menuOverlay?.addEventListener('click', closeMenu);

    // Zamknij menu po kliknięciu poza menu
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mobile-nav') &&
            !e.target.closest('#hamburgerBtn') &&
            mobileNav.classList.contains('open')) {
            closeMenu();
        }
    });

    // Efekt glassmorphic na scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Obsługa prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.style.setProperty(
        '--transition-speed',
        prefersReducedMotion ? '0s' : '0.3s'
    );

    // Zamknij menu przy zmianie wielkości okna
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileNav.classList.contains('open')) {
            closeMenu();
        }
    });

    // Płynne przewijanie do sekcji
    initSmoothScroll(headerHeight, closeMenu);
}

/**
 * Inicjalizuje płynne przewijanie do sekcji
 * @param {number} headerHeight - Wysokość headera
 * @param {Function} closeMenuCallback - Funkcja zamykająca menu
 */
function initSmoothScroll(headerHeight, closeMenuCallback) {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");

            // Pomijamy puste # i #top
            if (targetId === "#" || targetId === "#top") return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                // Płynne przewijanie z offsetem
                window.scrollTo({
                    top: targetElement.offsetTop - headerHeight,
                    behavior: "smooth"
                });

                // Dodaj klasę .active do aktywnego linku
                document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
                this.classList.add("active");

                // Zamknij menu mobilne
                closeMenuCallback();
            }
        });
    });

    // Podświetlanie aktywnej sekcji na scroll
    window.addEventListener("scroll", function () {
        let current = "";
        const sections = document.querySelectorAll("section[id]");

        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerHeight - 100;
            const sectionHeight = section.offsetHeight;
            if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute("id");
            }
        });

        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${current}`) {
                link.classList.add("active");
            }
        });
    });
}
