import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function FilterBar({ filters, setFilters }) {
  return (
    <Card className="shadow-md border-none mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#860063]" />
            <span className="font-semibold text-gray-900">Filtros:</span>
          </div>

          <Select
            value={filters.warehouse}
            onValueChange={(value) => setFilters({ ...filters, warehouse: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Armazém" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="central">Central</SelectItem>
              <SelectItem value="fabrica">Fábrica</SelectItem>
              <SelectItem value="barra">Barra</SelectItem>
              <SelectItem value="ferraz">Ferraz</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.line}
            onValueChange={(value) => setFilters({ ...filters, line: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="01">Linha 01</SelectItem>
              <SelectItem value="02">Linha 02</SelectItem>
              <SelectItem value="03">Linha 03</SelectItem>
              <SelectItem value="04">Linha 04</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="em_descarga">Em Descarga</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}