import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], weight: ['400', '500', '600'] });
const poppins = Poppins({ variable: '--font-poppins', subsets: ['latin'], weight: ['500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Next Trip',
  description: 'Plan your next trip: destinations, itineraries, weather, transport and budgets.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
