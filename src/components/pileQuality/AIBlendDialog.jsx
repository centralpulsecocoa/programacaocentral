import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

export default function AIBlendDialog({ open, onClose, records }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const activePiles = records.filter(
    (r) => r.status === "ativa" && r.current_balance > 0
  );

  const pilesContext = activePiles.map((p) => ({
    lote: p.pile_lot,
    origem: p.origin,
    saldo: p.current_balance,
    ffa: p.last_ffa ?? p.formation_ffa,
    umidade: p.last_moisture ?? p.formation_moisture,
  }));

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult(null);

    const systemContext = `
Você é um especialista em blending de cacau. Com base nos lotes ativos abaixo, responda à solicitação do usuário com uma sugestão técnica e precisa de blend.

Lotes disponíveis:
${JSON.stringify(pilesContext, null, 2)}

Ao sugerir um blend, apresente a resposta de forma limpa e direta, SEM mostrar cálculos intermediários ou memorial de cálculo. Inclua apenas:
- Os lotes sugeridos (nome, origem, quantidade em toneladas e % do blend)
- O FFA resultante final do blend
- Uma breve justificativa técnica
- Confirmação se os saldos são suficientes
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nSolicitação do usuário: ${prompt}`,
    });

    setResult(response);
    setIsLoading(false);
  };

  const handleClose = () => {
    setPrompt("");
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#860063]">
            <Sparkles className="w-5 h-5 text-[#F88D2A]" />
            IA Blend — Sugestão Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 border border-[#860063]/20 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              🤖 Descreva o blend que você precisa e a IA irá sugerir os lotes ideais com base no estoque atual.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {activePiles.length} lote{activePiles.length !== 1 ? "s" : ""} ativo{activePiles.length !== 1 ? "s" : ""} disponível{activePiles.length !== 1 ? "is" : ""}.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Descreva o blend desejado</Label>
            <Textarea
              className="h-28 resize-none"
              placeholder={`Exemplos:\n• "Preciso de 200T com FFA ≤ 1.75, priorizando Bahia e Pará"\n• "Qual o melhor blend para 150T com o menor FFA possível?"\n• "Sugira um blend usando origens africanas, máximo 100T"`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAsk}
            disabled={!prompt.trim() || isLoading}
            className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando estoque e calculando blend...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Sugestão com IA
              </>
            )}
          </Button>

          {result && (
            <div className="border border-[#860063]/20 rounded-lg p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#F88D2A]" />
                <span className="font-semibold text-[#860063] text-sm">Sugestão da IA</span>
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {result}
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}