
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Package, AlertTriangle, CheckCircle } from "lucide-react"

interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_description: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  is_new: boolean // Only new items that haven't been paid
  added_at: string
  metadata: Record<string, any>
}

interface ShoppingCartProps {
  id: string
  user_id: string
  project_id?: string
  items: CartItem[]
  total_amount: number
  status: "active" | "checkout" | "completed" | "abandoned"
  expires_at?: string
}

interface RestructuredShoppingCartProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  projectId?: string
}

export default function RestructuredShoppingCart({
  isOpen,
  onClose,
  userId,
  projectId,
}: RestructuredShoppingCartProps) {
  const { toast } = useToast()
  const [cart, setCart] = useState<ShoppingCartProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCart()
    }
  }, [isOpen, userId, projectId])

  const loadCart = async () => {
    try {
      setLoading(true)

      // Mock data - in real app, fetch from API
      const mockCart: ShoppingCartProps = {
        id: "cart-1",
        user_id: userId,
        project_id: projectId,
        items: [
          {
            id: "item-1",
            product_id: "product-1",
            product_name: "Logo Design Premium",
            product_description: "Criação de logo profissional com variações",
            category: "Design",
            quantity: 1,
            unit_price: 1500,
            total_price: 1500,
            is_new: true,
            added_at: "2024-12-26T10:00:00Z",
            metadata: { complexity: "high", delivery_time: "5 dias" },
          },
          {
            id: "item-2",
            product_id: "addon-1",
            product_name: "Revisões Extras",
            product_description: "Pacote adicional de 3 revisões",
            category: "Complemento",
            quantity: 1,
            unit_price: 300,
            total_price: 300,
            is_new: true,
            added_at: "2024-12-26T11:30:00Z",
            metadata: { revision_count: 3 },
          },
        ],
        total_amount: 1800,
        status: "active",
        expires_at: "2024-12-27T10:00:00Z",
      }

      // Filter only new items that haven't been paid
      mockCart.items = mockCart.items.filter((item) => item.is_new)
      mockCart.total_amount = mockCart.items.reduce((sum, item) => sum + item.total_price, 0)

      setCart(mockCart)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar carrinho",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (!cart) return

    if (newQuantity <= 0) {
      removeItem(itemId)
      return
    }

    try {
      const updatedItems = cart.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            total_price: item.unit_price * newQuantity,
          }
        }
        return item
      })

      const updatedCart = {
        ...cart,
        items: updatedItems,
        total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
      }

      setCart(updatedCart)

      toast({
        title: "Carrinho Atualizado",
        description: "Quantidade alterada com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar quantidade",
        variant: "destructive",
      })
    }
  }

  const removeItem = async (itemId: string) => {
    if (!cart) return

    try {
      const updatedItems = cart.items.filter((item) => item.id !== itemId)
      const updatedCart = {
        ...cart,
        items: updatedItems,
        total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0),
      }

      setCart(updatedCart)

      toast({
        title: "Item Removido",
        description: "Item removido do carrinho",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao remover item",
        variant: "destructive",
      })
    }
  }

  const proceedToCheckout = async () => {
    if (!cart || cart.items.length === 0) return

    try {
      setCheckoutLoading(true)

      // Mock checkout process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Redirecionando para Pagamento",
        description: "Você será redirecionado para finalizar a compra",
      })

      // In real app, redirect to payment gateway
      onClose()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar checkout",
        variant: "destructive",
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Design: "bg-blue-100 text-blue-800",
      Desenvolvimento: "bg-green-100 text-green-800",
      Marketing: "bg-purple-100 text-purple-800",
      Complemento: "bg-orange-100 text-orange-800",
      Consultoria: "bg-gray-100 text-gray-800",
    }
    return colors[category as keyof typeof colors] || colors["Design"]
  }

  const isExpiringSoon = () => {
    if (!cart?.expires_at) return false
    const expiresAt = new Date(cart.expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry <= 24
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho de Compras
            {cart && cart.items.length > 0 && <Badge variant="secondary">{cart.items.length} itens novos</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Carregando carrinho...</div>
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Carrinho Vazio</h3>
            <p className="text-gray-600 mb-4">Adicione produtos ao seu carrinho para continuar</p>
            <Button onClick={onClose}>Continuar Comprando</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Expiry Warning */}
            {isExpiringSoon() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Carrinho expira em breve!</span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Complete sua compra antes de {new Date(cart.expires_at!).toLocaleString("pt-BR")}
                </p>
              </div>
            )}

            {/* New Items Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Apenas itens novos não pagos</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Este carrinho mostra apenas os itens adicionados recentemente que ainda não foram pagos
              </p>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{item.product_description}</p>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-sm text-gray-500">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(item.unit_price)}{" "}
                            cada
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold mb-2">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(item.total_price)}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Adicionado em {new Date(item.added_at).toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(cart.total_amount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Continuar Comprando
              </Button>
              <Button onClick={proceedToCheckout} disabled={checkoutLoading} className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />
                {checkoutLoading ? "Processando..." : "Finalizar Compra"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
