# Coda MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)](package.json)

Connecteur **MCP (Model Context Protocol)** pour intégrer **Coda.io** dans **Claude Code** et **Claude Desktop**.

Permet à Claude d'accéder directement à vos docs, pages, tables et données Coda depuis une conversation — lire, écrire, filtrer, créer, sans quitter Claude.

---

## Table des matières

- [Pourquoi ce MCP ?](#pourquoi-ce-mcp-)
- [Outils disponibles](#outils-disponibles)
- [Installation](#installation)
  - [Prérequis](#prérequis)
  - [Option A — Via npx (recommandé)](#option-a--via-npx-recommandé)
  - [Option B — Via clone git](#option-b--via-clone-git)
  - [Configuration Claude Code](#configuration-claude-code)
  - [Configuration Claude Desktop](#configuration-claude-desktop)
  - [Installer le skill Coda Formulas](#installer-le-skill-coda-formulas-optionnel)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Mise à jour](#mise-à-jour)
- [Sécurité](#sécurité)
- [Contribution](#contribution)

---

## Pourquoi ce MCP ?

Coda.io est un outil puissant mais répétitif pour les tâches de données. Ce MCP connecte Claude directement à votre compte Coda, vous permettant par exemple de :

- *"Montre-moi toutes les tâches non terminées dans mon projet"*
- *"Ajoute une ligne dans ma table de dépenses"*
- *"Résume le contenu de ma page de notes de réunion"*
- *"Copie la page template de janvier vers février"*

Tout sans ouvrir Coda, sans copier-coller, en langage naturel.

---

## Outils disponibles

### Documents & Pages

| Outil | Description |
|-------|-------------|
| `coda_list_docs` | Lister / rechercher des documents |
| `coda_get_doc` | Obtenir les métadonnées d'un doc |
| `coda_create_doc` | Créer un nouveau document |
| `coda_search_docs` | Rechercher parmi tous les docs |
| `coda_list_pages` | Lister les pages d'un doc |
| `coda_update_page` | Modifier le titre / icône d'une page |
| `coda_get_page_content` | Lire le contenu complet d'une page (markdown) |
| `coda_peek_page` | Aperçu des N premières lignes d'une page |
| `coda_create_page` | Créer une nouvelle page avec contenu optionnel |
| `coda_replace_page_content` | Remplacer entièrement le contenu d'une page |
| `coda_append_page_content` | Ajouter du contenu à la fin d'une page |
| `coda_duplicate_page` | Dupliquer une page sous un nouveau nom |
| `coda_resolve_link` | Résoudre une URL Coda en métadonnées |

### Tables & Données

| Outil | Description |
|-------|-------------|
| `coda_list_tables` | Lister les tables et vues d'un doc |
| `coda_list_columns` | Lister les colonnes d'une table |
| `coda_list_rows` | Lister les lignes avec filtres et tri |
| `coda_get_row` | Obtenir une ligne spécifique |
| `coda_upsert_rows` | Insérer ou mettre à jour des lignes |
| `coda_update_row` | Modifier une ligne existante |
| `coda_delete_row` | Supprimer une ligne |
| `coda_delete_rows` | Supprimer plusieurs lignes en une opération |
| `coda_push_button` | Déclencher un bouton sur une ligne |

### Formules

| Outil | Description |
|-------|-------------|
| `coda_list_formulas` | Lister les formules nommées avec leurs valeurs calculées |

---

## Installation

### Prérequis

- [Node.js](https://nodejs.org) v18 ou supérieur
- [Claude Code](https://claude.ai/code) ou [Claude Desktop](https://claude.ai/download)
- Un compte [Coda.io](https://coda.io) avec un token API

### Obtenir un token API Coda

1. Aller sur [coda.io/account](https://coda.io/account)
2. Section **API Settings** → **Generate API token**
3. Laisser le champ "Doc or table" **vide** pour accéder à tous vos docs
4. Copier le token généré

> ⚠️ Ne jamais committer votre token dans le code. Passez-le toujours via variable d'environnement.

---

### Option A — Via npx (recommandé)

Aucune installation requise. Ajoutez directement dans votre config :

**Claude Code :**
```bash
claude mcp add coda npx -y @thierryvm/coda-mcp-server@latest \
  --env CODA_API_TOKEN=VOTRE_TOKEN_ICI \
  -s user
```

**Claude Desktop** (`claude_desktop_config.json`) :
```json
{
  "mcpServers": {
    "coda": {
      "command": "npx",
      "args": ["-y", "@thierryvm/coda-mcp-server@latest"],
      "env": {
        "CODA_API_TOKEN": "VOTRE_TOKEN_ICI"
      }
    }
  }
}
```

---

### Option B — Via clone git

Utile si vous souhaitez modifier le code ou contribuer.

```bash
git clone https://github.com/thierryvm/coda-mcp-server.git
cd coda-mcp-server
npm install
npm run build
```

**Claude Code :**
```bash
claude mcp add coda node /chemin/vers/coda-mcp-server/dist/index.js \
  --env CODA_API_TOKEN=VOTRE_TOKEN_ICI \
  -s user
```

> Remplacez `/chemin/vers/coda-mcp-server/` par le chemin réel :
> - **Windows** : `C:\Users\VotreNom\Documents\coda-mcp-server`
> - **macOS/Linux** : `/home/votreNom/Documents/coda-mcp-server`

---

### Configuration Claude Desktop

Localisez le fichier `claude_desktop_config.json` :

| OS | Chemin |
|----|--------|
| **Windows (Store)** | `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\` |
| **Windows (classique)** | `%APPDATA%\Claude\` |
| **macOS** | `~/Library/Application Support/Claude/` |

Ajoutez la configuration :
```json
{
  "mcpServers": {
    "coda": {
      "command": "node",
      "args": ["/chemin/vers/coda-mcp-server/dist/index.js"],
      "env": {
        "CODA_API_TOKEN": "VOTRE_TOKEN_ICI"
      }
    }
  }
}
```

Puis **redémarrez Claude Desktop**.

---

### Installer le skill Coda Formulas (optionnel)

Le fichier `coda-formulas.plugin` inclus dans ce repo ajoute à Claude une référence complète des formules Coda. Il s'active automatiquement quand vous travaillez avec des formules.

**Installation :** glisser-déposer `coda-formulas.plugin` dans la fenêtre Claude Code.

Ou manuellement :
```bash
# macOS/Linux
cp -r skills ~/.claude/

# Windows (PowerShell)
Copy-Item -Recurse skills\coda-formulas "$env:USERPROFILE\.claude\plugins\repos\coda-formulas\skills"
```

---

## Exemples d'utilisation

Une fois configuré, voici ce que vous pouvez demander à Claude :

```
"Liste mes 10 derniers documents Coda"
"Montre-moi les colonnes de la table Projets dans mon doc Planning"
"Ajoute une dépense de 45€ pour 'électricité' dans ma table budget"
"Lis le contenu de ma page Réunion du 15 mars"
"Duplique la page Template janvier en Template février"
"Quelles sont les formules de mon budget et leurs valeurs ?"
"Supprime toutes les lignes où le statut est Archivé"
```

---

## Mise à jour

**Via npx :** automatique à chaque utilisation (`@thierryvm/coda-mcp-server@latest`).

**Via clone git :**
```bash
git pull
npm run build
```

Puis relancer Claude Code / Claude Desktop.

---

## Sécurité

- Token API passé via **variable d'environnement**, jamais dans le code
- Serveur en **local** (stdio) — aucun port réseau exposé
- Toutes les URLs externes validées pour appartenir à `coda.io`
- Limite de 100KB sur les écritures de contenu
- Paramètres validés avec Zod (`.strict()`)

Voir [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité.

---

## Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le workflow complet.

Pour signaler un bug ou proposer une fonctionnalité : [ouvrir une issue](https://github.com/thierryvm/coda-mcp-server/issues).

---

*Créé avec [Claude Cowork](https://claude.ai) — Licence [MIT](LICENSE)*
