import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, action, data_before, data_after, notes } = await req.json();

    // Calcular campos alterados (apenas para updates)
    let changed_fields = [];
    if (action === 'update' && data_before && data_after) {
      changed_fields = Object.keys(data_after).filter(key => {
        return JSON.stringify(data_before[key]) !== JSON.stringify(data_after[key]);
      });
    }

    // Criar registro de transação
    const transactionLog = await base44.asServiceRole.entities.TransactionLog.create({
      entity_type,
      entity_id,
      action,
      data_before: data_before || null,
      data_after: data_after || null,
      changed_fields,
      user_email: user.email,
      user_name: user.full_name,
      timestamp: new Date().toISOString(),
      notes: notes || null
    });

    return Response.json({ success: true, log_id: transactionLog.id });
  } catch (error) {
    console.error('Error logging transaction:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});