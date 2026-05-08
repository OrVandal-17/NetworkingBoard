# Networking Board

Simulation ICMP (ping) entre routeurs, construite en React + Vite.

## Démarrage rapide

```bash
npm install
npm run dev
```

---

## Architecture

```
src/
├── main.jsx                      # Point d'entrée React
├── App.jsx                       # Wrapper racine
├── NetworkingBoard.jsx           # Orchestrateur principal (wiring état ↔ UI)
│
├── data/
│   └── routers.js                # Définitions initiales des routeurs
│
├── store/
│   └── useRouterStore.js         # État et API de gestion individuelle des routeurs
│
├── hooks/
│   ├── usePing.js                # Logique simulation ICMP + animation paquet
│   └── useTerminal.js            # État des logs + auto-scroll
│
├── utils/
│   └── ping.js                   # Helpers: sleep, rand, ease, formatRtt
│
├── styles/
│   └── global.css                # Reset + layout racine
│
└── components/
    ├── Board/
    │   ├── Board.jsx             # Layout: header + canvas + terminal + controls + légende
    │   ├── Board.css
    │   ├── BoardCanvas.jsx       # SVG stage: lien, routeurs, paquet animé
    │   ├── BoardCanvas.css
    │   └── index.js
    │
    ├── Router/
    │   ├── RouterNode.jsx        # Icône SVG d'un routeur (LEDs, ports, état offline)
    │   ├── RouterNode.css
    │   ├── RouterLabel.jsx       # Nom + IP sous le routeur (SVG text)
    │   └── index.js
    │
    ├── Packet/
    │   ├── Packet.jsx            # Bulle PING/ECHO animée sur le canvas
    │   ├── Packet.css
    │   └── index.js
    │
    ├── Terminal/
    │   ├── Terminal.jsx          # Pane CLI scrollable
    │   ├── Terminal.css
    │   └── index.js
    │
    └── Controls/
        ├── Controls.jsx          # Toolbar: src/dst, count, TTL, boutons
        ├── Controls.css
        └── index.js
```

---

## Ajouter un routeur

1. Dans `src/data/routers.js`, ajouter une entrée `C` dans `INITIAL_ROUTERS`.
2. Dans `src/components/Board/BoardCanvas.jsx`, ajouter le `<foreignObject>` + `<RouterLabel>` correspondants.
3. Le `Controls` se met à jour automatiquement (options générées dynamiquement depuis `routers`).

## Gérer un routeur individuellement

`useRouterStore` expose :

| Méthode              | Description                            |
|----------------------|----------------------------------------|
| `updateRouter(id, patch)` | Met à jour n'importe quel champ   |
| `setLed(id, state)`  | `idle` \| `tx` \| `rx` \| `error`     |
| `toggleStatus(id)`   | `online` ↔ `offline`                  |
| `renameRouter(id, name)` | Renommer                           |
| `setIp(id, ip)`      | Changer l'adresse IP                   |

Le `onRouterPress(routerId)` dans `NetworkingBoard.jsx` est le point d'entrée
pour ouvrir un futur panneau de gestion (ex: `RouterDetailPanel`).
