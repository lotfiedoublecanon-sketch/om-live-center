# Rapport OM Live Center

## Projet

- Dossier : `om-live-center`
- Branche locale : `om-live-center`
- Version : `1.0.0`
- Projet CDM 2026 : non modifie
- Remote Git : aucun configure

## Fonctionnalites livrees

- hero match OM live, programme ou dernier resultat confirme;
- score direct horizontal et minute quand la source les fournit;
- commentaires et evenements confirmes;
- mini-stade SVG original avec fallback explicite sans positions inventees;
- actualites OM sourcees;
- mercato avec source, URL, statut et fiabilite;
- calendrier et resultats;
- classement Ligue 1;
- effectif et indisponibilites quand la source les publie;
- notifications navigateur sur demarrage de match ou changement de score;
- PWA versionnee, installable et utilisable avec la derniere reponse valide.

## Backend et cache

- `GET /health` : HTTP 200;
- `GET /api/om/widget` : HTTP 200;
- premier appel : cache `MISS`;
- second appel : cache `HIT`;
- live : cache 45 s;
- contenu : cache 7 min 30;
- calendrier, classement, effectif : cache 10 min;
- derniere valeur valide : retour `STALE` si une source tombe.

## Verification du 15 juillet 2026

- prochain match confirme : Marseille - Strasbourg, programme le 21 aout 2026;
- matchs a venir recus : 18;
- classement recu : 18 clubs;
- actualites recues : 36;
- informations mercato recues : 30;
- scores fictifs : aucun;
- telemetrie fictive : aucune.

## Tests

- `npm run build` : OK;
- 10 tests Vitest : OK;
- smoke test avec vraies sources : OK;
- mobile 360 x 800 : OK, aucun debordement, score horizontal;
- mobile 390 x 844 : OK, onglets scrollables;
- PC 1366 x 768 : OK;
- PC 1920 x 1080 : OK;
- ecrans Actus, Mercato, Calendrier, Classement et Effectif : non vides ou fallback propre;
- console navigateur apres proxy logo : aucune erreur.

## Securite

- aucune cle API;
- aucun token;
- aucun `.env` versionne;
- aucune URL utilisateur proxifiee;
- aucune erreur brute affichee dans l'interface;
- liens externes ouverts avec `noreferrer`;
- CSP, `nosniff`, politique de referer et permissions restrictives actives.

## Deploiement

`render.yaml` est pret pour un nouveau service Render. Le deploiement public reste a effectuer apres creation du depot distant dedie; aucune URL CDM existante n'a ete modifiee.

## Limites honnetes

- le fournisseur d'effectif publiait un seul joueur au moment du test; l'interface affiche uniquement ce qui est recu;
- le mini-stade n'affiche pas le ballon tant qu'aucune source ne fournit de coordonnees reelles;
- les notifications fonctionnent pendant l'utilisation de la PWA; un vrai push ferme necessiterait un fournisseur push et des cles serveur separees.
