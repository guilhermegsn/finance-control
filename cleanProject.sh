rm -rf node_modules

# Limpa cache do npm
npm cache clean --force

# Limpa cache do Metro
rm -rf /tmp/metro-*
rm -rf $TMPDIR/metro-*

# Android
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build

echo "Limpeza concluída!"