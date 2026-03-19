# Guide de contribution

Merci de ton intérêt pour ce projet ! Voici comment contribuer.

## Avant de commencer

- Vérifie qu'une [issue](https://github.com/thierryvm/coda-mcp-server/issues) n'existe pas déjà pour ton cas
- Pour les grandes modifications, ouvre d'abord une issue pour en discuter
- Assure-toi d'avoir lu le [Code de conduite](CODE_OF_CONDUCT.md)

## Workflow de contribution

### 1. Fork & clone

```bash
# Fork via l'interface GitHub, puis :
git clone https://github.com/TON_USERNAME/coda-mcp-server.git
cd coda-mcp-server
npm install
```

### 2. Crée une branche

```bash
git checkout -b feature/ma-fonctionnalite
# ou
git checkout -b fix/mon-bugfix
```

### 3. Développe

```bash
npm run dev        # mode watch
npm run build      # compiler
```

### 4. Règles à respecter

- **Sécurité avant tout** : valider toutes les entrées avec Zod, ne jamais faire confiance aux URLs externes
- **Pas de secrets dans le code** : le token Coda vient toujours de `process.env.CODA_API_TOKEN`
- **TypeScript strict** : pas de `any` implicite, pas de `@ts-ignore` sans justification
- **Un outil = une responsabilité** : chaque outil MCP fait une seule chose bien

### 5. Ouvre une Pull Request

```bash
git push origin feature/ma-fonctionnalite
# Puis ouvre une PR sur GitHub
```

La PR sera automatiquement pré-remplie avec le template. Remplis-le soigneusement.

## Ajouter un nouvel outil MCP

1. Ajoute le `server.registerTool(...)` dans `src/index.ts`
2. Utilise Zod pour valider **tous** les paramètres (`.strict()` obligatoire)
3. Pense à la gestion d'erreur avec `handleApiError()`
4. Documente l'outil dans le README (tableau des outils)
5. Mets à jour la version dans `package.json` (semver)

## Questions ?

Ouvre une [issue](https://github.com/thierryvm/coda-mcp-server/issues) avec le label `question`.
