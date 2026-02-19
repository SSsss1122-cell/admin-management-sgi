import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Student Management System',
  description: 'Admin dashboard for student management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Add suppressHydrationWarning to body to ignore browser extension attributes */}
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}