import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tecnicoEmail = user.email;

    // Buscar todas as atribuições via service role e filtrar pelo email do técnico
    let allAtribuicoes = [];
    let skipA = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FazendaAtribuicao.list('created_date', 5000, skipA);
      allAtribuicoes = [...allAtribuicoes, ...batch];
      if (batch.length < 5000) break;
      skipA += 5000;
    }

    const atribuicoes = allAtribuicoes.filter(a => a.tecnico_email === tecnicoEmail);

    console.log(`getTecnicoProdutores: user=${tecnicoEmail}, total_atrib=${allAtribuicoes.length}, filtradas=${atribuicoes.length}`);

    if (atribuicoes.length === 0) {
      return Response.json({ produtores: [], atribuicoes: [] });
    }

    // IDs únicos dos produtores atribuídos
    const produtorIds = [...new Set(atribuicoes.map(a => a.produtor_id).filter(Boolean))];

    // Buscar todos os produtores via service role com paginação (bypass do RLS)
    let allProdutores = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Produtor.list('nome', 5000, skip);
      allProdutores = [...allProdutores, ...batch];
      if (batch.length < 5000) break;
      skip += 5000;
    }

    // Filtrar apenas os atribuídos ao técnico
    const produtores = allProdutores.filter(p => produtorIds.includes(p.id));

    // Buscar link de envio de documentos via service role (bypass RLS)
    const configs = await base44.asServiceRole.entities.SustentabilidadeConfig.list('config_key', 100);
    const docLinkConfig = configs.find(c => c.config_key === 'link_envio_documentos' && c.enabled && c.value);
    const docLink = docLinkConfig?.value || null;

    console.log(`getTecnicoProdutores: ${produtorIds.length} IDs, ${allProdutores.length} total produtores, ${produtores.length} encontrados, docLink=${docLink}`);

    return Response.json({ produtores, atribuicoes, docLink });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});