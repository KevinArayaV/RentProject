import "../globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Navbar from "./components/navbar/Navbar";
import ClientOnly from "./components/ClientOnly";
import RegisterModal from "./components/modals/RegisterModal";
import ToasterProvider from "./providers/ToasterProvider";
import LoginModal from "./components/modals/LoginModal";
import getCurrentUser from "./actions/getCurrentUser";
import RentModal from "./components/modals/RentModal";
import SearchModal from "./components/modals/SearchModal";
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

const nunito = Nunito({
   subsets: ["latin"],
});

export const metadata: Metadata = {
   title: "Casa Tica",
   description: "Rental Properties in Costa Rica",
};

// Function to generate static params for locales
export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'es'}];
}

export default async function RootLayout({ 
  children, 
  params: { locale } 
}: { 
  children: React.ReactNode;
  params: { locale: string };
}) {
   const currentUser = await getCurrentUser();
   let messages;
   try {
     messages = (await import(`../../messages/${locale}.json`)).default;
   } catch (error) {
     notFound();
   }

   return (
      <html lang={locale}>
         <body className={nunito.className}>
           <NextIntlClientProvider locale={locale} messages={messages}>
              <ClientOnly>
                 <ToasterProvider />
                 <SearchModal />
                 <RentModal />
                 <LoginModal />
                 <RegisterModal />
                 <Navbar currentUser={currentUser} />
              </ClientOnly>
              <div className="pb-20 pt-28">{children}</div>
            </NextIntlClientProvider>
         </body>
      </html>
   );
}