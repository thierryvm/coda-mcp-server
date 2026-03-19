# Politique de sécurité

## Versions supportées

| Version | Supportée |
|---------|-----------|
| 2.x     | ✅        |
| 1.x     | ❌        |

## Signaler une vulnérabilité

**Ne pas ouvrir d'issue publique pour une faille de sécurité.**

Si tu découvres une vulnérabilité, merci de la signaler **en privé** via :
- [GitHub Security Advisories](https://github.com/thierryvm/coda-mcp-server/security/advisories/new)

### Ce qu'il faut inclure

- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel
- Suggestion de correction si possible

### Délai de réponse

- Accusé de réception : sous 48h
- Évaluation : sous 7 jours
- Correction : selon la criticité

## Bonnes pratiques de sécurité pour les utilisateurs

- Ne jamais committer ton `CODA_API_TOKEN` dans le code
- Utiliser un token Coda avec les permissions minimales nécessaires
- Régénérer ton token si tu penses qu'il a été compromis sur [coda.io/account](https://coda.io/account)
- Ce serveur tourne en local (stdio) — il n'expose aucun port réseau
