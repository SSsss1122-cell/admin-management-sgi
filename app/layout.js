import './globals.css'
import BackHandler from "./back-handler";

export const metadata = {
  title: 'Admin',
  description: 'admin Management System for Siddaganga Institute of Technology',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <BackHandler />   {/* client component runs back-button logic */}
        {children}
      </body>
    </html>
  )
}
