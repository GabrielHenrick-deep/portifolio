# Portfólio — Gabriel Henrick

Portfólio pessoal com tema escuro, cena 3D interativa (Three.js) e deploy via GitHub Actions.

## Stack

- **HTML, CSS, JavaScript** puro
- **Three.js** (CDN) — estrelas, óculos VR, partículas, formas 3D
- **GitHub Pages** + **GitHub Actions** (CI/CD)

## Estrutura

```
├── assets/
│   ├── icons/         # Favicon e logo
│   └── images/        # Imagens
├── css/
│   └── style.css      # Estilos
├── js/
│   ├── script.js      # Interações e animações
│   └── scene.js       # Cena Three.js
├── .github/workflows/ # CI/CD
├── index.html
└── README.md
```

## Dev

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy

Automatizado via GitHub Actions — push na `main` publica em:

https://gabrielhenrick-deep.github.io/portifolio
