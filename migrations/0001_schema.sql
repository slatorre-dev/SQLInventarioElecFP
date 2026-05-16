CREATE TABLE IF NOT EXISTS inventario (
  id        INTEGER PRIMARY KEY,
  ref       TEXT DEFAULT '',
  aula      TEXT DEFAULT '',
  mod       TEXT DEFAULT '',
  item      TEXT DEFAULT '',
  qty       INTEGER DEFAULT 0,
  min       INTEGER DEFAULT 0,
  cat       TEXT DEFAULT '',
  loc       TEXT DEFAULT '',
  est       TEXT DEFAULT '',
  util      TEXT DEFAULT '',
  fecha     TEXT DEFAULT '',
  mant      TEXT DEFAULT '',
  mantFecha TEXT DEFAULT '',
  mantNota  TEXT DEFAULT '',
  mantResp  TEXT DEFAULT '',
  mantEstado TEXT DEFAULT '',
  mantSolicitante TEXT DEFAULT '',
  mantSolicitanteEmail TEXT DEFAULT '',
  foto      TEXT DEFAULT '',
  obs       TEXT DEFAULT '',
  code      TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usuarios (
  usuario  TEXT PRIMARY KEY,
  password TEXT DEFAULT '',
  nombre   TEXT DEFAULT '',
  rol      TEXT DEFAULT 'profesor',
  email    TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS profesores (
  id           INTEGER PRIMARY KEY,
  nombre       TEXT DEFAULT '',
  departamento TEXT DEFAULT '',
  email        TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS prestamos (
  id               INTEGER PRIMARY KEY,
  itemId           INTEGER DEFAULT 0,
  itemNombre       TEXT DEFAULT '',
  cantidad         INTEGER DEFAULT 0,
  aulaOrigen       TEXT DEFAULT '',
  aulaDestino      TEXT DEFAULT '',
  profesorId       INTEGER DEFAULT 0,
  profesorNombre   TEXT DEFAULT '',
  gestionadoPor    TEXT DEFAULT '',
  fechaPrestamo    TEXT DEFAULT '',
  fechaPrevista    TEXT DEFAULT '',
  fechaDevolucion  TEXT DEFAULT '',
  cantidadDevuelta INTEGER DEFAULT 0,
  estado           TEXT DEFAULT 'activo',
  obs              TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aulas (
  id    TEXT PRIMARY KEY,
  name  TEXT DEFAULT '',
  icon  TEXT DEFAULT '',
  desc  TEXT DEFAULT '',
  th    TEXT DEFAULT '',
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categorias (
  name  TEXT PRIMARY KEY,
  c     TEXT DEFAULT '',
  bg    TEXT DEFAULT '',
  i     TEXT DEFAULT '',
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ciclos (
  cicloId     TEXT,
  cicloNombre TEXT DEFAULT '',
  nivel       TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  th          TEXT DEFAULT '',
  desc        TEXT DEFAULT '',
  modCod      TEXT DEFAULT '',
  modNombre   TEXT DEFAULT '',
  modHoras    INTEGER DEFAULT 0,
  cicloOrden  INTEGER DEFAULT 0,
  modOrden    INTEGER DEFAULT 0,
  PRIMARY KEY (cicloId, modCod)
);

CREATE TABLE IF NOT EXISTS modulos (
  cod         TEXT PRIMARY KEY,
  nombre      TEXT DEFAULT '',
  responsable TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS documentos (
  id         INTEGER PRIMARY KEY,
  itemId     INTEGER DEFAULT 0,
  itemNombre TEXT DEFAULT '',
  aulaId     TEXT DEFAULT '',
  fileName   TEXT DEFAULT '',
  driveId    TEXT DEFAULT '',
  driveUrl   TEXT DEFAULT '',
  fecha      TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha   TEXT DEFAULT '',
  usuario TEXT DEFAULT '',
  nombre  TEXT DEFAULT '',
  rol     TEXT DEFAULT '',
  accion  TEXT DEFAULT '',
  itemId  TEXT DEFAULT '',
  resumen TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token   TEXT PRIMARY KEY,
  usuario TEXT DEFAULT '',
  expires INTEGER DEFAULT 0
);
