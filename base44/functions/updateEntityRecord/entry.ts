import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_PROFILES_UPDATE = {
  Scheduling: ['supervisor', 'operador', 'op_balanca', 'analista_qualidade', 'qualidade', 'gerente_originacao', 'comprador', 'classificador'],
  Transfer2082: ['supervisor', 'operador', 'op_balanca', 'analista_qualidade', 'qualidade', 'gerente_originacao', 'classificador', 'comprador'],
  TransferDeposit: ['supervisor', 'qualidade', 'analista_qualidade', 'classificador'],
  MoegaAnterior: ['qualidade', 'analista_qualidade', 'classificador'],
  Quality: ['qualidade', 'analista_qualidade', 'classificador', 'gerente_originacao', 'supervisor'],
  IndiretosCost: ['supervisor', 'gerente_originacao', 'comprador'],
};

const ALLOWED_PROFILES_DELETE = {
  TecnicoSustentabilidade: ['gerente_sustentabilidade'],
  IndiretosCost: ['supervisor', 'gerente_originacao'],
};

const ALLOWED_PROFILES_CREATE = {
  Transfer2082: ['supervisor'],
  TransferDeposit: ['supervisor', 'qualidade', 'analista_qualidade', 'classificador'],
  MoegaAnterior: ['qualidade', 'analista_qualidade', 'classificador'],
  IndiretosCost: ['supervisor', 'gerente_originacao', 'comprador'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity, id, data, action = 'update' } = await req.json();

    if (!entity || !data) {
      return Response.json({ error: 'Missing required fields: entity, data' }, { status: 400 });
    }

    // Fetch full user data including custom fields (profile)
    const fullUser = await base44.asServiceRole.entities.User.get(user.id).catch(() => user);
    const userProfile = fullUser?.profile || user?.profile;
    const isAdmin = user.role === 'admin';

    if (action === 'delete') {
      if (!id) {
        return Response.json({ error: 'Missing required field: id' }, { status: 400 });
      }
      const allowedDel = ALLOWED_PROFILES_DELETE[entity];
      if (!allowedDel) {
        return Response.json({ error: 'Invalid entity for delete' }, { status: 400 });
      }
      if (!isAdmin && !allowedDel.includes(userProfile)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.asServiceRole.entities[entity].delete(id);
      base44.asServiceRole.entities.TransactionLog.create({
        entity_type: entity,
        entity_id: id,
        action: 'delete',
        user_email: user.email,
        user_name: user.full_name,
        timestamp: new Date().toISOString()
      }).catch(() => {});
      return Response.json({ success: true });
    }

    if (action === 'create') {
      const allowed = ALLOWED_PROFILES_CREATE[entity];
      if (!allowed) {
        return Response.json({ error: 'Invalid entity for create' }, { status: 400 });
      }
      if (!isAdmin && !allowed.includes(userProfile)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const created = await base44.asServiceRole.entities[entity].create(data);
      base44.asServiceRole.entities.TransactionLog.create({
        entity_type: entity,
        entity_id: created.id,
        action: 'create',
        data_after: data,
        user_email: user.email,
        user_name: user.full_name,
        timestamp: new Date().toISOString()
      }).catch(() => {});
      return Response.json({ success: true, id: created.id });
    }

    // Coerce string fields that may arrive as numbers
    if (entity === 'Scheduling' && data) {
      const stringFields = ['balancinha', 'amostragem', 'duplo', 'nibs', 'po',
        'amostragem_devolvida', 'duplo_devolvido', 'nibs_devolvido', 'po_devolvido'];
      for (const f of stringFields) {
        if (data[f] !== undefined && data[f] !== null && typeof data[f] !== 'string') {
          data[f] = String(data[f]);
        }
      }
    }

    // action === 'update'
    if (!id) {
      return Response.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const allowed = ALLOWED_PROFILES_UPDATE[entity];
    if (!allowed) {
      return Response.json({ error: 'Invalid entity' }, { status: 400 });
    }

    if (!isAdmin && !allowed.includes(userProfile)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities[entity].update(id, data);

    // Log transaction
    base44.asServiceRole.entities.TransactionLog.create({
      entity_type: entity,
      entity_id: id,
      action: 'update',
      data_after: data,
      user_email: user.email,
      user_name: user.full_name,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});