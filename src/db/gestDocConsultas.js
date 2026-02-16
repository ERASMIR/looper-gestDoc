import { pool } from './conexiones.js';
import { v4 as uuidv4 } from 'uuid';


export async function obtenerPerfilUsuario(usuarioId) {
  const [rows] = await pool.query(
    `SELECT id_perfil_usuario, empresa_id
     FROM datos_usuarios
     WHERE id = ?`,
    [usuarioId]
  );
  return rows.length ? rows[0] : null;
}

// Verifica si el usuario tiene acceso a la empresa seleccionada
export async function usuarioTieneEmpresa(usuarioId, empresaId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM usuario_empresa WHERE usuario_id = ? AND empresa_id = ?`,
    [usuarioId, empresaId]
  );
  return rows.length > 0;
}




export async function obtenerArchivos(tipo = null, usuarioId = null, empresaId = null) {
  const filtros = ['t.eliminado = 0'];
  const params = [];

  if (empresaId) {
    filtros.push('t.empresa_id = ?');
    params.push(empresaId);

    if (usuarioId != null) {
      filtros.push('t.id_usuario = ?');
      params.push(usuarioId);
    }
  } else if (usuarioId != null) {
    filtros.push('t.id_usuario = ?');
    params.push(usuarioId);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  let query;
  if (tipo === 'matriz') {
    query = `
      SELECT 
        t.id,
        t.id_usuario,
        t.empresa_id,
        t.nombre_archivo AS nombre,
        t.url_carga AS url,
        t.url_web,
        t.fecha_carga,
        t.tamano_archivo AS size,
        CONCAT(u.nombre, ' ', u.apellidos) AS usuario_nombre
      FROM matriz_materiales t
      LEFT JOIN datos_usuarios u ON t.id_usuario = u.id
      ${where}
      ORDER BY t.fecha_carga DESC
    `;
  } else if (tipo === 'ventas') {
    query = `
      SELECT 
        t.id,
        t.id_usuario,
        t.empresa_id,
        t.nombre_archivo AS nombre,
        t.url_carga AS url,
        t.url_web,
        t.fecha_carga,
        t.tamano_archivo AS size,
        CONCAT(u.nombre, ' ', u.apellidos) AS usuario_nombre
      FROM registro_ventas t
      LEFT JOIN datos_usuarios u ON t.id_usuario = u.id
      ${where}
      ORDER BY t.fecha_carga DESC
    `;
  } else {
    return { matriz: [], ventas: [] };
  }

  console.log('🔎 SQL obtenerArchivos:', { tipo, where, params });

  const [rows] = await pool.query(query, params);
  return { [tipo]: rows };
}





export async function obtenerReportesRep(usuarioId = null, empresaId = null) {
  const filtros = ["t.eliminado = 0"];
  const params = [];

  if (empresaId) {
    filtros.push("t.empresa_id = ?");
    params.push(empresaId);

    if (usuarioId != null) {
      filtros.push("t.id_usuario = ?");
      params.push(usuarioId);
    }
  } else if (usuarioId != null) {
    filtros.push("t.id_usuario = ?");
    params.push(usuarioId);
  }

  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

  const query = `
    SELECT 
      t.id,
      t.id_usuario,
      t.empresa_id,
      t.nombre_archivo AS nombre,
      t.fecha_carga,
      t.url_web,
      t.url_carga AS url,
      t.periodo_anio,
      t.periodo_mes,
      t.result_reporte,
      CONCAT(u.nombre, ' ', u.apellidos) AS usuario_nombre
    FROM reporte_rep t
    LEFT JOIN datos_usuarios u ON t.id_usuario = u.id
    ${where}
    ORDER BY t.fecha_carga DESC
  `;

  console.log("🔎 SQL obtenerReportesRep:", { where, params });

  const [rows] = await pool.query(query, params);
  return rows;
}






export async function eliminarArchivo(id, tipo, empresaId, usuarioId = null) {
  try {
    const tableMap = {
      matriz: 'matriz_materiales',
      ventas: 'registro_ventas',
      reportes: 'reporte_rep'
    };

    const table = tableMap[tipo];
    if (!table) {
      throw new Error(`Tipo inválido para eliminar: ${tipo}`);
    }

    // Soft delete validando empresa
    const [result] = await pool.query(
      `UPDATE \`${table}\` 
       SET eliminado = 1, eliminado_por = ?, eliminado_fecha = NOW()
       WHERE id = ? AND empresa_id = ? AND eliminado = 0`,
      [usuarioId, id, empresaId]
    );

    return { affectedRows: result.affectedRows || 0 };
  } catch (err) {
    console.error('❌ Error en eliminarArchivo (DB):', err);
    throw err;
  }
}






export async function obtenerReporteMateriales(usuarioId, empresaId, mesInicio, anioInicio, mesFin, anioFin) {
  try {
    let query = `
      SELECT result_reporte, periodo_mes, periodo_anio
      FROM reporte_rep
      WHERE 1=1
    `;
    const params = [];

    if (usuarioId) {
      query += ` AND id_usuario = ?`;
      params.push(usuarioId);
    }
    if (empresaId) {
      query += ` AND empresa_id = ?`;
      params.push(empresaId);
    }

    // 🔹 Filtro por rango de fechas
    if (mesInicio && anioInicio && mesFin && anioFin) {
      query += `
        AND ((periodo_anio * 12 + periodo_mes) BETWEEN (? * 12 + ?) AND (? * 12 + ?))
      `;
      params.push(anioInicio, mesInicio, anioFin, mesFin);
    }

    query += ` ORDER BY periodo_anio DESC, periodo_mes DESC`;

    const [rows] = await pool.query(query, params);

    // 🔹 Parseamos el JSON
    return rows.map(row => ({
      periodo_mes: row.periodo_mes,
      periodo_anio: row.periodo_anio,
      result_reporte: row.result_reporte // ← dejamos el JSON crudo
    }));

  } catch (error) {
    console.error("❌ Error en obtenerReporteMateriales:", error);
    throw error;
  }
}
