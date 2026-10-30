# Asteria Launcher

Prototype de launcher Windows en Electron pour le projet Minecraft Asteria.

## État du prototype

- Accueil Asteria avec thème sombre par défaut et thème clair sélectionnable.
- Écrans de compte Supabase et aperçu local.
- Pages Accueil, Jouer, Boutique, Actualités et Radio.
- Sélection locale d’une civilisation de prototype.
- Lancement du client NeoForge local configuré sur le PC de développement.
- Vérification et installation des mises à jour du launcher publiées dans les Releases GitHub.

La sélection de civilisation n’est pas encore reliée à des factions ou à des données de serveur. Le lancement du jeu est actuellement configuré pour le client de développement local : ce n’est pas encore un lanceur public capable d’installer Minecraft et ses mods sur un autre PC.

## Développement

Prérequis : Node.js et npm.

```powershell
npm install
npm start
```

Pour produire l’installateur Windows :

```powershell
npm run pack:release
```

Les fichiers de sortie sont créés dans `dist/`. Pour publier une mise à jour, augmenter la version dans `package.json`, reconstruire le launcher puis créer une GitHub Release avec l’installateur, son fichier `.blockmap` et `latest.yml`.
