# Plan de carga masiva (bulk load) – mi-rotaract

## Resumen ejecutivo

Este documento define la funcionalidad de carga masiva para todas las entidades del proyecto que se benefician de importación por CSV con UTF-8, incluyendo endpoints REST, validaciones, manejo de errores parciales y UX en el frontend.

---

## 1. Entidades que requieren carga masiva

| Entidad | Contexto | Prioridad | Rol requerido |
|---------|----------|-----------|---------------|
| **Clubs** | Secretaría crea muchos clubes al inicio de período | Alta | SECRETARY |
| **Socios (Members)** | Presidente/tesorero carga planilla de socios del club | Alta | Club authority |
| **Usuarios** | Admin distrital crea cuentas en masa para presidentes/socios | Alta | SECRETARY |
| **Eventos** | Importar calendario de eventos distritales | Media | SECRETARY o PRESIDENT |
| **Proyectos** | Club importa lista de proyectos/ideas | Media | Club authority |
| **Oportunidades** | Importar convocatorias desde planilla externa | Media | SECRETARY |
| **Reuniones** | Crear múltiples reuniones programadas | Baja | SECRETARY |
| **Participantes de reunión** | Asignar participantes a reunión en masa | Media | SECRETARY |
| **Miembros de comité** | Agregar integrantes a comité distrital | Baja | SECRETARY |

**Fuera de alcance MVP bulk:**
- Reportes (contentJson complejo, creación manual tiene más sentido)
- Temas de agenda (por reunión, poco volumen)
- Períodos distritales (entidad administrativa, pocos registros)
- Comités (entidades raíz, pocos registros)

---

## 2. Especificación técnica por módulo

### 2.1 Clubs

**Endpoint:** `POST /clubs/bulk`  
**Rol:** SECRETARY  
**Módulo:** `clubs`  
**Archivo template:** `plantilla-clubes.csv`

#### Formato CSV (UTF-8, separador `,`, comillas `"` para campos con coma/saltos)

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| name | Sí | Nombre del club | Texto |
| code | Sí | Código único (ej: CLUB-ALPHA) | Texto, mayúsculas |
| presidentEmail | No | Email del presidente | Email válido |
| enabledForDistrictMeetings | No | Participa en reuniones distritales | true/false (default: true) |
| cuotaAldia | No | Cuota al día | true/false (default: false) |
| informeAlDia | No | Informe al día | true/false (default: false) |

#### Ejemplo CSV

```csv
name,code,presidentEmail,enabledForDistrictMeetings,cuotaAldia,informeAlDia
"Club Rotaract Alpha",CLUB-ALPHA,presi@alpha.org,true,false,false
"Club Rotaract Beta",CLUB-BETA,,true,true,true
```

---

### 2.2 Socios (Members)

**Endpoint:** `POST /club/members/bulk`  
**Rol:** Club authority (ClubAuthorityGuard)  
**Contexto:** `clubId` viene del `req` (club del usuario)  
**Archivo template:** `plantilla-socios.csv`

#### Formato CSV (UTF-8)

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| firstName | Sí | Nombre | Texto |
| lastName | Sí | Apellido | Texto |
| email | Sí | Email único por club | Email válido |
| phone | No | Teléfono | Texto |
| birthDate | No | Fecha nacimiento | YYYY-MM-DD |
| joinedAt | No | Fecha ingreso | YYYY-MM-DD |
| status | No | Estado del socio | ACTIVE, INACTIVE, LICENCIA, EGRESADO, PENDIENTE |
| title | No | Cargo/cargo (ej: Socio fundador) | Texto |
| internalNotes | No | Notas internas | Texto (evitar comillas) |

#### Ejemplo CSV

```csv
firstName,lastName,email,phone,birthDate,joinedAt,status,title,internalNotes
"María","García",maria@club.org,+34 600 111 222,1995-03-15,2024-01-01,ACTIVE,Socio,
"Juan","López",juan@club.org,,,2024-02-01,PENDIENTE,,
```

---

### 2.3 Usuarios

**Endpoint:** `POST /users/bulk`  
**Rol:** SECRETARY  
**Módulo:** `users` (nuevo método en auth o users)  
**Archivo template:** `plantilla-usuarios.csv`

**Nota:** La creación de usuarios requiere `fullName`, `email`, `password`. Para bulk, se genera contraseña temporal o se envía email de invitación.

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| fullName | Sí | Nombre completo | Texto |
| email | Sí | Email único | Email válido |
| role | Sí | Rol inicial | PARTICIPANT, PRESIDENT, SECRETARY |
| sendInvite | No | Enviar invitación con link para definir contraseña | true/false (default: true) |
| temporaryPassword | No | Contraseña temporal (solo si sendInvite=false) | Mín 6 caracteres |

**Regla:** Si `sendInvite=true`, no se persiste contraseña; se genera token de invitación y se envía email. Si `sendInvite=false` y se provee `temporaryPassword`, se crea usuario con esa contraseña (hasheada).

#### Ejemplo CSV

```csv
fullName,email,role,sendInvite
"María García",maria@club.org,PRESIDENT,true
"Juan López",juan@club.org,PARTICIPANT,false
```

---

### 2.4 Eventos

**Endpoint:** `POST /events/bulk`  
**Rol:** SECRETARY o PRESIDENT (organizador)  
**Archivo template:** `plantilla-eventos.csv`

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| title | Sí | Título | Texto |
| description | No | Descripción | Texto |
| type | Sí | Tipo | DISTRITAL, CLUB, CAPACITACION, REUNION, ASAMBLEA, PROYECTO_SERVICIO, NETWORKING, PROFESIONAL |
| modality | Sí | Modalidad | PRESENCIAL, VIRTUAL, HIBRIDA |
| startsAt | Sí | Inicio | ISO 8601 (YYYY-MM-DD HH:mm o YYYY-MM-DD) |
| endsAt | No | Fin | ISO 8601 |
| location | No | Ubicación | Texto |
| meetingUrl | No | URL reunión virtual | URL |
| maxCapacity | No | Aforo máximo | Número entero |
| featured | No | Destacado | true/false |
| clubId | No | Club organizador (código o id) | Código club existente |

#### Ejemplo CSV

```csv
title,description,type,modality,startsAt,endsAt,location,meetingUrl,maxCapacity,featured,clubId
"Encuentro distrital","Reunión trimestral",DISTRITAL,PRESENCIAL,2025-04-15 09:00,,Hotel XYZ,,200,true,
"Taller liderazgo",,CAPACITACION,VIRTUAL,2025-04-20 18:00,2025-04-20 20:00,,https://zoom.us/j/123,50,false,
```

---

### 2.5 Proyectos

**Endpoint:** `POST /club/projects/bulk`  
**Rol:** Club authority  
**Contexto:** `clubId` del usuario  
**Archivo template:** `plantilla-proyectos.csv`

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| title | Sí | Título del proyecto | Texto |
| description | No | Descripción | Texto |
| status | No | Estado | IDEA, PLANIFICACION, EN_EJECUCION, FINALIZADO, CANCELADO |
| category | No | Categoría | SOCIAL, PROFESIONAL, AMBIENTAL, OTRO |
| startDate | No | Fecha inicio | YYYY-MM-DD |
| endDate | No | Fecha fin | YYYY-MM-DD |

---

### 2.6 Oportunidades

**Endpoint:** `POST /opportunities/bulk`  
**Rol:** SECRETARY (o rol con permisos de crear oportunidades)  
**Archivo template:** `plantilla-oportunidades.csv`

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| title | Sí | Título | Texto |
| description | No | Descripción | Texto |
| requirements | No | Requisitos | Texto |
| type | Sí | Tipo | EMPLEO, PASANTIA, BECA, VOLUNTARIADO, CAPACITACION, LIDERAZGO, CONVOCATORIA |
| modality | Sí | Modalidad | PRESENCIAL, VIRTUAL, HIBRIDA |
| area | No | Área | Texto |
| organization | No | Organización | Texto |
| externalUrl | No | URL externa | URL |
| deadlineAt | No | Fecha límite | ISO 8601 |
| featured | No | Destacada | true/false |

---

### 2.7 Reuniones

**Endpoint:** `POST /meetings/bulk`  
**Rol:** SECRETARY  
**Archivo template:** `plantilla-reuniones.csv`

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| title | Sí | Título | Texto |
| description | No | Descripción | Texto |
| clubId | Sí | ID o código del club | Código o ID |
| scheduledAt | No | Fecha/hora programada | ISO 8601 |

---

### 2.8 Participantes de reunión

**Endpoint:** `POST /meetings/:meetingId/participants/bulk`  
**Rol:** SECRETARY  
**Archivo template:** `plantilla-participantes-reunion.csv`

| Columna | Obligatorio | Descripción | Valores |
|---------|-------------|-------------|---------|
| email | Sí | Email del usuario existente | Email |
| canVote | No | Puede votar | true/false |

---

### 2.9 Miembros de comité

**Endpoint:** `POST /district/committees/:committeeId/members/bulk`  
**Rol:** SECRETARY (DistrictGuard)  
**Archivo template:** `plantilla-integrantes-comite.csv`

| Columna | Obligatorio | Descripción |
|---------|-------------|-------------|
| email | Sí | Email del usuario existente |
| role | No | Rol en comité (ej: integrante, secretario) |

---

## 3. Flujo de datos (upload → validación → persistencia)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO BULK LOAD                              │
└─────────────────────────────────────────────────────────────────────┘

  [Frontend]                    [Backend]                     [DB]
      │                             │                           │
      │  1. POST multipart/form-data│                           │
      │     file: archivo.csv       │                           │
      │  ─────────────────────────►│                           │
      │                             │  2. Parse CSV (UTF-8)     │
      │                             │     - Detectar BOM        │
      │                             │     - Separador: ,        │
      │                             │     - Comillas: "         │
      │                             │                           │
      │                             │  3. Validar por fila      │
      │                             │     - class-validator     │
      │                             │     - reglas de negocio   │
      │                             │     - unicidad, FK        │
      │                             │                           │
      │                             │  4. Persistir en batch    │
      │                             │     - Transacción parcial │
      │                             │     - Filas OK → insert   │
      │                             │     - Filas KO → skip     │
      │                             │  ────────────────────────►│
      │                             │                           │
      │  5. Respuesta 207           │  ◄────────────────────────│
      │  { created, failed, report }│                           │
      │  ◄─────────────────────────│                           │
      │                             │                           │
      │  6. Mostrar reporte UX      │                           │
      │     - Filas creadas         │                           │
      │     - Filas con error       │                           │
      │     - Descargar reporte     │                           │
      │                             │                           │
```

### 3.1 Estrategia de validación

1. **Pre-validación:** Parsear CSV y detectar errores de formato (columnas faltantes, encoding).
2. **Validación por fila:** Cada fila se valida contra el DTO correspondiente (class-validator).
3. **Validación de negocio:** Unicidad (email, code), existencia de FKs (clubId, etc.).
4. **Modo de ejecución:** Por defecto `partial` (crear filas válidas, reportar inválidas). Opcional `strict` (si hay un error, no persistir nada).

---

### 3.2 Manejo de errores parciales

**Respuesta estándar (HTTP 207 Multi-Status):**

```typescript
interface BulkImportResult<T> {
  total: number;           // Filas procesadas
  created: number;         // Filas creadas exitosamente
  failed: number;          // Filas que fallaron
  mode: 'partial' | 'strict';
  createdIds?: string[];   // IDs creados (opcional)
  errors: BulkRowError[];  // Errores por fila
  reportCsv?: string;      // CSV con reporte (opcional, para descargar)
}

interface BulkRowError {
  row: number;             // Número de fila (1-based, incluyendo header)
  data: Record<string, unknown>;  // Datos de la fila
  message: string;         // Mensaje de error
  field?: string;          // Campo que falló (si aplica)
}
```

- Si `failed === 0` y `created > 0` → éxito total.
- Si `failed > 0` y `created > 0` → éxito parcial (modo `partial`).
- Si `failed === total` → fallo total (o en modo `strict` todo falla).

---

## 4. Especificación de endpoints REST

### Resumen de endpoints

| Método | Ruta | Entidad | Rol |
|--------|------|---------|-----|
| POST | `/clubs/bulk` | Clubs | SECRETARY |
| POST | `/club/members/bulk` | Members | Club authority |
| POST | `/users/bulk` | Users | SECRETARY |
| POST | `/events/bulk` | Events | SECRETARY, PRESIDENT |
| POST | `/club/projects/bulk` | Projects | Club authority |
| POST | `/opportunities/bulk` | Opportunities | SECRETARY |
| POST | `/meetings/bulk` | Meetings | SECRETARY |
| POST | `/meetings/:id/participants/bulk` | Meeting participants | SECRETARY |
| POST | `/district/committees/:id/members/bulk` | Committee members | SECRETARY |

### Query params opcionales (comunes)

- `mode=partial|strict` — default: `partial`
- `dryRun=true` — solo validar, no persistir (opcional)

### Plantillas descargables

- `GET /clubs/bulk/template` → `plantilla-clubes.csv`
- `GET /club/members/bulk/template` → `plantilla-socios.csv`
- `GET /users/bulk/template` → `plantilla-usuarios.csv`
- `GET /events/bulk/template` → `plantilla-eventos.csv`
- `GET /club/projects/bulk/template` → `plantilla-proyectos.csv`
- `GET /opportunities/bulk/template` → `plantilla-oportunidades.csv`
- `GET /meetings/bulk/template` → `plantilla-reuniones.csv`
- `GET /meetings/:id/participants/bulk/template` → `plantilla-participantes-reunion.csv`
- `GET /district/committees/:id/members/bulk/template` → `plantilla-integrantes-comite.csv`

Todos devuelven `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="...csv"` con BOM UTF-8 para Excel.

---

## 5. Formato CSV estándar (UTF-8)

- **Encoding:** UTF-8 con BOM (`\uFEFF`) al inicio del archivo (para Excel).
- **Separador:** coma (`,`).
- **Comillas:** dobles (`"`) para campos que contengan coma, salto de línea o comillas.
- **Salto de línea:** `\n` (LF). CRLF también aceptado.
- **Header:** primera fila con nombres de columnas exactos (case-sensitive).
- **Valores booleanos:** `true`, `false` (o vacío para default).
- **Fechas:** `YYYY-MM-DD` o ISO 8601 para datetime.
- **Campos vacíos:** dejar vacío entre comas `,,` o `,"",`.

---

## 6. Ubicación de implementación

### Backend (apps/api/src/)

```
apps/api/src/
├── common/
│   ├── bulk/
│   │   ├── bulk.module.ts
│   │   ├── csv-parser.service.ts      # Parse UTF-8 CSV
│   │   ├── bulk-validator.service.ts  # Validación genérica por fila
│   │   ├── bulk-result.types.ts       # BulkImportResult, BulkRowError
│   │   └── index.ts
│   └── ...
├── clubs/
│   ├── clubs.controller.ts            # + POST bulk, GET bulk/template
│   └── clubs.service.ts               # + bulkImport()
├── club-members/
│   ├── club-members.controller.ts     # + POST bulk, GET bulk/template
│   └── club-members.service.ts        # + bulkImport(clubId, rows)
├── users/
│   ├── users.controller.ts            # + POST bulk, GET bulk/template (o auth)
│   └── users.service.ts               # + bulkCreate()
├── events/
│   └── ...
├── club-projects/
│   └── ...
├── opportunities/
│   └── ...
├── meetings/
│   └── ...
└── district/committees/
    └── ...
```

### Frontend (apps/web/)

```
apps/web/
├── public/
│   └── templates/           # Opcional: templates estáticos
│       ├── plantilla-clubes.csv
│       └── ...
├── src/
│   ├── components/
│   │   └── bulk-import/
│   │       ├── BulkImportModal.tsx    # Modal reutilizable
│   │       ├── BulkImportDropzone.tsx # Drag & drop CSV
│   │       ├── BulkImportReport.tsx   # Tabla errores/éxitos
│   │       └── useBulkImport.ts       # Hook para upload + estado
│   └── app/
│       ├── admin/clubs/page.tsx       # + botón "Importar CSV"
│       ├── (club)/club/socios/page.tsx
│       ├── admin/eventos/page.tsx
│       └── ...
```

---

## 7. Experiencia de usuario (UX)

### 7.1 Flujo en pantalla

1. Usuario hace clic en "Importar CSV" / "Carga masiva".
2. Se abre modal con:
   - Link "Descargar plantilla" → llama a `GET .../bulk/template`.
   - Zona de drag & drop o input file para subir CSV.
   - Opción "Modo estricto" (checkbox): si hay errores, no se crea nada.
3. Al subir archivo:
   - Loading con mensaje "Validando y procesando...".
   - Llamada `POST .../bulk` con `multipart/form-data`.
4. Resultado:
   - Si todo OK: mensaje "X registros creados correctamente" + cierre modal + refetch listado.
   - Si hay errores parciales: panel "Reporte de importación" con:
     - Resumen: "Y creados, Z con errores".
     - Tabla de errores: fila, datos, mensaje.
     - Botón "Descargar reporte CSV" (si el backend lo incluye).
   - Si todo falló: mensaje de error global + lista de errores.

### 7.2 Estados y feedback

| Estado | UI |
|--------|-----|
| Idle | Botón "Importar CSV", link plantilla |
| Uploading | Spinner, "Procesando archivo..." |
| Success (full) | Toast verde "X registros importados" |
| Success (partial) | Modal con reporte, opción descargar |
| Error (total) | Toast rojo + mensaje, opción ver detalles |
| Error (network) | Toast "Error de conexión. Reintentar." |

### 7.3 Errores por fila

En el reporte se muestra:
- Número de fila.
- Valores de la fila (truncados si son largos).
- Mensaje de error legible (ej. "Email duplicado", "Club con código X ya existe", "Formato de fecha inválido").

---

## 8. Consideraciones de seguridad y auditoría

- **Autorización:** Cada endpoint valida rol/permiso antes de procesar.
- **Límite de filas:** Opcional `maxRows=500` (configurable) para evitar DoS.
- **Tamaño de archivo:** Límite 5 MB por defecto (multer).
- **Auditoría:** Registrar en AuditLog: acción `BULK_IMPORT`, entidad, actor, total/failed/created.

---

## 9. Orden recomendado de desarrollo

| Fase | Entidades | Dependencias |
|------|-----------|--------------|
| 1 | Clubs, Members | CsvParser, BulkResult types |
| 2 | Usuarios | Auth/invite flow |
| 3 | Eventos, Proyectos | - |
| 4 | Oportunidades | - |
| 5 | Reuniones, Participantes, Comité miembros | - |

---

## 10. Criterios de aceptación

- [ ] Todos los endpoints bulk responden 207 con `BulkImportResult`.
- [ ] Archivos CSV se interpretan con UTF-8.
- [ ] Plantillas descargables incluyen header + 1 fila de ejemplo.
- [ ] Errores parciales se reportan por fila con mensaje claro.
- [ ] Modo `strict` aborta si hay al menos un error.
- [ ] Frontend muestra reporte de importación y permite descargar plantilla.
- [ ] Auditoría registra imports masivos.
- [ ] Límite de filas y tamaño de archivo configurados.

---

## 11. Qué dejar fuera del MVP bulk

- Importación de reportes (contentJson complejo).
- Importación de temas de agenda.
- Modo dry-run en UI (backend puede tenerlo).
- Progreso en tiempo real (upload grande) — suficiente con loading simple.
- Soporte XLSX — solo CSV en MVP.
- Importación "actualizar existentes" (upsert) — solo create en MVP.
