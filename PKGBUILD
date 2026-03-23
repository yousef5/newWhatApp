pkgname=multiwhatsapp
pkgver=2.0.0
pkgrel=1
pkgdesc="Multi-account WhatsApp desktop client"
arch=('x86_64')
url="https://github.com/yousef5/newWhatApp"
license=('MIT')
depends=('electron' 'gtk3' 'nss' 'libxss')
makedepends=('bun' 'nodejs')
source=()

build() {
  cd "$startdir"
  bun install
  bun run build
}

package() {
  cd "$startdir"

  # Install the built app
  install -dm755 "$pkgdir/opt/$pkgname"
  cp -r out/* "$pkgdir/opt/$pkgname/"
  cp package.json "$pkgdir/opt/$pkgname/"

  # Install icon
  install -Dm644 resources/icon-256.png "$pkgdir/usr/share/icons/hicolor/256x256/apps/$pkgname.png"
  install -Dm644 resources/icon-128.png "$pkgdir/usr/share/icons/hicolor/128x128/apps/$pkgname.png"
  install -Dm644 resources/icon-64.png "$pkgdir/usr/share/icons/hicolor/64x64/apps/$pkgname.png"
  install -Dm644 resources/icon-48.png "$pkgdir/usr/share/icons/hicolor/48x48/apps/$pkgname.png"
  install -Dm644 resources/icon.svg "$pkgdir/usr/share/icons/hicolor/scalable/apps/$pkgname.svg"

  # Install desktop entry
  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/$pkgname.desktop" << EOF
[Desktop Entry]
Name=MultiWhatsApp
Comment=Multi-account WhatsApp desktop client
Exec=electron /opt/$pkgname/main/index.js
Icon=$pkgname
Type=Application
Categories=Network;InstantMessaging;Chat;
Keywords=whatsapp;chat;messaging;multi-account;
StartupWMClass=MultiWhatsApp
EOF

  # Install license
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE" 2>/dev/null || true
}
