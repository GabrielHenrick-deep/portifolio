document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');
    const progressBar = document.getElementById('progress-bar');
    const backToTop = document.getElementById('backToTop');
    const cursorGlow = document.getElementById('cursor-glow');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Cursor glow — segue o mouse com lerp suave
    if (cursorGlow && finePointer && !reducedMotion) {
        const glow = { x: -500, y: -500, tx: -500, ty: -500 };

        document.addEventListener('mousemove', (e) => {
            glow.tx = e.clientX;
            glow.ty = e.clientY;
        }, { passive: true });

        (function glowLoop() {
            glow.x += (glow.tx - glow.x) * 0.12;
            glow.y += (glow.ty - glow.y) * 0.12;
            cursorGlow.style.transform = `translate(${glow.x - 210}px, ${glow.y - 210}px)`;
            requestAnimationFrame(glowLoop);
        })();
    } else if (cursorGlow) {
        cursorGlow.style.display = 'none';
    }

    // Tilt 3D + spotlight nos cards de projeto
    if (finePointer && !reducedMotion) {
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mx', x + 'px');
                card.style.setProperty('--my', y + 'px');
                const rx = ((y / rect.height) - 0.5) * -6;
                const ry = ((x / rect.width) - 0.5) * 6;
                card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // Ano dinâmico no footer
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Menu mobile acessível
    function closeMenu() {
        navLinks.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
            toggle.focus();
        }
    });

    // Animações de revelação
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.skill-category, .project-card, .stat, .contact-card, .timeline-item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // Âncoras suaves
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const href = anchor.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    target.setAttribute('tabindex', '-1');
                    target.focus({ preventScroll: true });
                }
            }
        });
    });

    // Scrollspy — destaca o link da seção visível
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');

    const scrollSpyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navAnchors.forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
                });
            }
        });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(section => scrollSpyObserver.observe(section));

    // Scroll com requestAnimationFrame (evita trabalho redundante)
    let ticking = false;

    function onScroll() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';

        const scrolled = scrollTop > 100;
        navbar.classList.toggle('scrolled', scrolled);
        backToTop.classList.toggle('visible', scrolled);

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });

    // Efeito de digitação (desativado se o usuário prefere movimento reduzido)
    const phrases = [
        'Construindo pontes entre o físico e o digital',
        'Full Stack & VR/XR Developer',
        'Laravel · TypeScript · Unity · Docker',
        'Do backend ao metaverso',
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingTimer = null;
    const typingElement = document.querySelector('.typing-text');

    function type() {
        if (!typingElement) return;

        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }

        let delay = isDeleting ? 30 : 60;

        if (!isDeleting && charIndex === currentPhrase.length) {
            delay = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            delay = 400;
        }

        typingTimer = setTimeout(type, delay);
    }

    if (typingElement && !reducedMotion) {
        typingTimer = setTimeout(type, 500);
    } else if (typingElement) {
        typingElement.textContent = phrases[0];
    }

    // Pausa o typing quando a aba está oculta
    document.addEventListener('visibilitychange', () => {
        if (!typingElement || reducedMotion) return;
        if (document.hidden) {
            clearTimeout(typingTimer);
        } else {
            typingTimer = setTimeout(type, 500);
        }
    });
});
