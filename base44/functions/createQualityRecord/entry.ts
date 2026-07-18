import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedProfiles = ['qualidade', 'analista_qualidade', 'classificador'];
    const isAdmin = user.role === 'admin';
    const hasProfile = allowedProfiles.includes(user.profile);

    if (!isAdmin && !hasProfile) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data || !data.sample || !data.date) {
      return Response.json({ error: 'Missing required fields: sample, date' }, { status: 400 });
    }

    const newQuality = await base44.asServiceRole.entities.Quality.create(data);

    // Log transaction
    base44.asServiceRole.entities.TransactionLog.create({
      entity_type: 'Quality',
      entity_id: newQuality.id,
      action: 'create',
      data_before: null,
      data_after: newQuality,
      user_email: user.email,
      user_name: user.full_name,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({ success: true, record: newQuality });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});