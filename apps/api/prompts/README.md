# Prompts ImmoSafe

## Convention de versioning

Chaque fichier de prompt commence par une ligne commentée `# VERSION: X.Y`.

| Incrément | Signification | Action requise |
|-----------|--------------|----------------|
| Majeur (X) | Changement de la structure JSON de réponse | Mettre à jour le Zod schema dans `biens.schema.ts` et tester |
| Mineur (Y) | Amélioration du prompt sans changement de structure | Tester sur quelques cas avant déploiement |

## Règles

- Ne jamais modifier un prompt en production sans avoir testé la réponse Zod
- Versionner chaque changement dans git : `chore: bump prompt analyse-bien to vX.Y`
- Garder les anciennes versions dans `prompts/archives/`
- Le cache mémoire du prompt est invalidé au redémarrage du serveur
