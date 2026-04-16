import './globals.css'
import { ThemeProvider } from '../lib/ThemeContext'

export const metadata = {
  title: {
    default: 'Grupo do Zap — Monitor Inteligente de Grupos WhatsApp',
    template: '%s | Grupo do Zap',
  },
  description: 'Monitore, analise e gerencie seus grupos WhatsApp com inteligência artificial. Alertas em tempo real, gestão de contatos e disparos automatizados.',
  keywords: ['WhatsApp', 'grupos WhatsApp', 'monitoramento WhatsApp', 'gestão de grupos', 'automação WhatsApp', 'CRM WhatsApp'],
  authors: [{ name: 'Grupo do Zap' }],
  creator: 'Grupo do Zap',
  metadataBase: new URL('https://grupodozap.ai'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://grupodozap.ai',
    siteName: 'Grupo do Zap',
    title: 'Grupo do Zap — Monitor Inteligente de Grupos WhatsApp',
    description: 'Monitore, analise e gerencie seus grupos WhatsApp com inteligência artificial.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Grupo do Zap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grupo do Zap — Monitor Inteligente de Grupos WhatsApp',
    description: 'Monitore, analise e gerencie seus grupos WhatsApp com inteligência artificial.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'var(--font-sans)' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
