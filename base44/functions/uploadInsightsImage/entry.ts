import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apenas jjancem@gmail.com e jose.j.santos@ofi.com podem usar
        const allowedEmails = ['jjancem@gmail.com', 'jose.j.santos@ofi.com'];
        if (!allowedEmails.includes(user.email)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { imageData, fileName } = await req.json();

        if (!imageData) {
            return Response.json({ error: 'No image data provided' }, { status: 400 });
        }

        console.log('📤 Backend recebeu imagem base64');

        // Converter base64 para Uint8Array
        const binaryString = atob(imageData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('📤 Bytes criados:', bytes.length, 'bytes');

        // Criar File object (não Blob)
        const file = new File([bytes], fileName || 'insights.png', { type: 'image/png' });

        console.log('📤 File criado:', file.size, 'bytes');

        // Upload usando o SDK com asServiceRole
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        console.log('✅ Upload completo:', uploadResult.file_url);

        return Response.json({ file_url: uploadResult.file_url });
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});