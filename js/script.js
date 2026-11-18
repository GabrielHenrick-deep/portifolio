document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');
    const progressBar = document.getElementById('progress-bar');
    const backToTop = document.getElementById('backToTop');
    const retroCursor = document.getElementById('retro-cursor');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Cursor retrô — anel neon que segue o mouse e reage a elementos clicáveis
    if (retroCursor && finePointer && !reducedMotion) {
        // Só esconde o cursor nativo quando o customizado está ativo
        document.documentElement.classList.add('custom-cursor');
        const pos = { x: -100, y: -100, tx: -100, ty: -100 };

        document.addEventListener('mousemove', (e) => {
            pos.tx = e.clientX;
            pos.ty = e.clientY;
            retroCursor.classList.add('active');
        }, { passive: true });

        // Esconde quando o mouse sai da janela
        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget) {
                retroCursor.classList.remove('active');
            }
        });

        // Hover via delegação (funciona até movendo rápido entre elementos)
        document.addEventListener('mouseover', (e) => {
            const interactive = e.target.closest('a, button, .skill-tag, .grid-row, .contact-card');
            retroCursor.classList.toggle('hovering', !!interactive);
        });

        // Feedback de clique
        document.addEventListener('mousedown', () => retroCursor.classList.add('pressed'));
        document.addEventListener('mouseup', () => retroCursor.classList.remove('pressed'));
        window.addEventListener('blur', () => retroCursor.classList.remove('pressed'));

        (function cursorLoop() {
            // Lerp rápido: segue sem parecer travado
            pos.x += (pos.tx - pos.x) * 0.5;
            pos.y += (pos.ty - pos.y) * 0.5;
            retroCursor.style.left = pos.x + 'px';
            retroCursor.style.top = pos.y + 'px';
            requestAnimationFrame(cursorLoop);
        })();
    }

    // Luzes de largada: acendem uma a uma e apagam — a cena 3D larga junto
    const startLights = document.querySelector('.start-lights');
    function lightsOut() {
        window.__lightsOut = true;
        window.dispatchEvent(new Event('lightsout'));
    }
    if (startLights && !reducedMotion) {
        const bulbs = startLights.querySelectorAll('span');
        const STEP = 650;
        bulbs.forEach((bulb, i) => setTimeout(() => bulb.classList.add('on'), 500 + i * STEP));
        // Tempo aleatório antes do apagar, como na largada real
        setTimeout(() => {
            bulbs.forEach(b => b.classList.remove('on'));
            startLights.classList.add('out');
            lightsOut();
        }, 500 + bulbs.length * STEP + 300 + Math.random() * 900);
    } else {
        lightsOut();
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

    document.querySelectorAll('.skill-category, .grid-row, .stat, .contact-card, .timeline-item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // Âncoras suaves
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const href = anchor.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
            } else {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
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

    const timeline = document.getElementById('timeline');
    const timelineItems = timeline ? timeline.querySelectorAll('.timeline-item') : [];
    const lapFill = document.getElementById('lap-fill');
    const lapPct = document.getElementById('lap-pct');
    const lapLabel = document.getElementById('lap-label');

    function onScroll() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';

        // Indicador de volta (lateral)
        if (lapFill) {
            lapFill.style.transform = `scaleY(${progress / 100})`;
            lapPct.textContent = Math.round(progress) + '%';
            lapLabel.textContent = progress >= 99.5 ? 'FINISH' : 'LAP 01/01';
        }

        // Timeline: linha preenche conforme a rolagem; setores acendem ao serem alcançados
        if (timeline) {
            const rect = timeline.getBoundingClientRect();
            const head = window.innerHeight * 0.6 - rect.top;
            const fill = Math.min(Math.max(head / rect.height, 0), 1);
            timeline.style.setProperty('--fill', fill);
            timelineItems.forEach(item => {
                item.classList.toggle('passed', head >= item.offsetTop + 30);
            });
        }

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
    window.addEventListener('resize', onScroll);
    onScroll();

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
