# Integração Google Maps Places Autocomplete

## Configuração

### 1. Obter API Key do Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative as seguintes APIs:
   - Google Maps JavaScript API
   - Places API
   - Geocoding API
4. Crie uma chave de API (tipo "Chave de navegador")
5. Restrinja a chave apenas para os domínios autorizados

### 2. Configurar a chave no projeto

Substitua `YOUR_GOOGLE_MAPS_API_KEY` em `/app/layout.tsx` pela sua chave real:

```tsx
<script
  src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_AQUI&libraries=places,geometry&language=pt-BR"
  async
  defer
></script>
```

## Uso do Componente

### No formulário de criação/edição de empresa:

```tsx
import { AddressMapPicker } from "@/components/address/address-map-picker"

// Dentro do formulário
<AddressMapPicker
  value={formData}
  onChange={(addressData) => {
    setFormData(prev => ({
      ...prev,
      ...addressData,
      rua: addressData.street,
      numero: addressData.number,
      cidade: addressData.city,
      estado: addressData.state,
      cep: addressData.zipcode,
      latitude: addressData.lat,
      longitude: addressData.lng,
      place_id: addressData.placeId,
      formatted_address: addressData.formatted,
    }))
  }}
/>
```

## Estrutura de dados retornada

```typescript
{
  street: string          // Nome da rua
  number: string          // Número
  district: string        // Bairro/Sublocality
  city: string            // Cidade
  state: string           // Estado (UF)
  zipcode: string         // CEP
  lat: number             // Latitude
  lng: number             // Longitude
  placeId: string         // ID do lugar no Google
  formatted: string       // Endereço formatado completo
}
```

## Banco de dados

Adicionar as seguintes colunas opcionais à tabela de empresas:

```sql
ALTER TABLE companies ADD COLUMN latitude FLOAT NULL;
ALTER TABLE companies ADD COLUMN longitude FLOAT NULL;
ALTER TABLE companies ADD COLUMN place_id VARCHAR(255) NULL;
ALTER TABLE companies ADD COLUMN formatted_address VARCHAR(500) NULL;
```

## Compatibilidade com dados antigos

- O componente funciona com ou sem coordenadas
- Se houver apenas rua/número/cidade, o usuário precisará buscar novamente
- Dados antigos continuam funcionando normalmente
- Novo dado é preenchido apenas quando o usuário seleciona um endereço

## Características principais

✅ Autocomplete com sugestões em tempo real  
✅ Validação automática de endereço  
✅ Resolve problemas de acentuação, CEP errado, cidades duplicadas  
✅ Mapa interativo com marcador arrastável  
✅ Precisão urbana com Google Places  
✅ Sem quebra de dados existentes  
✅ Geocodificação reversa (clica no mapa, atualiza endereço)

## Troubleshooting

**Erro: "google is not defined"**
- Certifique-se que o script foi carregado em `/app/layout.tsx`
- Verifique se a chave de API é válida
- Aguarde alguns segundos para o script carregar completamente

**Autocomplete não funciona**
- Verifique se a API "Places API" está ativada no Google Cloud Console
- Confira se o domínio está na whitelist da chave

**Mapa não carrega**
- Verifique se a API "Google Maps JavaScript API" está ativada
- Confira as restrições de domínio na chave de API
