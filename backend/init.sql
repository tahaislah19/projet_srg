-- ═══════════════════════════════════════════════════════
--  Auto Hall Maroc — Base de Données
--  init.sql — Tables + Données de démo
-- ═══════════════════════════════════════════════════════

-- ── RH : Employés ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS employes (
  id        SERIAL PRIMARY KEY,
  code      VARCHAR(20) UNIQUE,
  nom       VARCHAR(100) NOT NULL,
  poste     VARCHAR(100),
  ville     VARCHAR(50),
  telephone VARCHAR(20),
  statut    VARCHAR(20) DEFAULT 'Actif'
);
INSERT INTO employes (code,nom,poste,ville,telephone,statut) VALUES
  ('EMP-001','Mohammed Taha Islah','Développeur Full-Stack','Casablanca','0661-000001','Actif'),
  ('EMP-002','Sara Benali','Responsable RH','Rabat','0662-000002','Actif'),
  ('EMP-003','Karim El Alaoui','Commercial Senior','Marrakech','0663-000003','Actif'),
  ('EMP-004','Fatima Zahra Idrissi','Comptable','Casablanca','0664-000004','Actif'),
  ('EMP-005','Youssef Benhaddou','Technicien SAV','Tanger','0665-000005','En congé'),
  ('EMP-006','Nadia Cherkaoui','Assistante Direction','Casablanca','0666-000006','Actif'),
  ('EMP-007','Omar Bensouda','Responsable Stock','Fès','0667-000007','Actif'),
  ('EMP-008','Leila Mansouri','Chargée Marketing','Casablanca','0668-000008','Actif')
ON CONFLICT (code) DO NOTHING;

-- ── RH : Congés ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS conges (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20) UNIQUE,
  employe    VARCHAR(100) NOT NULL,
  type_conge VARCHAR(50),
  date_debut DATE,
  date_fin   DATE,
  duree      VARCHAR(10),
  statut     VARCHAR(20) DEFAULT 'En cours'
);
INSERT INTO conges (code,employe,type_conge,date_debut,date_fin,duree,statut) VALUES
  ('CGE-001','Mohammed Taha Islah','Congé annuel','2026-07-10','2026-07-20','10j','Actif'),
  ('CGE-002','Sara Benali','Congé maladie','2026-07-05','2026-07-08','3j','Actif'),
  ('CGE-003','Karim El Alaoui','Congé exceptionnel','2026-07-15','2026-07-16','1j','En cours'),
  ('CGE-004','Fatima Zahra Idrissi','Congé annuel','2026-08-01','2026-08-15','14j','En cours'),
  ('CGE-005','Youssef Benhaddou','Congé maladie','2026-07-01','2026-07-07','6j','Actif')
ON CONFLICT (code) DO NOTHING;

-- ── RH : Paie ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paie (
  id      SERIAL PRIMARY KEY,
  code    VARCHAR(20) UNIQUE,
  employe VARCHAR(100) NOT NULL,
  poste   VARCHAR(100),
  salaire NUMERIC(10,2),
  mois    VARCHAR(20),
  statut  VARCHAR(20) DEFAULT 'En attente'
);
INSERT INTO paie (code,employe,poste,salaire,mois,statut) VALUES
  ('PAY-001','Mohammed Taha Islah','Développeur Full-Stack',12000,'Mars 2026','Payé'),
  ('PAY-002','Sara Benali','Responsable RH',11000,'Mars 2026','Payé'),
  ('PAY-003','Karim El Alaoui','Commercial Senior',9500,'Mars 2026','En attente'),
  ('PAY-004','Fatima Zahra Idrissi','Comptable',8500,'Mars 2026','Payé'),
  ('PAY-005','Youssef Benhaddou','Technicien SAV',7500,'Mars 2026','En attente'),
  ('PAY-006','Nadia Cherkaoui','Assistante Direction',8000,'Mars 2026','Payé'),
  ('PAY-007','Omar Bensouda','Responsable Stock',9000,'Mars 2026','En attente'),
  ('PAY-008','Leila Mansouri','Chargée Marketing',8200,'Mars 2026','Payé')
ON CONFLICT (code) DO NOTHING;

-- ── Stock : Véhicules Neufs ───────────────────────────
CREATE TABLE IF NOT EXISTS vehicules_neufs (
  id      SERIAL PRIMARY KEY,
  code    VARCHAR(20) UNIQUE,
  marque  VARCHAR(50),
  modele  VARCHAR(100),
  annee   INTEGER,
  couleur VARCHAR(30),
  prix    NUMERIC(12,2),
  statut  VARCHAR(20) DEFAULT 'Disponible'
);
INSERT INTO vehicules_neufs (code,marque,modele,annee,couleur,prix,statut) VALUES
  ('VN-001','Toyota','Land Cruiser 300 GXR',2026,'Blanc',920000,'Disponible'),
  ('VN-002','Toyota','Corolla GR Sport',2026,'Rouge',215000,'Disponible'),
  ('VN-003','Toyota','Hilux Double Cab',2026,'Gris',445000,'Réservé'),
  ('VN-004','Toyota','RAV4 Hybrid',2026,'Noir',415000,'Disponible'),
  ('VN-005','Toyota','Yaris Cross GX',2026,'Bleu',195000,'Disponible'),
  ('VN-006','Suzuki','Swift GL',2026,'Blanc',168000,'Vendu'),
  ('VN-007','Suzuki','Vitara AllGrip',2026,'Gris',285000,'Disponible'),
  ('VN-008','Hino','500 Series FC',2026,'Blanc',780000,'Réservé')
ON CONFLICT (code) DO NOTHING;

-- ── Stock : Pièces de Rechange ────────────────────────
CREATE TABLE IF NOT EXISTS pieces_rechange (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) UNIQUE,
  designation VARCHAR(150),
  marque      VARCHAR(50),
  quantite    INTEGER DEFAULT 0,
  prix_unit   NUMERIC(10,2),
  statut      VARCHAR(20) DEFAULT 'En stock'
);
INSERT INTO pieces_rechange (code,designation,marque,quantite,prix_unit,statut) VALUES
  ('PR-001','Filtre a huile moteur','Toyota',450,85,'En stock'),
  ('PR-002','Plaquettes de frein avant','Toyota',280,320,'En stock'),
  ('PR-003','Courroie de distribution','Toyota',95,540,'En stock'),
  ('PR-004','Filtre a air','Suzuki',320,120,'En stock'),
  ('PR-005','Amortisseur avant gauche','Toyota',18,1200,'Faible stock'),
  ('PR-006','Bougie allumage NGK','NGK',850,45,'En stock'),
  ('PR-007','Huile moteur 5W40 5L','Castrol',620,180,'En stock'),
  ('PR-008','Batterie 70Ah','Hino',12,890,'Faible stock')
ON CONFLICT (code) DO NOTHING;

-- ── Stock : Véhicules Occasion ────────────────────────
CREATE TABLE IF NOT EXISTS vehicules_occasion (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) UNIQUE,
  marque      VARCHAR(50),
  modele      VARCHAR(100),
  annee       INTEGER,
  kilometrage INTEGER,
  prix        NUMERIC(12,2),
  statut      VARCHAR(20) DEFAULT 'Disponible'
);
INSERT INTO vehicules_occasion (code,marque,modele,annee,kilometrage,prix,statut) VALUES
  ('VO-001','Toyota','Land Cruiser GX',2022,45000,680000,'Disponible'),
  ('VO-002','Toyota','Corolla',2021,62000,145000,'Disponible'),
  ('VO-003','Toyota','Hilux',2020,78000,320000,'Réservé'),
  ('VO-004','Suzuki','Swift',2022,38000,120000,'Disponible'),
  ('VO-005','Toyota','RAV4',2021,55000,295000,'Vendu'),
  ('VO-006','Suzuki','Vitara',2023,22000,215000,'Disponible')
ON CONFLICT (code) DO NOTHING;

-- ── Ventes : Clients ──────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id        SERIAL PRIMARY KEY,
  code      VARCHAR(20) UNIQUE,
  nom       VARCHAR(100) NOT NULL,
  telephone VARCHAR(20),
  ville     VARCHAR(50),
  interet   VARCHAR(100),
  statut    VARCHAR(20) DEFAULT 'Actif'
);
INSERT INTO clients (code,nom,telephone,ville,interet,statut) VALUES
  ('CL-001','Ahmed Bennani','0661-234567','Casablanca','Toyota Land Cruiser','Actif'),
  ('CL-002','Sara Benali','0662-345678','Rabat','Toyota Yaris','Actif'),
  ('CL-003','Omar El Fassi','0663-456789','Fès','Suzuki Swift','En cours'),
  ('CL-004','Leila Mansouri','0664-567890','Tanger','Toyota Hilux','Actif'),
  ('CL-005','Rachid Tahiri','0665-678901','Marrakech','Toyota Corolla','En cours'),
  ('CL-006','Sara El Amrani','0666-789012','Casablanca','Suzuki Vitara','Actif'),
  ('CL-007','Khalil Regragui','0667-890123','Casablanca','Toyota RAV4','Actif'),
  ('CL-008','Nadia Cherkaoui','0668-901234','Rabat','Toyota Corolla','En cours')
ON CONFLICT (code) DO NOTHING;

-- ── Ventes : Commandes ────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id            SERIAL PRIMARY KEY,
  ref           VARCHAR(30) UNIQUE,
  client        VARCHAR(100),
  vehicule      VARCHAR(100),
  date_commande DATE,
  montant       NUMERIC(12,2),
  statut        VARCHAR(20) DEFAULT 'En cours'
);
INSERT INTO commandes (ref,client,vehicule,date_commande,montant,statut) VALUES
  ('CMD-2026-001','Ahmed Bennani','Toyota Land Cruiser V6','2026-03-05',920000,'Actif'),
  ('CMD-2026-002','Sara Benali','Toyota Yaris Cross','2026-03-06',195000,'Actif'),
  ('CMD-2026-003','Omar El Fassi','Suzuki Swift GL','2026-03-07',168000,'En cours'),
  ('CMD-2026-004','Leila Mansouri','Toyota Hilux Double Cab','2026-03-08',445000,'Actif'),
  ('CMD-2026-005','Rachid Tahiri','Toyota Corolla GR Sport','2026-03-09',215000,'En cours')
ON CONFLICT (ref) DO NOTHING;

-- ── Ventes : Devis ────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id            SERIAL PRIMARY KEY,
  ref           VARCHAR(30) UNIQUE,
  client        VARCHAR(100),
  vehicule      VARCHAR(100),
  montant       NUMERIC(12,2),
  date_validite DATE,
  statut        VARCHAR(20) DEFAULT 'En cours'
);
INSERT INTO devis (ref,client,vehicule,montant,date_validite,statut) VALUES
  ('DEV-2026-041','Rachid Tahiri','Toyota Corolla GR Sport',215000,'2026-03-20','En cours'),
  ('DEV-2026-042','Sara El Amrani','Suzuki Vitara AllGrip',285000,'2026-03-20','En cours'),
  ('DEV-2026-043','Khalil Regragui','Toyota RAV4 Hybrid',415000,'2026-03-22','Actif'),
  ('DEV-2026-044','Nadia Cherkaoui','Toyota Hilux Double Cab',445000,'2026-03-22','Actif')
ON CONFLICT (ref) DO NOTHING;

-- ── SAV ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav (
  id         SERIAL PRIMARY KEY,
  ref        VARCHAR(20) UNIQUE,
  client     VARCHAR(100),
  vehicule   VARCHAR(100),
  probleme   VARCHAR(200),
  technicien VARCHAR(100),
  statut     VARCHAR(20) DEFAULT 'En cours'
);
INSERT INTO sav (ref,client,vehicule,probleme,technicien,statut) VALUES
  ('SAV-001','Ahmed Bennani','Toyota Land Cruiser 2022','Vidange + filtre','Youssef Benhaddou','Actif'),
  ('SAV-002','Sara Benali','Toyota Yaris 2023','Remplacement plaquettes frein','Hassan Karimi','Actif'),
  ('SAV-003','Omar El Fassi','Suzuki Swift 2021','Révision 60 000 km','Youssef Benhaddou','En cours'),
  ('SAV-004','Leila Mansouri','Toyota Hilux 2022','Réglage géométrie','Hassan Karimi','En cours')
ON CONFLICT (ref) DO NOTHING;

-- ── SAV : Atelier ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS atelier (
  id        SERIAL PRIMARY KEY,
  ref       VARCHAR(20) UNIQUE,
  client    VARCHAR(100),
  vehicule  VARCHAR(100),
  date_rdv  DATE,
  heure_rdv VARCHAR(10),
  service   VARCHAR(100),
  statut    VARCHAR(20) DEFAULT 'Confirmé'
);
INSERT INTO atelier (ref,client,vehicule,date_rdv,heure_rdv,service,statut) VALUES
  ('RDV-001','Ahmed Bennani','Toyota LC 2022','2026-03-14','09:00','Vidange + révision','Confirmé'),
  ('RDV-002','Sara Benali','Toyota Yaris 2023','2026-03-14','10:30','Freinage','Confirmé'),
  ('RDV-003','Omar El Fassi','Suzuki Swift 2021','2026-03-15','09:00','Révision 60k','En cours'),
  ('RDV-004','Rachid Tahiri','Toyota Corolla 2024','2026-03-16','14:00','Contrôle général','Confirmé')
ON CONFLICT (ref) DO NOTHING;

-- ── SAV : Réparations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reparations (
  id         SERIAL PRIMARY KEY,
  ref        VARCHAR(20) UNIQUE,
  client     VARCHAR(100),
  vehicule   VARCHAR(100),
  reparation VARCHAR(200),
  cout       NUMERIC(10,2),
  technicien VARCHAR(100),
  statut     VARCHAR(20) DEFAULT 'En cours'
);
INSERT INTO reparations (ref,client,vehicule,reparation,cout,technicien,statut) VALUES
  ('REP-001','Ahmed Bennani','Toyota LC 2022','Remplacement amortisseurs AV',2800,'Youssef Benhaddou','En cours'),
  ('REP-002','Sara Benali','Toyota Yaris 2023','Remplacement courroie distribution',1500,'Hassan Karimi','Actif'),
  ('REP-003','Omar El Fassi','Suzuki Swift 2021','Réparation boite de vitesse',4200,'Youssef Benhaddou','En cours'),
  ('REP-004','Leila Mansouri','Toyota Hilux 2022','Vidange + filtre huile',350,'Hassan Karimi','Actif')
ON CONFLICT (ref) DO NOTHING;