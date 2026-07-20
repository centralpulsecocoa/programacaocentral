import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Link, Save, CheckCircle2, FileUp, ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CONFIGS = [
  {
    config_key: "alerta_visita_concluida",
    config_label: "Alerta: Técnico concluiu visita",
    enabled: true,
    value: "",
    notes: "Exibe um alerta no painel do gerente quando um técnico clicar em 'Concluir' em uma visita",
    type: "toggle",
  },
  {
    config_key: "alerta_checklist_salvo",
    config_label: "Alerta: Checklist salvo pelo técnico",
    enabled: false,
    value: "",
    notes: "Exibe um alerta no painel do gerente sempre que um técnico salvar progresso no checklist de uma fazenda",
    type: "toggle",
  },
  {
    config_key: "alerta_prazo_visita_dias",
    config_label: "Alerta: Visita com prazo excedido",
    enabled: false,
    value: "30",
    notes: "Exibe um alerta para visitas pendentes/em andamento que ultrapassaram o prazo configurado em dias",
    type: "number",
  },
  {
    config_key: "link_envio_documentos",
    config_label: "Link: Envio de Documentos (Forms)",
    enabled: false,
    value: "",
    notes: "URL do Google Forms ou outro formulário onde o técnico envia documentos da fazenda",
    type: "url",
  },
];

export default function ConfigSustentabilidade() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["sust-configs"],
    queryFn: () => base44.entities.SustentabilidadeConfig.list("config_key", 100),
  });

  // Merge defaults com dados do banco
  const mergedConfigs = useMemo(() => {
    return DEFAULT_CONFIGS.map((def) => {
      const saved = configs.find((c) => c.config_key === def.config_key);
      return saved ? { ...def, ...saved } : { ...def, _new: true };
    });
  }, [configs]);

  const handleSave = async (cfg, newValues) => {
    setSaving((prev) => ({ ...prev, [cfg.config_key]: true }));
    const payload = {
      config_key: cfg.config_key,
      config_label: cfg.config_label,
      enabled: newValues.enabled ?? cfg.enabled,
      value: newValues.value ?? cfg.value ?? "",
      notes: cfg.notes,
    };
    if (cfg.id) {
      await base44.entities.SustentabilidadeConfig.update(cfg.id, payload);
    } else {
      await base44.entities.SustentabilidadeConfig.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["sust-configs"] });
    setSaving((prev) => ({ ...prev, [cfg.config_key]: false }));
    toast.success("Configuração salva!");
  };

  const [localValues, setLocalValues] = useState({});

  const getVal = (cfg, key) =>
    localValues[cfg.config_key]?.[key] !== undefined
      ? localValues[cfg.config_key][key]
      : cfg[key];

  const setVal = (cfg, key, value) => {
    setLocalValues((prev) => ({
      ...prev,
      [cfg.config_key]: { ...(prev[cfg.config_key] || {}), [key]: value },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#860063]/10 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#860063]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Configurações de Sustentabilidade</h1>
          <p className="text-xs text-gray-500">Configure alertas, notificações e links do módulo de sustentabilidade</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#860063]" />
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* Seção: Alertas */}
          <div className="flex items-center gap-2 mb-2 mt-2">
            <Bell className="w-4 h-4 text-[#860063]" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Alertas e Notificações</h2>
          </div>

          {mergedConfigs.filter(c => c.config_key.startsWith("alerta_")).map((cfg) => {
            const isNumber = cfg.type === "number";
            const enabled = !!getVal(cfg, "enabled");
            return (
              <Card key={cfg.config_key} className="shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? "bg-orange-100" : "bg-gray-100"}`}>
                        {cfg.config_key === "alerta_checklist_salvo"
                          ? <ClipboardList className={`w-4 h-4 ${enabled ? "text-orange-600" : "text-gray-400"}`} />
                          : cfg.config_key === "alerta_prazo_visita_dias"
                          ? <Clock className={`w-4 h-4 ${enabled ? "text-orange-600" : "text-gray-400"}`} />
                          : <Bell className={`w-4 h-4 ${enabled ? "text-orange-600" : "text-gray-400"}`} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{cfg.config_label}</p>
                        <p className="text-xs text-gray-500">{cfg.notes}</p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => setVal(cfg, "enabled", v)}
                    />
                  </div>

                  {/* Campo de prazo em dias */}
                  {isNumber && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600">Prazo em dias</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={getVal(cfg, "value") ?? "30"}
                          onChange={(e) => setVal(cfg, "value", e.target.value)}
                          className="w-28 text-sm"
                        />
                        <span className="text-xs text-gray-500">dias sem conclusão para disparar o alerta</span>
                      </div>
                    </div>
                  )}

                  {enabled && (
                    <div className={`border rounded-lg p-3 ${isNumber ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isNumber ? "text-orange-600" : "text-green-600"}`} />
                        <p className={`text-xs ${isNumber ? "text-orange-800" : "text-green-800"}`}>
                          {cfg.config_key === "alerta_visita_concluida" && <>Quando um técnico clicar em <strong>"Concluir"</strong> em uma visita, um popup aparecerá no painel do gerente.</>}
                          {cfg.config_key === "alerta_checklist_salvo" && <>Quando um técnico clicar em <strong>"Salvar"</strong> no checklist de qualquer fazenda, um popup notificará o gerente.</>}
                          {cfg.config_key === "alerta_prazo_visita_dias" && <>Visitas pendentes ou em andamento há mais de <strong>{getVal(cfg, "value") || 30} dias</strong> dispararão um alerta de prazo excedido.</>}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={saving[cfg.config_key]}
                      onClick={() => handleSave(cfg, localValues[cfg.config_key] || {})}
                      className="bg-[#860063] hover:bg-[#6b004f] text-white"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {saving[cfg.config_key] ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Seção: Links */}
          <div className="flex items-center gap-2 mb-2 mt-4">
            <Link className="w-4 h-4 text-[#860063]" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Links e Formulários</h2>
          </div>

          {mergedConfigs.filter(c => c.config_key.startsWith("link_")).map((cfg) => (
            <Card key={cfg.config_key} className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getVal(cfg, "enabled") ? "bg-blue-100" : "bg-gray-100"}`}>
                      <FileUp className={`w-4 h-4 ${getVal(cfg, "enabled") ? "text-blue-700" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{cfg.config_label}</p>
                      <p className="text-xs text-gray-500">{cfg.notes}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!getVal(cfg, "enabled")}
                    onCheckedChange={(v) => setVal(cfg, "enabled", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-600">URL do Formulário</Label>
                  <Input
                    value={getVal(cfg, "value") || ""}
                    onChange={(e) => setVal(cfg, "value", e.target.value)}
                    placeholder="https://forms.google.com/..."
                    className="text-sm"
                  />
                  <p className="text-[11px] text-gray-400">
                    Cole aqui a URL do Google Forms ou qualquer outro formulário. O botão "Enviar Documentos" no checklist do técnico abrirá este link.
                  </p>
                </div>

                {getVal(cfg, "value") && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800 font-medium mb-1">Preview do link configurado:</p>
                    <a
                      href={getVal(cfg, "value")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline break-all"
                    >
                      {getVal(cfg, "value")}
                    </a>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={saving[cfg.config_key]}
                    onClick={() => handleSave(cfg, localValues[cfg.config_key] || {})}
                    className="bg-[#860063] hover:bg-[#6b004f] text-white"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving[cfg.config_key] ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}