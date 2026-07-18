import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedProfiles = ['admin', 'supervisor', 'gerente_originacao', 'comprador'];
    const isAdmin = user.role === 'admin';
    const hasProfile = allowedProfiles.includes(user.profile);

    if (!isAdmin && !hasProfile) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { month, filial, allByFilial } = body;

    let records;
    if (allByFilial) {
      records = await base44.asServiceRole.entities.IndiretosCost.filter({ filial }, '-created_date', 500);
    } else {
      records = await base44.asServiceRole.entities.IndiretosCost.filter({ month, filial }, '-created_date', 200);
    }

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});