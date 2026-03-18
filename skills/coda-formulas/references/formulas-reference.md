# Référence complète des formules Coda

## 📝 Texte

| Formule | Description | Exemple |
|---------|-------------|---------|
| `Concatenate(a, b)` ou `a & b` | Concaténer des textes | `"Bonjour " & Nom` |
| `Upper(texte)` | Majuscules | `Upper("hello")` → `"HELLO"` |
| `Lower(texte)` | Minuscules | `Lower("WORLD")` → `"world"` |
| `Proper(texte)` | Première lettre majuscule | `Proper("jean dupont")` → `"Jean Dupont"` |
| `Len(texte)` | Longueur du texte | `Len("abc")` → `3` |
| `Left(texte, n)` | N premiers caractères | `Left("Bonjour", 3)` → `"Bon"` |
| `Right(texte, n)` | N derniers caractères | `Right("Bonjour", 3)` → `"our"` |
| `Mid(texte, début, n)` | Sous-chaîne depuis position | `Mid("Bonjour", 4, 3)` → `"jou"` |
| `Find(chercher, dans)` | Position d'un sous-texte | `Find("on", "Bonjour")` → `2` |
| `Substitute(texte, ancien, nouveau)` | Remplacer du texte | `Substitute("a-b-c", "-", "/")` → `"a/b/c"` |
| `Trim(texte)` | Supprimer espaces début/fin | `Trim("  hello  ")` → `"hello"` |
| `Contains(texte, sous-texte)` | Contient ? (booléen) | `Contains("Bonjour", "jour")` → `true` |
| `StartsWith(texte, début)` | Commence par ? | `StartsWith("Bonjour", "Bon")` → `true` |
| `EndsWith(texte, fin)` | Finit par ? | `EndsWith("Bonjour", "jour")` → `true` |
| `Split(texte, séparateur)` | Découper en liste | `Split("a,b,c", ",")` → `["a","b","c"]` |
| `ToText(valeur)` | Convertir en texte | `ToText(42)` → `"42"` |
| `Format(template, v1, v2...)` | Formatage avec placeholder | `Format("Bonjour {1} !", Prénom)` |
| `Rept(texte, n)` | Répéter N fois | `Rept("ab", 3)` → `"ababab"` |
| `Exact(a, b)` | Égalité stricte (casse) | `Exact("ABC", "abc")` → `false` |
| `RegexMatch(texte, regex)` | Correspond au pattern ? | `RegexMatch(Email, ".*@.*")` |
| `RegexExtract(texte, regex)` | Extraire via regex | |
| `RegexReplace(texte, regex, nouveau)` | Remplacer via regex | |

---

## 🔢 Mathématiques

| Formule | Description | Exemple |
|---------|-------------|---------|
| `Sum(liste)` | Somme | `Sum([Prix])` |
| `Average(liste)` | Moyenne | `Average([Notes])` |
| `Median(liste)` | Médiane | |
| `Min(liste)` | Minimum | `Min([Scores])` |
| `Max(liste)` | Maximum | `Max([Scores])` |
| `Count(liste)` | Nombre d'éléments | `Count([Clients])` |
| `CountIf(liste, condition)` | Compter si condition | `CountIf([Statuts], Statuts = "Actif")` |
| `SumIf(liste_val, liste_cond, condition)` | Somme conditionnelle | |
| `Round(n, décimales)` | Arrondir | `Round(3.14159, 2)` → `3.14` |
| `RoundUp(n, décimales)` | Arrondir vers le haut | `RoundUp(3.1, 0)` → `4` |
| `RoundDown(n, décimales)` | Arrondir vers le bas | `RoundDown(3.9, 0)` → `3` |
| `Ceiling(n)` | Entier supérieur | |
| `Floor(n)` | Entier inférieur | |
| `Abs(n)` | Valeur absolue | `Abs(-5)` → `5` |
| `Mod(n, diviseur)` | Modulo (reste) | `Mod(10, 3)` → `1` |
| `Power(base, exp)` | Puissance | `Power(2, 10)` → `1024` |
| `Sqrt(n)` | Racine carrée | `Sqrt(16)` → `4` |
| `Log(n)` | Logarithme base 10 | |
| `Ln(n)` | Logarithme naturel | |
| `Exp(n)` | e^n | |
| `Pi()` | Valeur de π | |
| `Random()` | Nombre aléatoire 0-1 | |
| `ToNumber(texte)` | Convertir en nombre | `ToNumber("42")` → `42` |
| `IsNaN(valeur)` | Est-ce NaN ? | |

---

## 📅 Dates & Temps

| Formule | Description | Exemple |
|---------|-------------|---------|
| `Today()` | Date du jour (sans heure) | |
| `Now()` | Date et heure actuelles | |
| `Date(année, mois, jour)` | Créer une date | `Date(2025, 12, 31)` |
| `Time(h, m, s)` | Créer une heure | `Time(14, 30, 0)` |
| `DateTime(date, time)` | Combiner date + heure | |
| `Year(date)` | Extraire l'année | `Year(Today())` |
| `Month(date)` | Extraire le mois (1-12) | |
| `Day(date)` | Extraire le jour (1-31) | |
| `Hour(datetime)` | Extraire l'heure | |
| `Minute(datetime)` | Extraire les minutes | |
| `Weekday(date)` | Jour de la semaine (0=dim, 1=lun...) | |
| `WeekNum(date)` | Numéro de semaine | |
| `DateAdd(date, n, unité)` | Ajouter une durée | `DateAdd(Today(), 7, "days")` |
| `DateDif(date1, date2, unité)` | Différence entre dates | `DateDif(Début, Fin, "days")` |
| `DateFormat(date, format)` | Formater une date | `DateFormat(Today(), "DD/MM/YYYY")` |
| `ToDate(texte)` | Convertir texte en date | `ToDate("2025-01-15")` |
| `Edate(date, mois)` | Ajouter N mois complets | `Edate(Today(), 3)` |
| `EoMonth(date, mois)` | Dernier jour du mois | `EoMonth(Today(), 0)` |
| `WorkDay(date, jours)` | Ajouter N jours ouvrés | `WorkDay(Today(), 5)` |
| `NetworkDays(date1, date2)` | Jours ouvrés entre 2 dates | |

**Unités pour DateAdd/DateDif** : `"days"`, `"weeks"`, `"months"`, `"years"`, `"hours"`, `"minutes"`, `"seconds"`

**Formats DateFormat** : `"DD/MM/YYYY"`, `"YYYY-MM-DD"`, `"MMM D, YYYY"`, `"dddd"` (nom du jour), `"HH:mm"`

---

## ✅ Logique & Conditions

| Formule | Description | Exemple |
|---------|-------------|---------|
| `If(condition, vrai, faux)` | Condition binaire | `If(Score > 50, "Réussi", "Échoué")` |
| `Switch(valeur, c1, r1, c2, r2, ..., défaut)` | Conditions multiples | `Switch(Statut, "A", "Actif", "I", "Inactif", "Inconnu")` |
| `And(c1, c2, ...)` | Toutes vraies ? | `And(Age > 18, Validé = true)` |
| `Or(c1, c2, ...)` | Au moins une vraie ? | `Or(Urgent, Priorité = "haute")` |
| `Not(condition)` | Inverse | `Not(IsBlank(Email))` |
| `IsBlank(valeur)` | Est vide/null ? | `If(IsBlank(Email), "Manquant", Email)` |
| `IsNotBlank(valeur)` | N'est pas vide ? | |
| `IsNull(valeur)` | Est null ? | |
| `Coalesce(v1, v2, ...)` | Premier non-vide | `Coalesce(Mobile, Fixe, "Aucun tel.")` |
| `IfError(formule, fallback)` | Gérer les erreurs | `IfError(ToNumber(Texte), 0)` |
| `True()` / `False()` | Valeurs booléennes explicites | |
| `XOR(c1, c2)` | OU exclusif | |

---

## 📋 Listes & Tables

| Formule | Description | Exemple |
|---------|-------------|---------|
| `Filter(liste, condition)` | Filtrer selon critère | `[Tâches].Filter(Terminée = true)` |
| `Sort(liste, colonne, asc)` | Trier (asc=true par défaut) | `[Clients].Sort(Nom, true)` |
| `Unique(liste)` | Supprimer doublons | `Unique([Catégories])` |
| `First(liste)` | Premier élément | `[Commandes].Sort(Date).First()` |
| `Last(liste)` | Dernier élément | |
| `Nth(liste, n)` | Nième élément (base 1) | `Nth([Items], 3)` |
| `Slice(liste, début, fin)` | Sous-liste | `Slice([Items], 1, 5)` |
| `Reverse(liste)` | Inverser l'ordre | |
| `FormulaMap(liste, formule)` | Transformer chaque élément | `[Prix].FormulaMap(CurrentValue * 1.21)` |
| `CountIf(liste, condition)` | Compter avec filtre | `CountIf([Statuts], CurrentValue = "Actif")` |
| `SumIf(liste_vals, liste_conds, cond)` | Somme conditionnelle | |
| `AverageIf(liste, condition)` | Moyenne conditionnelle | |
| `MinIf(liste, condition)` | Minimum conditionnel | |
| `MaxIf(liste, condition)` | Maximum conditionnel | |
| `Contains(liste, valeur)` | La liste contient valeur ? | `Contains([Tags], "urgent")` |
| `List(v1, v2, ...)` | Créer une liste littérale | `List("rouge", "vert", "bleu")` |
| `Join(liste, séparateur)` | Convertir liste en texte | `Join([Noms], ", ")` |
| `Flatten(liste_de_listes)` | Aplatir une liste imbriquée | |
| `Intersection(l1, l2)` | Éléments communs | |
| `Difference(l1, l2)` | Éléments dans l1 pas dans l2 | |
| `AddToList(liste, valeur)` | Ajouter un élément | |
| `RemoveFromList(liste, valeur)` | Retirer un élément | |
| `Shuffle(liste)` | Mélanger aléatoirement | |

---

## 🔍 Lookup & Relations

| Formule | Description | Exemple |
|---------|-------------|---------|
| `Lookup(table, col_cherche, valeur)` | Trouver une ligne | `Lookup([Produits], Référence, "REF-001")` |
| `thisRow` | Ligne courante | `thisRow.[Prix] * thisRow.[Qté]` |
| `thisTable` | Table courante | `thisTable.Filter(Statut = "Actif")` |
| `CurrentValue` | Valeur en cours dans lambda | `[Prix].Filter(CurrentValue > 100)` |
| `rowId()` | ID unique de la ligne courante | |
| `thisRow.RowLink()` | URL de la ligne courante | |

---

## 🔗 Exemples de formules combinées

### Tableau de bord projet
```
# Tâches en retard
[Tâches].Filter(
  DateDif(Today(), thisRow.[Échéance], "days") < 0
  && thisRow.[Terminée] = false
).Count()

# Progression (%)
Round(
  [Tâches].Filter(Terminée = true).Count()
  / [Tâches].Count() * 100
, 0) & "%"
```

### Synthèse financière
```
# Total commandes ce mois
[Commandes].Filter(
  Month(thisRow.[Date]) = Month(Today())
  && Year(thisRow.[Date]) = Year(Today())
).Sum(thisRow.[Montant])

# Top 5 clients par CA
[Clients].Sort([CA total], false).Slice(1, 5)
```

### Gestion de contacts
```
# Email ou téléphone disponible ?
If(IsNotBlank(thisRow.[Email]) || IsNotBlank(thisRow.[Téléphone]),
  "✅ Joignable",
  "⚠️ Aucun contact"
)

# Nom affiché propre
Proper(Trim(thisRow.[Prénom])) & " " & Upper(Trim(thisRow.[Nom]))
```
