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
      user.profile === 'gerente_originacao' ||
      user.profile === 'qualidade' ||
      user.profile === 'analista_qualidade' ||
      user.profile === 'classificador';

    if (!isAllowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { recordId, data } = body;

    if (!recordId || !data) {
      return Response.json({ error: 'recordId e data são obrigatórios' }, { status: 400 });
    }

    // Usa asServiceRole para ignorar RLS na atualização
    await base44.asServiceRole.entities.Quality.update(recordId, data);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});