# Sources et mercato

## Sport

Le backend interroge des reponses football structurees pour les competitions configurees, filtre strictement l'identifiant OM et conserve la derniere valeur valide. Les scores ne sont exposes que pour un statut live, mi-temps ou termine.

## Actualites

Les recherches RSS couvrent :

- le domaine officiel OM;
- le domaine Ligue 1;
- les actualites generales sur l'Olympique de Marseille.

Chaque element conserve titre, editeur, URL editeur quand disponible, URL article et date. Les doublons sont supprimes par URL et titre normalise.

## Mercato

Les flux couvrent les recherches mercato et transfert OM. Regles :

- `OFFICIEL` : domaine officiel et vocabulaire de confirmation;
- `RUMEUR` : media reconnu, sans confirmation officielle;
- `SURVEILLE` : source de fiabilite plus faible ou non classee.

Le mot "officiel" dans le titre d'un media ne suffit jamais a produire le statut `OFFICIEL`.
