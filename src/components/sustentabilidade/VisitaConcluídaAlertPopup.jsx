import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TreePine, X, ClipboardList, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function VisitaConcluidaAlertPopup({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [configs, setConfigs] = useState({});
  const seenConcluidoIds = useRef(new Set());
  const seenChecklistDates = useRef({});
  const seenAtrasadosIds = useRef(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const cfgs = await base44.entities.SustentabilidadeConfig.list("config_key", 100);
        const map = {};
        cfgs.forEach((c) => { map[c.config_key] = c; });
        setConfigs(map);
      } catch (error) {
        if (error.message?.includes('Rate limit')) {
          // Back off and retry after 30s
          setTimeout(loadConfigs, 30000);
        } else {
          console.error('Failed to load sustentabilidade configs:', error);
        }
      }
    };
    loadConfigs();
  }, []);

  useEffect(() => {
    const cfgConcluida = configs["alerta_visita_concluida"];
    const cfgChecklist = configs["alerta_checklist_salvo"];
    const cfgPrazo = configs["alerta_prazo_visita_dias"];

    const anyEnabled = cfgConcluida?.enabled || cfgChecklist?.enabled || cfgPrazo?.enabled;
    if (!anyEnabled) return;

    const poll = async () => {
      try {
        const newAlerts = [];

      if (cfgConcluida?.enabled) {
        const atribuicoes = await base44.entities.FazendaAtribuicao.filter({ status: "concluido" });
        if (!initialized.current) {
          atribuicoes.forEach((a) => seenConcluidoIds.current.add(a.id));
        } else {
          atribuicoes.forEach((a) => {
            if (!seenConcluidoIds.current.has(a.id)) {
              seenConcluidoIds.current.add(a.id);
              newAlerts.push({
                type: "concluida",
                title: "Visita Concluída!",
                icon: "check",
                color: "green",
                produtor_nome: a.produtor_nome,
                tecnico_nome: a.tecnico_nome || a.tecnico_email,
                perfil_visita: a.perfil_visita,
                data_atendimento: a.data_atendimento,
              });
            }
          });
        }
      }

      if (cfgChecklist?.enabled) {
        const checklists = await base44.entities.FazendaChecklist.list("updated_date", 200);
        if (!initialized.current) {
          checklists.forEach((c) => { seenChecklistDates.current[c.id] = c.updated_date; });
        } else {
          checklists.forEach((c) => {
            const prev = seenChecklistDates.current[c.id];
            const isNew = !prev;
            const isUpdated = prev && c.updated_date !== prev;
            if (isNew || isUpdated) {
              seenChecklistDates.current[c.id] = c.updated_date;
              newAlerts.push({
                type: "checklist",
                title: "Checklist Atualizado",
                icon: "clipboard",
                color: "blue",
                produtor_id: c.produtor_id,
                tecnico_email: c.tecnico_email,
              });
            }
          });
        }
      }

      if (cfgPrazo?.enabled) {
        const prazoNum = parseInt(cfgPrazo.value || "30", 10);
        const atribuicoes = await base44.entities.FazendaAtribuicao.list("created_date", 500);
        atribuicoes.forEach((a) => {
          if (a.status === "concluido") return;
          const dias = differenceInDays(new Date(), new Date(a.created_date));
          if (dias >= prazoNum && !seenAtrasadosIds.current.has(a.id)) {
            seenAtrasadosIds.current.add(a.id);
            if (initialized.current) {
              newAlerts.push({
                type: "prazo",
                title: `Prazo Excedido (${dias}d)`,
                icon: "clock",
                color: "orange",
                produtor_nome: a.produtor_nome,
                tecnico_nome: a.tecnico_nome || a.tecnico_email,
                perfil_visita: a.perfil_visita,
                dias,
                prazoNum,
              });
            }
          }
        });
      }

      if (!initialized.current) initialized.current = true;
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...prev, ...newAlerts]);
      }
      } catch (error) {
        if (error.message?.includes('logged in') || error.message?.includes('unauthorized')) {
          console.log('Session expired, stopping polling');
          return;
        }
        if (error.message?.includes('Rate limit')) {
          // Silently skip this poll cycle
          return;
        }
        console.error('Poll error:', error);
      }
    };

    poll();
    const interval = setInterval(poll, 300000);
    return () => clearInterval(interval);
  }, [configs]);

  if (alerts.length === 0) return null;

  const current = alerts[0];
  const dismiss = () => setAlerts((prev) => prev.slice(1));

  const colorMap = {
    green: { bg: "bg-green-50", border: "border-green-400", title: "text-green-700", badge: "bg-green-100 text-green-700", btn: "from-green-700 to-green-600 hover:from-green-800 hover:to-green-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-400", title: "text-blue-700", badge: "bg-blue-100 text-blue-700", btn: "from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700" },
    orange: { bg: "bg-orange-50", border: "border-orange-400", title: "text-orange-700", badge: "bg-orange-100 text-orange-700", btn: "from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600" },
  };
  const c = colorMap[current.color] || colorMap.green;
  const IconComp = current.icon === "check" ? CheckCircle2 : current.icon === "clipboard" ? ClipboardList : AlertTriangle;

  // Painel flutuante NÃO-BLOQUEANTE (substitui Dialog que bloqueava toda a tela)
  return (
    <div className="fixed bottom-6 left-6 z-[200] max-w-sm w-full shadow-2xl pointer-events-auto">
      <div className={`rounded-xl border-2 ${c.border} ${c.bg} overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${c.border} flex items-center justify-between`}>
          <div className={`flex items-center gap-2 font-bold text-sm ${c.title}`}>
            <IconComp className="w-4 h-4 animate-pulse" />
            {current.title}
            {alerts.length > 1 && (
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${c.badge}`}>
                +{alerts.length - 1} mais
              </span>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TreePine className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-800">{current.produtor_nome || current.produtor_id || "Fazenda"}</p>
              <p className="text-xs text-gray-500">
                {current.type === "checklist"
                  ? "Checklist atualizado"
                  : current.type === "prazo"
                  ? `${current.dias} dias em aberto (prazo: ${current.prazoNum}d)`
                  : "Fazenda visitada"}
              </p>
            </div>
          </div>
          {current.tecnico_nome && (
            <p className="text-xs text-gray-600">Técnico: <strong>{current.tecnico_nome}</strong></p>
          )}
          {current.type === "prazo" && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-2">
              <p className="text-xs text-orange-700 font-semibold">⚠️ Pendente há {current.dias} dias (limite: {current.prazoNum}d)</p>
            </div>
          )}
          <Button
            onClick={dismiss}
            className={`w-full bg-gradient-to-r ${c.btn} text-white`}
          >
            <X className="w-4 h-4 mr-2" />
            {alerts.length > 1 ? `OK (${alerts.length - 1} restantes)` : "OK, entendido"}
          </Button>
        </div>
      </div>
    </div>
  );
}