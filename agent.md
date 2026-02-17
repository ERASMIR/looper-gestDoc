# Looper GestDoc — Agent Context

## Proyecto
- **Tipo:** Azure Function App (Node.js v4, ESM)
- **Azure URL:** https://looper-gestdoc.azurewebsites.net
- **GitHub:** https://github.com/ERASMIR/looper-gestDoc.git (branch: master)
- **Puerto local:** 7072 (`func start --port 7072`)
- **Version tag:** v1.0-deploy-2026-02-16

## Arquitectura
```
looper-gestDoc/
├── host.json
├── local.settings.json          # gitignored
├── package.json                 # type: "module"
└── src/
    ├── db/
    │   ├── conexiones.js        # Pool MySQL (mysql2/promise, SSL)
    │   └── gestDocConsultas.js   # Todas las queries
    └── functions/
        └── gestDoc.js           # Todos los handlers HTTP
```

## Endpoints (4 funciones)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/listarArchivos?tipo=&usuario=&empresa= | Listar archivos (matriz/ventas) |
| GET | /api/listarReportesRep?usuario=&empresa= | Listar reportes generados |
| GET | /api/listarReporteMateriales?usuarioId=&empresaId=&mesInicio=&anioInicio=&mesFin=&anioFin= | Datos para dashboard |
| DELETE | /api/eliminarArchivo?id=&tipo=&usuario=&empresa= | Soft-delete archivo |

## Control de acceso por roles
Patron consistente en todos los endpoints:
1. Sanitizar params (rechazar "undefined", "null", "")
2. `obtenerPerfilUsuario(usuario)` → 403 si no existe
3. Determinar `empresaEfectiva` (validar con `usuarioTieneEmpresa()`)
4. Aplicar reglas por rol:
   - **rol 1 (admin):** ve todos los archivos de su empresa
   - **rol 2 (REP):** solo sus propios archivos, dentro de su empresa
   - **rol 3 (dev):** acceso total, cross-empresa
5. REP no puede eliminar archivos (403 explicito)

## Base de datos
- Misma BD MySQL que looper-usuarios (looper)
- **Tablas:**
  - `matriz_materiales` — archivos de matriz subidos
  - `registro_ventas` — archivos de ventas subidos
  - `reporte_rep` — reportes generados (con result_reporte JSON)
  - `datos_usuarios` — para obtener perfil y nombre
  - `usuario_empresa` — para validar acceso a empresa
- **Columnas comunes:** id, id_usuario, empresa_id, nombre_archivo, fecha_carga, url_web, url_carga, eliminado, eliminado_por, eliminado_fecha
- **Soft deletes:** siempre `eliminado = 1`, nunca hard delete

## Variables de entorno
- DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

## Deploy
```bash
func azure functionapp publish looper-gestdoc
```
