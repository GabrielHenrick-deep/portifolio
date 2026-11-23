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

    // Carrosséis (mobile): indicadores sincronizados com o scroll-snap
    function setupCarousel(list, itemSelector, label) {
        if (!list) return;
        const cards = [...list.querySelectorAll(itemSelector)];
        const dots = document.createElement('div');
        dots.className = 'carousel-dots';
        cards.forEach((card, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', `Ir para ${label} ${i + 1}`);
            dot.addEventListener('click', () => {
                list.scrollTo({
                    left: card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2,
                    behavior: reducedMotion ? 'auto' : 'smooth',
                });
            });
            dots.appendChild(dot);
        });
        list.after(dots);

        const setActive = (index) => {
            [...dots.children].forEach((d, i) => {
                d.classList.toggle('active', i === index);
                d.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
        };
        setActive(0);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) setActive(cards.indexOf(entry.target));
            });
        }, { root: list, threshold: 0.6 });
        cards.forEach(card => observer.observe(card));
    }

    setupCarousel(document.querySelector('.grid-list'), '.grid-row', 'o projeto');
    setupCarousel(document.querySelector('.skills-grid'), '.skill-category', 'a categoria');

    /* ------------------- Carro 3D: HUD de inspeção ------------------- */

    function carCommand(cmd, value) {
        window.dispatchEvent(new CustomEvent('car:command', { detail: { cmd, value } }));
    }

    const carButtons = document.querySelectorAll('[data-car-cmd]');
    carButtons.forEach(btn => {
        btn.addEventListener('click', () => carCommand(btn.dataset.carCmd));
    });

    // Mantém botões sincronizados mesmo quando o comando vem do terminal
    window.addEventListener('car:state', (e) => {
        const state = e.detail;
        carButtons.forEach(btn => {
            btn.setAttribute('aria-pressed', String(Boolean(state[btn.dataset.carCmd])));
        });
    });

    /* ------------------- Terminal interativo ------------------------- */

    const termForm = document.getElementById('term-form');
    const termInput = document.getElementById('term-cmd');
    const termLog = document.getElementById('term-log');
    const MAX_LINES = 9;

    function termPrint(text, kind = 'out') {
        const line = document.createElement('p');
        line.className = `term-line term-${kind}`;
        line.textContent = text;
        termLog.appendChild(line);
        while (termLog.children.length > MAX_LINES) termLog.firstChild.remove();
        termLog.scrollTop = termLog.scrollHeight;
    }

    const carReady = () => window.__carReady === true;
    const needsCar = (fn) => (args) => (carReady() ? fn(args) : 'cena 3D indisponível neste dispositivo');

    const TERM_COMMANDS = {
        help: () => [
            'drs --open | --close          abre/fecha a asa traseira',
            'telemetry --heatmap | --off   temperatura dos pneus',
            'render --wireframe | --solid  malha de telemetria',
            'explode | explode --off       vista explodida',
            'wind --on | --off             túnel de vento',
            'camera --top|--side|--front|--default',
            'reset · whoami · clear',
        ],
        drs: needsCar((a) => {
            const open = !a.includes('--close');
            carCommand('drs', open);
            return open ? 'DRS ativado: flap aberto, menos arrasto' : 'DRS desativado';
        }),
        telemetry: needsCar((a) => {
            if (!a.includes('--heatmap') && !a.includes('--off')) return 'uso: telemetry --heatmap | --off';
            const on = !a.includes('--off');
            carCommand('heat', on);
            return on ? 'heatmap ligado: pneus e freios' : 'heatmap desligado';
        }),
        render: needsCar((a) => {
            const wire = a.includes('--wireframe');
            if (!wire && !a.includes('--solid')) return 'uso: render --wireframe | --solid';
            carCommand('wire', wire);
            return wire ? 'modo wireframe' : 'modo sólido';
        }),
        explode: needsCar((a) => {
            const on = !a.includes('--off');
            carCommand('explode', on);
            return on ? 'separando componentes...' : 'montando o carro';
        }),
        wind: needsCar((a) => {
            const on = !a.includes('--off');
            carCommand('wind', on);
            return on ? 'túnel de vento ligado: mexa o mouse para mudar o fluxo' : 'túnel de vento desligado';
        }),
        camera: needsCar((a) => {
            const view = ['top', 'side', 'front', 'default'].find(v => a.includes(`--${v}`));
            if (!view) return 'uso: camera --top | --side | --front | --default';
            carCommand('view', view);
            return `câmera: ${view}`;
        }),
        reset: needsCar(() => {
            ['wire', 'explode', 'drs', 'wind', 'heat'].forEach(c => carCommand(c, false));
            carCommand('view', 'default');
            return 'carro de volta à configuração de corrida';
        }),
        whoami: () => 'gabriel henrick — full stack & vr/xr developer',
        sudo: () => 'permissão negada: só o engenheiro de corrida tem sudo',
    };

    function runCommand(raw) {
        const input = raw.trim();
        if (!input) return;
        termPrint(`gabriel@ufu:~$ ${input}`, 'cmd');
        const [name, ...args] = input.toLowerCase().split(/\s+/);
        if (name === 'clear') {
            termLog.replaceChildren();
            return;
        }
        const fn = TERM_COMMANDS[name];
        const result = fn ? fn(args) : `comando não encontrado: ${name}. Digite help`;
        [].concat(result).forEach(line => termPrint(line));
    }

    if (termForm && termInput && termLog) {
        const history = [];
        let historyIndex = 0;

        termForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const value = termInput.value;
            if (value.trim()) history.push(value);
            historyIndex = history.length;
            runCommand(value);
            termInput.value = '';
        });

        // Setas ↑/↓ navegam no histórico, como num shell
        termInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && historyIndex > 0) {
                historyIndex--;
                termInput.value = history[historyIndex];
                e.preventDefault();
            } else if (e.key === 'ArrowDown' && historyIndex < history.length) {
                historyIndex++;
                termInput.value = history[historyIndex] || '';
                e.preventDefault();
            }
        });

        document.querySelectorAll('[data-term]').forEach(chip => {
            chip.addEventListener('click', () => runCommand(chip.dataset.term));
        });
    }

    /* ------------------- Copiar e-mail ------------------------------- */

    const copyStatus = document.getElementById('copy-status');
    document.querySelectorAll('[data-copy]').forEach(btn => {
        const label = btn.querySelector('.copy-label');
        const original = label ? label.textContent : '';
        let resetTimer = null;

        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            let ok = false;
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch (err) {
                // Fallback para contextos sem Clipboard API
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
                area.remove();
            }
            const message = ok ? 'Copiado!' : 'Não foi possível copiar';
            if (label) label.textContent = message;
            if (copyStatus) copyStatus.textContent = ok ? 'E-mail copiado para a área de transferência' : message;
            btn.classList.toggle('copied', ok);
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                if (label) label.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        });
    });

    /* ------------------- Tilt 3D nos projetos (desktop) -------------- */

    const tiltEnabled = finePointer && !reducedMotion && window.matchMedia('(min-width: 769px)').matches;
    if (tiltEnabled) {
        document.querySelectorAll('.grid-row').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.style.transition = 'transform 0.12s ease-out, border-color 0.2s, background 0.2s';
                card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 4}deg) translateX(4px)`;
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = '';
                card.style.transform = '';
            });
        });
    }

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
    const lapDraw = document.getElementById('lap-draw');
    const lapHead = document.getElementById('lap-head');
    let lapLength = 0;
    try {
        lapLength = lapDraw ? lapDraw.getTotalLength() : 0;
    } catch (e) {
        lapLength = 0;
    }
    const lapPct = document.getElementById('lap-pct');
    const lapLabel = document.getElementById('lap-label');

    function onScroll() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';

        // Traçado de Interlagos se forma até o fim da página
        if (lapDraw) {
            const f = progress / 100;
            lapDraw.style.strokeDashoffset = 1 - f;
            if (lapLength) {
                const pt = lapDraw.getPointAtLength(f * lapLength);
                lapHead.setAttribute('cx', pt.x);
                lapHead.setAttribute('cy', pt.y);
            }
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
