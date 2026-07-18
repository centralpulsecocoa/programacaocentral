import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lineConfigs = await base44.asServiceRole.entities.AppConfig.filter({ config_type: 'line' }, 'name', 200);
    const warehouseConfigs = await base44.asServiceRole.entities.AppConfig.filter({ config_type: 'warehouse' }, 'name', 50);

    return Response.json({ lineConfigs, warehouseConfigs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});