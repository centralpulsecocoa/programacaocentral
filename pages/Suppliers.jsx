import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, Trash2, Check, X, User, AlertCircle, CheckCircle2, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    active: true,
    buyer_email: ""
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list("name", 1000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    placeholderData: [],
  });

  // Filtrar apenas compradores
  const buyers = users.filter(u => u.profile === 'comprador' || u.profile === 'supervisor' || u.profile === 'admin');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      resetForm();
      setIsDialogOpen(false); // Using setIsDialogOpen instead of setShowDialog
      toast.success('✅ Fornecedor criado com sucesso!', {
        description: 'O fornecedor foi adicionado ao sistema.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar fornecedor', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      resetForm();
      setIsDialogOpen(false); // Using setIsDialogOpen instead of setShowDialog
      setEditingSupplier(null);
      toast.success('✅ Fornecedor atualizado!', {
        description: 'As alterações foram salvas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar fornecedor', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('✅ Fornecedor excluído!', {
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir fornecedor', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", contact: "", active: true, buyer_email: "" });
    setEditingSupplier(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, buyer_email: formData.buyer_email === "none" ? "" : formData.buyer_email };
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      active: supplier.active,
      buyer_email: supplier.buyer_email || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      deleteMutation.mutate(id);
    }
  };

  const getBuyerName = (email) => {
    if (!email) return null;
    const buyer = users.find(u => u.email === email);
    return buyer?.full_name || email;
  };

  // Filtrar fornecedores
  const filteredSuppliers = suppliers.filter(supplier => {
    // Filtro de busca por nome
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && supplier.active) || 
      (statusFilter === "inactive" && !supplier.active);
    
    // Filtro de comprador
    const matchesBuyer = buyerFilter === "all" || 
      (buyerFilter === "none" && !supplier.buyer_email) ||
      supplier.buyer_email === buyerFilter;
    
    return matchesSearch && matchesStatus && matchesBuyer;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Package className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Fornecedores
              </h1>
              <p className="text-sm md:text-base text-gray-600">Gerencie os fornecedores cadastrados</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm}
                  className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Fornecedor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contato</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="Email ou telefone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="buyer">Comprador Responsável</Label>
                    <Select 
                      value={formData.buyer_email} 
                      onValueChange={(value) => setFormData({ ...formData, buyer_email: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o comprador responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {buyers.map((buyer) => (
                          <SelectItem key={buyer.id} value={buyer.email}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {buyer.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Notificações sobre este fornecedor serão enviadas para este comprador
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex items-center gap-3">
                      {formData.active ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      )}
                      <div>
                        <Label htmlFor="active" className="text-base font-semibold cursor-pointer">
                          Status do Fornecedor
                        </Label>
                        <p className="text-sm text-gray-600">
                          {formData.active ? 'Fornecedor ativo e disponível para agendamentos' : 'Fornecedor inativo e não disponível'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                    >
                      {editingSupplier ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="text-lg md:text-xl font-bold">
                Lista de Fornecedores
              </CardTitle>
              
              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={buyerFilter} onValueChange={setBuyerFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Comprador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="none">Sem comprador</SelectItem>
                    {buyers.map((buyer) => (
                      <SelectItem key={buyer.id} value={buyer.email}>
                        {buyer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="outline" className="ml-2">
                  {filteredSuppliers.length} de {suppliers.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {searchTerm || statusFilter !== "all" || buyerFilter !== "all" ? (
                  <>
                    <p className="text-gray-600 mb-2">Nenhum fornecedor encontrado</p>
                    <p className="text-sm text-gray-500">Tente ajustar os filtros</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setBuyerFilter("all");
                      }}
                      className="mt-4"
                    >
                      Limpar Filtros
                    </Button>
                  </>
                ) : (
                  <p className="text-gray-600">Nenhum fornecedor cadastrado</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSuppliers.map((supplier) => (
                    <motion.div
                      key={supplier.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-4 rounded-lg border-2 hover:border-[#860063]/30 transition-all bg-white ${
                        supplier.active 
                          ? 'border-green-200 bg-green-50/30' 
                          : 'border-red-200 bg-red-50/30 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {supplier.name}
                            </h3>
                            {supplier.active ? (
                              <Badge className="bg-green-100 text-green-800 border-green-300 border-2">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-300 border-2">
                                <AlertCircle className="w-3 h-3 mr-1" /> Inativo
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {supplier.contact && (
                              <p className="text-sm text-gray-600">📞 {supplier.contact}</p>
                            )}
                            {supplier.buyer_email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  <User className="w-3 h-3 mr-1" />
                                  Comprador: {getBuyerName(supplier.buyer_email)}
                                </Badge>
                              </div>
                            )}
                            {!supplier.buyer_email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Sem comprador responsável
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                            className="hover:bg-[#860063]/10 hover:border-[#860063]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(supplier.id)}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}