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

-- Horario de clases (alumnos y docentes). Los salones se ligan por nombre.
CREATE TABLE IF NOT EXISTS schedules (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  room        TEXT NOT NULL DEFAULT '',
  teacher     TEXT NOT NULL DEFAULT '',
  group_code  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS schedules_person_idx ON schedules (person_id, weekday);

-- Aceptación del aviso de privacidad (por versión)
CREATE TABLE IF NOT EXISTS privacy_consents (
  subject_type  TEXT NOT NULL CHECK (subject_type IN ('staff', 'person')),
  subject_id    TEXT NOT NULL,
  version       TEXT NOT NULL,
  accepted_at   TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (subject_type, subject_id, version)
);

-- Avisos para el celular de cada persona
CREATE TABLE IF NOT EXISTS notifications (
  id            TEXT PRIMARY KEY,
  person_id     TEXT NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  link          TEXT,
  dedupe_key    TEXT UNIQUE,
  read_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS notifications_person_idx ON notifications (person_id, created_at DESC);

-- Invitaciones con código QR que emite un docente o personal para su visitante
CREATE TABLE IF NOT EXISTS invitations (
  id               TEXT PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  token            TEXT NOT NULL UNIQUE,
  host_person_id   TEXT REFERENCES people (id) ON DELETE CASCADE,
  guest_name       TEXT NOT NULL,
  guest_email      TEXT NOT NULL DEFAULT '',
  reason           TEXT NOT NULL,
  visit_date       TEXT NOT NULL,
  access_point_id  TEXT REFERENCES access_points (id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'usada', 'cancelada')),
  guest_pass_id    TEXT REFERENCES guest_passes (id) ON DELETE SET NULL,
  used_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT ${NOW}
);

-- Laboratorios y salones, con sus equipos (cada equipo lleva un QR pegado)
CREATE TABLE IF NOT EXISTS rooms (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  building     TEXT NOT NULL DEFAULT '',
  kind         TEXT NOT NULL CHECK (kind IN ('laboratorio', 'salon')),
  has_display  INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS stations (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  in_service  INTEGER NOT NULL DEFAULT 1,
  UNIQUE (room_id, label)
);

CREATE TABLE IF NOT EXISTS station_sessions (
  id          TEXT PRIMARY KEY,
  station_id  TEXT NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES people (id) ON DELETE CASCADE,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  ended_by    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS station_sessions_open_idx ON station_sessions (ended_at, station_id);

CREATE TABLE IF NOT EXISTS station_incidents (
  id           TEXT PRIMARY KEY,
  station_id   TEXT NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  person_id    TEXT REFERENCES people (id) ON DELETE SET NULL,
  description  TEXT NOT NULL,
  reported_by  TEXT NOT NULL,
  resolved_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT ${NOW}
);

-- Emergencias y simulacros: quién estaba dentro y quién ya está a salvo
CREATE TABLE IF NOT EXISTS emergency_events (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('simulacro', 'emergencia')),
  started_by  TEXT NOT NULL,
  started_at  TEXT NOT NULL DEFAULT ${NOW},
  ended_at    TEXT
);

CREATE TABLE IF NOT EXISTS emergency_marks (
  event_id   TEXT NOT NULL REFERENCES emergency_events (id) ON DELETE CASCADE,
  record_id  TEXT NOT NULL,
  marked_by  TEXT NOT NULL,
  marked_at  TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (event_id, record_id)
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
