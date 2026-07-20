import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Database, X } from "lucide-react";

const CHECKLIST_FIELDS = [
  { key: "poligono", label: "Polígono" },
  { key: "coord_geoespacial", label: "Coord. Geo" },
  { key: "termo_adesao", label: "Termo Adesão" },
  { key: "codigo_fornecedor", label: "Cód. Fornecedor" },
  { key: "ficha_recomendacao", label: "Ficha Recom." },
  { key: "doc_pessoal", label: "Doc. Pessoal" },
  { key: "doc_fazenda", label: "Doc. Fazenda" },
  { key: "doc_trabalhador", label: "Doc. Trabalhador" },
  { key: "all_farmers", label: "All Farmers" },
  { key: "cadastro_meeiros", label: "Cad. Meeiros" },
  { key: "pesquisa_anual", label: "Pesquisa Anual" },
  { key: "checklist", label: "Checklist" },
  { key: "asc_pesquisa", label: "ASC Pesquisa" },
  { key: "clmrs_f1", label: "CLMRS F1" },
  { key: "clmrs_f2", label: "CLMRS F2" },
  { key: "treinamento_coaching", label: "Coaching/Técnico" },
  { key: "treinamento_agri", label: "Agri Supplier" },
  { key: "drive", label: "Drive" },
];

// Célula do checklist: verde se FAZER/PERFIL FAMILIAR e marcado como feito, traço se NÃO FAZER, laranja se FAZER mas não feito
function CheckCell({ cl, fieldKey }) {
  if (!cl) return <span className="text-gray-300 text-center block">—</span>;
  const val = cl[fieldKey];
  if (!val || val === "NÃO FAZER") return <span className="text-gray-300 text-center block">—</span>;
  // FAZER ou PERFIL FAMILIAR
  const feitos = cl.itens_feitos || [];
  const feito = feitos.includes(fieldKey);
  if (feito) return <span className="text-green-600 font-bold text-center block">✓</span>;
  // Atribuído mas não feito ainda
  return <span className="text-orange-400 font-bold text-center block">○</span>;
}

export default function SustentabilidadeDados() {
  const [search, setSearch] = useState("");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: produtores = [], isLoading: loadProd } = useQuery({
    queryKey: ["prod-sustdados"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.Produtor.list("nome", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: atribuicoes = [], isLoading: loadAtrib } = useQuery({
    queryKey: ["atrib-sustdados"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.FazendaAtribuicao.list("created_date", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: checklists = [], isLoading: loadCl } = useQuery({
    queryKey: ["cl-sustdados"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.FazendaChecklist.list("created_date", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const atribByProdId = useMemo(() => {
    const m = {};
    atribuicoes.forEach(a => { m[a.produtor_id] = a; });
    return m;
  }, [atribuicoes]);

  const checklistByProdId = useMemo(() => {
    const m = {};
    checklists.forEach(c => {
      const ex = m[c.produtor_id];
      if (!ex || new Date(c.updated_date) > new Date(ex.updated_date)) m[c.produtor_id] = c;
    });
    return m;
  }, [checklists]);

  const tecnicosList = useMemo(() => [...new Set([
    ...produtores.map(p => p.tecnico_responsavel).filter(Boolean),
    ...atribuicoes.map(a => a.tecnico_nome || a.tecnico_email).filter(Boolean),
  ])].sort(), [produtores, atribuicoes]);

  const compradoresList = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);
  const programasList = useMemo(() => [...new Set(produtores.map(p => p.programa).filter(Boolean))].sort(), [produtores]);

  const rows = useMemo(() => produtores.map(p => {
    const atrib = atribByProdId[p.id];
    const cl = checklistByProdId[p.id];
    return { prod: p, atrib, cl };
  }), [produtores, atribByProdId, checklistByProdId]);

  const filtered = useMemo(() => rows.filter(({ prod, atrib }) => {
    const q = search.toLowerCase();
    if (q && !prod.nome?.toLowerCase().includes(q) &&
        !prod.municipio?.toLowerCase().includes(q) &&
        !prod.nome_fazenda?.toLowerCase().includes(q) &&
        !prod.produtor_id?.toLowerCase().includes(q)) return false;
    if (tecnicoFilter !== "all") {
      const match = atrib?.tecnico_email === tecnicoFilter ||
                    atrib?.tecnico_nome === tecnicoFilter ||
                    prod.tecnico_responsavel === tecnicoFilter;
      if (!match) return false;
    }
    if (compradorFilter !== "all" && prod.comprador_responsavel !== compradorFilter) return false;
    if (programaFilter !== "all" && prod.programa !== programaFilter) return false;
    if (statusFilter !== "all") {
      const s = atrib?.status || "sem_atribuicao";
      if (statusFilter === "sem_atribuicao" && atrib) return false;
      if (statusFilter !== "sem_atribuicao" && s !== statusFilter) return false;
    }
    return true;
  }), [rows, search, tecnicoFilter, compradorFilter, programaFilter, statusFilter]);

  const handleDownload = () => {
    const checklistHeaders = CHECKLIST_FIELDS.map(f => f.label);
    const headers = [
      "ID Fazenda", "Nome Produtor", "CPF", "Município", "Nome Fazenda", "Programa",
      "Comprador", "Técnico Responsável", "Filial", "Latitude", "Longitude",
      "Status Visita", "Perfil Visita", "Data Início", "Data Conclusão",
      "Reporte", "Reporte Final", "Adequação", "Responsável Verificação",
      "Observação", "Observações Finais",
      ...checklistHeaders,
    ];
    const rows_csv = filtered.map(({ prod, atrib, cl }) => {
      const clValues = CHECKLIST_FIELDS.map(f => {
        if (!cl) return "";
        const val = cl[f.key];
        if (!val || val === "NÃO FAZER") return "NÃO FAZER";
        const feito = (cl.itens_feitos || []).includes(f.key);
        return feito ? "FEITO" : "FAZER (pendente)";
      });
      return [
        prod.produtor_id || "",
        prod.nome || "",
        prod.cpf || "",
        prod.municipio || "",
        prod.nome_fazenda || "",
        prod.programa || "",
        prod.comprador_responsavel || "",
        prod.tecnico_responsavel || "",
        prod.filial_responsavel || "",
        prod.latitude ?? "",
        prod.longitude ?? "",
        atrib?.status || "sem_atribuicao",
        atrib?.perfil_visita || "",
        atrib?.data_atendimento || "",
        cl?.data_verificacao || "",
        cl?.reporte || "",
        cl?.reporte_final || "",
        cl?.adequacao || "",
        cl?.responsavel_verificacao || "",
        cl?.observacao || "",
        cl?.observacoes_finais || "",
        ...clValues,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows_csv].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sustentabilidade_dados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loadProd || loadAtrib || loadCl;

  // Colunas fixas antes do checklist
  const fixedHeaders = ["ID Fazenda", "Nome Produtor", "Município", "Programa", "Comprador", "Técnico Resp.", "Status Visita", "Perfil Visita", "Data Início", "Reporte", "Rep. Final", "Data Conclusão"];
  const totalCols = fixedHeaders.length + CHECKLIST_FIELDS.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Todos os Dados de Sustentabilidade</h1>
            <p className="text-xs text-gray-500">{filtered.length} de {produtores.length} produtores</p>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={filtered.length === 0} className="bg-green-700 hover:bg-green-800 text-white">
          <Download className="w-4 h-4 mr-2" /> Download CSV ({filtered.length})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Produtores", value: produtores.length, color: "from-[#860063] to-[#6b004f]" },
          { label: "Com Atribuição", value: rows.filter(r => !!r.atrib).length, color: "from-blue-600 to-blue-700" },
          { label: "Com Checklist", value: rows.filter(r => !!r.cl).length, color: "from-green-600 to-green-700" },
          { label: "Visitas Concluídas", value: rows.filter(r => r.atrib?.status === "concluido").length, color: "from-[#F88D2A] to-[#d97824]" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${s.color}`}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nome, fazenda, cidade, ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos técnicos</SelectItem>
            {tecnicosList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={compradorFilter} onValueChange={setCompradorFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Comprador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos compradores</SelectItem>
            {compradoresList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={programaFilter} onValueChange={setProgramaFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos programas</SelectItem>
            {programasList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status Visita" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="sem_atribuicao">Sem Atribuição</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
        {(search || tecnicoFilter !== "all" || compradorFilter !== "all" || programaFilter !== "all" || statusFilter !== "all") && (
          <Button variant="outline" onClick={() => { setSearch(""); setTecnicoFilter("all"); setCompradorFilter("all"); setProgramaFilter("all"); setStatusFilter("all"); }}>
            <X className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="text-green-600 font-bold">✓</span> Feito</span>
        <span className="flex items-center gap-1"><span className="text-orange-400 font-bold">○</span> Atribuído (pendente)</span>
        <span className="flex items-center gap-1"><span className="text-gray-300">—</span> Não fazer / sem checklist</span>
      </div>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#860063] mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    {/* Colunas fixas */}
                    {fixedHeaders.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-gray-600 whitespace-nowrap bg-gray-50 sticky top-0">{h}</th>
                    ))}
                    {/* Colunas checklist — fundo levemente verde */}
                    {CHECKLIST_FIELDS.map(f => (
                      <th key={f.key} className="px-2 py-2 text-center font-bold text-green-700 whitespace-nowrap bg-green-50 sticky top-0 min-w-[72px]">
                        <span className="block text-[9px] uppercase leading-tight">{f.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={totalCols} className="text-center py-12 text-gray-400">Nenhum registro encontrado.</td></tr>
                  ) : filtered.map(({ prod, atrib, cl }, i) => (
                    <tr key={prod.id} className={`border-b hover:bg-green-50/20 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{prod.produtor_id || "—"}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{prod.nome}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{prod.municipio || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{prod.programa || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">{prod.comprador_responsavel || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">{prod.tecnico_responsavel || "—"}</td>
                      <td className="px-3 py-2">
                        {atrib ? (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${atrib.status === "concluido" ? "bg-green-100 text-green-700" : atrib.status === "em_andamento" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {atrib.status === "concluido" ? "Concluído" : atrib.status === "em_andamento" ? "Em Andamento" : "Pendente"}
                          </span>
                        ) : <span className="text-gray-400">Sem atrib.</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{atrib?.perfil_visita || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{atrib?.data_atendimento || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{cl?.reporte || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{cl?.reporte_final || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{cl?.data_verificacao || "—"}</td>
                      {/* Colunas checklist */}
                      {CHECKLIST_FIELDS.map(f => (
                        <td key={f.key} className="px-2 py-2 text-center">
                          <CheckCell cl={cl} fieldKey={f.key} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}