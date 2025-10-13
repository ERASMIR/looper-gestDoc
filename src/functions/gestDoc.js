import { app } from '@azure/functions';
import { obtenerPerfilUsuario, obtenerArchivos, obtenerReportesRep, eliminarArchivo, obtenerReporteMateriales} from '../db/gestDocConsultas.js';



app.http('listarArchivos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    try {
      const tipo = req.query.get("tipo") || "matriz";

      const rawEmpresa = req.query.get('empresa');
      const empresa = rawEmpresa && rawEmpresa !== 'undefined' && rawEmpresa !== 'null' && rawEmpresa !== '' ? rawEmpresa : null;

      // Sanea usuario
      const rawUser = req.query.get('usuario');
      const usuario = (rawUser && rawUser !== 'undefined' && rawUser !== 'null' && rawUser !== '')
        ? rawUser
        : null;
                 
      context.log('📥 listarArchivos params:', {
        tipo,
        usuario,
        //rawUser,
        empresa,
        //usuarioFinal: usuario
      });




      // 🔹 Traemos el perfil del usuario
      const perfilData = usuario ? await obtenerPerfilUsuario(usuario) : null;
      if (!perfilData) {
        return {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: "Usuario no válido o sin perfil asignado" }),
        };
      }


      // ⚠️ Normalizamos tipos
      const rol = Number(perfilData.id_perfil_usuario);   // 1=admin, 2=REP, 3=dev
      const empresaPerfil = Number(perfilData.empresa_id) || null;

      context.log('👤 perfilData:', { rol, empresaPerfil, raw: perfilData });


      //const { id_perfil_usuario, empresa_id } = perfilData;

      // 🔹 Ajustamos filtros según perfil
      //let empresaFinal = null;
      //let usuarioFinal = null;
      //let empresaFinal = empresa;
      //let usuarioFinal = usuario;


      // Ajuste de filtros según perfil
      let empresaFinal = null;
      let usuarioFinal = null;

      if (rol === 1) {                 // admin → toda su empresa
        empresaFinal = empresaPerfil;
        usuarioFinal = null;
      } else if (rol === 2) {          // REP → solo sus archivos dentro de su empresa
        empresaFinal = empresaPerfil;  // 🔒 NO usar el query param
        usuarioFinal = usuario;
      } else if (rol === 3) {          // dev → sin filtros (ve todo)
        empresaFinal = null;
        usuarioFinal = null;
      } else {
        // Rol desconocido → por defecto, restricción mínima razonable
        empresaFinal = empresaPerfil ?? null;
        usuarioFinal = usuario ?? null;
      }

      context.log('🧪 filtros calculados:', { empresaFinal, usuarioFinal });




      // Llamada con ambos parámetros
      const archivos = await obtenerArchivos(tipo, usuarioFinal, empresaFinal);

      context.log('📤 listarArchivos resultado DB:', archivos?.[tipo]?.[0]);

      context.log('📤 listarArchivos resultado DB (resumen):', {
        tipo,
        count: Array.isArray(archivos?.[tipo]) ? archivos[tipo].length : 0
      });

      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(archivos),
      };
    } catch (err) {
      //context.log("❌ listarArchivos error:", err);
      console.error("❌ listarArchivos error:", err);
      //context.log("❌ listarArchivos error:", err.message);
      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message }),
      };
    }
  }
});





app.http('listarReportesRep', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    try {
      context.log("📢 Ejecutando listarReportesRep...");

      const rawUser = req.query.get("usuario");
      const usuario = rawUser && rawUser !== 'undefined' && rawUser !== 'null' && rawUser !== '' 
        ? rawUser 
        : null;

      const rawEmpresa = req.query.get("empresa");
      const empresa = rawEmpresa && rawEmpresa !== 'undefined' && rawEmpresa !== 'null' && rawEmpresa !== '' 
        ? rawEmpresa 
        : null;

      context.log('📥 listarReportesRep params:', { usuario, empresa });

      // 🔹 Traemos el perfil del usuario
      const perfilData = usuario ? await obtenerPerfilUsuario(usuario) : null;
      if (!perfilData) {
        return {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: "Usuario no válido o sin perfil asignado" }),
        };
      }

      // ⚠️ Normalizamos
      const rol = Number(perfilData.id_perfil_usuario);   // 1=admin, 2=REP, 3=dev
      const empresaPerfil = Number(perfilData.empresa_id) || null;

      context.log('👤 perfilData:', { rol, empresaPerfil, raw: perfilData });

      // 🔹 Ajustamos filtros según perfil
      let empresaFinal = null;
      let usuarioFinal = null;

      if (rol === 1) {                 // admin → todos los reportes de su empresa
        empresaFinal = empresaPerfil;
        usuarioFinal = null;
      } else if (rol === 2) {          // REP → solo sus reportes
        empresaFinal = empresaPerfil;  // 🔒 siempre su empresa, no el query param
        usuarioFinal = usuario;
      } else if (rol === 3) {          // dev → ve todo
        empresaFinal = null;
        usuarioFinal = null;
      } else {
        // rol desconocido → restricción mínima razonable
        empresaFinal = empresaPerfil ?? null;
        usuarioFinal = usuario ?? null;
      }

      context.log('🧪 filtros calculados:', { empresaFinal, usuarioFinal });

      // 🔹 Llamamos con los filtros correctos
      const reportes = await obtenerReportesRep(usuarioFinal, empresaFinal);

      context.log("📤 listarReportesRep ejemplo", reportes?.[0])

      context.log("✅ Reportes obtenidos:", { count: Array.isArray(reportes) ? reportes.length : 0 });

      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(reportes),
      };

    } catch (err) {
      context.log("❌ Error en listarReportesRep:", err);
      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message, stack: err.stack }),
      };
    }
  }
});








// 🗑️ ELIMINAR ARCHIVO
app.http('eliminarArchivo', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    try {

      context.log("📢 Ejecutando eliminarArchivo...");
      const body = await req.json().catch(() => ({}));

      const id = req.query.get('id') || body.id;
      const tipo = req.query.get('tipo') || body.tipo;
      const usuario = req.query.get('usuario') || body.usuario || null;
      const empresa = req.query.get('empresa') || body.empresa || null;

      if (!id || !tipo || !usuario) {
        return { status: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Faltan parámetros requeridos' }) };
      }

      
      // 🔹 Traemos el perfil del usuario
      const perfilData = usuario ? await obtenerPerfilUsuario(usuario) : null;
      if (!perfilData) {
        return {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: "Usuario no válido o sin perfil asignado" }),
        };
      }


      const { id_perfil_usuario, empresa_id } = perfilData;


      // 🔹 Validamos permisos para eliminar
      if (id_perfil_usuario === 2) { // usuarioREP
        return {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: "No tienes permisos para eliminar archivos" }),
        };
      }



      // 🔹 Ajustamos filtros según perfil
      let empresaFinal = empresa;
      let usuarioFinal = usuario;

      if (id_perfil_usuario === 1) { // admin
        empresaFinal = empresa_id; // solo su empresa
      } else if (id_perfil_usuario === 3) { // dev
        // puede eliminar todo → no filtramos nada
        empresaFinal = null;
        usuarioFinal = null;
      }

      const resultado = await eliminarArchivo(id, tipo, empresaFinal, usuarioFinal);

      if (resultado.affectedRows === 0) {
        return {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'No se encontró el archivo o no pertenece a la empresa' }),
        };
      }


      return { status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true }) };
    } catch (err) {
      context.log("❌ Error en eliminarArchivo:", err);
      return { status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
    }
  }
});





app.http('listarReporteMateriales', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req, context) => {
    try {
      context.log("📢 Ejecutando listarReporteMateriales...");

      // 🧭 Parámetros desde el query
      const usuarioId = req.query.get("usuarioId") || null;
      const empresaId = req.query.get("empresaId") || null;
      const mesInicio = Number(req.query.get("mesInicio")) || null;
      const anioInicio = Number(req.query.get("anioInicio")) || null;
      const mesFin = Number(req.query.get("mesFin")) || null;
      const anioFin = Number(req.query.get("anioFin")) || null;

      context.log('📥 Params listarReporteMateriales:', {
        usuarioId, empresaId, mesInicio, anioInicio, mesFin, anioFin
      });

      // 🔹 Traemos el perfil del usuario
      const perfilData = usuarioId ? await obtenerPerfilUsuario(usuarioId) : null;
      if (!perfilData) {
        return {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: "Usuario no válido o sin perfil asignado" }),
        };
      }

      // ⚙️ Normalizamos perfil
      const rol = Number(perfilData.id_perfil_usuario); // 1=admin, 2=REP, 3=dev
      const empresaPerfil = Number(perfilData.empresa_id) || null;
      context.log('👤 perfilData:', { rol, empresaPerfil });

      // 🔒 Filtros según rol
      let empresaFinal = null;
      let usuarioFinal = null;

      if (rol === 1) { // admin → toda su empresa
        empresaFinal = empresaPerfil;
        usuarioFinal = null;
      } else if (rol === 2) { // REP → solo sus reportes
        empresaFinal = empresaPerfil;
        usuarioFinal = usuario;
      } else if (rol === 3) { // dev → ve todo
        empresaFinal = null;
        usuarioFinal = null;
      } else {
        empresaFinal = empresaPerfil ?? null;
        usuarioFinal = usuario ?? null;
      }

      context.log('🧪 filtros calculados:', { empresaFinal, usuarioFinal });

      // 🔹 Ejecutamos consulta con rango de fechas
      const reportes = await obtenerReporteMateriales(
        usuarioFinal,
        empresaFinal,
        mesInicio,
        anioInicio,
        mesFin,
        anioFin
      );

      context.log("📤 listarReporteMateriales ejemplo:", reportes?.[0]);

      // ✅ Devolvemos resultado
      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(reportes),
      };

    } catch (err) {
      context.log("❌ Error en listarReporteMateriales:", err);
      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message, stack: err.stack }),
      };
    }
  }
});
