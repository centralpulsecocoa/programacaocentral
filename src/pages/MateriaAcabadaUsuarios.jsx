import React, { useState } from "react";
import MALayout from "@/components/materiaAcabada/MALayout";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Mail, Shield } from "lucide-react";

// Usuários autorizados para o módulo Matéria Acabada
const MA_USERS = ["jjancem@gmail.com"];

const roleLabels = {
  admin: "Administrador",
  user: "Usuário",
};

export default function MateriaAcabadaUsuarios() {
  const [search, setSearch] = useState("");

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["users-ma"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Filtrar apenas usuários do módulo MA
  const users = allUsers.filter((u) => MA_USERS.includes(u.email?.toLowerCase()));

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  return (
    <MALayout>
      <div className="p-6 md:p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-[#860063]" />
            Usuários — Matéria Acabada
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Usuários com acesso a este módulo</p>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card className="shadow-md border-none max-w-2xl">
          <CardHeader className="border-b bg-[#1a5276]/5 py-3 px-5">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Usuários Cadastrados</span>
              <Badge variant="outline">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#1a5276]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1a5276] flex items-center justify-center text-white font-semibold text-sm">
                        {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role === "admin" && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Badge className="bg-[#1a5276]/10 text-[#860063] border-[#1a5276]/20 text-xs">
                        {user.last_login
                          ? `Último login: ${new Date(user.last_login).toLocaleDateString("pt-BR")}`
                          : "Nunca acessou"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Para adicionar novos usuários</strong> a este módulo, inclua o email deles na lista <code className="bg-blue-100 px-1 rounded">MA_USERS</code> neste arquivo.
          </p>
        </div>
      </div>
    </MALayout>
  );
}