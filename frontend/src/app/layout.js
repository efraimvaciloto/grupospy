import './globals.css'

export const metadata = {
  title: 'GrupoSpy — Monitor Inteligente de Grupos WhatsApp',
  description: 'Monitore, analise e gerencie seus grupos WhatsApp com IA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
