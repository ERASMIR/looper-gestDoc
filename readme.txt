========================================
 LOOPER-GESTDOC
 Azure Function App (Node.js)
========================================

Descripcion:
  Microservicio de gestion documental. Consulta, listado y eliminacion
  de archivos (matriz, ventas, reportes) almacenados en Google Drive.
  Desplegado en: https://looper-gestdoc.azurewebsites.net

Endpoints:
  GET    /api/listarArchivos?tipo=&usuario=&empresa=   - Listar archivos por tipo (matriz/ventas)
  GET    /api/listarReportesRep?usuario=&empresa=      - Listar reportes generados
  GET    /api/listarReporteMateriales?usuarioId=&empresaId=&mesInicio=&anioInicio=&mesFin=&anioFin=  - Datos para dashboard de materiales
  DELETE /api/eliminarArchivo?id=&tipo=&usuario=&empresa=  - Eliminar archivo

Archivos principales:
  src/functions/gestDoc.js          - Handlers HTTP
  src/db/gestDocConsultas.js        - Queries a MySQL (archivos, reportes, perfiles)
  src/db/conexiones.js              - Pool de conexion MySQL

Variables de entorno requeridas:
  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME   - Conexion a MySQL

Version desplegada: v1.0-deploy-2026-02-16
Puerto local: 7072 (func start --port 7072)
