# Cria o diretório se não existir
mkdir -p assets/logos

# URLs de logos em PNG de alta qualidade (via CDN transparente)
declare -A logos=( 
  ["visa"]="https://raw.githubusercontent.com/fawazahmed0/currency-api/1/img/visa.png"
  ["mastercard"]="https://raw.githubusercontent.com/fawazahmed0/currency-api/1/img/mastercard.png"
  ["amex"]="https://raw.githubusercontent.com/fawazahmed0/currency-api/1/img/amex.png"
  ["elo"]="https://logodownload.org/wp-content/uploads/2014/05/elo-logo-0.png"
  ["hipercard"]="https://logodownload.org/wp-content/uploads/2015/12/hipercard-logo-0.png"
)

for brand in "${!logos[@]}"; do
  echo "Baixando logo da $brand..."
  curl -L "${logos[$brand]}" -o "assets/logos/$brand.png"
done

echo "✅ Todos os logos foram salvos em assets/logos/"