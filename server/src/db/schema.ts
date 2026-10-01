const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const SCHEMA = /* sql */ `
-- Operadores del sistema: administración y vigilancia
CREATE TABLE IF NOT EXISTS staff (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name      TEXT NOT NULL,
  area           TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL CHECK (role IN ('admin', 'vigilancia')),
  password_hash  TEXT NOT NULL,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  last_login_at  TEXT
);

-- Personas con credencial institucional que registran su acceso
CREATE TABLE IF NOT EXISTS people (
  id                     TEXT PRIMARY KEY,
  code                   TEXT NOT NULL UNIQUE,
  full_name              TEXT NOT NULL,
  email                  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role                   TEXT NOT NULL CHECK (role IN ('alumno', 'docente', 'personal')),
  program                TEXT NOT NULL DEFAULT '',
  credential_expires_at  TEXT,
  password_hash          TEXT NOT NULL,
  active                 INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL DEFAULT ${NOW},
  last_login_at          TEXT
);

-- Puertas o áreas del campus, con los roles que pueden ingresar por cada una
CREATE TABLE IF NOT EXISTS access_points (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  description    TEXT NOT NULL DEFAULT '',
  allowed_roles  TEXT NOT NULL DEFAULT '["alumno","docente","personal"]',
  lat            REAL,
  lng            REAL,
  radius_meters  INTEGER NOT NULL DEFAULT 300,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT ${NOW}
);

-- Pases temporales para visitantes sin credencial
CREATE TABLE IF NOT EXISTS guest_passes (
  id               TEXT PRIMARY KEY,
  full_name        TEXT NOT NULL,
  document         TEXT NOT NULL DEFAULT '',
  reason           TEXT NOT NULL DEFAULT '',
  host_name        TEXT NOT NULL DEFAULT '',
  access_point_id  TEXT REFERENCES access_points (id) ON DELETE SET NULL,
  issued_by        TEXT REFERENCES staff (id) ON DELETE SET NULL,
  valid_date       TEXT NOT NULL,
  closed_at        TEXT,
  created_at       TEXT NOT NULL DEFAULT ${NOW}
);

-- Entradas y salidas: una fila por ciclo de acceso (persona o invitado)
CREATE TABLE IF NOT EXISTS access_records (
  id               TEXT PRIMARY KEY,
  person_id        TEXT REFERENCES people (id) ON DELETE CASCADE,
  guest_pass_id    TEXT REFERENCES guest_passes (id) ON DELETE CASCADE,
  access_point_id  TEXT REFERENCES access_points (id) ON DELETE SET NULL,
  check_in         TEXT,
  check_out        TEXT,
  status           TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'incidencia')),
  incident         TEXT CHECK (incident IN ('salida_sin_entrada', 'sin_salida')),
  source           TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'manual')),
  biometric        INTEGER NOT NULL DEFAULT 0,
  geo              TEXT,
  notes            TEXT NOT NULL DEFAULT '',
  registered_by    TEXT REFERENCES staff (id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT ${NOW},
  updated_at       TEXT NOT NULL DEFAULT ${NOW},
  CHECK (person_id IS NOT NULL OR guest_pass_id IS NOT NULL),
  CHECK (check_in IS NOT NULL OR check_out IS NOT NULL),
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in)
);
CREATE INDEX IF NOT EXISTS access_person_idx ON access_records (person_id, check_in DESC);
CREATE INDEX IF NOT EXISTS access_open_idx ON access_records (check_out, check_in DESC);
CREATE INDEX IF NOT EXISTS access_created_idx ON access_records (created_at DESC);

-- Alertas para vigilancia (accesos denegados e incidencias)
CREATE TABLE IF NOT EXISTS alerts (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  person_id        TEXT REFERENCES people (id) ON DELETE CASCADE,
  access_point_id  TEXT REFERENCES access_points (id) ON DELETE SET NULL,
  ref_id           TEXT,
  dedupe_key       TEXT UNIQUE,
  read_at          TEXT,
  reviewed_by      TEXT REFERENCES staff (id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS alerts_created_idx ON alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash    TEXT PRIMARY KEY,
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('staff', 'person')),
  subject_id    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  user_agent    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS sessions_subject_idx ON sessions (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  public_key    BLOB NOT NULL,
  counter       INTEGER NOT NULL DEFAULT 0,
  transports    TEXT NOT NULL DEFAULT '[]',
  label         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT ${NOW},
  last_used_at  TEXT
);

-- Configuración del sistema (por ejemplo, redes permitidas)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_type  TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  details     TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT ${NOW}
);
`;

/** Accesos de ejemplo que se crean al inicializar la base vacía */
export const DEFAULT_ACCESS_POINTS = [
  { name: 'Acceso principal', description: 'Entrada peatonal sobre la vialidad principal', roles: ['alumno', 'docente', 'personal'] },
  { name: 'Acceso vehicular', description: 'Entrada de estacionamiento', roles: ['docente', 'personal'] },
  { name: 'Acceso de servicios', description: 'Puerta de personal administrativo y proveedores', roles: ['personal'] },
];
