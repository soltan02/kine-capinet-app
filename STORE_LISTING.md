# Google Play Console — store listing & submission worksheet

Ready-to-paste content for the Play Console. Fill this in yourself in the
console UI — none of this can be submitted on your behalf.

## ⚠️ Before you submit: make the privacy policy link public

The privacy policy is published at:

**https://claude.ai/code/artifact/3ce729e8-40c6-4adb-99c5-56d4555d1b24**

Artifacts are **private by default**. Open that link → use the page's share
menu → make it shared/public, otherwise Google's reviewers can't open it and
your submission will be rejected. (Alternatively, copy the page content
somewhere you control long-term — e.g. a page on your own domain — since a
Play Store listing should point to a policy URL you'll maintain indefinitely.)

## App details

- **App name**: Kine Cabinet
- **Package name**: `com.kinecabinet.app`
- **Category**: Medical (or Business — Medical fits a clinical records tool better)
- **Contact email**: ghailen.zitouni@edu.isetcom.tn

## Short description (max 80 characters)

```
Gestion de cabinet de kinésithérapie : patients, RDV, facturation, IA.
```

## Full description (French)

```
Kine Cabinet est l'application de gestion pensée pour les cabinets de
kinésithérapie tunisiens.

DOSSIERS PATIENTS
Diagnostic, antécédents, contre-indications, objectifs de traitement et
documents médicaux (radios, ordonnances) centralisés et sécurisés.

RENDEZ-VOUS & CALENDRIER
Planification avec détection automatique des conflits d'horaire, statuts de
suivi (programmé, confirmé, terminé...).

NOTES DE SÉANCE
Suivi de la douleur avant/après, actes réalisés, historique complet de
l'évolution du patient.

FACTURATION
Paiements en espèces, CNAM ou carte, suivi des recettes, export de factures.

ANALYSE PAR INTELLIGENCE ARTIFICIELLE
Sur demande, obtenez une synthèse clinique et des suggestions pour la
prochaine séance — une aide à la décision pour le praticien, jamais un
diagnostic automatique. Aucune donnée identifiante n'est envoyée.

GESTION D'ÉQUIPE PAR RÔLE
Trois niveaux d'accès (administrateur, kinésithérapeute, secrétaire) : les
données cliniques sensibles restent réservées au personnel soignant.

SAUVEGARDES AUTOMATIQUES
Une sauvegarde de vos données est générée chaque semaine, et vous pouvez
exporter l'ensemble de vos données à tout moment.

Disponible en français et en arabe.
```

## Feature graphic (1024×500) and screenshots

Not generated here — these need real captures. Recommended screens to
screenshot from BlueStacks or a real device (in this order, they tell the
app's story well):

1. Dashboard (shows the at-a-glance daily overview)
2. Patient profile (diagnosis/history section)
3. Session note with pain-scale tracking
4. Calendar/appointments view
5. The AI analysis screen (a strong differentiator vs. generic clinic apps)
6. Billing screen

Play Store requires **at least 2** phone screenshots (16:9 or 9:16), 320–3840px
on the short side. The feature graphic is a plain 1024×500 banner — a solid
brand-teal (`#0D9488`) background with the app name and a tagline works fine;
no need for anything elaborate.

## Data safety form — answer sheet

Play Console asks a structured questionnaire; here are the answers based on
what the app actually does:

| Question | Answer |
|---|---|
| Does your app collect or share user data? | Yes |
| Data types collected | **Personal info**: name, email, phone (staff + patient records). **Health and fitness**: health info (diagnosis, treatment notes). **Financial info**: payment info (amounts, method — not card numbers, no payment processor integrated). |
| Is data encrypted in transit? | Yes (HTTPS/TLS) |
| Can users request data deletion? | Yes — an admin can delete records in-app; full account/data deletion available on request to the clinic |
| Is data shared with third parties? | Yes — limited: Supabase (hosting/infrastructure processor) and Google Gemini (AI analysis feature only, anonymized clinical text, no identifiers) |
| Is data collection required or optional? | Required for core app functionality (it's a clinical records tool) |
| Purpose of collection | App functionality (patient/clinic management) — not advertising or analytics |

## Content rating questionnaire

Expected answers: no violence, no user-generated public content, no gambling,
no mature themes — this is a professional business/medical administration
tool. Should receive the lowest content rating tier (e.g. "Everyone"/"3+"
equivalent) without issue.

## Build to upload

Use the **production** EAS profile (already configured in `eas.json` to
produce an `.aab`, the required format for Play Store — the `preview` profile
used for direct-install testing produces an `.apk`, which Play Console will
reject for new app bundles):

```bash
npx eas build --platform android --profile production
```

## The one thing only you can do: closed testing

Google requires new personal Play Console accounts to run a **closed test
with ≥20 opted-in testers for 14 continuous days** before the app can go to
public/production release. Plan your first sale(s) around this — you'll need
~20 people (friends, family, other clinics you know) to install via the
closed-testing link and keep using the app for two weeks before you can
publish it publicly.
