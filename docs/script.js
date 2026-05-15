document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-links a, .hero-btns a');
    const pages = document.querySelectorAll('.page');

    function switchPage(targetId) {
        const targetPage = document.querySelector(targetId);
        
        if (targetPage && !targetPage.classList.contains('active')) {
            // Désactiver la page actuelle
            pages.forEach(page => {
                page.classList.remove('active');
            });

            // Activer la nouvelle page
            targetPage.classList.add('active');

            // Mettre à jour les liens de navigation
            const cleanId = targetId.startsWith('#') ? targetId : `#${targetId}`;
            document.querySelectorAll('.nav-links a').forEach(link => {
                if (link.getAttribute('href') === cleanId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                switchPage(href);
            }
        });
    });

    // Gestion du scroll à la souris pour changer de page (optionnel mais moderne)
    let isTransitioning = false;
    window.addEventListener('wheel', (e) => {
        if (isTransitioning) return;

        const activePage = document.querySelector('.page.active');
        const activeIndex = Array.from(pages).indexOf(activePage);

        if (e.deltaY > 50 && activeIndex < pages.length - 1) {
            // Scroll Down
            isTransitioning = true;
            switchPage(`#${pages[activeIndex + 1].id}`);
            setTimeout(() => isTransitioning = false, 800);
        } else if (e.deltaY < -50 && activeIndex > 0) {
            // Scroll Up
            isTransitioning = true;
            switchPage(`#${pages[activeIndex - 1].id}`);
            setTimeout(() => isTransitioning = false, 800);
        }
    });
});
