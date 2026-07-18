import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAllowed =
      user.role === 'admin' ||
      user.profile === 'comprador' ||
      user.profile === 'supervisor' ||
      user.profile === 'gerente_originacao';

    if (!isAllowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data) {
      return Response.json({ error: 'data é obrigatório' }, { status: 400 });
    }

    // Injeta o nome do usuário real antes de criar (asServiceRole sobrescreve created_by_id)
    const dataWithCreator = {
      ...data,
      created_by_name: data.created_by_name || user.full_name || user.email,
    };

    // Usa asServiceRole para ignorar RLS na criação
    const newSchedule = await base44.asServiceRole.entities.Scheduling.create(dataWithCreator);

    return Response.json({ success: true, schedule: newSchedule });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});