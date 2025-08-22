import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: "VisualFlow - 学習プロセス可視化アプリ",
  description: "目標達成のプロセスを視覚的に管理・追跡できるアプリケーション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}