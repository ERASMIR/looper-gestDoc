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


