# Google Maps API - Configuração Rápida

## O que você vê agora?

No formulário de adicionar nova empresa, você tem um **seletor de localização com mapa interativo**. Para ativá-lo, você precisa configurar sua Google Maps API Key.

## Como Configurar (3 passos)

### 1. Obter uma API Key do Google Cloud

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto ou selecione um existente
3. Ative as seguintes APIs:
   - Google Maps JavaScript API
   - Places API
   - Geocoding API
4. Na seção "Credenciais", crie uma chave de API (tipo: chave de navegador)
5. Copie a chave gerada

### 2. Adicionar a API Key ao projeto

Abra o arquivo `/app/layout.tsx` e procure por esta linha:

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry&language=pt-BR"
  async
  defer
></script>
```

Substitua `YOUR_GOOGLE_MAPS_API_KEY` pela sua chave real. Exemplo:

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDu5VzKt3SYpRyBv_x8R5ZqZQw0R9-5k2E&libraries=places,geometry&language=pt-BR"
  async
  defer
></script>
```

### 3. Reiniciar o servidor

Salve o arquivo e recarregue a página. O mapa agora deve aparecer no formulário de empresas.

## Funcionalidades do Seletor

✅ **Autocomplete**: Digite um endereço e veja sugestões em tempo real  
✅ **Mapa Interativo**: Visualize a localização no mapa  
✅ **Arraste o Marcador**: Ajuste a posição manualmente no mapa  
✅ **Campos Automáticos**: Rua, número, cidade, estado e CEP são preenchidos automaticamente  
✅ **Fallback Manual**: Se a API não estiver configurada, você pode preencher os campos manualmente  

## Troubleshooting

**"Google Maps não foi configurado"** → A API Key ainda não foi adicionada ou está inválida.

**"Não aparecem sugestões"** → Verifique se a Places API está ativada no Google Cloud Console.

**"Mapa branco"** → A chave pode estar inválida ou restrita. Remova restrições de IP temporariamente.

## Suporte

Para mais informações, consulte a documentação oficial:
- https://developers.google.com/maps/documentation/javascript/places
- https://developers.google.com/maps/documentation/geocoding
