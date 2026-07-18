import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_base64, file_type, file_name } = await req.json();
    if (!file_base64) return Response.json({ error: 'Arquivo não enviado' }, { status: 400 });

    // Converte base64 para File
    const binaryStr = atob(file_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const file = new File([bytes], file_name || 'document.pdf', { type: file_type });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Uma única chamada LLM que faz tudo de uma vez
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analise este documento e extraia TODOS os registros encontrados.

Para cada registro, extraia:
- data: data no formato DD/MM/AAAA (se não houver, deixe vazio)
- nome: nome completo da pessoa (se não houver, deixe vazio)
- quantidade_kg: quantidade em KG como número (apenas o número, sem unidade; se a quantidade estiver em sacos ou outra unidade, converta ou registre o valor como está)
- cpf: CPF da pessoa (se não houver, deixe vazio)

Retorne TODOS os registros encontrados no documento. Também retorne um campo "texto_bruto" com a transcrição completa do conteúdo do documento.`,
      file_urls: [file_url],
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          texto_bruto: { type: "string" },
          registros: {
            type: "array",
            items: {
              type: "object",
              properties: {
                data: { type: "string" },
                nome: { type: "string" },
                quantidade_kg: { type: "string" },
                cpf: { type: "string" },
              },
            },
          },
        },
      },
    });

    return Response.json({
      rawText: result?.texto_bruto || "",
      registros: result?.registros || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});