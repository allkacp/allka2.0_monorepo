
import { Save, Mail, Phone, Building2, Shield, UserIcon, MapPin, FileText, User, DollarSign, Plus, Trash2, Edit2, Key, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { useSidebar } from "@/contexts/sidebar-context"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BankAccount {
  id?: string
  bank: string
  agency: string
  account: string
  accountType: "corrente" | "poupanca"
  holder: string
}

interface PIXKey {
  id?: string
  key: string
  type: "cpf" | "cnpj" | "email" | "phone" | "random"
}

interface UserEditSlidePanelProps {
  open: boolean
  onClose: () => void
  user: any | null
  isAdmin?: boolean
}

export function UserEditSlidePanel({ open, onClose, user, isAdmin = false }: UserEditSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [editedUser, setEditedUser] = useState<any | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [pixKeys, setPixKeys] = useState<PIXKey[]>([])
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [editingPix, setEditingPix] = useState<PIXKey | null>(null)
  const [showPasswordResetOptions, setShowPasswordResetOptions] = useState(false)
  const { sidebarWidth } = useSidebar()

  useEffect(() => {
    if (user && open) {
      setEditedUser({ ...user })
      setBankAccounts(user.bankAccounts || [])
      setPixKeys(user.pixKeys || [])
    }
  }, [user, open])

  useEffect(() => {
    if (!open) {
      setIsClosing(false)
    }
  }, [open])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleSave = () => {
    const userData = {
      ...editedUser,
      bankAccounts,
      pixKeys,
    }
    console.log("[v0] Saving user:", userData)
    // Implement save logic here
    handleClose()
  }

  const addBankAccount = () => {
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      bank: "",
      agency: "",
      account: "",
      accountType: "corrente",
      holder: "",
    }
    setBankAccounts([...bankAccounts, newAccount])
    setEditingAccount(newAccount)
  }

  const updateBankAccount = (account: BankAccount) => {
    setBankAccounts(bankAccounts.map((a) => (a.id === account.id ? account : a)))
    setEditingAccount(null)
  }

  const removeBankAccount = (id: string | undefined) => {
    if (!id) return
    setBankAccounts(bankAccounts.filter((a) => a.id !== id))
  }

  const addPixKey = () => {
    const newKey: PIXKey = {
      id: Date.now().toString(),
      key: "",
      type: "cpf",
    }
    setPixKeys([...pixKeys, newKey])
    setEditingPix(newKey)
  }

  const updatePixKey = (pixKey: PIXKey) => {
    setPixKeys(pixKeys.map((p) => (p.id === pixKey.id ? pixKey : p)))
    setEditingPix(null)
  }

  const removePixKey = (id: string | undefined) => {
    if (!id) return
    setPixKeys(pixKeys.filter((p) => p.id !== id))
  }

  const handleResetPassword = async (method: "email" | "force") => {
    console.log(`[v0] Reset password via ${method} for user: ${user?.id}`)
    // Implement password reset logic here
  }

  if (!open && !isClosing) return null
  if (!user || !editedUser) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserTypeColor = (type: string) => {
    if (!type) return "bg-gray-500"

    switch (type.toLowerCase()) {
      case "company":
        return "bg-blue-500"
      case "agency":
        return "bg-purple-500"
      case "nomade":
        return "bg-green-500"
      case "team_allka":
        return "bg-orange-500"
      case "partner":
        return "bg-pink-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <>
      {/* // Modal panel without overlay, sliding from right to sidebar */}
      <div
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
        className={`fixed top-0 right-0 h-[calc(100%-32px)] bg-white shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out ${
          open && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with brand theme */}
        <ModalBrandHeader
          title="Editar Usuário"
          left={
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className={getUserTypeColor(editedUser.user_type)}>
                  {getInitials(editedUser.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-blue-100">{editedUser.email}</p>
              </div>
            </div>
          }
          onClose={handleClose}
        />

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Geral</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                {/* Personal Information Section */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Informações Pessoais</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="name" className="text-xs text-gray-700">
                        Nome Completo
                      </Label>
                      <Input
                        id="name"
                        value={editedUser.name}
                        onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-xs text-gray-700">
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={editedUser.email}
                          onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                          className="mt-1 h-8 text-sm pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-xs text-gray-700">
                        Telefone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          id="phone"
                          value={editedUser.phone || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                          className="mt-1 h-8 text-sm pl-7"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="document" className="text-xs text-gray-700">
                        Documento (CPF/CNPJ)
                      </Label>
                      <Input
                        id="document"
                        value={editedUser.document || ""}
                        onChange={(e) => setEditedUser({ ...editedUser, document: e.target.value })}
                        className="mt-1 h-8 text-sm"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="job_title" className="text-xs text-gray-700">
                        Cargo
                      </Label>
                      <Input
                        id="job_title"
                        value={editedUser.job_title || ""}
                        onChange={(e) => setEditedUser({ ...editedUser, job_title: e.target.value })}
                        className="mt-1 h-8 text-sm"
                        placeholder="Desenvolvedor, Gerente..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="observations" className="text-xs text-gray-700">
                        Observações
                      </Label>
                      <Textarea
                        id="observations"
                        value={editedUser.observations || ""}
                        onChange={(e) => setEditedUser({ ...editedUser, observations: e.target.value })}
                        className="mt-1 text-sm"
                        placeholder="Notas adicionais sobre o usuário..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Settings Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Configurações da Conta</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="user_type" className="text-xs text-gray-700">
                        Tipo de Usuário
                      </Label>
                      <Select
                        value={editedUser.user_type}
                        onValueChange={(value) => setEditedUser({ ...editedUser, user_type: value })}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                          <SelectItem value="nomade">Nômade</SelectItem>
                          <SelectItem value="team_allka">Team Allka</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="company_name" className="text-xs text-gray-700">
                        Empresa
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          id="company_name"
                          value={editedUser.company_name || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, company_name: e.target.value })}
                          className="mt-1 h-8 text-sm pl-7"
                          placeholder="Nome da empresa..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active" className="text-xs text-gray-700">
                          Status da Conta
                        </Label>
                        <p className="text-xs text-gray-500">Ativo/Inativo</p>
                      </div>
                      <Switch
                        id="is_active"
                        checked={editedUser.is_active}
                        onCheckedChange={(checked) => setEditedUser({ ...editedUser, is_active: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Endereço</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="street" className="text-xs text-gray-700">
                        Rua
                      </Label>
                      <Input
                        id="street"
                        value={editedUser.street || ""}
                        onChange={(e) => setEditedUser({ ...editedUser, street: e.target.value })}
                        className="mt-1 h-8 text-sm"
                        placeholder="Nome da rua..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="number" className="text-xs text-gray-700">
                          Número
                        </Label>
                        <Input
                          id="number"
                          value={editedUser.number || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, number: e.target.value })}
                          className="mt-1 h-8 text-sm"
                          placeholder="123"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="complement" className="text-xs text-gray-700">
                          Complemento
                        </Label>
                        <Input
                          id="complement"
                          value={editedUser.complement || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, complement: e.target.value })}
                          className="mt-1 h-8 text-sm"
                          placeholder="Apto, sala, etc..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="city" className="text-xs text-gray-700">
                          Cidade
                        </Label>
                        <Input
                          id="city"
                          value={editedUser.city || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, city: e.target.value })}
                          className="mt-1 h-8 text-sm"
                          placeholder="São Paulo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-xs text-gray-700">
                          Estado
                        </Label>
                        <Input
                          id="state"
                          value={editedUser.state || ""}
                          onChange={(e) => setEditedUser({ ...editedUser, state: e.target.value })}
                          className="mt-1 h-8 text-sm"
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zip_code" className="text-xs text-gray-700">
                        CEP
                      </Label>
                      <Input
                        id="zip_code"
                        value={editedUser.zip_code || ""}
                        onChange={(e) => setEditedUser({ ...editedUser, zip_code: e.target.value })}
                        className="mt-1 h-8 text-sm"
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-1 font-mono text-gray-900">{editedUser.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Criado em:</span>
                      <span className="ml-1 text-gray-900">
                        {new Date(editedUser.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4">
                {/* Bank Accounts Section */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Contas Bancárias</h3>
                    </div>
                    <Button
                      onClick={addBankAccount}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs bg-transparent"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {bankAccounts.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4">Nenhuma conta bancária cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {bankAccounts.map((account) =>
                        editingAccount?.id === account.id ? (
                          <div key={account.id} className="bg-white p-3 rounded border border-blue-200 space-y-2">
                            <div>
                              <Label className="text-xs text-gray-700">Banco</Label>
                              <Input
                                value={account.bank}
                                onChange={(e) => setEditingAccount({ ...account, bank: e.target.value })}
                                className="mt-1 h-7 text-xs"
                                placeholder="Banco do Brasil..."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-700">Agência</Label>
                                <Input
                                  value={account.agency}
                                  onChange={(e) => setEditingAccount({ ...account, agency: e.target.value })}
                                  className="mt-1 h-7 text-xs"
                                  placeholder="0000"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-700">Conta</Label>
                                <Input
                                  value={account.account}
                                  onChange={(e) => setEditingAccount({ ...account, account: e.target.value })}
                                  className="mt-1 h-7 text-xs"
                                  placeholder="00000-0"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-700">Tipo</Label>
                                <Select
                                  value={account.accountType}
                                  onValueChange={(value: any) =>
                                    setEditingAccount({ ...account, accountType: value })
                                  }
                                >
                                  <SelectTrigger className="mt-1 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="corrente">Corrente</SelectItem>
                                    <SelectItem value="poupanca">Poupança</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-700">Titular</Label>
                                <Input
                                  value={account.holder}
                                  onChange={(e) => setEditingAccount({ ...account, holder: e.target.value })}
                                  className="mt-1 h-7 text-xs"
                                  placeholder="Nome do titular..."
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => updateBankAccount(editingAccount)}
                                size="sm"
                                className="h-7 flex-1 text-xs"
                              >
                                Salvar
                              </Button>
                              <Button
                                onClick={() => setEditingAccount(null)}
                                size="sm"
                                variant="outline"
                                className="h-7 flex-1 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={account.id}
                            className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between"
                          >
                            <div className="text-xs space-y-1 flex-1">
                              <p className="font-medium text-gray-900">{account.bank}</p>
                              <p className="text-gray-600">
                                Ag. {account.agency} • Conta {account.account}
                              </p>
                              <p className="text-gray-500">{account.holder}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => setEditingAccount(account)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => removeBankAccount(account.id)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* PIX Keys Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Chaves PIX</h3>
                    </div>
                    <Button
                      onClick={addPixKey}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs bg-transparent"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {pixKeys.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4">Nenhuma chave PIX cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {pixKeys.map((pix) =>
                        editingPix?.id === pix.id ? (
                          <div key={pix.id} className="bg-white p-3 rounded border border-purple-200 space-y-2">
                            <div>
                              <Label className="text-xs text-gray-700">Tipo</Label>
                              <Select
                                value={pix.type}
                                onValueChange={(value: any) => setEditingPix({ ...pix, type: value })}
                              >
                                <SelectTrigger className="mt-1 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cpf">CPF</SelectItem>
                                  <SelectItem value="cnpj">CNPJ</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Telefone</SelectItem>
                                  <SelectItem value="random">Aleatória</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-700">Chave</Label>
                              <Input
                                value={pix.key}
                                onChange={(e) => setEditingPix({ ...pix, key: e.target.value })}
                                className="mt-1 h-7 text-xs"
                                placeholder="Digite a chave PIX..."
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => updatePixKey(editingPix)}
                                size="sm"
                                className="h-7 flex-1 text-xs"
                              >
                                Salvar
                              </Button>
                              <Button
                                onClick={() => setEditingPix(null)}
                                size="sm"
                                variant="outline"
                                className="h-7 flex-1 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div key={pix.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between">
                            <div className="text-xs space-y-1 flex-1">
                              <p className="font-medium text-gray-900 capitalize">{pix.type}</p>
                              <p className="text-gray-600 break-all">{pix.key}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => setEditingPix(pix)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => removePixKey(pix.id)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Admin Tab */}
              {isAdmin && (
                <TabsContent value="admin" className="space-y-4">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800 ml-2">
                      Essas ações são apenas para administradores. Use com cuidado.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border border-red-200 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="h-4 w-4 text-red-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Gerenciamento de Senha</h3>
                    </div>

                    <Button
                      onClick={() => handleResetPassword("email")}
                      variant="outline"
                      className="w-full h-9 justify-start text-xs text-left"
                    >
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Enviar link de recuperação</p>
                        <p className="text-gray-600 text-xs">Envia email com link para redefinição</p>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleResetPassword("force")}
                      variant="outline"
                      className="w-full h-9 justify-start text-xs text-left border-red-300 hover:bg-red-50"
                    >
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />
                      <div>
                        <p className="font-medium">Forçar redefinição</p>
                        <p className="text-gray-600 text-xs">Força redefinição no próximo login</p>
                      </div>
                    </Button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Última ação:</strong> {new Date().toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-gray-600">
                      <strong>Último login:</strong> {editedUser.last_login || "Nunca"}
                    </p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>

        {/* // Save button footer */}
        <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2">
          <Button onClick={handleClose} variant="outline" size="sm" className="h-8 bg-transparent">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </>
  )
}

export default UserEditSlidePanel
