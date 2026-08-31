export type ChatParticipantType = "admin" | "empresas" | "agencias" | "nomades"

export interface ChatParticipant {
  id: string
  name: string
  email: string
  avatar?: string
  account_type: ChatParticipantType
  online_status: "online" | "offline" | "busy" | "away"
  phone?: string
  last_seen?: string
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read"

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
  created_at: string
  status: MessageStatus
  type: "text" | "file" | "image" | "system"
  /** true when the message was sent by the currently logged-in admin */
  is_mine: boolean
}

export interface Conversation {
  id: string
  participants: ChatParticipant[]
  /** The other participant (the one who is NOT the current user) */
  contact: ChatParticipant
  messages: ChatMessage[]
  last_message?: ChatMessage
  unread_count: number
  created_at: string
  updated_at: string
  is_pinned: boolean
  is_archived: boolean
}

// ─── Chat real (ata 2026-08, bloco 3/5 — restaurado) ─────────────────────

export interface ChatRoomParticipant {
  id: string
  name: string
  avatar?: string | null
  role: string
}

export interface ChatRoomMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender: { id: string; name: string; avatar?: string | null }
  content: string
  created_at: string
  client_message_id?: string | null
  /** UI local: aguardando confirmação do servidor */
  pending?: boolean
  /** UI local: envio falhou, pode tentar de novo */
  failed?: boolean
}

export interface ChatRoom {
  id: string
  title: string | null
  type: string
  status: "active" | "archived"
  read_only: boolean
  notification_group?: { id: string; name: string; status: string } | null
  participants: ChatRoomParticipant[]
  last_message: { id: string; content: string; created_at: string; sender_id: string } | null
  unread_count: number
  updated_at: string
}

// ─── Scheduled Messages ──────────────────────────────────────────────────────

export type ScheduledChannel = "whatsapp" | "email" | "platform"

export interface ScheduledMessage {
  id: string
  recipient_id: string
  recipient_name: string
  recipient_email: string
  recipient_phone?: string
  content: string
  channels: ScheduledChannel[]
  scheduled_at: string
  created_at: string
  status: "pending" | "sent" | "cancelled"
}

// ─── Quick Contact ────────────────────────────────────────────────────────────

export interface QuickWhatsAppPayload {
  phone: string
  message: string
  via_platform: boolean
}

export interface QuickEmailPayload {
  to: string
  subject: string
  body: string
}

export interface QuickNotificationPayload {
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  is_urgent: boolean
}
