import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipients, subject, body } = await req.json();
  if (!recipients || !recipients.length) {
    return Response.json({ error: 'No recipients' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    recipients.map(to =>
      base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return Response.json({ sent, failed, total: recipients.length });
});