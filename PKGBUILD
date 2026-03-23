pkgname=multiwhatsapp
pkgver=2.0.0
pkgrel=1
pkgdesc="Multi-account WhatsApp desktop client"
arch=('x86_64')
url="https://github.com/yousef5/newWhatApp"
license=('MIT')
depends=('gtk3' 'nss' 'libxss' 'alsa-lib' 'libxtst' 'libdrm' 'mesa')
makedepends=('bun' 'nodejs')
source=()
options=('!strip')

build() {
  cd "$startdir"
  bun install --frozen-lockfile 2>/dev/null || bun install
  bun run package:linux
}

package() {
  cd "$startdir"

  # Install the AppImage contents (extract and install)
  install -dm755 "$pkgdir/opt/$pkgname"

  # Extract AppImage
  chmod +x release/MultiWhatsApp-${pkgver}.AppImage
  release/MultiWhatsApp-${pkgver}.AppImage --appimage-extract 2>/dev/null

  # Copy extracted contents
  cp -r squashfs-root/* "$pkgdir/opt/$pkgname/"
  rm -rf squashfs-root

  # Fix ALL permissions — directories need 755, files need 644, binaries need 755
  find "$pkgdir/opt/$pkgname/" -type d -exec chmod 755 {} \;
  find "$pkgdir/opt/$pkgname/" -type f -exec chmod 644 {} \;
  # Make binaries executable
  chmod 755 "$pkgdir/opt/$pkgname/multiwhatsapp"
  chmod 755 "$pkgdir/opt/$pkgname/chrome_crashpad_handler"
  chmod 755 "$pkgdir/opt/$pkgname/chrome-sandbox"
  chmod 755 "$pkgdir/opt/$pkgname/libEGL.so"
  chmod 755 "$pkgdir/opt/$pkgname/libGLESv2.so"
  chmod 755 "$pkgdir/opt/$pkgname/libffmpeg.so"
  chmod 755 "$pkgdir/opt/$pkgname/libvk_swiftshader.so"
  chmod 755 "$pkgdir/opt/$pkgname/libvulkan.so.1"
  # chrome-sandbox needs SUID
  chmod 4755 "$pkgdir/opt/$pkgname/chrome-sandbox"

  # Create launcher script
  install -Dm755 /dev/stdin "$pkgdir/usr/bin/$pkgname" << EOF
#!/bin/bash
exec /opt/$pkgname/multiwhatsapp --no-sandbox "\$@"
EOF

  # Install icons
  for size in 16 32 48 64 128 256 512; do
    if [ -f "resources/icon-${size}.png" ]; then
      install -Dm644 "resources/icon-${size}.png" \
        "$pkgdir/usr/share/icons/hicolor/${size}x${size}/apps/$pkgname.png"
    fi
  done
  install -Dm644 resources/icon.png \
    "$pkgdir/usr/share/icons/hicolor/1024x1024/apps/$pkgname.png"

  # Install desktop entry
  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/$pkgname.desktop" << EOF
[Desktop Entry]
Name=MultiWhatsApp
GenericName=WhatsApp Client
Comment=Multi-account WhatsApp desktop client
Exec=$pkgname %U
Icon=$pkgname
Type=Application
Categories=Network;InstantMessaging;Chat;
Keywords=whatsapp;chat;messaging;multi-account;
StartupWMClass=MultiWhatsApp
MimeType=x-scheme-handler/whatsapp;
EOF
}
