
import { useState } from "react"
import {
  X,
  Bell,
  Check,
  Trash2,
  Mail,
  MessageCircle,
  AlertCircle,
  Info,
  CheckCircle,
  Archive,
  Star,
  Clock,
  MoreVertical,
  Inbox,
  ListChecks,
  ArchiveIcon,
  Send,
  UserPlus,
  ChevronDown,
  ChevronUp,
  AtSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  author: string
  authorAvatar?: string
  content: string
  mentions: string[]
  timestamp: string
}

interface TeamMember {
  id: string
  name: string
  avatar?: string
  role: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  channel: "email" | "in_app" | "whatsapp" | "push"
  read: boolean
  archived: boolean
  favorited: boolean
  resolved: boolean
  queued: boolean
  timestamp: string
  comments?: Comment[]
  assignedTo?: string
}

interface NotificationListPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationListPanel({ open, onClose }: NotificationListPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [showMentions, setShowMentions] = useState<Record<string, boolean>>({})

  const teamMembers: TeamMember[] = [
    { id: "1", name: "João Silva", avatar: "/placeholder.svg", role: "Desenvolvedor" },
    { id: "2", name: "Maria Santos", avatar: "/placeholder.svg", role: "Designer" },
    { id: "3", name: "Pedro Costa", avatar: "/placeholder.svg", role: "Gerente de Projeto" },
    { id: "4", name: "Ana Oliveira", avatar: "/placeholder.svg", role: "QA Tester" },
  ]

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Novo projeto atribuído",
      message: "Você foi atribuído ao projeto 'Website Redesign' pela empresa Tech Solutions Ltd.",
      type: "info",
      channel: "in_app",
      read: false,
      archived: false,
      favorited: false,
      resolved: false,
      queued: false,
      timestamp: "2024-01-28T10:30:00Z",
      comments: [],
    },
    {
      id: "2",
      title: "Pagamento recebido",
      message: "Pagamento de R$ 5.000,00 foi confirmado para o projeto 'Mobile App Development'.",
      type: "success",
      channel: "email",
      read: false,
      archived: false,
      favorited: false,
      resolved: false,
      queued: false,
      timestamp: "2024-01-27T15:45:00Z",
      comments: [],
    },
    {
      id: "3",
      title: "Prazo próximo",
      message: "O projeto 'E-commerce Platform' tem prazo de entrega em 2 dias.",
      type: "warning",
      channel: "whatsapp",
      read: true,
      archived: false,
      favorited: false,
      resolved: false,
      queued: true,
      timestamp: "2024-01-26T09:00:00Z",
      comments: [
        {
          id: "c1",
          author: "João Silva",
          authorAvatar: "/placeholder.svg",
          content: "Vou verificar o status com o cliente hoje.",
          mentions: [],
          timestamp: "2024-01-26T10:00:00Z",
        },
      ],
      assignedTo: "1",
    },
    {
      id: "4",
      title: "Documento pendente",
      message: "Por favor, envie os documentos necessários para completar seu cadastro.",
      type: "error",
      channel: "in_app",
      read: true,
      archived: false,
      favorited: false,
      resolved: false,
      queued: false,
      timestamp: "2024-01-25T14:20:00Z",
      comments: [],
    },
  ])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedNotifications)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedNotifications(newExpanded)
  }

  const handleAddComment = (notificationId: string) => {
    const content = commentInputs[notificationId]?.trim()
    if (!content) return

    const mentions = content.match(/@(\w+)/g)?.map((m) => m.substring(1)) || []

    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: "Você",
      content,
      mentions,
      timestamp: new Date().toISOString(),
    }

    setNotifications(
      notifications.map((n) => (n.id === notificationId ? { ...n, comments: [...(n.comments || []), newComment] } : n)),
    )

    setCommentInputs({ ...commentInputs, [notificationId]: "" })
    setShowMentions({ ...showMentions, [notificationId]: false })
  }

  const handleAssign = (notificationId: string, memberId: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, assignedTo: memberId, queued: true, read: true } : n,
      ),
    )
    // In a real app, this would send a notification to the assigned member
    console.log(`[v0] Notification ${notificationId} assigned to member ${memberId}`)
  }

  const insertMention = (notificationId: string, memberName: string) => {
    const currentInput = commentInputs[notificationId] || ""
    const newInput = currentInput + `@${memberName} `
    setCommentInputs({ ...commentInputs, [notificationId]: newInput })
    setShowMentions({ ...showMentions, [notificationId]: false })
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const handleArchive = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n)))
  }

  const handleFavorite = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, favorited: !n.favorited } : n)))
  }

  const handleResolve = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, resolved: !n.resolved, read: true } : n)))
  }

  const handleQueue = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, queued: !n.queued } : n)))
  }

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-warning" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Info className="h-5 w-5 text-info" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-3 w-3" />
      case "whatsapp":
        return <MessageCircle className="h-3 w-3" />
      case "push":
        return <Bell className="h-3 w-3" />
      default:
        return <Bell className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success/10 border-success/20"
      case "warning":
        return "bg-warning/10 border-warning/20"
      case "error":
        return "bg-destructive/10 border-destructive/20"
      default:
        return "bg-info/10 border-info/20"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Agora"
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString("pt-BR")
  }

  const allNotifications = notifications.filter((n) => !n.archived)
  const queuedNotifications = notifications.filter((n) => n.queued && !n.archived)
  const resolvedNotifications = notifications.filter((n) => n.resolved && !n.archived)
  const archivedNotifications = notifications.filter((n) => n.archived)
  const favoritedNotifications = notifications.filter((n) => n.favorited && !n.archived)

  const unreadCount = allNotifications.filter((n) => !n.read).length

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "queued":
        return queuedNotifications
      case "resolved":
        return resolvedNotifications
      case "archived":
        return archivedNotifications
      case "favorited":
        return favoritedNotifications
      default:
        return allNotifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200" onClick={onClose} />

      {/* Panel - Reduced width from 800px to 700px for more compact design */}
      <div className="fixed right-0 top-0 h-full w-[700px] bg-background border-l shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col rounded-l-xl">
        {/* Header - Reduced padding from p-6 to p-4 for more compact design */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-tl-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notificações</h2>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Todas lidas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-8 text-xs">
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Marcar lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive hover:text-destructive h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Limpar
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs - More compact tabs with reduced padding */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-4 pt-3 border-b">
            <TabsList className="grid w-full grid-cols-5 h-9">
              <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs py-1.5">
                <Inbox className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Todas</span>
                {allNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {allNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="queued" className="flex items-center gap-1.5 text-xs py-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fila</span>
                {queuedNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {queuedNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-1.5 text-xs py-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resolvidas</span>
                {resolvedNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {resolvedNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-1.5 text-xs py-1.5">
                <ArchiveIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Arquivadas</span>
                {archivedNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {archivedNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="favorited" className="flex items-center gap-1.5 text-xs py-1.5">
                <Star className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Favoritas</span>
                {favoritedNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                    {favoritedNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Notifications List - Reduced padding from p-6 to p-4 */}
          <TabsContent value={activeTab} className="flex-1 m-0">
            <ScrollArea className="h-full p-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="p-3 bg-muted rounded-full mb-3">
                    <Bell className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Nenhuma notificação</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === "all" && "Você está em dia! Não há notificações no momento."}
                    {activeTab === "queued" && "Nenhuma notificação na fila de resolução."}
                    {activeTab === "resolved" && "Nenhuma notificação resolvida."}
                    {activeTab === "archived" && "Nenhuma notificação arquivada."}
                    {activeTab === "favorited" && "Nenhuma notificação favoritada."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => {
                    const isExpanded = expandedNotifications.has(notification.id)
                    const assignedMember = teamMembers.find((m) => m.id === notification.assignedTo)

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-200 hover:shadow-sm",
                          getTypeColor(notification.type),
                          !notification.read && "ring-1 ring-primary/30",
                          notification.resolved && "opacity-60",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex-shrink-0 mt-0.5">{getTypeIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-1">
                                <h4
                                  className={cn(
                                    "font-semibold text-xs leading-tight",
                                    notification.resolved && "line-through",
                                  )}
                                >
                                  {notification.title}
                                </h4>
                                {notification.favorited && (
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                )}
                                {notification.resolved && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-200"
                                  >
                                    Resolvida
                                  </Badge>
                                )}
                                {notification.queued && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    Fila
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {!notification.read && (
                                  <Badge variant="default" className="h-1.5 w-1.5 p-0 rounded-full bg-primary" />
                                )}
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {getChannelIcon(notification.channel)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{notification.message}</p>

                            {assignedMember && (
                              <div className="flex items-center gap-1.5 mb-2 p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={assignedMember.avatar || "/placeholder.svg"} />
                                  <AvatarFallback className="text-[10px]">{assignedMember.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] text-muted-foreground">
                                  Atribuído a <span className="font-medium text-foreground">{assignedMember.name}</span>
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 w-7 p-0",
                                    notification.favorited && "text-yellow-600 hover:text-yellow-700",
                                  )}
                                  onClick={() => handleFavorite(notification.id)}
                                  title={notification.favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                >
                                  <Star className={cn("h-3.5 w-3.5", notification.favorited && "fill-current")} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 w-7 p-0",
                                    notification.resolved && "text-green-600 hover:text-green-700",
                                  )}
                                  onClick={() => handleResolve(notification.id)}
                                  title={notification.resolved ? "Marcar como não resolvida" : "Marcar como resolvida"}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 w-7 p-0",
                                    notification.queued && "text-blue-600 hover:text-blue-700",
                                  )}
                                  onClick={() => handleQueue(notification.id)}
                                  title={notification.queued ? "Remover da fila" : "Adicionar à fila de resolução"}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleArchive(notification.id)}
                                  title="Arquivar notificação"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => toggleExpanded(notification.id)}
                                  title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    {!notification.read && (
                                      <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                                        <Check className="h-3.5 w-3.5 mr-2" />
                                        <span className="text-xs">Marcar como lida</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleFavorite(notification.id)}>
                                      <Star
                                        className={cn("h-3.5 w-3.5 mr-2", notification.favorited && "fill-current")}
                                      />
                                      <span className="text-xs">
                                        {notification.favorited ? "Remover favorito" : "Favoritar"}
                                      </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleResolve(notification.id)}>
                                      <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                      <span className="text-xs">
                                        {notification.resolved ? "Marcar não resolvida" : "Marcar resolvida"}
                                      </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQueue(notification.id)}>
                                      <Clock className="h-3.5 w-3.5 mr-2" />
                                      <span className="text-xs">
                                        {notification.queued ? "Remover da fila" : "Adicionar à fila"}
                                      </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleArchive(notification.id)}>
                                      <Archive className="h-3.5 w-3.5 mr-2" />
                                      <span className="text-xs">Arquivar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(notification.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      <span className="text-xs">Excluir</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                {/* Assignment section - More compact button */}
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                        Atribuir
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-52">
                                      {teamMembers.map((member) => (
                                        <DropdownMenuItem
                                          key={member.id}
                                          onClick={() => handleAssign(notification.id, member.id)}
                                        >
                                          <Avatar className="h-6 w-6 mr-2">
                                            <AvatarImage src={member.avatar || "/placeholder.svg"} />
                                            <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium">{member.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{member.role}</span>
                                          </div>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Comments section - More compact comments */}
                                {notification.comments && notification.comments.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                      Comentários ({notification.comments.length})
                                    </h5>
                                    {notification.comments.map((comment) => (
                                      <div key={comment.id} className="flex gap-2 p-2 bg-muted/50 rounded-md">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={comment.authorAvatar || "/placeholder.svg"} />
                                          <AvatarFallback className="text-[10px]">{comment.author[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-xs font-medium">{comment.author}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {formatTimestamp(comment.timestamp)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-foreground leading-relaxed">{comment.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add comment input - More compact input */}
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <Input
                                      placeholder="Adicione um comentário... Use @ para mencionar"
                                      value={commentInputs[notification.id] || ""}
                                      onChange={(e) => {
                                        setCommentInputs({ ...commentInputs, [notification.id]: e.target.value })
                                        if (e.target.value.endsWith("@")) {
                                          setShowMentions({ ...showMentions, [notification.id]: true })
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault()
                                          handleAddComment(notification.id)
                                        }
                                      }}
                                      className="pr-16 h-8 text-xs"
                                    />
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                      <DropdownMenu
                                        open={showMentions[notification.id]}
                                        onOpenChange={(open) =>
                                          setShowMentions({ ...showMentions, [notification.id]: open })
                                        }
                                      >
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <AtSign className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                          {teamMembers.map((member) => (
                                            <DropdownMenuItem
                                              key={member.id}
                                              onClick={() => insertMention(notification.id, member.name)}
                                            >
                                              <Avatar className="h-5 w-5 mr-2">
                                                <AvatarImage src={member.avatar || "/placeholder.svg"} />
                                                <AvatarFallback className="text-[10px]">
                                                  {member.name[0]}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="text-xs">{member.name}</span>
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleAddComment(notification.id)}
                                        disabled={!commentInputs[notification.id]?.trim()}
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    Enter para enviar, Shift+Enter para nova linha
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer - Reduced padding from p-4 to p-3 */}
        <div className="p-3 border-t bg-muted/30">
          <Button variant="outline" className="w-full bg-transparent h-8 text-xs" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </>
  )
}
