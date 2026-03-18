# Coda MCP Server + Skill

Connecteur MCP (Model Context Protocol) pour intégrer **Coda.io** dans **Claude Code** et **Claude Desktop**.
Permet à Claude d'accéder à vos docs, tables et données Coda directement depuis une conversation.

---

## Outils disponibles

| Outil | Description |
|-------|-------------|
| `coda_list_docs` | Lister / rechercher des docs |
| `coda_get_doc` | Obtenir les métadonnées d'un doc |
| `coda_create_doc` | Créer un nouveau doc |
| `coda_list_pages` | Lister les pages d'un doc |
| `coda_update_page` | Modifier le titre / icône d'une page |
| `coda_list_tables` | Lister les tables d'un doc |
| `coda_list_columns` | Lister les colonnes d'une table |
| `coda_list_rows` | Lister les lignes avec filtres |
| `coda_get_row` | Obtenir une ligne spécifique |
| `coda_upsert_rows` | Insérer / mettre à jour des lignes |
| `coda_update_row` | Modifier une ligne existante |
| `coda_delete_row` | Supprimer une ligne |
| `coda_list_formulas` | Lister les formules d'un doc |
| `coda_search_docs` | Rechercher parmi tous les docs |

---

## Installation

### Prérequis

- [Node.js](https://nodejs.org) v18 ou supérieur
- [Claude Code](https://claude.ai/code) ou Claude Desktop
- Un compte [Coda.io](https://coda.io)

---

### Étape 1 — Cloner le repo

```bash
git clone https://github.com/thierryvm/coda-mcp-server.git
cd coda-mcp-server
```

### Étape 2 — Installer les dépendances et builder

```bash
npm install
npm run build
```

### Étape 3 — Obtenir un token API Coda

1. Aller sur [coda.io/account](https://coda.io/account)
2. Section **API Settings** → **Generate API token**
3. Laisser le champ "Doc or table" **vide** pour accéder à tous vos docs
4. Copier le token généré

> ⚠️ Ne jamais committer votre token dans le code ou un fichier versionné.

---

### Étape 4a — Configurer dans Claude Code

```bash
claude mcp add coda node /chemin/absolu/vers/coda-mcp-server/dist/index.js \
  --env CODA_API_TOKEN=VOTRE_TOKEN_ICI \
  -s user
```

Remplacez `/chemin/absolu/vers/coda-mcp-server/` par le chemin réel sur votre machine.
**Windows** : `C:\Users\VotreNom\Documents\coda-mcp-server`
**macOS/Linux** : `/home/votreNom/Documents/coda-mcp-server`

Puis **relancez Claude Code** — les outils `coda_*` seront disponibles.

---

### Étape 4b — Configurer dans Claude Desktop

Modifier `claude_desktop_config.json` :

- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "coda": {
      "command": "node",
      "args": ["/chemin/absolu/vers/coda-mcp-server/dist/index.js"],
      "env": {
        "CODA_API_TOKEN": "VOTRE_TOKEN_ICI"
      }
    }
  }
}
```

---

### Étape 5 — Installer le skill (optionnel, Claude Code uniquement)

Le dossier `skills/coda-formulas/` contient un skill qui donne à Claude une référence complète des formules Coda. Il s'active automatiquement quand vous travaillez avec des formules.

Pour installer le skill, glisser le fichier `coda-formulas.plugin` dans la fenêtre Claude Code,
ou copier manuellement :

```bash
# macOS/Linux
cp -r skills ~/.claude/

# Windows (PowerShell)
Copy-Item -Recurse skills\coda-formulas "$env:USERPROFILE\.claude\plugins\repos\coda-formulas\skills"
```

---

## Mise à jour

```bash
git pull
npm run build
```

Puis relancer Claude Code / Claude Desktop.

---

## Sécurité

- Le token API est passé via **variable d'environnement**, jamais dans le code
- Le serveur tourne en **local** (transport stdio) — aucun port réseau exposé
- Permissions minimales : uniquement les endpoints Coda nécessaires

---

## Contribution

Pull requests bienvenues. Pour les bugs ou suggestions, ouvrir une issue.

---

*Créé avec [Claude Cowork](https://claude.ai)*
