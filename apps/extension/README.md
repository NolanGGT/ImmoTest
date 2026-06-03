# ImmoTest Extension Chrome

Analyse n'importe quelle annonce immobilière en 1 clic depuis LeBonCoin, SeLoger ou PAP.

## Générer les icônes (requis avant le premier chargement)

1. Ouvrir `icons/generate-icons.html` dans votre navigateur
2. Cliquer sur **"Télécharger les 4 icônes"**
3. Déplacer les 4 fichiers PNG téléchargés dans `apps/extension/icons/`

## Installation en développement

1. Ouvrir Chrome → `chrome://extensions/`
2. Activer **"Mode développeur"** (en haut à droite)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `apps/extension/`

## Tester

1. Aller sur une annonce LeBonCoin (ex. `leboncoin.fr/ad/ventes_immobilieres/…`)
2. Cliquer sur l'icône ImmoTest dans la barre d'extensions
3. Vérifier que le prix et la surface s'affichent dans le popup
4. Cliquer **"Analyser"** → vérifier la redirection vers ImmoTest avec les champs pré-remplis

Cas d'erreur à tester :
- Page liste (pas une annonce) → popup affiche "Naviguez sur une annonce"
- Annonce sans prix → popup affiche l'état partiel avec les deux boutons

## Sites supportés

| Site | Extracteur | Méthode |
|------|-----------|---------|
| LeBonCoin | `leboncoin.js` | `__NEXT_DATA__` |
| SeLoger | `seloger.js` | `__NEXT_DATA__` + meta OG fallback |
| PAP | `pap.js` | JSON-LD + DOM fallback |
| Logic-Immo | — | Non implémenté (badge uniquement) |
| Bienici | — | Non implémenté (badge uniquement) |

## Publication Chrome Web Store

1. Zipper le dossier `apps/extension/` (sans `icons/generate-icons.html`)
2. Aller sur <https://chrome.google.com/webstore/devconsole>
3. **"Nouvel article"** → uploader le zip
4. Frais d'inscription : 5 $ une fois
