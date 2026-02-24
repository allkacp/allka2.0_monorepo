// Exemplo de integração do AddressMapPicker no CompanyCreateSlidePanel
// Substitua a seção de endereço no componente company-create-slide-panel.tsx

// 1. Importe o componente no topo do arquivo:
import { AddressMapPicker } from "@/components/address/address-map-picker"

// 2. Substitua a seção de endereço (linhas ~410-480) por:

{/* Endereço */}
<div className="space-y-4">
  <h3 className="text-base font-semibold text-gray-900">Endereço</h3>
  
  <AddressMapPicker
    value={{
      street: formData.rua,
      number: formData.numero,
      city: formData.cidade,
      state: formData.estado,
      zipcode: formData.cep,
      lat: formData.latitude,
      lng: formData.longitude,
      placeId: formData.place_id,
      formatted: formData.formatted_address,
    }}
    onChange={(addressData) => {
      // Atualiza o formulário com os dados do endereço selecionado
      updateField("rua", addressData.street || "")
      updateField("numero", addressData.number || "")
      updateField("cidade", addressData.city || "")
      updateField("estado", addressData.state || "")
      updateField("cep", addressData.zipcode || "")
      
      // Salva os dados geográficos (novo)
      updateField("latitude", addressData.lat)
      updateField("longitude", addressData.lng)
      updateField("place_id", addressData.placeId)
      updateField("formatted_address", addressData.formatted)
    }}
  />

  {/* Complemento (opcional) */}
  <div>
    <Label htmlFor="complemento" className="text-xs font-semibold">
      Complemento <span className="text-gray-400">(opcional)</span>
    </Label>
    <Input
      id="complemento"
      placeholder="Apt 123, Sala 5, etc"
      value={formData.complemento}
      onChange={(e) => updateField("complemento", e.target.value)}
    />
  </div>
</div>

// 3. Atualize a função updateField se ainda não existir:
const updateField = (field: keyof FormData, value: any) => {
  setFormData(prev => ({
    ...prev,
    [field]: value,
  }))
  
  // Limpa o erro do campo ao editar
  if (errors[field]) {
    setErrors(prev => ({
      ...prev,
      [field]: "",
    }))
  }
}

// 4. Atualize a validação para remover a exigência de rua/numero se tiver place_id:
const validateForm = () => {
  const newErrors: FormErrors = {}
  
  if (!formData.razaoSocial.trim()) newErrors.razaoSocial = "Razão Social é obrigatória"
  if (!formData.nomeFantasia.trim()) newErrors.nomeFantasia = "Nome Fantasia é obrigatório"
  if (!formData.cnpj.trim()) newErrors.cnpj = "CNPJ é obrigatório"
  if (!formData.emailPrincipal.trim()) newErrors.emailPrincipal = "Email é obrigatório"
  if (!formData.telefone.trim()) newErrors.telefone = "Telefone é obrigatório"
  
  // Se não tem place_id (endereço não selecionado no mapa)
  if (!formData.place_id) {
    if (!formData.rua.trim()) newErrors.rua = "Rua é obrigatória"
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório"
  }
  
  if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória"
  if (!formData.estado) newErrors.estado = "Estado é obrigatório"
  if (!formData.cep.trim()) newErrors.cep = "CEP é obrigatório"
  if (!formData.nomeAdmin.trim()) newErrors.nomeAdmin = "Nome do Admin é obrigatório"
  if (!formData.emailAdmin.trim()) newErrors.emailAdmin = "Email do Admin é obrigatório"
  
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

// 5. Garanta que os novos campos sejam enviados ao criar a empresa:
const handleCreateCompany = async () => {
  if (!validateForm()) return
  
  const companyData = {
    ...formData,
    // Dados geográficos opcionais
    ...(formData.latitude && { latitude: formData.latitude }),
    ...(formData.longitude && { longitude: formData.longitude }),
    ...(formData.place_id && { place_id: formData.place_id }),
    ...(formData.formatted_address && { formatted_address: formData.formatted_address }),
  }
  
  // Enviar para API...
  onCreate(companyData)
}
