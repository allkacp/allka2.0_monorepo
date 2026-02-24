// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Shield, Mail, Plus, Trash2, Edit2, UserCheck, Crown, Star } from "lucide-react"

interface TeamMember {
  id: number
  name: string
  email: string
  avatar?: string
  role: "owner" | "admin" | "member"
  level: string
  permissions: string[]
  joined_at: string
  is_active: boolean
}

const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    name: "João Silva",
    email: "joao@agencia.com",
    role: "owner",
    level: "Partner Gold",
    permissions: ["all"],
    joined_at: "2023-01-15",
    is_active: true,
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "maria@agencia.com",
    role: "admin",
    level: "Senior",
    permissions: ["manage_projects", "manage_clients", "view_finances"],
    joined_at: "2023-03-20",
    is_active: true,
  },
  {
    id: 3,
    name: "Carlos Oliveira",
    email: "carlos@agencia.com",
    role: "member",
    level: "Pleno",
    permissions: ["manage_projects", "view_clients"],
    joined_at: "2023-06-10",
    is_active: true,
  },
  {
    id: 4,
    name: "Ana Costa",
    email: "ana@agencia.com",
    role: "member",
    level: "Junior",
    permissions: ["view_projects"],
    joined_at: "2023-09-05",
    is_active: true,
  },
]

export function AgencyTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null)
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "member" as const })

  console.log("[v0] AgencyTeam rendered", { teamMembersCount: teamMembers.length })

  const handleAddMember = () => {
    console.log("[v0] Adding new member:", newMember)
    const member: TeamMember = {
      id: Date.now(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      level: "Junior",
      permissions: ["view_projects"],
      joined_at: new Date().toISOString(),
      is_active: true,
    }
    setTeamMembers([...teamMembers, member])
    setShowAddDialog(false)
    setNewMember({ name: "", email: "", role: "member" })
  }

  const handleDeleteMember = (memberId: number) => {
    console.log("[v0] Deleting member:", memberId)
    setTeamMembers(teamMembers.filter((m) => m.id !== memberId))
    setMemberToDelete(null)
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: {
        color: "bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0",
        text: "Proprietário",
        icon: Crown,
      },
      admin: {
        color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0",
        text: "Administrador",
        icon: Shield,
      },
      member: { color: "bg-slate-100 text-slate-700 border-slate-200", text: "Membro", icon: UserCheck },
    }
    return variants[role as keyof typeof variants] || variants.member
  }

  const getLevelColor = (level: string) => {
    if (level.includes("Partner")) return "text-yellow-600"
    if (level === "Senior") return "text-purple-600"
    if (level === "Pleno") return "text-blue-600"
    return "text-slate-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipe da Agência</h2>
          <p className="text-slate-600 mt-1">Gerencie os membros da sua equipe e suas permissões</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-md"
        >
          <Plus className="h-4 w-4" />
          Adicionar Membro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{teamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600">{teamMembers.filter((m) => m.is_active).length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {teamMembers.filter((m) => m.role === "admin" || m.role === "owner").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Membros</p>
                <p className="text-2xl font-bold text-amber-600">
                  {teamMembers.filter((m) => m.role === "member").length}
                </p>
              </div>
              <Star className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamMembers.map((member) => {
          const roleBadge = getRoleBadge(member.role)
          const RoleIcon = roleBadge.icon

          return (
            <Card key={member.id} className="hover:shadow-lg transition-all duration-200 border-slate-200">
              <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-slate-900">{member.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={roleBadge.color}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleBadge.text}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className={`font-medium ${getLevelColor(member.level)}`}>{member.level}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">Permissões</p>
                  <div className="flex flex-wrap gap-1">
                    {member.permissions.slice(0, 3).map((perm, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {perm.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {member.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{member.permissions.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Membro desde {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>

                {member.role !== "owner" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-transparent"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMemberToDelete(member.id)}
                      className="flex-1 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Membro</DialogTitle>
            <DialogDescription>Convide um novo membro para sua equipe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="João Silva"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="joao@agencia.com"
              />
            </div>
            <div>
              <Label htmlFor="role">Função</Label>
              <select
                id="role"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value as "admin" | "member" })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-blue-400 focus:outline-none"
              >
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!newMember.name || !newMember.email}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Adicionar Membro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={memberToDelete !== null} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita e o membro perderá
              acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && handleDeleteMember(memberToDelete)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Remover Membro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
