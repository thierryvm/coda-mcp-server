---
description: >
  Référence des formules Coda.io. Utilise ce skill quand l'utilisateur demande
  d'écrire une formule Coda, d'utiliser Filter/Sort/If/DateAdd ou toute autre
  fonction Coda, ou lorsque le MCP Coda est utilisé et qu'un calcul, filtre,
  ou transformation de données est nécessaire. Déclenché aussi par : "formule
  coda", "filter dans coda", "calculer dans coda", "FormulaMap", "thisRow",
  "CurrentValue", "comment faire un if dans coda".
---

# Coda Formulas — Référence complète

## Syntaxe fondamentale

Coda supporte **deux styles** équivalents :

### Style chaîné (recommandé)
```
[Tâches].Filter(Statut = "Actif").Sort(Priorité)
```

### Style imbriqué (Excel-like)
```
Sort(Filter([Tâches], Statut = "Actif"), Priorité)
```

### Opérateurs
| Opérateur | Signification |
|-----------|---------------|
| `=` | Égal |
| `!=` | Différent |
| `<`, `>`, `<=`, `>=` | Comparaison numérique/date |
| `&&` ou `AND` | ET logique |
| `\|\|` ou `OR` | OU logique |
| `!` ou `NOT` | Négation |
| `&` | Concaténation texte |
| `.` | Chaînage d'opérations |

### Mots-clés spéciaux
| Mot-clé | Usage |
|---------|-------|
| `thisRow` | Référence la ligne courante dans une colonne calculée |
| `thisTable` | Référence la table courante |
| `CurrentValue` | Valeur courante dans `Filter`, `FormulaMap`, `Sort` |

---

## Catégories principales

Voir le fichier de référence détaillé pour la liste complète avec exemples :
→ `references/formulas-reference.md`

### Résumé rapide par catégorie

**Texte** : `Concatenate`, `Upper`, `Lower`, `Proper`, `Len`, `Left`, `Right`, `Mid`, `Find`, `Substitute`, `Trim`, `Contains`, `StartsWith`, `EndsWith`, `Split`, `ToText`, `Format`

**Math** : `Sum`, `Average`, `Min`, `Max`, `Count`, `CountIf`, `Round`, `RoundUp`, `RoundDown`, `Abs`, `Mod`, `Power`, `Sqrt`, `ToNumber`

**Dates** : `Today`, `Now`, `Date`, `Year`, `Month`, `Day`, `Weekday`, `DateAdd`, `DateDif`, `DateFormat`, `ToDate`, `Edate`

**Logique** : `If`, `Switch`, `And`, `Or`, `Not`, `IsBlank`, `IsNotBlank`, `Coalesce`, `IfError`

**Listes/Tables** : `Filter`, `Sort`, `Unique`, `First`, `Last`, `Nth`, `Slice`, `Reverse`, `FormulaMap`, `CountIf`, `SumIf`, `Contains`, `List`, `Join`, `Flatten`, `Intersection`, `Difference`

**Lookup** : `Lookup`, `thisRow`, `CurrentValue`, `rowId()`

---

## Patterns courants avec le MCP Coda

### Avant toute opération sur les lignes → récupérer les IDs de colonnes
```
coda_list_columns(doc_id, table_id)
# → retourne les IDs de colonnes (ex: "c-ABC123")
# Utiliser ces IDs dans coda_list_rows(query) et coda_upsert_rows(cells)
```

### Filtrer des lignes via `coda_list_rows`
```json
{ "query": "c-ABC123:Actif" }
```

### Insérer une ligne avec valeurs calculées via `coda_upsert_rows`
```json
{
  "rows": [{
    "cells": [
      {"column": "c-prix", "value": 99.99},
      {"column": "c-tva", "value": 20.998},
      {"column": "c-total", "value": 120.988}
    ]
  }]
}
```

### Formules dans les colonnes calculées (écrites dans Coda, pas via MCP)
```
# Colonne "Total TTC"
thisRow.[Prix HT] * 1.21

# Colonne "Statut délai"
If(DateDif(Today(), thisRow.[Échéance], "days") < 0, "⛔ En retard",
   If(DateDif(Today(), thisRow.[Échéance], "days") <= 7, "⚠️ Urgent", "✅ OK"))

# Colonne "Nom complet"
thisRow.[Prénom] & " " & Upper(thisRow.[Nom])

# Colonne "Projets actifs" (dans une table liée)
thisRow.[Projets].Filter(Statut = "En cours").Count()
```

---

## Règles importantes

1. **MCP écrit des valeurs brutes** — les formules Coda (`Filter`, `If`, etc.) s'écrivent dans l'interface Coda, pas dans les payloads API
2. **Toujours utiliser les IDs de colonnes** dans les opérations MCP (pas les noms affichés)
3. **`coda_upsert_rows` = base table uniquement** — ne fonctionne pas sur les vues
4. **`CurrentValue`** = élément courant dans les lambdas (`Filter`, `FormulaMap`, `Sort`)
5. **`thisRow`** = ligne courante dans les colonnes calculées
