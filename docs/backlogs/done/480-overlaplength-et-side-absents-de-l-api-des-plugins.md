# `overlapLength` et `Side` absents de l'API des plugins : le mode Event storming (`contacts/contacts.ts`) a son propre recouvrement d'intervalles et ses côtés (`ContactSide`) ; les réexporter depuis `core/plugins/index.ts` et les reprendre.

- Fait : `overlapLength` et le type `Side` réexportés par `core/plugins/index.ts` ; `contacts/contacts.ts` les reprend
  (son `overlapOf` et son `ContactSide` retirés), côtés des contacts en `n` / `s` / `w` / `e`. Écart : `overlapLength`
  renvoie 0 pour deux intervalles disjoints (au lieu d'un négatif), sans effet sur les contacts (comparés à la
  tolérance 0,5). Tests `contacts.test.ts` adaptés aux côtés.
